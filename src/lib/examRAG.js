/**
 * examRAG.js — RAG (Retrieval-Augmented Generation) pipeline for GCSE exam marking
 *
 * Retrieves relevant mark scheme chunks and examiner reports from the vector database
 * to provide context for AI-powered marking of extended responses and essays.
 *
 * Architecture:
 * - searchRelevantChunks: Vector similarity search on exam_chunks table using pgvector
 * - generateEmbedding: Create 1536-dim embeddings via OpenAI text-embedding-3-small
 * - buildRAGContext: Format chunks into structured context for marking prompts
 * - getMarkSchemeContext: High-level orchestrator function
 *
 * Integration:
 * - Called from markingEngine.js markWithAI() before building marking prompt
 * - Graceful degradation: continues with existing marking if RAG fails
 * - Non-blocking: RAG retrieval has timeout to prevent marking bottleneck
 *
 * Database:
 * - exam_chunks: pgvector table with 1536-dim embeddings (IVFFlat index)
 * - exam_chunk_links: Links chunks to questions for fast retrieval
 * - exam_documents: Source metadata (paper_type, source_type, etc.)
 */

import OpenAI from 'openai'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSION = 1536
const RAG_TIMEOUT_MS = 5000 // 5s timeout — don't block marking
const RAG_RETRIEVAL_LIMIT = 5 // Top-5 chunks per query
const SIMILARITY_THRESHOLD = 0.5 // Minimum cosine similarity to include chunk

/**
 * Generate a 1536-dimensional embedding for query text via OpenAI.
 * Used for vector similarity search.
 *
 * @param {string} text — Query text to embed
 * @param {string} apiKey — OpenAI API key (from env.OPENAI_API_KEY)
 * @returns {Promise<number[]>} 1536-dim embedding array, or null on error
 */
export async function generateEmbedding(text, apiKey) {
  if (!text || !apiKey) return null

  try {
    const client = new OpenAI({ apiKey })
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000) // Limit text length
    })

    if (!response.data || !response.data[0]) return null
    return response.data[0].embedding
  } catch (err) {
    console.warn('Embedding generation failed:', err.message)
    return null
  }
}

/**
 * Search for relevant mark scheme chunks using pgvector cosine similarity.
 * First checks exam_chunk_links for direct question associations,
 * then falls back to vector similarity search.
 *
 * @param {Object} supabase — Supabase client
 * @param {string} questionId — exam_questions.id
 * @param {string} queryText — Question text or search query
 * @param {number} topK — Number of chunks to retrieve (default: 5)
 * @returns {Promise<Array>} Array of { chunk_text, similarity_score, source_type, page_number, chunk_id }
 */
export async function searchRelevantChunks(
  supabase,
  questionId,
  queryText,
  topK = RAG_RETRIEVAL_LIMIT
) {
  if (!supabase || !queryText) return []

  const results = []

  try {
    // Step 1: Check exam_chunk_links for direct question associations
    if (questionId) {
      const { data: links, error: linksError } = await supabase
        .from('exam_chunk_links')
        .select('chunk_id')
        .eq('question_id', questionId)
        .limit(topK)

      if (!linksError && links && links.length > 0) {
        // Fetch the linked chunks
        const chunkIds = links.map(l => l.chunk_id)
        const { data: linkedChunks, error: chunksError } = await supabase
          .from('exam_chunks')
          .select('id, content_text, metadata, page_number, document_id')
          .in('id', chunkIds)

        if (!chunksError && linkedChunks) {
          for (const chunk of linkedChunks) {
            results.push({
              chunk_text: chunk.content_text,
              similarity_score: 1.0, // Direct link = highest score
              source_type: chunk.metadata?.chunk_type || 'mark_scheme',
              page_number: chunk.page_number,
              chunk_id: chunk.id,
              retrieved_via: 'direct_link'
            })
          }
        }

        // Return early if we have enough direct links
        if (results.length >= topK) {
          return results.slice(0, topK)
        }
      }
    }

    // Step 2: Vector similarity search as fallback
    const embedding = await generateEmbedding(queryText, process.env.OPENAI_API_KEY)
    if (!embedding) {
      // Fallback gracefully — continue without RAG context
      return results
    }

    // Call Supabase RPC function for cosine similarity search
    // RPC assumes a function named "search_exam_chunks" exists in Supabase
    // If it doesn't exist, we'll fall back to raw SQL via rpc()
    const { data: similarChunks, error: searchError } = await supabase.rpc(
      'search_exam_chunks',
      {
        query_embedding: embedding,
        match_limit: topK - results.length,
        match_threshold: SIMILARITY_THRESHOLD
      }
    )

    if (searchError) {
      // If RPC doesn't exist, try raw SQL via rpc('sql_query')
      // For now, just warn and return direct links found
      console.warn('Vector search failed:', searchError.message)
      return results
    }

    if (similarChunks && Array.isArray(similarChunks)) {
      for (const chunk of similarChunks) {
        // Avoid duplicates with direct links
        if (!results.find(r => r.chunk_id === chunk.id)) {
          results.push({
            chunk_text: chunk.content_text,
            similarity_score: chunk.similarity || 0,
            source_type: chunk.metadata?.chunk_type || 'mark_scheme',
            page_number: chunk.page_number,
            chunk_id: chunk.id,
            retrieved_via: 'vector_search'
          })
        }
      }
    }
  } catch (err) {
    console.warn('Chunk retrieval error:', err.message)
    // Graceful degradation — return what we have
  }

  return results.slice(0, topK)
}

