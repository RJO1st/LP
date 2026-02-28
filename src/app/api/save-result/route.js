import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req) {
  try {
    const cookieStore = cookies()
    const { scholarId, subject, score, totalQuestions, answers } = await req.json()

    // 1. Verify scholar session from secure cookie
    const sessionCookie = cookieStore.get('scholar_session')
    if (!sessionCookie) {
      return Response.json({ error: "No active scholar session found." }, { status: 401 })
    }

    const sessionData = JSON.parse(decodeURIComponent(sessionCookie.value))
    
    // 2. Validate session identity matches the request
    if (sessionData.id !== scholarId) {
      return Response.json({ error: "Unauthorized session access." }, { status: 403 })
    }

    // 3. Initialize Supabase Server Client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
        },
      }
    )

    // 4. Insert into quiz_results
    const { error: logError } = await supabase.from('quiz_results').insert([{
      scholar_id: scholarId,
      subject: subject,
      score: score,
      total_questions: totalQuestions,
      accuracy: Math.round((score / totalQuestions) * 100),
      answers: answers
    }])

    if (logError) throw logError

    // 5. Update Scholar total XP and Proficiency
    // Proficiency uses a simple moving average (20% current quiz, 80% previous)
    const accuracy = Math.round((score / totalQuestions) * 100)
    const xpGained = score * 50

    // Use RPC for atomic database operations
    await supabase.rpc('update_scholar_progress', { 
      s_id: scholarId, 
      xp_inc: xpGained,
      new_acc: accuracy 
    })

    return Response.json({ success: true, xpEarned: xpGained })
  } catch (error) {
    console.error("Vault Error:", error)
    return Response.json({ error: "Internal server processing error." }, { status: 500 })
  }
}
