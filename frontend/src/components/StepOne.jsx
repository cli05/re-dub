import { useState, useRef } from "react";
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

export default function NewDubStep1() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  }

  return (
    <div style={styles.app}>
      <Header hideSearch />

      <main style={styles.main}>
        {/* Page title */}
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>New Dub</h1>
          <p style={styles.subtitle}>Translate and dub your video content effortlessly.</p>
        </div>

        {/* Step progress tracker */}
        <StepProgress />

        {/* Upload card */}
        <form style={styles.uploadCard}>
          <div style={styles.uploadCardHeader}>
            <span style={styles.stepLabel}>Step 1: Upload your video</span>
            <span style={styles.nextHint}>Wait: Next Step is Language selection</span>
          </div>

          {/* Drop zone */}
          <div
            style={{
              ...styles.dropzone,
              borderColor: dragOver ? "#00e5a0" : file ? "rgba(0,229,160,0.5)" : "rgba(0,229,160,0.2)",
              background: dragOver ? "rgba(0,229,160,0.05)" : file ? "rgba(0,229,160,0.04)" : "rgba(255,255,255,0.02)",
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              id="file-input"
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {file ? (
              <div style={styles.filePreview}>
                <div style={styles.fileIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={styles.fileInfo}>
                  <span style={styles.fileName}>{file.name}</span>
                  <span style={styles.fileSize}>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
                <button
                  style={styles.removeBtn}
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div style={styles.dropContent}>
                <div style={styles.dropIcon}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" stroke="#00e5a0" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 9l5 3-5 3V9z" fill="#00e5a0"/>
                  </svg>
                </div>
                <p style={styles.dropTitle}>Drag and drop your video here</p>
                <p style={styles.dropDesc}>
                  Your video will be automatically transcribed and prepared for translation once uploaded.
                </p>
                <label
                  htmlFor="file-input"
                  style={styles.browseBtn}
                  onClick={e => e.stopPropagation()}
                >
                  Browse Files
                </label>
              </div>
            )}
          </div>

          {/* Format info */}
          <div style={styles.formatBar}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
              <path d="M12 16v-4M12 8h.01" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={styles.formatText}>
              Supported formats: <strong style={{ color: "rgba(255,255,255,0.65)" }}>MP4, MOV, AVI, MKV</strong>
              <span style={styles.formatDot}>·</span>
              Max file size: <strong style={{ color: "rgba(255,255,255,0.65)" }}>500MB</strong>
            </span>
          </div>

          {/* Nav buttons */}
          <div style={styles.navRow}>
            <button disabled style={styles.backBtnDisabled}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Previous
            </button>
            <button style={styles.nextBtn} onClick={() => navigate('/new-dub/step-2')}>
              Continue to Language
            </button>
          </div>
        </form>

        {/* Tip cards */}
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
  navRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 20,
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  backBtnDisabled: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.2)",
    fontSize: 14,
    cursor: "not-allowed",
    padding: "8px 4px",
  },
  nextBtn: {
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 8,
    padding: "11px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
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
  },
  uploadCard: {
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "22px 24px",
    marginBottom: 18,
  },
  uploadCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: 600,
  },
  nextHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  dropzone: {
    border: "1.5px dashed",
    borderRadius: 12,
    padding: "40px 24px",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: 16,
    minHeight: 220,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    textAlign: "center",
  },
  dropIcon: {
    marginBottom: 4,
  },
  dropTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  dropDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    maxWidth: 400,
    margin: 0,
    lineHeight: 1.6,
  },
  browseBtn: {
    marginTop: 6,
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 8,
    padding: "10px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  filePreview: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "rgba(0,229,160,0.07)",
    border: "1px solid rgba(0,229,160,0.2)",
    borderRadius: 10,
    padding: "16px 20px",
    width: "100%",
    maxWidth: 440,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "rgba(0,229,160,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 500,
    color: "#fff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 260,
  },
  fileSize: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  formatBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    padding: "10px 16px",
  },
  formatText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  formatDot: {
    color: "rgba(255,255,255,0.2)",
    margin: "0 2px",
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