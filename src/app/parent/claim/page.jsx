'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'

export default function ClaimScholarPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [scholar, setScholar] = useState(null)

  // Auto-submit if code in URL on mount
  useEffect(() => {
    const urlCode = searchParams.get('code')
    if (urlCode) {
      setCode(urlCode)
      submitCode(urlCode)
    }
  }, [searchParams])

  const submitCode = async (codeToSubmit) => {
    const finalCode = codeToSubmit || code
    if (!finalCode) {
      setError('Please enter a validation code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/parent/claim-scholar', {
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

  const handleSubmit = (e) => {
    e.preventDefault()
    submitCode(code)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      {/* Space-themed background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />
        <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 backdrop-blur-sm">
          {!success ? (
            <>
              <h1 className="text-3xl font-bold mb-2 text-center">Claim Scholar</h1>
              <p className="text-slate-400 text-center mb-8">
                Enter the validation code from your school invitation
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                    disabled={isLoading}
                    className={clsx(
                      'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg',
                      'text-white placeholder-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                      'font-mono uppercase tracking-wide',
                      isLoading && 'opacity-50 cursor-not-allowed'
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
                  disabled={isLoading || !code}
                  className={clsx(
                    'w-full px-4 py-3 font-semibold rounded-lg',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-emerald-500',
                    isLoading || !code
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  )}
                >
                  {isLoading ? 'Verifying...' : 'Claim Scholar'}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-800">
                <p className="text-slate-500 text-sm text-center mb-4">
                  Already have an account?
                </p>
                <Link
                  href="/dashboard"
                  className="block text-center text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </>
          ) : (
            // Success state
            <div className="text-center space-y-6">
              <div className="flex justify-center">
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

              <h2 className="text-2xl font-bold">Scholar Claimed!</h2>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Scholar Name</p>
                  <p className="text-lg font-semibold text-emerald-400">{scholar.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Year Level</p>
                    <p className="text-sm font-medium">{scholar.year_level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Curriculum</p>
                    <p className="text-sm font-medium capitalize">{scholar.curriculum}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Access Code</p>
                  <p className="font-mono text-sm bg-slate-900 px-3 py-2 rounded border border-slate-700">
                    {scholar.access_code}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Codename</p>
                  <p className="font-mono text-sm text-blue-300">{scholar.codename}</p>
                </div>
              </div>

              <Link
                href="/dashboard"
                className={clsx(
                  'inline-block w-full px-4 py-3 font-semibold rounded-lg',
                  'bg-emerald-600 hover:bg-emerald-700 text-white',
                  'transition-all duration-200',
                  'text-center'
                )}
              >
                Go to Dashboard
              </Link>

              <p className="text-slate-500 text-xs">
                Your scholar is now linked to your account and ready to learn!
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-slate-600 text-xs">
          <p>
            Don't have a code?{' '}
            <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">
              Contact your school
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
