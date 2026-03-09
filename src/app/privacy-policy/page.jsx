"use client";
// src/app/privacy-policy/page.jsx
// LaunchPard Privacy Policy Page
// Renders the Termly-generated privacy policy

import { termlyPolicyHTML } from './termly-policy';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6 transition-colors"
          >
            ← Back to LaunchPard
          </a>
          <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="text-white/80 mt-2 text-sm">LaunchPard Technologies</p>
        </div>
      </div>

      {/* Termly Policy Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Termly custom styles are embedded in the HTML below */}
        <div
          className="termly-policy-content prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: termlyPolicyHTML }}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          <p>
            Questions? Email us at{' '}
            <a href="mailto:hello@launchpard.com" className="text-indigo-600 hover:underline">
              hello@launchpard.com
            </a>
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <a href="/cookie-policy" className="hover:text-indigo-600 transition-colors">
              Cookie Policy
            </a>
            <a href="/" className="hover:text-indigo-600 transition-colors">
              Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}