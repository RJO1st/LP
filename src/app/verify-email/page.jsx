// ═══════════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION PAGE
// File: src/app/verify-email/page.jsx
// Shows after signup when email confirmation is required
// ═══════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
          
          {/* Icon */}
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-indigo-600" size={40} />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Check Your Email
          </h1>
          
          {/* Email address */}
          {email && (
            <p className="text-slate-600 mb-6">
              We've sent a confirmation email to:<br />
              <span className="font-bold text-slate-900">{email}</span>
            </p>
          )}
          
          {/* Instructions */}
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 mb-6 text-left">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle className="text-indigo-600" size={20} />
              Next Steps:
            </h2>
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  1
                </span>
                <span>Check your inbox (and spam folder)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  2
                </span>
                <span>Click the confirmation link in the email</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  3
                </span>
                <span>You'll be redirected to your dashboard</span>
              </li>
            </ol>
          </div>

          {/* Tips */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-slate-600 font-bold mb-2">💡 Helpful Tips:</p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Email should arrive within 2 minutes</li>
              <li>• Check your spam/junk folder</li>
              <li>• Add hello@launchpard.com to your contacts</li>
            </ul>
          </div>

          {/* Already verified link */}
          <div className="text-center">
            <Link 
              href="/login?type=parent"
              className="text-indigo-600 hover:text-indigo-700 font-bold text-sm"
            >
              Already verified? Sign in →
            </Link>
          </div>

          {/* Resend link */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-2">
              Didn't receive the email?
            </p>
            <button
              onClick={() => {
                alert('Resend feature coming soon! Please check your spam folder or contact support@launchpard.com');
              }}
              className="text-sm text-indigo-600 hover:underline font-bold"
            >
              Resend verification email
            </button>
          </div>

        </div>

        {/* Support */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-600">
            Need help?{' '}
            <a href="mailto:support@launchpard.com" className="text-indigo-600 hover:underline font-bold">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}