"use client";
// src/app/terms/page.jsx
// Deploy to: src/app/terms/page.jsx

const EMAIL    = 'hello@launchpard.com';
const COMPANY  = 'LaunchPard Technologies';
const PLATFORM = 'LaunchPard';
const WEBSITE  = 'https://www.launchpard.com';
const UPDATED  = '9 March 2026';

// ─── Named sub-component (valid RSC pattern) ─────────────────────────────────
function Block({ blocks }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.type === 'h3') {
          return <h3 key={i} className="text-sm font-bold text-slate-800 pt-4 first:pt-0">{b.text}</h3>;
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
                  <span className="text-indigo-400 font-bold flex-shrink-0">
                    ({String.fromCharCode(97 + j)})
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="text-sm text-slate-600 leading-relaxed">{b.text}</p>;
      })}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────
export default function TermsPage() {
  const sections = [
    {
      id: 'definitions', n: '1', title: 'Definitions',
      blocks: [
        { type: 'p', text: 'In these Terms, the following words have the meanings set out below:' },
        { type: 'h3', text: '"Account"' },
        { type: 'p', text: 'The registered account created by a Flight Director to access the Service.' },
        { type: 'h3', text: '"Scholar"' },
        { type: 'p', text: "A child or young person (aged 5–16) whose learning is managed through a Flight Director's Account." },
        { type: 'h3', text: '"Content"' },
        { type: 'p', text: 'All text, questions, curriculum materials, images, audio, software, and other materials made available through the Service.' },
        { type: 'h3', text: '"Flight Director"' },
        { type: 'p', text: 'The parent or guardian who registers for and holds an Account.' },
        { type: 'h3', text: '"Intellectual Property Rights"' },
        { type: 'p', text: 'All patents, rights to inventions, copyright and related rights, trade marks, trade names, domain names, goodwill, database rights, and all other intellectual property rights, whether registered or unregistered.' },
        { type: 'h3', text: `"${PLATFORM}", "we", "us", or "our"` },
        { type: 'p', text: `${COMPANY}, a company registered in the United Kingdom.` },
        { type: 'h3', text: '"Licence"' },
        { type: 'p', text: 'Has the meaning given in clause 4.' },
        { type: 'h3', text: '"Service"' },
        { type: 'p', text: `The ${PLATFORM} web application and any associated mobile application, including all features, tools, and content made available through them.` },
        { type: 'h3', text: '"Stardust"' },
        { type: 'p', text: 'The virtual in-platform reward currency earned by Scholars through completing missions and activities. Stardust has no monetary value.' },
        { type: 'h3', text: '"Subscription"' },
        { type: 'p', text: 'The paid or free-trial subscription through which a Flight Director accesses the Service.' },
        { type: 'h3', text: '"Terms"' },
        { type: 'p', text: 'These Terms and Conditions, together with our Privacy Policy and Cookie Policy.' },
      ],
    },
    {
      id: 'acceptance', n: '2', title: 'Acceptance of Terms',
      blocks: [
        { type: 'p', text: 'By registering for an Account or accessing the Service, you confirm that:' },
        { type: 'list', items: [
          'you have read, understood, and agree to be bound by these Terms;',
          'you are at least 18 years old and have legal capacity to enter into a binding agreement;',
          'you are acting as a parent or legal guardian and are authorising the use of the Service by any Scholar associated with your Account;',
          'if you are registering on behalf of an organisation, you have authority to bind that organisation to these Terms.',
        ]},
        { type: 'p', text: 'If you do not agree to these Terms, you must not use the Service.' },
        { type: 'p', text: 'We may update these Terms from time to time. We will notify you of material changes by email or by displaying a notice within the Service. Your continued use of the Service after the effective date of any updated Terms constitutes your acceptance of those changes.' },
      ],
    },
    {
      id: 'accounts', n: '3', title: 'Accounts and Registration',
      blocks: [
        { type: 'h3', text: '3.1 Flight Director Accounts' },
        { type: 'p', text: 'You must register as a Flight Director to access the Service. You agree to:' },
        { type: 'list', items: [
          'provide accurate, current, and complete information during registration;',
          'keep your login credentials secure and confidential;',
          `notify us immediately at ${EMAIL} if you suspect any unauthorised access to your Account;`,
          'take responsibility for all activity that occurs under your Account.',
        ]},
        { type: 'p', text: 'We are not liable for any loss arising from your failure to keep your credentials secure.' },
        { type: 'h3', text: '3.2 Scholar Profiles' },
        { type: 'p', text: 'You may create Scholar profiles within your Account. You confirm that:' },
        { type: 'list', items: [
          'you are the parent or legal guardian of each Scholar, or have explicit written permission from their parent or guardian;',
          "you will supervise Scholars' use of the Service as appropriate to their age;",
          'the display name and information you provide for each Scholar will not include their full legal name, home address, or other information that could identify them to third parties.',
        ]},
        { type: 'h3', text: '3.3 Account Limits' },
        { type: 'p', text: `Your Subscription tier determines the number of Scholar profiles you may create. Details are set out on our pricing page at ${WEBSITE}/pricing.` },
        { type: 'h3', text: '3.4 Account Security' },
        { type: 'p', text: 'Sharing your Account credentials with others outside your household is not permitted. Each Subscription is for a single family unit.' },
      ],
    },
    {
      id: 'licence', n: '4', title: 'Licence to Use the Service',
      blocks: [
        { type: 'h3', text: '4.1 Grant of Licence' },
        { type: 'p', text: 'Subject to your compliance with these Terms and payment of applicable Subscription fees, we grant you a limited, personal, non-exclusive, non-transferable, revocable licence to:' },
        { type: 'list', items: [
          'access and use the Service for the personal educational purposes of your Scholar(s);',
          'view, interact with, and benefit from the Content made available through the Service.',
        ]},
        { type: 'h3', text: '4.2 Restrictions' },
        { type: 'p', text: 'You must not, and must not allow any third party to:' },
        { type: 'list', items: [
          'copy, reproduce, distribute, republish, download, display, post, or transmit any part of the Service or Content in any form or by any means, except as permitted under these Terms;',
          'modify, translate, adapt, merge, or create derivative works based on the Service or Content;',
          'reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service;',
          'rent, lease, lend, sell, sublicence, assign, or otherwise transfer your rights under this Licence to any third party;',
          'use the Service or Content for commercial purposes, including tutoring services, resale, or redistribution;',
          'scrape, crawl, or systematically extract data from the Service by automated means;',
          'use the Service in a way that imposes an unreasonable or disproportionate load on our infrastructure;',
          'circumvent, disable, or interfere with security features of the Service.',
        ]},
        { type: 'h3', text: '4.3 Curriculum Content' },
        { type: 'p', text: 'All questions, explanations, learning pathways, and curriculum materials within the Service are proprietary Content owned by or licensed to us. You may not extract, reproduce, or distribute this Content outside the Service.' },
        { type: 'h3', text: '4.4 AI-Generated Content' },
        { type: 'p', text: 'Some Content is generated using artificial intelligence tools. We take reasonable steps to ensure accuracy and curriculum alignment, but we do not guarantee that AI-generated Content is error-free. You should not rely solely on the Service for formal academic assessment.' },
      ],
    },
    {
      id: 'subscriptions', n: '5', title: 'Subscriptions, Fees, and Payment',
      blocks: [
        { type: 'h3', text: '5.1 Subscription Plans' },
        { type: 'p', text: `Access to the Service requires a paid Subscription, except during any free trial period. Current pricing is displayed at ${WEBSITE}/pricing. We reserve the right to change our pricing with reasonable notice.` },
        { type: 'h3', text: '5.2 Free Trial' },
        { type: 'p', text: 'We may offer a free trial period. During the trial you have access to the full Service. At the end of the trial your Subscription will automatically convert to a paid plan unless you cancel before the trial ends. We will notify you before the trial expires.' },
        { type: 'h3', text: '5.3 Billing' },
        { type: 'list', items: [
          'Subscriptions are billed monthly or annually in advance, as selected at checkout.',
          'Payment is processed by Stripe. By providing payment details, you authorise us to charge the applicable fees to your payment method on each billing date.',
          'All fees are stated inclusive of VAT where applicable.',
          'If a payment fails, we will retry and notify you. Continued failure may result in suspension of your Account.',
        ]},
        { type: 'h3', text: '5.4 Cancellation' },
        { type: 'p', text: 'You may cancel your Subscription at any time through your Account settings. Cancellation takes effect at the end of your current billing period. You will retain access to the Service until that date. We do not provide refunds for partial periods, except as set out in clause 5.5.' },
        { type: 'h3', text: '5.5 Refunds' },
        { type: 'list', items: [
          'If you cancel within 14 days of first subscribing (cooling-off period under UK consumer law), you are entitled to a full refund, provided you have not made substantial use of the Service during that period.',
          `Outside the cooling-off period, refunds are at our discretion. We will consider refund requests made in good faith to ${EMAIL}.`,
        ]},
        { type: 'h3', text: '5.6 Price Changes' },
        { type: 'p', text: "We will give you at least 30 days' notice of any price increase. If you do not cancel before the increase takes effect, you will be charged the new price from your next billing date." },
      ],
    },
    {
      id: 'acceptable-use', n: '6', title: 'Acceptable Use',
      blocks: [
        { type: 'h3', text: '6.1 Permitted Use' },
        { type: 'p', text: 'The Service is intended for use by families for the personal education of children aged 5–16. You agree to use it only for lawful purposes and in accordance with these Terms.' },
        { type: 'h3', text: '6.2 Prohibited Conduct' },
        { type: 'p', text: 'You must not use the Service to:' },
        { type: 'list', items: [
          'upload, post, or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable;',
          'impersonate any person or entity, or misrepresent your affiliation with any person or entity;',
          'attempt to gain unauthorised access to any part of the Service or any system or network connected to the Service;',
          'introduce any virus, trojan horse, worm, or other harmful code into the Service;',
          'use the Service in any way that could damage, disable, or impair it.',
        ]},
        { type: 'h3', text: '6.3 Reporting Misuse' },
        { type: 'p', text: `If you become aware of any misuse of the Service, please report it to us at ${EMAIL}.` },
      ],
    },
    {
      id: 'children', n: '7', title: "Children's Safety and Parental Responsibility",
      blocks: [
        { type: 'h3', text: '7.1 Age Requirement' },
        { type: 'p', text: 'The Service is designed for children aged 5–16. Accounts are held by Flight Directors (adults aged 18+). Children do not hold Accounts directly and do not create their own login credentials.' },
        { type: 'h3', text: '7.2 Parental Responsibility' },
        { type: 'p', text: 'As a Flight Director, you are responsible for:' },
        { type: 'list', items: [
          "monitoring your Scholar's use of the Service;",
          "ensuring the Service is used in an environment appropriate for your child's age;",
          "reviewing your child's progress and the Content they engage with.",
        ]},
        { type: 'h3', text: '7.3 Data About Children' },
        { type: 'p', text: `We handle data relating to Scholars in accordance with our Privacy Policy. We collect only the minimum information necessary to deliver the educational experience. We do not collect children's email addresses, require children to register independently, or use children's data for advertising. Please review our Privacy Policy at ${WEBSITE}/privacy-policy for full details.` },
        { type: 'h3', text: '7.4 No Direct Communication' },
        { type: 'p', text: "We do not communicate directly with Scholars. All service communications are directed to the Flight Director's email address." },
      ],
    },
    {
      id: 'ip', n: '8', title: 'Intellectual Property',
      blocks: [
        { type: 'h3', text: '8.1 Our Intellectual Property' },
        { type: 'p', text: `The Service and all Content, including curriculum materials, questions, assessments, learning pathways, software, graphics, logos, and the ${PLATFORM} name and brand, are owned by or licensed to us and are protected by Intellectual Property Rights.` },
        { type: 'p', text: 'These Terms do not grant you any rights in our Intellectual Property other than the limited Licence set out in clause 4.' },
        { type: 'h3', text: '8.2 Feedback' },
        { type: 'p', text: 'If you provide us with suggestions, feedback, or ideas about the Service, you grant us a worldwide, perpetual, royalty-free licence to use that Feedback for any purpose, including improving the Service. You waive any moral rights in the Feedback to the extent permitted by law.' },
        { type: 'h3', text: '8.3 Third-Party Content' },
        { type: 'p', text: 'The Service may include content from third-party curriculum bodies (including the UK Department for Education, NERDC, and others). Such content is used under licence or in accordance with applicable law. All third-party trade marks remain the property of their respective owners.' },
      ],
    },
    {
      id: 'rewards', n: '9', title: 'Virtual Rewards and In-Platform Currency',
      blocks: [
        { type: 'h3', text: '9.1 Stardust and Badges' },
        { type: 'p', text: 'Scholars may earn Stardust, badges, and other in-platform rewards by completing missions and activities. These rewards:' },
        { type: 'list', items: [
          'have no monetary value and cannot be exchanged for cash or any real-world goods or services;',
          'are not transferable between Accounts;',
          'may be adjusted, removed, or replaced if we change the reward system, with reasonable notice where practical;',
          'are forfeited upon Account termination.',
        ]},
        { type: 'h3', text: '9.2 No In-App Purchases' },
        { type: 'p', text: 'We do not offer the purchase of in-platform currency or items. All rewards are earned through educational activity only.' },
      ],
    },
    {
      id: 'availability', n: '10', title: 'Service Availability and Changes',
      blocks: [
        { type: 'h3', text: '10.1 Availability' },
        { type: 'p', text: 'We aim to keep the Service available at all times, but we do not guarantee uninterrupted or error-free access. The Service may be temporarily unavailable due to maintenance, technical issues, or circumstances beyond our control.' },
        { type: 'h3', text: '10.2 Changes to the Service' },
        { type: 'p', text: 'We may update, modify, or discontinue any feature of the Service at any time. We will give reasonable notice of significant changes where practical. If a change materially reduces the functionality you subscribed for, you may cancel and request a pro-rata refund.' },
        { type: 'h3', text: '10.3 Curriculum Updates' },
        { type: 'p', text: 'We update curriculum content periodically to reflect changes in national curriculum standards. Content should not be used as the sole resource for formal examination preparation.' },
      ],
    },
    {
      id: 'liability', n: '11', title: 'Limitation of Liability',
      blocks: [
        { type: 'h3', text: '11.1 What We Are Responsible For' },
        { type: 'p', text: 'We do not exclude or limit our liability to you where it would be unlawful to do so. This includes liability for death or personal injury caused by our negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded under applicable law.' },
        { type: 'h3', text: '11.2 What We Are Not Responsible For' },
        { type: 'p', text: 'Subject to clause 11.1, we are not liable for:' },
        { type: 'list', items: [
          'any indirect, consequential, or special loss;',
          'loss of profits, revenue, business, or data;',
          'any loss arising from your reliance on Content for formal academic purposes;',
          'any loss arising from third-party services, including AI generation providers or payment processors;',
          'any loss caused by events outside our reasonable control.',
        ]},
        { type: 'h3', text: '11.3 Cap on Liability' },
        { type: 'p', text: 'Subject to clause 11.1, our total liability shall not exceed the greater of: (a) the total Subscription fees paid by you in the 12 months preceding the event giving rise to the claim; or (b) £100.' },
        { type: 'h3', text: '11.4 Consumer Rights' },
        { type: 'p', text: 'If you are a consumer, nothing in these Terms affects your statutory rights under UK consumer protection legislation, including the Consumer Rights Act 2015.' },
      ],
    },
    {
      id: 'termination', n: '12', title: 'Termination',
      blocks: [
        { type: 'h3', text: '12.1 Termination by You' },
        { type: 'p', text: `You may terminate your Account at any time by contacting us at ${EMAIL} or through your Account settings. Clause 5.4 applies to any refund entitlement.` },
        { type: 'h3', text: '12.2 Termination by Us' },
        { type: 'p', text: 'We may suspend or terminate your Account immediately if:' },
        { type: 'list', items: [
          'you materially breach these Terms and, where the breach is capable of remedy, fail to remedy it within 14 days of written notice;',
          'you use the Service in a way that is fraudulent, abusive, or harmful to us, other users, or third parties;',
          'we are required to do so by law or a regulatory authority.',
        ]},
        { type: 'p', text: 'If we terminate your Account for reasons other than your breach, we will refund any prepaid fees on a pro-rata basis.' },
        { type: 'h3', text: '12.3 Effect of Termination' },
        { type: 'list', items: [
          'all licences granted under these Terms cease immediately;',
          'you must stop using the Service;',
          'we will handle your personal data in accordance with our Privacy Policy;',
          'any outstanding payment obligations survive termination.',
        ]},
        { type: 'p', text: 'Clauses 8, 11, 13, and 15 survive termination.' },
      ],
    },
    {
      id: 'privacy', n: '13', title: 'Privacy and Data Protection',
      blocks: [
        { type: 'p', text: `We process personal data in accordance with our Privacy Policy, available at ${WEBSITE}/privacy-policy.` },
        { type: 'p', text: 'We are committed to complying with UK GDPR and the Data Protection Act 2018. As Flight Director, you are responsible for ensuring that any personal information you provide about Scholars is accurate and that you have the necessary authority to provide it.' },
        { type: 'p', text: `For data subject access requests, corrections, or deletion requests, please contact us at ${EMAIL}.` },
      ],
    },
    {
      id: 'disputes', n: '14', title: 'Disputes and Complaints',
      blocks: [
        { type: 'h3', text: '14.1 Contact Us First' },
        { type: 'p', text: `If you have a complaint or dispute, please contact us first at ${EMAIL}. We will acknowledge your complaint within 5 business days and aim to resolve it within 28 days.` },
        { type: 'h3', text: '14.2 Alternative Dispute Resolution' },
        { type: 'p', text: 'If we cannot resolve your complaint directly, you may be entitled to use an Alternative Dispute Resolution (ADR) scheme. We will provide information about available ADR options if we cannot resolve a complaint within 8 weeks.' },
      ],
    },
    {
      id: 'governing-law', n: '15', title: 'Governing Law and Jurisdiction',
      blocks: [
        { type: 'p', text: 'These Terms shall be governed by and construed in accordance with the laws of England and Wales.' },
        { type: 'p', text: 'The courts of England and Wales shall have exclusive jurisdiction to settle any dispute arising out of or in connection with these Terms, except that consumers resident in Scotland, Northern Ireland, or another jurisdiction retain the right to bring proceedings in their local courts.' },
      ],
    },
    {
      id: 'general', n: '16', title: 'General',
      blocks: [
        { type: 'h3', text: '16.1 Entire Agreement' },
        { type: 'p', text: 'These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and us and supersede all prior agreements, representations, and understandings.' },
        { type: 'h3', text: '16.2 Severability' },
        { type: 'p', text: 'If any provision of these Terms is found to be unenforceable or invalid, it shall be modified to the minimum extent necessary to make it enforceable. If modification is not possible, it shall be removed, and the remaining Terms shall continue in full force.' },
        { type: 'h3', text: '16.3 Waiver' },
        { type: 'p', text: 'Our failure to enforce any provision of these Terms on any occasion shall not constitute a waiver of that provision.' },
        { type: 'h3', text: '16.4 Assignment' },
        { type: 'p', text: 'You may not assign or transfer any rights under these Terms without our prior written consent. We may assign these Terms in connection with a business transfer, provided this does not materially affect your rights.' },
        { type: 'h3', text: '16.5 Third Party Rights' },
        { type: 'p', text: 'These Terms do not create any rights in favour of any third party under the Contracts (Rights of Third Parties) Act 1999.' },
        { type: 'h3', text: '16.6 Force Majeure' },
        { type: 'p', text: 'We shall not be liable for any failure or delay in performing our obligations where such failure or delay results from events beyond our reasonable control.' },
        { type: 'h3', text: '16.7 Contact' },
        { type: 'p', text: COMPANY },
        { type: 'p', text: `Email: ${EMAIL}` },
        { type: 'p', text: `Website: ${WEBSITE}` },
      ],
    },
  ];

  return (
    <main className="min-h-screen" style={{ background: '#f0f2ff' }}>

      {/* ── Header ── */}
      <div
        className="py-16 px-6 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {[200, 350, 500, 650].map((size, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white"
              style={{ width: size, height: size, top: '50%', right: '-5%', transform: 'translateY(-50%)' }}
            />
          ))}
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <a href="/" className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-white text-sm mb-8 transition-colors">
            &larr; Back to {PLATFORM}
          </a>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📋</span>
            <span
              className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#a5b4fc' }}
            >
              Legal
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-indigo-300 text-sm">
            Effective: {UPDATED} &middot; Last updated: {UPDATED}
          </p>
          <p className="text-indigo-200/70 text-sm mt-3 max-w-xl">
            These terms govern your access to and use of the {PLATFORM} educational platform, operated by {COMPANY}.
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="grid lg:grid-cols-[220px_1fr] gap-10 items-start">

          {/* Sticky TOC */}
          <nav className="hidden lg:block sticky top-8 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Contents</p>
            <ul className="space-y-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-baseline gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors py-1"
                  >
                    <span className="font-mono text-slate-300 flex-shrink-0 w-5">{s.n}.</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Questions?</p>
              <a href={`mailto:${EMAIL}`} className="text-xs font-semibold text-indigo-600 hover:underline break-all">
                {EMAIL}
              </a>
            </div>
          </nav>

          {/* Content */}
          <div className="space-y-5">

            {/* Intro callout */}
            <div
              className="rounded-2xl border p-6"
              style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', borderColor: '#c7d2fe' }}
            >
              <p className="text-slate-700 text-sm leading-relaxed">
                Please read these Terms carefully before using {PLATFORM}. By creating an account, you agree to be bound
                by these Terms. If you are registering on behalf of your child, these Terms apply to both your use and
                your child&#39;s use of the Service.
              </p>
              <p className="text-slate-500 text-xs mt-3">
                Questions? Contact us at{' '}
                <a href={`mailto:${EMAIL}`} className="text-indigo-600 hover:underline">{EMAIL}</a>
              </p>
            </div>

            {/* Section cards */}
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 p-7 scroll-mt-24"
              >
                <div className="flex items-start gap-4 mb-5">
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    {section.n}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 pt-1">{section.title}</h2>
                </div>
                <div className="pl-12">
                  <Block blocks={section.blocks} />
                </div>
              </section>
            ))}

            {/* Bottom nav */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">
                These Terms were last updated on <strong className="text-slate-700">{UPDATED}</strong>.
                Previous versions are available on request.
              </p>
              <div className="flex justify-center gap-6 mt-4 text-sm flex-wrap">
                <a href="/privacy-policy" className="text-indigo-600 hover:underline">Privacy Policy</a>
                <a href="/cookie-policy" className="text-indigo-600 hover:underline">Cookie Policy</a>
                <a href={`mailto:${EMAIL}`} className="text-indigo-600 hover:underline">Contact Us</a>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-slate-200 bg-white/50 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-400">
          &copy; 2026 {COMPANY}. All rights reserved.
        </div>
      </div>

    </main>
  );
}