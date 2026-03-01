import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import StepProgress from "./StepProgress";

const LANGUAGES = [
  { code: "es", name: "Spanish", flag: "🇪🇸", dialects: ["Latin American", "Castilian (Spain)", "Neutral"] },
  { code: "zh", name: "Mandarin", flag: "🇨🇳", dialects: ["Simplified", "Traditional"] },
  { code: "hi", name: "Hindi", flag: "🇮🇳", dialects: [] },
  { code: "fr", name: "French", flag: "🇫🇷", dialects: ["France", "Canadian", "Belgian"] },
  { code: "ar", name: "Arabic", flag: "🇸🇦", dialects: ["Modern Standard", "Egyptian", "Gulf"] },
  { code: "pt", name: "Portuguese", flag: "🇧🇷", dialects: ["Brazilian", "European"] },
  { code: "de", name: "German", flag: "🇩🇪", dialects: [] },
  { code: "ja", name: "Japanese", flag: "🇯🇵", dialects: [] },
  { code: "ko", name: "Korean", flag: "🇰🇷", dialects: [] },
  { code: "it", name: "Italian", flag: "🇮🇹", dialects: [] },
  { code: "ru", name: "Russian", flag: "🇷🇺", dialects: [] },
  { code: "tr", name: "Turkish", flag: "🇹🇷", dialects: [] },
];

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

export default function NewDubStep2() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("es");
  const [dialect, setDialect] = useState("Latin American");
  const navigate = useNavigate();

  const selectedLang = LANGUAGES.find(l => l.code === selected);
  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(code) {
    setSelected(code);
    const lang = LANGUAGES.find(l => l.code === code);
    if (lang?.dialects?.length) {
      setDialect(lang.dialects[0]);
    } else {
      setDialect(null);
    }
  }

  return (
    <div style={styles.app}>
      <Header hideSearch />

      <main style={styles.main}>
        {/* Title */}
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>New Dub</h1>
          <p style={styles.subtitle}>Translate and dub your video content effortlessly.</p>
        </div>

        {/* Step progress — Upload completed, Language active */}
        <StepProgress activeStep={2} />

        {/* Step 2 card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.stepLabel}>Step 2: Language Selection</span>
              <div style={styles.progressBar}>
                <div style={styles.progressFill} />
              </div>
            </div>
            <span style={styles.nextHint}>Next Step: Voice Selection</span>
          </div>

          {/* Search */}
          <div style={styles.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for a language (e.g. Japanese, German...)"
              style={styles.searchInput}
            />
          </div>

          {/* Language grid */}
          <div style={styles.langGrid}>
            {filtered.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                style={{
                  ...styles.langCard,
                  ...(selected === lang.code ? styles.langCardActive : {}),
                }}
              >
                <span style={styles.flag}>{lang.flag}</span>
                <span style={styles.langName}>{lang.name}</span>
              </button>
            ))}
          </div>

          {/* Dialect selector */}
          {selectedLang?.dialects?.length > 0 && (
            <div style={styles.dialectSection}>
              <p style={styles.dialectLabel}>SELECT DIALECT FOR {selectedLang.name.toUpperCase()}</p>
              <div style={styles.dialectRow}>
                {selectedLang.dialects.map(d => (
                  <button
                    key={d}
                    onClick={() => setDialect(d)}
                    style={{
                      ...styles.dialectChip,
                      ...(dialect === d ? styles.dialectChipActive : {}),
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div style={styles.navRow}>
            <button style={styles.backBtn} onClick={() => navigate('/new-dub')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <button style={styles.continueBtn} onClick={() => navigate('/new-dub/step-3')}>
              Continue to Voice Selection
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
    marginBottom: 20,
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
    width: "50%",
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
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "11px 16px",
    marginBottom: 20,
  },
  searchInput: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    width: "100%",
  },
  langGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 24,
  },
  langCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    transition: "all 0.18s",
    color: "rgba(255,255,255,0.75)",
  },
  langCardActive: {
    background: "rgba(0,229,160,0.07)",
    border: "1.5px solid #00e5a0",
    color: "#fff",
    boxShadow: "0 0 20px rgba(0,229,160,0.1)",
  },
  flag: {
    fontSize: 28,
    lineHeight: 1,
  },
  langName: {
    fontSize: 14,
    fontWeight: 600,
  },
  dialectSection: {
    marginBottom: 28,
  },
  dialectLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 10,
    marginTop: 0,
  },
  dialectRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  dialectChip: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    cursor: "pointer",
    transition: "all 0.18s",
  },
  dialectChipActive: {
    background: "rgba(0,229,160,0.12)",
    border: "1px solid #00e5a0",
    color: "#00e5a0",
  },
  navRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
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