/**
 * LaunchPard — Visual Generation Pipeline
 * File: src/app/api/generate-visuals/route.js
 *
 * Cron-driven endpoint that generates images for questions flagged with
 * needs_visual=true && visual_status='pending'.
 *
 * Strategy (3 tiers, cheapest first):
 *   1. SVG generation via cheap text model → stored as data URI (graphs, diagrams, charts)
 *   2. Image generation via OpenRouter image models (FLUX/Recraft) → stored in Supabase Storage
 *   3. Fallback: mark as 'svg_only' and let MathsVisualiser handle client-side
 *
 * Budget: processes up to 20 questions per run, ~$0.01–0.05 per image
 * Cron: every 4 hours via vercel.json
 *
 * Manual: /api/generate-visuals?limit=5&type=graph
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse }  from 'next/server';
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

const supabase = getServiceRoleClient();

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

// ─── IMAGE-CAPABLE MODELS (via OpenRouter) ──────────────────────────────────
// Tier 1: Text models that generate SVG/description (ultra-cheap)
const SVG_MODELS = [
  'google/gemini-2.0-flash-lite-001',
  'openai/gpt-4o-mini',
  'deepseek/deepseek-v3.2',
];

// Tier 2: Image generation models via OpenRouter (for illustrations/photos)
const IMAGE_MODELS = [
  'recraft-ai/recraft-v3',          // high quality illustrations
  'black-forest-labs/flux-1.1-pro', // photorealistic / diagrams
];

const MAX_PER_RUN     = 40;
const RATE_LIMIT_MS   = 2000;
const STORAGE_BUCKET  = 'question-visuals';

// ─── SVG PROMPT BUILDER ─────────────────────────────────────────────────────
function buildSvgPrompt(question, imageType) {
  const qText = question.question_text || '';
  const subject = question.subject || '';
  const year = question.year_level || 5;

  const base = `You are an educational diagram generator. Create a clean, accurate SVG illustration for this ${subject} question aimed at Year ${year} students.

Question: "${qText}"

CRITICAL RULES:
- Output ONLY valid SVG markup (starting with <svg and ending with </svg>)
- Use viewBox="0 0 400 300" for landscape or viewBox="0 0 300 400" for portrait
- Use clear, bold colours with good contrast (WCAG AA)
- Use readable font sizes (minimum 12px)
- Label all important parts clearly
- DO NOT include the answer — the visual should SUPPORT the question, not give it away
- Use a white or very light background
- Keep it simple and educational — this is for children aged ${Math.max(5, year + 4)}–${year + 6}`;

  const typePrompts = {
    graph: `${base}

Create a mathematical graph/plot. Include:
- Clear x and y axes with arrows and labels
- Grid lines (light grey, dashed)
- Axis tick marks with numbers
- Any curves/lines described in the question
- Use distinct colours for different lines (indigo #4f46e5, rose #e11d48, emerald #059669)
- Mark key points (intercepts, vertices) with filled circles`,

    diagram: `${base}

Create a clear scientific/educational diagram. Include:
- Clean labelled parts with leader lines
- Use colour coding for different components
- Include a title/heading if appropriate
- Arrows for processes/flows where relevant`,

    map: `${base}

Create a simplified educational map. Include:
- Clear outlines of relevant regions/countries
- Labels for key places mentioned in the question
- A compass rose (N/S/E/W)
- Use distinct fill colours for different regions
- Keep borders clean and sharp`,

    chart: `${base}

Create a data visualisation chart. Include:
- Clear axis labels and title
- Data bars/segments with distinct colours
- A simple legend if multiple data series
- Value labels on data points where helpful`,

    data_table: `${base}

Create a clean data table as SVG. Include:
- Header row with bold text and shaded background
- Clear cell borders
- Properly aligned text (left for labels, right for numbers)
- Alternating row shading for readability`,

    illustration: `${base}

Create a clear educational illustration. Include:
- Simple, clean line art style
- Bright, child-friendly colours
- Labels where relevant
- No unnecessary detail — focus on what the question asks about`,
  };

  return typePrompts[imageType] || typePrompts.diagram;
}

// ─── IMAGE PROMPT BUILDER (for Recraft/FLUX) ────────────────────────────────
function buildImagePrompt(question, imageType) {
  const qText = question.question_text || '';
  const subject = question.subject || '';
  const year = question.year_level || 5;
  const age = Math.max(5, year + 4);

  // Extract the visual subject from the question
  const visualSubject = qText
    .replace(/which|what|how|where|when|who|does|do|is|are|the|a|an/gi, '')
    .replace(/\?/g, '').trim().slice(0, 100);

  const styleGuide = 'Clean educational illustration style. Simple flat design with bold outlines. Bright saturated colours on white background. No text overlays. Child-friendly. High contrast.';

  const prompts = {
    diagram: `Educational diagram for ${subject}: ${visualSubject}. ${styleGuide} Labelled parts with clean leader lines. Scientific accuracy. Suitable for age ${age}+.`,
    map: `Simplified educational map showing: ${visualSubject}. ${styleGuide} Clear borders, compass rose, minimal detail. Geographic accuracy.`,
    illustration: `Educational illustration: ${visualSubject}. ${styleGuide} Age-appropriate for ${age}+ year olds. Engaging and informative.`,
    graph: null, // graphs should use SVG generation, not image models
    chart: null, // charts should use SVG generation
    data_table: null,
  };

  return prompts[imageType] || prompts.illustration;
}

// ─── CALL OPENROUTER (text model for SVG) ───────────────────────────────────
async function generateSvg(prompt, model) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://launchpard.com',
      'X-Title':       'LaunchPard Visual Generation',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter SVG error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Extract SVG from response (may be wrapped in markdown fences)
  const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
  if (!svgMatch) throw new Error('No valid SVG in response');

  return svgMatch[0];
}

// ─── CALL OPENROUTER (image model) ──────────────────────────────────────────
async function generateImage(prompt, model) {
  const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://launchpard.com',
      'X-Title':       'LaunchPard Visual Generation',
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: '1024x768',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter image error (${res.status}): ${err}`);
  }

  const data = await res.json();
  // OpenRouter returns either url or b64_json
  const imageData = data.data?.[0];
  if (!imageData) throw new Error('No image in response');

  return imageData.url || imageData.b64_json;
}

// ─── SVG → DATA URI ─────────────────────────────────────────────────────────
function svgToDataUri(svg) {
  const cleaned = svg
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .trim();
  return `data:image/svg+xml,${encodeURIComponent(cleaned)}`;
}

// ─── UPLOAD TO SUPABASE STORAGE ─────────────────────────────────────────────
async function uploadToStorage(questionId, imageBuffer, contentType = 'image/png') {
  const ext = contentType.includes('svg') ? 'svg' : 'png';
  const path = `visuals/${questionId}.${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, imageBuffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: publicUrl } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return publicUrl.publicUrl;
}

// ─── PROCESS ONE QUESTION ───────────────────────────────────────────────────
async function processQuestion(question) {
  const { id, image_type: imageType } = question;
  const svgTypes = ['graph', 'chart', 'data_table', 'diagram'];
  const imageOnlyTypes = ['illustration', 'map', 'photo'];

  try {
    let imageUrl = null;
    let visualPrompt = null;

    if (svgTypes.includes(imageType)) {
      // Tier 1: Generate SVG via cheap text model
      visualPrompt = buildSvgPrompt(question, imageType);
      const model = SVG_MODELS[Math.floor(Math.random() * SVG_MODELS.length)];
      const svg = await generateSvg(visualPrompt, model);

      // Validate SVG has meaningful content (not just empty tags)
      if (svg.length < 100) throw new Error('SVG too short — likely empty');

      // Store as data URI for graphs/charts (instant loading, no storage cost)
      if (imageType === 'graph' || imageType === 'chart') {
        imageUrl = svgToDataUri(svg);
      } else {
        // Upload larger diagrams to Supabase Storage
        imageUrl = await uploadToStorage(id, Buffer.from(svg), 'image/svg+xml');
      }

    } else if (imageOnlyTypes.includes(imageType)) {
      // Tier 2: Generate image via image model
      visualPrompt = buildImagePrompt(question, imageType);
      if (!visualPrompt) {
        // Fallback: use SVG for types that shouldn't use image models
        visualPrompt = buildSvgPrompt(question, 'diagram');
        const model = SVG_MODELS[Math.floor(Math.random() * SVG_MODELS.length)];
        const svg = await generateSvg(visualPrompt, model);
        imageUrl = await uploadToStorage(id, Buffer.from(svg), 'image/svg+xml');
      } else {
        const model = IMAGE_MODELS[Math.floor(Math.random() * IMAGE_MODELS.length)];
        const result = await generateImage(visualPrompt, model);

        if (result.startsWith('http')) {
          // URL — fetch and re-upload to our storage for permanence
          const imgRes = await fetch(result);
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          imageUrl = await uploadToStorage(id, buffer, 'image/png');
        } else {
          // Base64 — decode and upload
          const buffer = Buffer.from(result, 'base64');
          imageUrl = await uploadToStorage(id, buffer, 'image/png');
        }
      }
    } else {
      // Unknown type — try SVG as fallback
      visualPrompt = buildSvgPrompt(question, 'diagram');
      const model = SVG_MODELS[0];
      const svg = await generateSvg(visualPrompt, model);
      imageUrl = svgToDataUri(svg);
    }

    // Update DB
    await supabase.from('question_bank').update({
      image_url:      imageUrl,
      visual_status:  'generated',
      visual_prompt:  visualPrompt?.slice(0, 500), // store for auditing (truncated)
    }).eq('id', id);

    return { id, status: 'generated', imageType };

  } catch (err) {
    // Mark as failed so we don't retry endlessly
    await supabase.from('question_bank').update({
      visual_status: 'failed',
      visual_prompt: `ERROR: ${err.message}`.slice(0, 500),
    }).eq('id', id);

    return { id, status: 'failed', error: err.message };
  }
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limitOverride = parseInt(searchParams.get('limit')) || MAX_PER_RUN;
  const typeFilter    = searchParams.get('type');   // 'graph', 'diagram', 'map', etc.
  const retryFailed   = searchParams.get('retry') === 'true';

  const limit = Math.min(limitOverride, 50); // cap at 50 per run

  // Fetch pending questions
  let query = supabase
    .from('question_bank')
    .select('id, question_text, subject, year_level, curriculum, image_type, needs_visual, visual_status')
    .eq('needs_visual', true)
    .order('year_level', { ascending: true })
    .limit(limit);

  if (retryFailed) {
    query = query.in('visual_status', ['pending', 'failed']);
  } else {
    query = query.eq('visual_status', 'pending');
  }

  if (typeFilter) {
    query = query.eq('image_type', typeFilter);
  }

  const { data: questions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!questions?.length) {
    return NextResponse.json({
      message: 'No pending visual generation tasks',
      pending: 0,
    });
  }

  const results = [];
  for (const q of questions) {
    const result = await processQuestion(q);
    results.push(result);
    // Rate limit between generations
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  const generated = results.filter(r => r.status === 'generated').length;
  const failed    = results.filter(r => r.status === 'failed').length;

  // Log the batch
  await supabase.from('batch_log').insert({
    batch_id: `visuals-${new Date().toISOString().slice(0, 16)}`,
    curriculum: 'mixed',
    subject: typeFilter || 'mixed',
    questions_generated: generated,
    model_used: 'visual-pipeline',
    status: failed > 0 ? 'partial' : 'complete',
  }).catch(() => {}); // non-critical

  return NextResponse.json({
    processed: results.length,
    generated,
    failed,
    results,
  });
}
