import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { scholar_id, skill_topic, wrong_answer } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch the skill ID
    const { data: skillData, error: skillError } = await supabase
      .from('skills')
      .select('id')
      .ilike('topic', `%${skill_topic}%`)
      .limit(1);
    if (skillError || !skillData || skillData.length === 0) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    const skillId = skillData[0].id;

    // Call OpenRouter to generate remediation
    const prompt = `Generate a brief remediation for a Year 5 student who answered incorrectly on the topic "${skill_topic}". Provide a short explanation (1‑2 sentences) and a similar practice question with 4 multiple‑choice options and the correct answer index. Format as JSON: {"title":"...","description":"...","practice_q":"...","opts":["A","B","C","D"],"correct":0}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
    });

    if (!response.ok) throw new Error('AI generation failed');

    const data = await response.json();
    const raw = data.choices[0].message.content;
    // Clean markdown fences
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const remediation = JSON.parse(cleaned);

    // Insert into skill_remediation (optional – could be reused later)
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

    // Log that this scholar received it
    await supabase.from('scholar_remediation_log').insert({
      scholar_id,
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