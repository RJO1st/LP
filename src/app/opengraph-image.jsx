import { ImageResponse } from 'next/og';

export const alt = 'LaunchPard — AI-Powered Learning for Every Scholar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #080c15 0%, #0d1829 55%, #06101f 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Star field background dots */}
        {[
          [80, 60], [200, 120], [350, 40], [500, 90], [650, 55], [800, 110],
          [950, 70], [1100, 45], [140, 200], [420, 180], [720, 190], [1050, 210],
          [60, 350], [300, 390], [580, 340], [880, 370], [1120, 310],
          [180, 480], [450, 520], [750, 490], [1000, 510],
        ].map(([x, y], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              borderRadius: '50%',
              background: i % 5 === 0 ? '#6366f1' : '#ffffff',
              opacity: 0.3 + (i % 4) * 0.15,
            }}
          />
        ))}

        {/* Glow orb top-right */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          }}
        />

        {/* Glow orb bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
          }}
        />

        {/* Logo / wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          {/* Rocket icon */}
          <div
            style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
            }}
          >
            🚀
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-1px',
            }}
          >
            LaunchPard
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: 900,
            marginBottom: 20,
          }}
        >
          AI-Powered Learning
          <br />
          <span style={{ color: '#6366f1' }}>for Every Scholar</span>
        </div>

        {/* Sub-headline */}
        <div
          style={{
            fontSize: 24,
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.5,
            marginBottom: 40,
          }}
        >
          Adaptive Maths, English &amp; Science for ages 5–17.
          UK &amp; Nigerian curricula. Start free today.
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { emoji: '🎯', label: 'Adaptive AI' },
            { emoji: '📚', label: 'KS1–KS4' },
            { emoji: '🇳🇬', label: 'WAEC Ready' },
            { emoji: '🏆', label: 'Gamified' },
          ].map(({ emoji, label }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 50,
                color: '#e2e8f0',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Bottom URL badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 40,
            color: '#475569',
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          launchpard.com
        </div>
      </div>
    ),
    { ...size }
  );
}