/**
 * Format retrieved chunks into a structured context string for marking.
 * Organizes chunks by source type and includes metadata.
 *
 * @param {Array} chunks — Array of chunk objects from searchRelevantChunks
 * @returns {string} Formatted context string for insertion into marking prompt
 */
export function buildRAGContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return ''
  }

  const context = []
  context.push('MARK SCHEME & EXAMINER GUIDANCE:')
  context.push('=' .repeat(50))

  // Group chunks by source type
  const byType = {}
  for (const chunk of chunks) {
    const type = chunk.source_type || 'mark_scheme'
    if (!byType[type]) byType[type] = []
    byType[type].push(chunk)
  }

  // Format each section
  const typeOrder = ['mark_scheme', 'marking_notes', 'examiner_report', 'question']
  for (const type of typeOrder) {
    if (!byType[type]) continue

    const label = {
      mark_scheme: 'MARK SCHEME',
      marking_notes: 'MARKING NOTES',
      examiner_report: 'EXAMINER GUIDANCE',
      question: 'RELATED CONTENT'
    }[type] || type.toUpperCase()

    context.push('')
    context.push(`[${label}]`)

    for (const chunk of byType[type]) {
      if (chunk.page_number) {
        context.push(`Page ${chunk.page_number}:`)
      }
      context.push(chunk.chunk_text)
      if (chunk.similarity_score !== undefined && chunk.similarity_score < 1.0) {
        context.push(`(Relevance: ${(chunk.similarity_score * 100).toFixed(0)}%)`)
      }
      context.push('')
    }
  }

  context.push('=' .repeat(50))
  return context.join('\n')
}

/**
 * High-level orchestrator: retrieve and format mark scheme context for a question.
 * Combines searchRelevantChunks + buildRAGContext into a single call.
 *
 * This is the main entry point for marking code.
 *
 * @param {Object} supabase — Supabase client
 * @param {string} questionId — exam_questions.id
 * @param {string} questionText — Full question text for embedding
 * @param {number} marks — Total marks for question (used in fallback context)
 * @returns {Promise<string>} Formatted RAG context string (empty string if no context found)
 */
export async function getMarkSchemeContext(
  supabase,
  questionId,
  questionText,
  marks
) {
  if (!supabase || !questionText) return ''

  try {
    // Set timeout to prevent RAG from blocking marking
    const contextPromise = (async () => {
      const chunks = await searchRelevantChunks(supabase, questionId, questionText)
      return buildRAGContext(chunks)
    })()

    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve(''), RAG_TIMEOUT_MS)
    )

    const context = await Promise.race([contextPromise, timeoutPromise])
    return context || ''
  } catch (err) {
    console.warn('RAG context retrieval failed:', err.message)
    return ''
  }
}

/**
 * Link chunks to questions after exam paper ingestion.
 * Called from ingestExamPaper.mjs after creating exam_chunks.
 *
 * Matches chunks to questions based on:
 * 1. question_number field match (priority 1)
 * 2. Page proximity (chunks on same or adjacent pages, priority 2)
 * 3. Full-text keyword overlap (priority 3)
 *
 * @param {Object} supabase — Supabase client
 * @param {string} paperId — exam_papers.id
 * @param {string} docId — exam_documents.id (optional, for specific document)
 * @returns {Promise<Object>} { linked_count, skipped_count, errors }
 */
