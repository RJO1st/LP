import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { remediateSchema, parseBody } from '@/lib/validation';

export async function POST(req) {
  try {
    // ── Authentication check ──────────────────────────────────────────────
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll()
        }
      }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scholarId = user.id;

    const raw = await req.json();
    const parsed = parseBody(remediateSchema, raw);
    if (!parsed.success) return parsed.error;
    const { skill_topic, wrong_answer } = parsed.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Find the skill ID
    const { data: skillData, error: skillError } = await supabase
      .from('skills')
      .select('id')
      .ilike('topic', `%${skill_topic}%`)
      .limit(1);
    if (skillError || !skillData || skillData.length === 0) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    const skillId = skillData[0].id;

    // 2. Generate remediation using OpenRouter
    const prompt = `Generate a brief remediation for a student who answered incorrectly on the topic "${skill_topic}". Provide:
      - A short title (1‑2 words)
      - A 1‑2 sentence description
      - A similar practice question with 4 multiple‑choice options and the correct index (0‑based)
      Format as JSON: {"title":"...","description":"...","practice_q":"...","opts":["A","B","C","D"],"correct":0}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // you have credits for this
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error('AI generation failed');

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const remediation = JSON.parse(cleaned);

    // 3. Insert into skill_remediation (optional – for reuse)
    const { data: inserted, error: insertError } = await supabase
      .from('skill_remediation')
      .insert({
        skill_id: skillId,
        title: remediation.title,
        description: remediation.description,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Log that this scholar received it
    await supabase.from('scholar_remediation_log').insert({
      scholar_id: scholarId,
      remediation_id: inserted.id,
    });

    return NextResponse.json({
      remediation_id: inserted.id,
      title: remediation.title,
      description: remediation.description,
      practice_q: remediation.practice_q,
      opts: remediation.opts,
      correct: remediation.correct,
    });
  } catch (err) {
    console.error('Remediation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}