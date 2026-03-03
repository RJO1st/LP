import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req) {
  try {
    const cookieStore = await cookies() // Await cookies for Next.js 15/16 compatibility
    const { scholarId, subject, score, totalQuestions, answers } = await req.json()

    // 1. Verify Cadet session from secure cookie
    // (We keep the cookie name 'scholar_session' to avoid breaking existing logins)
    const sessionCookie = cookieStore.get('scholar_session')
    if (!sessionCookie) {
      return Response.json({ error: "Mission Control: No active Cadet session found." }, { status: 401 })
    }

    const sessionData = JSON.parse(decodeURIComponent(sessionCookie.value))
    
    // 2. Validate flight clearance (session identity matches request)
    if (sessionData.id !== scholarId) {
      return Response.json({ error: "Mission Control: Unauthorized flight deck access." }, { status: 403 })
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

    // 4. Log Mission Data (Insert into quiz_results)
    const { error: logError } = await supabase.from('quiz_results').insert([{
      scholar_id: scholarId,
      subject: subject,
      score: score,
      total_questions: totalQuestions,
      accuracy: Math.round((score / totalQuestions) * 100),
      answers: answers
    }])

    if (logError) throw logError

    // 5. Update Cadet Stardust (XP) and Proficiency
    // Proficiency uses a simple moving average
    const accuracy = Math.round((score / totalQuestions) * 100)
    const stardustGained = score * 50 // Rebranded XP to Stardust

    // Use RPC for atomic database operations
    // We keep the RPC name 'update_scholar_progress' to match your SQL function
    await supabase.rpc('update_scholar_progress', { 
      s_id: scholarId, 
      xp_inc: stardustGained,
      new_acc: accuracy 
    })

    return Response.json({ success: true, stardustEarned: stardustGained })
  } catch (error) {
    console.error("Mission Control Error:", error)
    return Response.json({ error: "Internal server processing error." }, { status: 500 })
  }
}