export async function linkChunksToQuestions(supabase, paperId, docId = null) {
  const result = { linked_count: 0, skipped_count: 0, errors: [] }

  if (!supabase || !paperId) {
    result.errors.push('Missing supabase or paperId')
    return result
  }

  try {
    // Fetch all chunks for this paper
    let chunksQuery = supabase
      .from('exam_chunks')
      .select('id, content_text, page_number, metadata')
      .eq('document_id', docId)

    if (!docId) {
      // Join through document to get paper filter
      chunksQuery = supabase
        .from('exam_chunks')
        .select('id, content_text, page_number, metadata, document:exam_documents(exam_paper_id)')
        .eq('document.exam_paper_id', paperId)
    }

    const { data: chunks, error: chunksError } = await chunksQuery

    if (chunksError) {
      result.errors.push(`Failed to fetch chunks: ${chunksError.message}`)
      return result
    }

    // Fetch all questions for this paper
    const { data: questions, error: questionsError } = await supabase
      .from('exam_questions')
      .select('id, question_number, page_number, question_text')
      .eq('exam_paper_id', paperId)

    if (questionsError) {
      result.errors.push(`Failed to fetch questions: ${questionsError.message}`)
      return result
    }

    // Build lookup maps
    const qByNumber = new Map()
    const qByPage = new Map()

    for (const q of questions) {
      if (q.question_number) {
        qByNumber.set(q.question_number, q)
      }
      if (q.page_number) {
        if (!qByPage.has(q.page_number)) qByPage.set(q.page_number, [])
        qByPage.get(q.page_number).push(q)
      }
    }

    // Link chunks to questions
    const links = []
    const linkSet = new Set() // Track duplicates

    for (const chunk of chunks) {
      let matchedQuestion = null
      let priority = 0

      // Priority 1: Direct question_number match
      if (chunk.metadata?.question_number) {
        matchedQuestion = qByNumber.get(chunk.metadata.question_number)
        if (matchedQuestion) priority = 1
      }

      // Priority 2: Page proximity (same or adjacent page)
      if (!matchedQuestion && chunk.page_number) {
        const pageQuestions = [
          ...(qByPage.get(chunk.page_number) || []),
          ...(qByPage.get(chunk.page_number - 1) || []),
          ...(qByPage.get(chunk.page_number + 1) || [])
        ]

        if (pageQuestions.length > 0) {
          // Match to first question on this or nearby page
          matchedQuestion = pageQuestions[0]
          priority = 2
        }
      }

      // Priority 3: Keyword overlap
      if (!matchedQuestion && chunk.content_text && questions.length > 0) {
        // Find question with highest keyword overlap
        const chunkWords = new Set(
          (chunk.content_text || '').toLowerCase().split(/\s+/).slice(0, 20)
        )

        let maxOverlap = 0
        for (const q of questions) {
          const qWords = new Set(
            (q.question_text || '').toLowerCase().split(/\s+/)
          )
          const overlap = [...chunkWords].filter(w => qWords.has(w)).length
          if (overlap > maxOverlap) {
            maxOverlap = overlap
            matchedQuestion = q
            priority = 3
          }
        }

        if (maxOverlap < 2) {
          matchedQuestion = null // Require at least 2 keyword matches
        }
      }

      if (matchedQuestion) {
        const linkKey = `${chunk.id}-${matchedQuestion.id}`
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey)
          links.push({
            chunk_id: chunk.id,
            question_id: matchedQuestion.id,
            link_priority: priority,
            matched_at: new Date().toISOString()
          })
        }
      } else {
        result.skipped_count++
      }
    }

    // Batch insert links
    if (links.length > 0) {
      const { error: insertError } = await supabase
        .from('exam_chunk_links')
        .insert(links)

      if (insertError) {
        result.errors.push(`Failed to insert links: ${insertError.message}`)
      } else {
        result.linked_count = links.length
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err.message}`)
  }

  return result
}

export {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
  RAG_TIMEOUT_MS,
  RAG_RETRIEVAL_LIMIT,
  SIMILARITY_THRESHOLD
}
