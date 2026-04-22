import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email' // your Brevo helper
import { supabaseKeys } from '@/lib/env'

export async function POST(request) {
  const requestUrl = new URL(request.url)
  const formData = await request.formData()
  const email = formData.get('email')
  const password = formData.get('password')
  const name = formData.get('name') // optional, if you collect name

  const cookieStore = await cookies()
  const supabase = createServerClient(
    supabaseKeys.url(),
    supabaseKeys.publishable(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // store extra user metadata
      // Disable automatic email confirmation if you want to handle it yourself
      // emailRedirectTo: `${requestUrl.origin}/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Send a custom welcome email via Brevo
  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to LaunchPard!',
      html: `<p>Hi ${name || 'Cadet'},</p>
             <p>Thank you for signing up. Please confirm your email by clicking the link below:</p>
             <p><a href="${requestUrl.origin}/auth/confirm?token=${data.session?.access_token}">Confirm your email</a></p>`,
    })
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError)
    // You might still want to return success even if email fails
  }

  return NextResponse.json({ success: true, user: data.user })
}