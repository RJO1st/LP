/**
 * Safeguarding & Child Safety Policy
 * Deploy to: src/app/safeguarding/page.jsx
 */

import Link from "next/link";

export const metadata = {
  title: "Safeguarding & Child Safety Policy — LaunchPard",
  description: "How LaunchPard protects children on our platform. Data protection, AI safety, parental controls, and reporting procedures.",
};

const LAST_UPDATED = "18 March 2026";
const CONTACT_EMAIL = "safeguarding@launchpard.com";
const DPO_EMAIL = "privacy@launchpard.com";
const COMPANY = "LaunchPard Technologies Ltd";

export default function SafeguardingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="LaunchPard" width={28} height={28} style={{ objectFit: "contain" }} />
            <span className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">LaunchPard</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 font-bold">← Back to home</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Safeguarding & Child Safety Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-slate prose-sm max-w-none
          [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-3
          [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-2
          [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3
          [&_ul]:text-slate-600 [&_ul]:mb-3 [&_ul]:pl-5
          [&_li]:mb-1.5
          [&_strong]:text-slate-800
        ">

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-8">
            <p className="text-sm text-indigo-800 font-bold mb-1">Our commitment</p>
            <p className="text-sm text-indigo-700 leading-relaxed">
              LaunchPard is built for children aged 5 to 18. The safety and wellbeing of every scholar on our platform
              is our highest priority. This policy explains the measures we take to protect children, how we handle their
              data, and how concerns can be raised.
            </p>
          </div>

          <h2>1. Who this policy applies to</h2>
          <p>
            This policy applies to all users of the LaunchPard platform, including scholars (children), parents and
            guardians, and any future staff, contractors, or partners who have access to the platform or its data.
            &ldquo;Scholar&rdquo; means any child or young person using LaunchPard, regardless of their age or location.
          </p>

          <h2>2. Platform design for child safety</h2>
          <p>LaunchPard is designed from the ground up with child safety in mind.</p>

          <h3>2.1 No direct communication</h3>
          <p>
            There is no messaging, chat, video calling, or any form of direct communication between users on LaunchPard.
            Scholars cannot contact other scholars, parents, or staff through the platform. There are no social features,
            comment sections, forums, or user-generated content visible to other users.
          </p>

          <h3>2.2 No 1:1 tutoring</h3>
          <p>
            LaunchPard does not provide live tutoring, video lessons, or any form of real-time interaction between
            children and adults. All learning is self-paced and delivered through our adaptive question engine and
            AI tutor (Tara).
          </p>

          <h3>2.3 Parental control by design</h3>
          <p>
            Only parents or guardians can create accounts. Scholars cannot sign up independently. Parents control
            which curriculum their child follows, can view all learning data through the parent dashboard, and can
            delete their child&rsquo;s account at any time.
          </p>

          <h3>2.4 Age-appropriate content</h3>
          <p>
            All questions in our question bank are curriculum-aligned and age-appropriate. Questions are generated
            to match the scholar&rsquo;s enrolled curriculum and year level. Our content review process ensures that
            no violent, sexual, discriminatory, or otherwise inappropriate material enters the platform.
          </p>

          <h2>3. AI safety — Tara, our AI tutor</h2>
          <p>
            Tara is LaunchPard&rsquo;s AI tutor, powered by large language models. Tara uses an &ldquo;Explain It
            Back&rdquo; pedagogy where scholars articulate their reasoning after answering questions. The following
            safeguards are in place:
          </p>

          <h3>3.1 Input filtering</h3>
          <p>
            All scholar input to Tara passes through a client-side profanity filter that blocks inappropriate language
            before it reaches the AI. Scholars who attempt to use blocked words receive a gentle prompt to rephrase.
          </p>

          <h3>3.2 AI output safety</h3>
          <p>
            Tara&rsquo;s API route uses Meta&rsquo;s Llama Guard safety model to screen both inputs and outputs. The
            AI system prompt is carefully constructed to keep Tara focused on the curriculum topic, the specific
            question being discussed, and age-appropriate language. Tara is instructed never to discuss topics outside
            the curriculum, never to share personal opinions, and never to ask scholars for personal information.
          </p>

          <h3>3.3 Conversation limits</h3>
          <p>
            Tara interactions are strictly bounded: one explanation attempt and one follow-up question per quiz question.
            There is no open-ended conversation. All interactions are stateless — Tara has no memory of previous sessions.
          </p>

          <h3>3.4 No personal data collection through AI</h3>
          <p>
            Tara does not collect, store, or process personal data beyond what is needed for the immediate interaction
            (the scholar&rsquo;s first name and year level, used to calibrate the response). Scholar inputs to Tara
            are not stored permanently or used for AI training.
          </p>

          <h2>4. Data protection</h2>

          <h3>4.1 What we collect</h3>
          <p>We collect the minimum data necessary to deliver the service:</p>
          <ul>
            <li><strong>Parent:</strong> name, email address, region, subscription status</li>
            <li><strong>Scholar:</strong> first name (or chosen display name), curriculum, year level, quiz answers, mastery scores, badges earned, coins earned</li>
          </ul>
          <p>
            We do not collect dates of birth, photographs, physical addresses, phone numbers, school names, or any
            biometric data from scholars.
          </p>

          <h3>4.2 How we use it</h3>
          <p>Scholar data is used solely to:</p>
          <ul>
            <li>Deliver adaptive learning (selecting appropriate questions and tracking mastery)</li>
            <li>Display progress to the scholar and their parent through dashboards</li>
            <li>Power gamification features (leaderboards use display names only)</li>
          </ul>
          <p>
            We do not sell, share, or transfer scholar data to any third party for marketing, advertising, or profiling
            purposes.
          </p>

          <h3>4.3 Where it&rsquo;s stored</h3>
          <p>
            All data is stored in Supabase (hosted on AWS infrastructure) with row-level security policies enforced
            at the database level. Data is encrypted in transit (TLS 1.2+) and at rest. Our infrastructure is hosted
            on Vercel (for the application) and Supabase (for the database), both of which maintain SOC 2 Type II
            compliance.
          </p>

          <h3>4.4 Data retention and deletion</h3>
          <p>
            Parents can request deletion of their child&rsquo;s data at any time by emailing {DPO_EMAIL}. Upon
            receiving a verified deletion request, we will permanently delete all scholar data within 30 days. When
            a parent deletes a scholar profile through the dashboard, associated quiz results, mastery records, and
            learning path data are permanently removed.
          </p>

          <h3>4.5 Applicable regulations</h3>
          <p>We comply with:</p>
          <ul>
            <li><strong>UK:</strong> UK GDPR, Data Protection Act 2018, Age Appropriate Design Code (Children&rsquo;s Code)</li>
            <li><strong>Nigeria:</strong> Nigeria Data Protection Regulation (NDPR), Child Rights Act 2003</li>
            <li><strong>Canada:</strong> Personal Information Protection and Electronic Documents Act (PIPEDA)</li>
            <li><strong>Australia:</strong> Privacy Act 1988, Australian Privacy Principles</li>
          </ul>

          <h2>5. Leaderboards and social features</h2>
          <p>
            Our leaderboards display only the scholar&rsquo;s chosen display name (first name or codename) and their
            score. No photographs, locations, ages, or identifying information are shown. Leaderboards are
            curriculum-scoped — scholars only see others in the same curriculum and year level. There is no way for
            scholars to contact, follow, friend, or interact with other scholars through the platform.
          </p>

          <h2>6. Third-party services</h2>
          <p>LaunchPard uses the following third-party services that may process data:</p>
          <ul>
            <li><strong>Supabase</strong> — database and authentication (stores all user data)</li>
            <li><strong>Vercel</strong> — application hosting (processes HTTP requests)</li>
            <li><strong>OpenRouter / AI providers</strong> — processes Tara AI interactions (scholar first name and question context only; no persistent storage)</li>
            <li><strong>Brevo</strong> — transactional email to parents only (never to scholars directly)</li>
            <li><strong>Google Analytics</strong> — anonymised usage analytics (no personally identifiable information)</li>
          </ul>
          <p>
            We do not use any advertising networks, social media trackers, or third-party profiling services. Google
            Analytics is configured without collecting personal data and with IP anonymisation enabled.
          </p>

          <h2>7. Reporting concerns</h2>
          <p>
            If you have any safeguarding concerns about a child using LaunchPard, or if you believe the platform
            has been used inappropriately, please contact us immediately:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-4 not-prose">
            <p className="text-sm font-bold text-slate-800 mb-1">Safeguarding contact</p>
            <p className="text-sm text-slate-600">
              Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 font-bold hover:underline">{CONTACT_EMAIL}</a>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Data protection: <a href={`mailto:${DPO_EMAIL}`} className="text-indigo-600 font-bold hover:underline">{DPO_EMAIL}</a>
            </p>
            <p className="text-xs text-slate-400 mt-2">We aim to respond to all safeguarding concerns within 24 hours.</p>
          </div>
          <p>
            If you believe a child is in immediate danger, please contact your local emergency services or child
            protection agency directly. In the UK, you can also contact the NSPCC helpline on 0808 800 5000 or
            Childline on 0800 1111. In Nigeria, contact the National Agency for the Prohibition of Trafficking in
            Persons (NAPTIP) helpline on 07030000203.
          </p>

          <h2>8. Content moderation</h2>
          <p>
            All questions in the LaunchPard question bank are either sourced from established curriculum frameworks
            or generated by AI models and reviewed for appropriateness. Our content pipeline includes automated
            quality checks for offensive language, factual accuracy, and age-appropriateness. Questions that fail
            these checks are rejected before entering the live question bank.
          </p>
          <p>
            Parents who encounter inappropriate content can report it through the parent dashboard or by emailing
            {" "}{CONTACT_EMAIL}. Reported content is reviewed and, if confirmed, removed within 24 hours.
          </p>

          <h2>9. Staff and access controls</h2>
          <p>
            Access to scholar data is restricted to essential personnel only. Database access requires multi-factor
            authentication. All administrative actions are logged. We do not employ individuals who work directly
            with children — all learning is delivered through the software platform.
          </p>

          <h2>10. Policy review</h2>
          <p>
            This policy is reviewed at least annually and updated whenever there are material changes to the platform,
            applicable regulations, or our understanding of risks to children. The date at the top of this page
            reflects the most recent review.
          </p>

          <h2>11. Contact</h2>
          <p>
            {COMPANY}<br />
            Email: {CONTACT_EMAIL}<br />
            Data protection enquiries: {DPO_EMAIL}
          </p>

        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {COMPANY} ·{" "}
        <Link href="/terms" className="hover:text-indigo-600">Terms</Link> ·{" "}
        <Link href="/privacy-policy" className="hover:text-indigo-600">Privacy</Link> ·{" "}
        <Link href="/safeguarding" className="font-bold text-indigo-500">Safeguarding</Link>
      </footer>
    </div>
  );
}