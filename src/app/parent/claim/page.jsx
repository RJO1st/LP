'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { apiFetch } from '@/lib/apiFetch'
import Link from 'next/link'
import clsx from 'clsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Inner component uses useSearchParams — must be inside <Suspense>
function ClaimScholarInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Auth states
  const [session, setSession] = useState(null)
  const [authMode, setAuthMode] = useState('signup') // 'signup' or 'signin'
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // Auth form states
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authFormData, setAuthFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  // Consent modal states
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  // Claim states
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [scholar, setScholar] = useState(null)

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session: sess } } = await supabase.auth.getSession()
        setSession(sess)

        // Auto-submit code if logged in and code in URL
        if (sess && !code) {
          const urlCode = searchParams.get('code')
          if (urlCode) {
            setCode(urlCode)
            setShowConsentModal(true)
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        setSession(sess)
        if (sess && !code) {
          const urlCode = searchParams.get('code')
          if (urlCode) {
            setCode(urlCode)
            setShowConsentModal(true)
          }
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [searchParams])

  // ── Auth handlers ────────────────────────────────────────────────────────
  const handleAuthChange = (field, value) => {
    setAuthFormData((prev) => ({ ...prev, [field]: value }))
    setAuthError('')
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      if (authMode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: authFormData.email,
          password: authFormData.password,
          options: {
            data: {
              full_name: authFormData.name,
            },
          },
        })

        if (signUpError) {
          setAuthError(signUpError.message)
          setAuthLoading(false)
          return
        }

        // After signup, check for session
        const { data: { session: sess } } = await supabase.auth.getSession()
        setSession(sess)
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authFormData.email,
          password: authFormData.password,
        })

        if (signInError) {
          setAuthError(signInError.message)
          setAuthLoading(false)
          return
        }

        const { data: { session: sess } } = await supabase.auth.getSession()
        setSession(sess)
      }
    } catch (err) {
      setAuthError(err.message || 'An error occurred')
    } finally {
      setAuthLoading(false)
    }
  }

  // ── Consent handler ──────────────────────────────────────────────────────
  const handleConsentContinue = async () => {
    if (!consentChecked) return

    setShowConsentModal(false)
    const urlCode = searchParams.get('code') || code
    if (urlCode) {
      await claimScholar(urlCode)
    }
  }

  // ── Claim scholar ────────────────────────────────────────────────────────
  const claimScholar = async (codeToSubmit) => {
    const finalCode = codeToSubmit || code
    if (!finalCode) {
      setError('Please enter a validation code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await apiFetch('/api/parent/claim-scholar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validation_code: finalCode }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to claim scholar')
        setIsLoading(false)
        return
      }

      const data = await res.json()
      if (data.success && data.scholar) {
        setScholar(data.scholar)
        setSuccess(true)
        setError('')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    if (!session) {
      setShowConsentModal(false)
      return
    }
    setShowConsentModal(true)
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#080c15] text-white flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#080c15] to-black" />
          <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // ── Not authenticated: show auth tabs ────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-[#080c15] text-white flex items-center justify-center p-4">
        {/* Space-themed background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#080c15] to-black" />
          <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg backdrop-blur-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => {
                  setAuthMode('signup')
                  setAuthError('')
                  setAuthFormData({ name: '', email: '', password: '' })
                }}
                className={clsx(
                  'flex-1 py-4 px-6 font-semibold text-center transition-all',
                  authMode === 'signup'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setAuthMode('signin')
                  setAuthError('')
                  setAuthFormData({ name: '', email: '', password: '' })
                }}
                className={clsx(
                  'flex-1 py-4 px-6 font-semibold text-center transition-all',
                  authMode === 'signin'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                Sign In
              </button>
            </div>

            {/* Form */}
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-2 text-center">
                {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-slate-400 text-center mb-8 text-sm">
                {authMode === 'signup'
                  ? 'Create an account to claim your scholar'
                  : 'Sign in to claim your scholar'}
              </p>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {/* Name field (signup only) */}
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={authFormData.name}
                      onChange={(e) => handleAuthChange('name', e.target.value)}
                      disabled={authLoading}
                      className={clsx(
                        'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg',
                        'text-white placeholder-slate-500',
                        'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                        authLoading && 'opacity-50 cursor-not-allowed'
                      )}
                    />
                  </div>
                )}

                {/* Email field */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={authFormData.email}
                    onChange={(e) => handleAuthChange('email', e.target.value)}
                    disabled={authLoading}
                    className={clsx(
                      'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg',
                      'text-white placeholder-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                      authLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  />
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authFormData.password}
                    onChange={(e) => handleAuthChange('password', e.target.value)}
                    disabled={authLoading}
                    className={clsx(
                      'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg',
                      'text-white placeholder-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                      authLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  />
                </div>

                {/* Error message */}
                {authError && (
                  <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm">
                    {authError}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={authLoading || !authFormData.email || !authFormData.password || (authMode === 'signup' && !authFormData.name)}
                  className={clsx(
                    'w-full px-4 py-3 font-semibold rounded-lg',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#080c15] focus:ring-emerald-500',
                    authLoading || !authFormData.email || !authFormData.password || (authMode === 'signup' && !authFormData.name)
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  )}
                >
                  {authLoading
                    ? 'Please wait...'
                    : authMode === 'signup'
                    ? 'Create Account'
                    : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-slate-500 text-xs text-center">
                  {authMode === 'signup'
                    ? 'Already have an account? '
                    : "Don't have an account? "}
                  <button
                    onClick={() => {
                      setAuthMode(authMode === 'signup' ? 'signin' : 'signup')
                      setAuthError('')
                      setAuthFormData({ name: '', email: '', password: '' })
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    {authMode === 'signup' ? 'Sign in' : 'Create account'}
                  </button>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-slate-600 text-xs">
            <p>
              Need help?{' '}
              <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Authenticated but not completed claim: show consent modal or form ────
  if (!success) {
    return (
      <div className="min-h-screen bg-[#080c15] text-white flex items-center justify-center p-4">
        {/* Space-themed background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#080c15] to-black" />
          <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 backdrop-blur-sm">
            <h1 className="text-3xl font-bold mb-2 text-center">Claim Scholar</h1>
            <p className="text-slate-400 text-center mb-8">
              Enter the validation code from your school invitation
            </p>

            <form onSubmit={handleCodeSubmit} className="space-y-6">
              {/* Code input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Validation Code
                </label>
                <input
                  type="text"
                  placeholder="e.g., ABC1DE2"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setError('')
                  }}
                  disabled={isLoading || showConsentModal}
                  className={clsx(
                    'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg',
                    'text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                    'font-mono uppercase tracking-wide',
                    (isLoading || showConsentModal) && 'opacity-50 cursor-not-allowed'
                  )}
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || !code || showConsentModal}
                className={clsx(
                  'w-full px-4 py-3 font-semibold rounded-lg',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#080c15] focus:ring-emerald-500',
                  isLoading || !code || showConsentModal
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                )}
              >
                {isLoading ? 'Verifying...' : 'Continue'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-800">
              <p className="text-slate-500 text-sm text-center mb-4">
                Signed in as {session.user.email}
              </p>
              <button
                onClick={() => supabase.auth.signOut()}
                className="block w-full text-center text-slate-400 hover:text-emerald-400 text-sm font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-8 text-center text-slate-600 text-xs">
            <p>
              Don't have a code?{' '}
              <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">
                Contact your school
              </Link>
            </p>
          </div>
        </div>

        {/* NDPR Consent Modal */}
        {showConsentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-emerald-600/30 rounded-lg max-w-md w-full p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white">
                Data Processing Consent
              </h2>

              {/* Consent text */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6 max-h-64 overflow-y-auto">
                <p className="text-slate-300 text-sm leading-relaxed space-y-4">
                  <span className="block">
                    I consent to LaunchPard processing my child's learning data
                    (quiz results, topic mastery, progress scores) for the
                    purpose of educational analytics and school reporting.
                  </span>
                  <span className="block">
                    I understand that my child's school may see their progress
                    data to support their learning. I can withdraw consent at
                    any time from my account settings.
                  </span>
                  <span className="block">
                    LaunchPard will not share my child's data with third parties
                    outside the school relationship, and will retain data for no
                    more than 3 years after my child leaves the school.
                  </span>
                </p>
              </div>

              {/* Checkbox */}
              <div className="flex items-start gap-3 mb-6">
                <input
                  type="checkbox"
                  id="consent-check"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="w-5 h-5 bg-slate-800 border border-slate-600 rounded mt-0.5 cursor-pointer accent-emerald-500"
                />
                <label
                  htmlFor="consent-check"
                  className="text-sm text-slate-300 cursor-pointer flex-1"
                >
                  I have read and agree to LaunchPard's data processing terms
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConsentModal(false)
                    setConsentChecked(false)
                  }}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConsentContinue}
                  disabled={!consentChecked}
                  className={clsx(
                    'flex-1 px-4 py-3 font-semibold rounded-lg transition-all',
                    consentChecked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  )}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Success state ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080c15] text-white flex items-center justify-center p-4">
      {/* Space-themed background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#080c15] to-black" />
        <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900/50 border border-emerald-600/30 rounded-lg p-8 backdrop-blur-sm">
          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-emerald-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-6">
            Scholar Claimed!
          </h2>

          {/* Scholar details */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3 mb-8">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Scholar Name
              </p>
              <p className="text-lg font-semibold text-emerald-400">
                {scholar.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  Year Level
                </p>
                <p className="text-sm font-medium">{scholar.year_level}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  Curriculum
                </p>
                <p className="text-sm font-medium capitalize">
                  {scholar.curriculum}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Access Code
              </p>
              <p className="font-mono text-sm bg-slate-900 px-3 py-2 rounded border border-slate-700">
                {scholar.access_code}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Codename
              </p>
              <p className="font-mono text-sm text-emerald-300">
                {scholar.codename}
              </p>
            </div>
          </div>

          {/* Premium trial banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-emerald-200 leading-relaxed">
              <span className="font-semibold">7-day premium trial</span> — Your
              full access ends in 7 days. Subscribe to continue tracking{' '}
              {scholar.name}'s topic-by-topic progress.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="space-y-3">
            <Link
              href="/dashboard/parent"
              className={clsx(
                'inline-block w-full px-4 py-3 font-semibold rounded-lg',
                'bg-emerald-600 hover:bg-emerald-700 text-white',
                'transition-all duration-200',
                'text-center'
              )}
            >
              Go to Dashboard
            </Link>

            <Link
              href="/subscribe"
              className={clsx(
                'inline-block w-full px-4 py-3 font-semibold rounded-lg',
                'bg-slate-800 hover:bg-slate-700 text-slate-200',
                'transition-all duration-200',
                'text-center border border-slate-700'
              )}
            >
              Upgrade Now
            </Link>
          </div>

          <p className="text-slate-500 text-xs text-center mt-6">
            Your scholar is now linked to your account and ready to learn!
          </p>
        </div>
      </div>
    </div>
  )
}

// Suspense boundary required by Next.js 16 when using useSearchParams()
// in a static-generation context. The fallback matches the page background
// so there is no layout shift while search params resolve.
export default function ClaimScholarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, #080c15 0%, #0f1629 100%)' }}>
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      }
    >
      <ClaimScholarInner />
    </Suspense>
  )
}
