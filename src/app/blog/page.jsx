import Link from "next/link";
import Image from "next/image";
import DarkModeToggle from "@/components/theme/DarkModeToggle";
import BlogHeroVisual from "@/components/blog/BlogHeroVisual";

export const metadata = {
  title: "Blog — LaunchPard",
  description: "Practical advice for parents who care about how their children learn.",
};

// Pseudo-random star generator
function generateStars(count = 25) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = ((i * 137.508) % 100);
    const y = ((i * 73.519) % 100);
    const size = Math.sin(i * 0.5) * 1 + 1;
    const opacity = Math.sin(i * 0.3) * 0.4 + 0.4;
    stars.push(
      <div
        key={i}
        className="absolute rounded-full bg-white/60"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: `${size}px`,
          height: `${size}px`,
          opacity,
        }}
      />
    );
  }
  return stars;
}

// Featured post
const featuredPost = {
  slug: "personalised-learning-paths",
  title: "Why Personalised Learning Paths Actually Work",
  category: "Learning Science",
  date: "March 2026",
  readTime: "5 min read",
  excerpt: "Every child learns differently. Here is the science behind adaptive learning and why one-size-fits-all education holds your child back.",
};

// Blog posts data
const blogPosts = [
  {
    slug: "child-falling-behind",
    title: "How to Know If Your Child Is Falling Behind (And What to Do About It)",
    category: "Parenting",
    date: "March 2026",
    readTime: "4 min read",
    excerpt: "The early warning signs that your child might be struggling academically, and practical steps you can take at home before it gets worse.",
  },
  {
    slug: "11-plus-preparation",
    title: "11+ Preparation: A No-Panic Guide for Parents",
    category: "Exam Prep",
    date: "February 2026",
    readTime: "7 min read",
    excerpt: "What the 11+ actually tests, when to start preparing, and how to keep your child confident through the process.",
  },
  {
    slug: "screen-time-that-counts",
    title: "Screen Time That Actually Counts: When Digital Learning Works",
    category: "Digital Parenting",
    date: "January 2026",
    readTime: "3 min read",
    excerpt: "Not all screen time is equal. Some of it builds skills. Here is how to tell the difference.",
  },
  {
    slug: "waec-vs-gcse",
    title: "WAEC vs GCSE: Understanding Your Child's Exam Path",
    category: "Curricula",
    date: "December 2025",
    readTime: "6 min read",
    excerpt: "If your family spans Nigeria and the UK, this is what you need to know about each exam system and how they compare.",
  },
  {
    slug: "homework-battle-is-over",
    title: "The Homework Battle Is Over: Why Gamified Learning Changes Everything",
    category: "Engagement",
    date: "November 2025",
    readTime: "4 min read",
    excerpt: "What happens when homework stops feeling like homework? Children ask to do more. Here is what is behind it.",
  },
];

const categoryColors = {
  "Learning Science": "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/30",
  Parenting: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30",
  "Exam Prep": "bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-500/30",
  "Digital Parenting": "bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-500/30",
  Curricula: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30",
  Engagement: "bg-pink-100 dark:bg-pink-500/20 text-pink-900 dark:text-pink-300 border-pink-300 dark:border-pink-500/30",
};

