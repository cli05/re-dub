import { useState, useEffect, useRef } from "react";

// ── Keyframe injection ──────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.6); }
  }
  @keyframes waveform {
    0%,100% { transform: scaleY(1); }
    50%     { transform: scaleY(0.4); }
  }
  @keyframes glow-orb {
    0%,100% { transform: translate(-50%,-50%) scale(1);   opacity: 0.18; }
    50%     { transform: translate(-50%,-50%) scale(1.15); opacity: 0.26; }
  }
  @keyframes slide-badge {
    from { opacity:0; transform: translateY(-8px); }
    to   { opacity:1; transform: translateY(0); }
  }

  .hero-title   { animation: fadeUp 0.7s ease both; }
  .hero-sub     { animation: fadeUp 0.7s 0.15s ease both; }
  .hero-ctas    { animation: fadeUp 0.7s 0.28s ease both; }
  .hero-mock    { animation: fadeUp 0.9s 0.4s ease both; }
  .feat-card    { animation: fadeUp 0.6s ease both; }
  .badge-pill   { animation: slide-badge 0.5s 0.1s ease both; }

  .nav-link:hover { color: #fff !important; }
  .cta-outline:hover { background: rgba(255,255,255,0.07) !important; }
  .export-row:hover  { border-color: rgba(0,229,160,0.3) !important; background: rgba(0,229,160,0.04) !important; }
`;

// ── Waveform bars (decorative) ────────────────────────────────────────────
function Waveform({ count = 48, height = 80 }) {
  const bars = Array.from({ length: count }, (_, i) => {
    const h = 20 + Math.abs(Math.sin(i * 0.6)) * 55 + Math.abs(Math.cos(i * 0.3)) * 20;
    const delay = (i * 40) % 900;
    const isTeal = i > count * 0.3 && i < count * 0.7;
    return { h, delay, isTeal };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2.5, height }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${b.h}%`,
            borderRadius: 2,
            background: b.isTeal
              ? `rgba(0,229,160,${0.5 + Math.random() * 0.4})`
              : `rgba(255,255,255,${0.08 + Math.random() * 0.12})`,
            animation: `waveform ${1.2 + Math.random()}s ${b.delay}ms ease-in-out infinite`,
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={s.root}>
      <style>{CSS}</style>

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={s.nav}>
        {/* Logo */}
        <div style={s.navLogo}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 5h12M9 3v2m4.5 13c0 2.485-2.015 4.5-4.5 4.5S4.5 20.485 4.5 18c0-2.484 2.015-4.5 4.5-4.5s4.5 2.016 4.5 4.5z" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
            <path d="M15 5c0 4-3 7-3 7m5-7c2 3 2 7 2 7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={s.navLogoText}>PolyGlot Dubs</span>
        </div>


        {/* Auth */}
        <div style={s.navAuth}>
          <a href="#" style={s.loginBtn}>Log In</a>
          <a href="#" style={s.signupBtn}>Sign Up</a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section style={s.hero}>
        {/* Glowing orb background */}
        <div style={s.orb} />

        {/* Badge */}
        <div className="badge-pill" style={s.badge}>
          <span style={s.badgeDot} />
          NEW AI MODEL RELEASED
        </div>

        {/* Headline */}
        <h1 className="hero-title" style={s.heroTitle}>
          Welcome to{" "}
          <span style={s.heroAccent}>PolyGlot<br />Dubs</span>
        </h1>

        {/* Sub */}
        <p className="hero-sub" style={s.heroSub}>
          The future of video translation and dubbing. Reach a global audience<br />
          in seconds with our advanced AI voice synthesis technology.
        </p>

        {/* CTAs */}
        <div className="hero-ctas" style={s.heroCtas}>
          <a href="#" style={s.ctaFilled}>Get Started Now</a>
          <a href="#" className="cta-outline" style={s.ctaOutline}>View Demo</a>
        </div>

        {/* Mock screen */}
        <div className="hero-mock" style={s.mockWrap}>
          <div style={s.mockScreen}>
            {/* Fake toolbar */}
            <div style={s.mockToolbar}>
              <div style={{ display: "flex", gap: 5 }}>
                {["#ff5f57","#ffbd2e","#28ca41"].map(c => (
                  <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
                ))}
              </div>
              <div style={s.mockTabRow}>
                {["Timeline","Voiceover","Subtitles"].map((t,i) => (
                  <span key={t} style={{ ...s.mockTab, ...(i===0 ? s.mockTabActive : {}) }}>{t}</span>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {[...Array(3)].map((_,i) => (
                  <div key={i} style={{ width: 18, height: 7, borderRadius: 3, background: "rgba(255,255,255,0.12)" }} />
                ))}
              </div>
            </div>

            {/* Waveform area */}
            <div style={s.mockWaveArea}>
              {/* Track labels */}
              <div style={s.trackLabels}>
                {["ORIG","TRANS","SYNC"].map(l => (
                  <div key={l} style={s.trackLabel}>{l}</div>
                ))}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "10px 0" }}>
                <Waveform count={52} height={48} />
                <Waveform count={52} height={44} />
                <Waveform count={52} height={38} />
              </div>
              {/* Play button overlay */}
              <div style={s.mockPlayBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4l14 8-14 8V4z" fill="white"/>
                </svg>
              </div>
            </div>

            {/* Bottom timeline strip */}
            <div style={s.mockTimeline}>
              {[...Array(12)].map((_, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ height: 6, borderRadius: 3, background: i < 5 ? "rgba(0,229,160,0.5)" : "rgba(255,255,255,0.06)" }} />
                  <div style={{ height: 4, borderRadius: 2, background: i < 8 ? "rgba(79,195,247,0.35)" : "rgba(255,255,255,0.04)" }} />
                </div>
              ))}
            </div>
          </div>
          {/* Laptop base reflection */}
          <div style={s.mockBase} />
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section style={s.features}>
        <div style={s.featuresGrid}>
          {[
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M3 5h12M9 3v2m4.5 13c0 2.485-2.015 4.5-4.5 4.5S4.5 20.485 4.5 18c0-2.484 2.015-4.5 4.5-4.5s4.5 2.016 4.5 4.5z" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M15 5c0 4-3 7-3 7m5-7c2 3 2 7 2 7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              stat: "100+ Languages",
              desc: "Translate your content into any major global language with native-level fluency and context awareness.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="7" r="4" stroke="#00e5a0" strokeWidth="2"/>
                  <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 3.13a4 4 0 010 7.75" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M21 21v-2a4 4 0 00-3-3.87" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              stat: "Voice Cloning",
              desc: "Maintain your original voice brand. Our AI clones the speaker's tone, pitch, and emotion perfectly.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M1 4v6h6" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 20v-6h-6" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.49 9A9 9 0 105.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              stat: "Lip Syncing",
              desc: "Advanced visual AI adjusts lip movements to match the translated audio for a seamless viewing experience.",
            },
          ].map((feat, i) => (
            <div
              key={i}
              className="feat-card"
              style={{ ...s.featCard, animationDelay: `${i * 0.12}s` }}
            >
              <div style={s.featIcon}>{feat.icon}</div>
              <h3 style={s.featStat}>{feat.stat}</h3>
              <p style={s.featDesc}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer style={s.footer}>
        <div style={s.footerTop}>
          <a href="#" style={s.footerDocsLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2"/>
            </svg>
            View Docs
          </a>
          <div style={s.footerStatus}>
            <span style={s.statusDot} />
            System Status: All Systems Operational
          </div>
        </div>
        <div style={s.footerIcons}>
          {[
            <path key="v" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
            <><polyline key="c1" points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline key="c2" points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
            <><rect key="m" x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><polyline key="m2" points="22 7 12 13 2 7" stroke="currentColor" strokeWidth="2"/></>,
          ].map((icon, i) => (
            <button key={i} style={s.footerIconBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">{icon}</svg>
            </button>
          ))}
        </div>
        <p style={s.footerCopy}>© 2024 PolyGlot Dubs. Empowering creators to speak to the world.</p>
      </footer>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    background: "#071412",
    fontFamily: "'Sora', 'DM Sans', sans-serif",
    color: "#fff",
    overflowX: "hidden",
  },

  // Nav
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 40px",
    height: 58,
    background: "rgba(7,20,18,0.85)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    cursor: "pointer",
  },
  navLogoText: {
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.3px",
  },
  navLinks: {
    display: "flex",
    gap: 6,
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
  },
  navLink: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textDecoration: "none",
    padding: "6px 14px",
    borderRadius: 8,
    transition: "color 0.18s",
  },
  navAuth: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  loginBtn: {
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.7)",
    textDecoration: "none",
    padding: "7px 16px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    transition: "all 0.18s",
  },
  signupBtn: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0a1a18",
    textDecoration: "none",
    padding: "7px 18px",
    borderRadius: 8,
    background: "#00e5a0",
    boxShadow: "0 0 20px rgba(0,229,160,0.25)",
  },

  // Hero
  hero: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "64px 24px 0",
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    top: "10%",
    left: "50%",
    width: 700,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(ellipse, rgba(0,229,160,0.13) 0%, transparent 70%)",
    animation: "glow-orb 5s ease-in-out infinite",
    pointerEvents: "none",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.4,
    color: "#00e5a0",
    background: "rgba(0,229,160,0.1)",
    border: "1px solid rgba(0,229,160,0.25)",
    borderRadius: 20,
    padding: "5px 14px",
    marginBottom: 28,
    position: "relative",
    zIndex: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#00e5a0",
    boxShadow: "0 0 6px #00e5a0",
    animation: "pulse-dot 1.8s ease-in-out infinite",
    display: "inline-block",
  },
  heroTitle: {
    fontSize: "clamp(38px, 7vw, 64px)",
    fontWeight: 800,
    lineHeight: 1.08,
    letterSpacing: "-1.5px",
    color: "#fff",
    position: "relative",
    zIndex: 1,
    marginBottom: 22,
  },
  heroAccent: {
    color: "#00e5a0",
    display: "inline",
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.5)",
    maxWidth: 480,
    position: "relative",
    zIndex: 1,
    marginBottom: 34,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
  },
  heroCtas: {
    display: "flex",
    gap: 12,
    position: "relative",
    zIndex: 1,
    marginBottom: 60,
  },
  ctaFilled: {
    background: "#00e5a0",
    color: "#071412",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
    padding: "12px 28px",
    borderRadius: 10,
    boxShadow: "0 0 28px rgba(0,229,160,0.35)",
    letterSpacing: "-0.2px",
  },
  ctaOutline: {
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    padding: "12px 28px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    letterSpacing: "-0.2px",
    transition: "background 0.2s",
  },

  // Mock screen
  mockWrap: {
    position: "relative",
    width: "100%",
    maxWidth: 640,
    zIndex: 1,
  },
  mockScreen: {
    background: "#0d201c",
    border: "1px solid rgba(255,255,255,0.1)",
    borderBottom: "none",
    borderRadius: "14px 14px 0 0",
    overflow: "hidden",
    boxShadow: "0 -20px 80px rgba(0,229,160,0.08), 0 40px 80px rgba(0,0,0,0.6)",
  },
  mockToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "#081512",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  mockTabRow: {
    display: "flex",
    gap: 2,
  },
  mockTab: {
    fontSize: 10,
    padding: "4px 10px",
    borderRadius: 5,
    color: "rgba(255,255,255,0.35)",
    cursor: "pointer",
  },
  mockTabActive: {
    background: "rgba(0,229,160,0.1)",
    color: "#00e5a0",
    fontWeight: 600,
  },
  mockWaveArea: {
    display: "flex",
    alignItems: "center",
    padding: "14px 16px",
    gap: 12,
    position: "relative",
    minHeight: 160,
  },
  trackLabels: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    justifyContent: "center",
  },
  trackLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1,
    color: "rgba(0,229,160,0.5)",
    minWidth: 32,
    textAlign: "right",
  },
  mockPlayBtn: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#00e5a0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 30px rgba(0,229,160,0.5)",
    cursor: "pointer",
    flexShrink: 0,
  },
  mockTimeline: {
    display: "flex",
    gap: 4,
    padding: "8px 14px 14px",
    background: "rgba(0,0,0,0.2)",
  },
  mockBase: {
    height: 18,
    background: "linear-gradient(180deg, #0d201c 0%, #071412 100%)",
    borderRadius: "0 0 6px 6px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderTop: "none",
  },

  // Features
  features: {
    padding: "72px 40px 80px",
    background: "linear-gradient(180deg, #071412 0%, #0a1e19 100%)",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 32,
    maxWidth: 860,
    margin: "0 auto",
  },
  featCard: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  featIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    background: "rgba(0,229,160,0.08)",
    border: "1px solid rgba(0,229,160,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  featStat: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.4px",
  },
  featDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 1.7,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
  },

  // Footer
  footer: {
    background: "#051210",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "28px 40px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  footerTop: {
    display: "flex",
    alignItems: "center",
    gap: 32,
    width: "100%",
    justifyContent: "center",
  },
  footerDocsLink: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    textDecoration: "none",
    fontWeight: 500,
  },
  footerStatus: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#00e5a0",
    boxShadow: "0 0 6px #00e5a0",
    flexShrink: 0,
    animation: "pulse-dot 2.5s ease-in-out infinite",
    display: "inline-block",
  },
  footerIcons: {
    display: "flex",
    gap: 6,
  },
  footerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  footerCopy: {
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: 0.2,
    fontFamily: "'DM Sans', sans-serif",
  },
};