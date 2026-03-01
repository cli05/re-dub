import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import StepProgress from "./StepProgress";

const tips = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="#00e5a0" strokeWidth="2"/>
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Clear Audio",
    desc: "Ensure background noise is minimal for better AI transcription.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#00e5a0" strokeWidth="2"/>
        <polyline points="12 6 12 12 16 14" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Processing Time",
    desc: "Large videos might take a few minutes to process and sync.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="#00e5a0" strokeWidth="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Privacy First",
    desc: "Your content is encrypted and only accessible by you.",
  },
];

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        ...styles.toggle,
        background: enabled ? "#00e5a0" : "rgba(255,255,255,0.12)",
        boxShadow: enabled ? "0 0 12px rgba(0,229,160,0.35)" : "none",
      }}
      aria-checked={enabled}
      role="switch"
    >
      <span
        style={{
          ...styles.toggleKnob,
          transform: enabled ? "translateX(22px)" : "translateX(2px)",
          background: enabled ? "#0a1a18" : "rgba(255,255,255,0.6)",
        }}
      />
    </button>
  );
}

export default function NewDubStep3() {
  const navigate = useNavigate();
  const [voiceCloning, setVoiceCloning] = useState(true);
  const [lipSyncing, setLipSyncing] = useState(true);
  const [burnSubtitles, setBurnSubtitles] = useState(false);
  const [tone, setTone] = useState("Neutral");

  const toggleRows = [
    {
      title: "Voice Cloning",
      desc: "AI clones the original speaker's voice.",
      value: voiceCloning,
      onToggle: () => setVoiceCloning(v => !v),
    },
    {
      title: "Lip Syncing",
      desc: "Synchronize lip movements with the new audio.",
      value: lipSyncing,
      onToggle: () => setLipSyncing(v => !v),
    },
    {
      title: "Burn-in Subtitles",
      desc: "Permanently embed subtitles into the video.",
      value: burnSubtitles,
      onToggle: () => setBurnSubtitles(v => !v),
    },
  ];

  return (
    <div style={styles.app}>
      <Header hideSearch />

      <main style={styles.main}>
        {/* Title */}
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>New Dub</h1>
          <p style={styles.subtitle}>Translate and dub your video content effortlessly.</p>
        </div>

        {/* Progress — Upload & Language completed, Preferences active */}
        <StepProgress activeStep={3} />

        {/* Step 3 card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.stepLabel}>Step 3: Dubbing Preferences</span>
              <div style={styles.progressBar}>
                <div style={styles.progressFill} />
              </div>
            </div>
            <span style={styles.nextHint}>Next Step: Confirmation</span>
          </div>

          {/* Toggle rows */}
          <div style={styles.toggleList}>
            {toggleRows.map((row, i) => (
              <div key={i} style={styles.toggleRow}>
                <div style={styles.toggleText}>
                  <span style={styles.toggleTitle}>{row.title}</span>
                  <span style={styles.toggleDesc}>{row.desc}</span>
                </div>
                <Toggle enabled={row.value} onToggle={row.onToggle} />
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          {/* Translation Tone */}
          <div style={styles.toneSection}>
            <p style={styles.toneTitle}>Translation Tone</p>
            <p style={styles.toneSubtitle}>Select the localization style.</p>
            <div style={styles.toneRow}>
              {["Formal", "Neutral", "Casual"].map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  style={{
                    ...styles.toneChip,
                    ...(tone === t ? styles.toneChipActive : {}),
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div style={styles.navRow}>
            <button style={styles.backBtn} onClick={() => navigate('/new-dub/step-2')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <button style={styles.continueBtn} onClick={() => navigate('/new-dub/step-4')}>
              Continue to Confirmation
            </button>
          </div>
        </div>

        {/* Tips */}
        <div style={styles.tipsGrid}>
          {tips.map((tip, i) => (
            <div key={i} style={styles.tipCard}>
              <div style={styles.tipIconWrap}>{tip.icon}</div>
              <p style={styles.tipTitle}>{tip.title}</p>
              <p style={styles.tipDesc}>{tip.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={{ display: "flex", gap: 24 }}>
          {["View Docs", "Terms of Service", "Support"].map(l => (
            <a key={l} href="#" style={styles.footerLink}>{l}</a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={styles.statusDot} />
          <span style={styles.footerText}>System Operational</span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>|</span>
          <span style={styles.footerText}>© 2024 Redub</span>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#0a1a18",
    fontFamily: "'DM Sans', 'Sora', sans-serif",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
  },
  main: {
    flex: 1,
    maxWidth: 720,
    margin: "0 auto",
    width: "100%",
    padding: "32px 24px",
  },
  titleBlock: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: 5,
    marginBottom: 0,
  },
  card: {
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "24px",
    marginBottom: 18,
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: 700,
    display: "block",
    marginBottom: 8,
  },
  progressBar: {
    width: 200,
    height: 3,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    width: "75%",
    height: "100%",
    background: "linear-gradient(90deg, #00e5a0, #4fc3f7)",
    borderRadius: 4,
  },
  nextHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    whiteSpace: "nowrap",
    marginTop: 4,
  },
  toggleList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 4,
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 10,
    padding: "16px 20px",
    gap: 16,
  },
  toggleText: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
  },
  toggleDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    border: "none",
    cursor: "pointer",
    position: "relative",
    flexShrink: 0,
    transition: "background 0.22s, box-shadow 0.22s",
    padding: 0,
  },
  toggleKnob: {
    position: "absolute",
    top: 3,
    width: 20,
    height: 20,
    borderRadius: "50%",
    transition: "transform 0.22s, background 0.22s",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "20px 0",
  },
  toneSection: {
    marginBottom: 28,
  },
  toneTitle: {
    fontSize: 14,
    fontWeight: 600,
    margin: "0 0 4px",
  },
  toneSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    margin: "0 0 14px",
  },
  toneRow: {
    display: "flex",
    gap: 8,
  },
  toneChip: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: "7px 20px",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    cursor: "pointer",
    transition: "all 0.18s",
  },
  toneChipActive: {
    background: "rgba(0,229,160,0.12)",
    border: "1px solid #00e5a0",
    color: "#00e5a0",
  },
  navRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    cursor: "pointer",
    padding: "8px 4px",
  },
  continueBtn: {
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 8,
    padding: "11px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  tipsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
  tipCard: {
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: "18px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  tipIconWrap: {
    width: 36,
    height: 36,
    background: "rgba(0,229,160,0.1)",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: 600,
    margin: 0,
  },
  tipDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    margin: 0,
    lineHeight: 1.6,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 28px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "#0d2420",
  },
  footerLink: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    textDecoration: "none",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00e5a0",
    boxShadow: "0 0 6px #00e5a0",
    flexShrink: 0,
  },
  footerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
};