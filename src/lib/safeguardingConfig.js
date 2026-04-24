/**
 * safeguardingConfig.js
 * Age-adaptive safeguarding responses and configuration.
 *
 * Imported by: src/app/api/tara/route.js
 */

export const SAFEGUARDING_RESPONSES = {
  crisis: {
    ks1: "Tara: I can see something important is on your mind. Please tell a grown-up you trust — a parent, teacher, or carer — right now. 💛",
    ks2: "Tara: It sounds like something serious is happening. Please speak to a trusted adult — your parent, teacher, or school counsellor. You don't have to deal with this alone. In the UK you can call Childline free on 0800 1111. 💛",
    ks3: "Tara: I'm concerned about what you've shared. Please talk to someone you trust — a parent, teacher, or counsellor. UK: Childline 0800 1111 (free, 24/7). Nigeria: SURPIN helpline 0800-567-567. You matter. 💛",
    ks4: "Tara: What you've written suggests you might be going through something difficult. Please reach out to someone — a trusted adult, counsellor, or a helpline. UK: Childline 0800 1111. Nigeria: SURPIN 0800-567-567. The Mix (UK under-25s): 0808 808 4994. You don't have to face this alone.",
  },
  off_topic_concerning: {
    ks1: "Tara: Let's focus on our learning today! 🌟 If something's worrying you, please talk to a grown-up.",
    ks2: "Tara: That's not something I can help with, Commander. Let's get back to our mission! If something's on your mind, talk to a trusted adult.",
    ks3: "Tara: That's outside what I can discuss. Let's get back to your studies. If something's bothering you, speak to a trusted adult.",
    ks4: "Tara: That's not something I can help with here. Let's focus on your work. If you need support, speak to a counsellor or trusted adult.",
  },
  off_topic_redirect: {
    ks1: "Tara: Ooh, interesting! Let's finish our adventure first! 🌟",
    ks2: "Tara: Great curiosity, Commander! Let's complete this mission first, then we can explore that. 🚀",
    ks3: "Tara: Interesting question — but let's stay on topic for now.",
    ks4: "Tara: Let's keep focus. Get back to the question.",
  },
  session_limit: {
    ks1: "Tara: Amazing work today, ${name}! Time for a break — come back soon! 🌟",
    ks2: "Tara: Great session, Commander ${name}! Let's rest the engines and come back fresh. 🚀",
    ks3: "Tara: Good work this session. Take a break and consolidate what you've learnt.",
    ks4: "Tara: Session complete. Review your notes, then return for the next round.",
  },
};

export const SAFEGUARDING_LOG_ENABLED = true; // flip to false to disable logging