export default function BlogPage() {
  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#080c15] font-sans overflow-hidden">
      {/* Star background - dark mode only */}
      <div className="fixed inset-0 pointer-events-none hidden dark:block">
        {generateStars(25)}
      </div>

      {/* ═══ NAV — matches landing page ═══ */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo.svg" alt="LaunchPard" width={34} height={34} style={{ objectFit: "contain" }} />
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">LaunchPard</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Home</Link>
            <Link href="/blog" className="text-indigo-600 dark:text-indigo-400">Blog</Link>
            <Link href="/subscribe" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <DarkModeToggle />
            <Link href="/login" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap">Sign In</Link>
            <Link href="/signup" className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 transition-all whitespace-nowrap rounded-full px-4 py-2 text-sm sm:px-5 sm:py-2.5">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
            The LaunchPard Blog
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Practical advice for parents who care about how their children learn.
          </p>
        </div>
      </section>

      {/* ═══ FEATURED POST ═══ */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <Link href={`/blog/${featuredPost.slug}`}>
            <div className="group cursor-pointer bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[20px] overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-300">
              {/* Featured Post Header */}
              <div className="relative border-b border-slate-200 dark:border-white/5 overflow-hidden">
                <BlogHeroVisual slug={featuredPost.slug} size="lg" />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 dark:bg-slate-900/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm">Featured</span>
                </div>
              </div>

              {/* Featured Post Content */}
              <div className="p-8 sm:p-10">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[featuredPost.category]}`}>
                    {featuredPost.category}
                  </span>
                  <span className="text-slate-500 dark:text-slate-500 text-sm">{featuredPost.date}</span>
                  <span className="text-slate-500 dark:text-slate-500 text-sm">{featuredPost.readTime}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ═══ BLOG GRID ═══ */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blogPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <div className="group cursor-pointer h-full bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[20px] overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-300 flex flex-col">
                  <BlogHeroVisual slug={post.slug} size="sm" />
                  <div className="p-6 flex flex-col flex-grow">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        categoryColors[post.category] || categoryColors["Parenting"]
                      }`}
                    >
                      {post.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 flex-grow">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-500 text-xs">
                    <span>{post.date}</span>
                    <span>{post.readTime}</span>
                  </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NEWSLETTER CTA ═══ */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-100 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[20px] p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
              Get Weekly Learning Tips
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Straight to your inbox. No spam, just practical advice for your child's education.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-colors"
              />
              <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER — matches landing page ═══ */}
      <footer className="relative z-10 border-t border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 backdrop-blur">
        <div className="border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800/40 px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-5 text-center">Legal &amp; Resources</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
              {[
                { icon: "📋", title: "Terms & Conditions", desc: "Your rights and obligations", href: "/terms" },
                { icon: "🔒", title: "Privacy Policy", desc: "How we protect your data", href: "/privacy-policy" },
                { icon: "🍪", title: "Cookie Policy", desc: "What cookies we use", href: "/cookie-policy" },
                { icon: "🛡️", title: "Safeguarding Policy", desc: "How we protect children", href: "/safeguarding" },
                { icon: "📝", title: "Blog", desc: "Learning insights & tips", href: "/blog" },
              ].map((d, i) => (
                <Link key={i} href={d.href} className="group flex items-start gap-3 bg-white dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800/60 border border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 rounded-xl p-4 transition-all hover:shadow-sm backdrop-blur-xl">
                  <span className="text-xl flex-shrink-0 mt-0.5">{d.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight mb-1">{d.title}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{d.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-700 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="LaunchPard" width={24} height={24} style={{ objectFit: "contain" }} />
              <span className="font-bold text-slate-900 dark:text-slate-100">LaunchPard</span>
            </div>
            <p className="text-xs text-center">© 2026 LaunchPard Technologies. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</Link>
              <Link href="/cookie-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Cookies</Link>
              <Link href="/blog" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Blog</Link>
              <a href="mailto:hello@launchpard.com" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "The LaunchPard Blog",
            description: "Practical advice for parents who care about how their children learn.",
            url: "https://launchpard.com/blog",
            blogPost: [
              {
                "@type": "BlogPosting",
                headline: featuredPost.title,
                description: featuredPost.excerpt,
                datePublished: "2026-03-01",
                author: { "@type": "Organization", name: "LaunchPard" },
              },
              ...blogPosts.map((p) => ({
                "@type": "BlogPosting",
                headline: p.title,
                description: p.excerpt,
                author: { "@type": "Organization", name: "LaunchPard" },
              })),
            ],
          }),
        }}
      />
    </div>
  );
}
