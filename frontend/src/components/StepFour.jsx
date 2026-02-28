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

// Summary data — in a real app these would come from props/context/store
const summary = {
  upload: {
    fileName: "product_demo_v2.mp4",
    duration: "02:45",
    fileSize: "42.5 MB",
  },
  language: {
    targetLanguage: "Spanish",
    dialect: "Latin American",
    originalLanguage: "English (Auto-detected)",
  },
  audio: {
    voiceSelection: "Male Premium (AI)",
    enabledFeatures: ["VOICE CLONING", "LIP SYNCING"],
  },
};

function SectionIcon({ children }) {
  return (
    <div style={styles.sectionIcon}>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

export default function NewDubStep4() {
  const navigate = useNavigate();
  return (
    <div style={styles.app}>
      <Header />

      <main style={styles.main}>
        {/* Title */}
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>New Dub</h1>
          <p style={styles.subtitle}>Translate and dub your video content effortlessly.</p>
        </div>

        {/* Progress — all completed except Confirm which is active */}
        <StepProgress activeStep={4} />

        {/* Step 4 card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.stepLabel}>Step 4: Review & Confirm</span>
              <div style={styles.progressBar}>
                <div style={styles.progressFill} />
              </div>
            </div>
            <span style={styles.nextHint}>Final Step</span>
          </div>

          {/* Summary grid */}
          <div style={styles.summaryGrid}>

            {/* Upload Details */}
            <div style={styles.summaryCol}>
              <div style={styles.colHeader}>
                <SectionIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </SectionIcon>
                <span style={styles.colTitle}>UPLOAD DETAILS</span>
              </div>
              <div style={styles.detailList}>
                <DetailRow label="File Name" value={summary.upload.fileName} />
                <DetailRow label="Duration" value={summary.upload.duration} />
                <DetailRow label="File Size" value={summary.upload.fileSize} />
              </div>
            </div>

            {/* Divider */}
            <div style={styles.verticalDivider} />

            {/* Language Settings */}
            <div style={styles.summaryCol}>
              <div style={styles.colHeader}>
                <SectionIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#00e5a0" strokeWidth="2"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="#00e5a0" strokeWidth="2"/>
                  </svg>
                </SectionIcon>
                <span style={styles.colTitle}>LANGUAGE SETTINGS</span>
              </div>
              <div style={styles.detailList}>
                <DetailRow label="Target Language" value={summary.language.targetLanguage} />
                <DetailRow label="Dialect" value={summary.language.dialect} />
                <DetailRow label="Original Language" value={summary.language.originalLanguage} />
              </div>
            </div>

            {/* Divider */}
            <div style={styles.verticalDivider} />

            {/* Audio Preferences */}
            <div style={styles.summaryCol}>
              <div style={styles.colHeader}>
                <SectionIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="#00e5a0" strokeWidth="2"/>
                    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </SectionIcon>
                <span style={styles.colTitle}>AUDIO PREFERENCES</span>
              </div>
              <div style={styles.detailList}>
                <DetailRow label="Voice Selection" value={summary.audio.voiceSelection} />
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Enabled Features</span>
                  <div style={styles.featureTags}>
                    {summary.audio.enabledFeatures.map(f => (
                      <span key={f} style={styles.featureTag}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Nav */}
          <div style={styles.navRow}>
            <button style={styles.backBtn} onClick={() => navigate('/new-dub/step-3')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <button style={styles.startBtn} onClick={() => navigate('/preview')}>
              Start Dubbing
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
          <span style={styles.footerText}>© 2024 PolyGlot Dubs AI</span>
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
    width: "100%",
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
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto 1fr",
    gap: 0,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: "22px 20px",
    marginBottom: 28,
  },
  summaryCol: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "0 16px",
  },
  verticalDivider: {
    width: 1,
    background: "rgba(255,255,255,0.07)",
    margin: "0 4px",
  },
  colHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    background: "rgba(0,229,160,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  colTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: "#00e5a0",
  },
  detailList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  detailRow: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  detailLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 500,
    color: "#fff",
  },
  featureTags: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  featureTag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: "#00e5a0",
    background: "rgba(0,229,160,0.12)",
    border: "1px solid rgba(0,229,160,0.25)",
    borderRadius: 20,
    padding: "3px 9px",
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
  startBtn: {
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 8,
    padding: "12px 36px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "-0.2px",
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