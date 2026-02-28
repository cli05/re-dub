import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

const EXPORT_OPTIONS = [
  {
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="#00e5a0" strokeWidth="2"/>
        <path d="M10 10l5 3-5 3V10z" fill="#00e5a0"/>
        <path d="M8 21h8M12 17v4" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Export Video",
    desc: "H.264 MP4 • 1080P",
  },
  {
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#00e5a0" strokeWidth="2"/>
        <path d="M7 8h10M7 12h6M7 16h8" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Export Subtitles",
    desc: "SRT, VTT FORMATS",
  },
  {
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#00e5a0" strokeWidth="2"/>
        <polyline points="14 2 14 8 20 8" stroke="#00e5a0" strokeWidth="2"/>
        <path d="M16 13H8M16 17H8M10 9H8" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Export Transcript",
    desc: "PDF, TXT FORMATS",
  },
];

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      style={{
        ...styles.toggle,
        background: enabled ? "#00e5a0" : "rgba(255,255,255,0.12)",
        boxShadow: enabled ? "0 0 12px rgba(0,229,160,0.35)" : "none",
      }}
    >
      <span style={{
        ...styles.toggleKnob,
        transform: enabled ? "translateX(22px)" : "translateX(2px)",
        background: enabled ? "#0a1a18" : "rgba(255,255,255,0.6)",
      }} />
    </button>
  );
}

export default function VideoPreview() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(true);
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [privacy, setPrivacy] = useState("public"); // "public" | "password"
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://polyglot.ai/v/mk-v1-92k3";

  function handleCopy() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={styles.app}>
      <Header hideSearch={true} />

      <main style={styles.main}>
        {/* Back link */}
        <a href="#" style={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </a>

        {/* Page title row */}
        <div style={styles.titleRow}>
          <div>
            <h1 style={styles.title}>Marketing Video V1 – Final</h1>
            <div style={styles.metaRow}>
              <span style={styles.langBadge}>SPANISH – LATIN AMERICAN</span>
              <span style={styles.duration}>• 04:20</span>
            </div>
          </div>
        </div>

        {/* Video player */}
        <div style={styles.playerCard}>
          {/* Thumbnail area */}
          <div
            style={styles.videoArea}
            onClick={() => setIsPlaying(p => !p)}
          >
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&h=400&fit=crop"
              alt="Video thumbnail"
              style={styles.thumbnail}
            />
            {/* Dim overlay */}
            <div style={styles.videoDim} />

            {/* Play/pause button */}
            <button style={styles.bigPlayBtn}>
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="4" width="4" height="16" rx="1" fill="white"/>
                  <rect x="14" y="4" width="4" height="16" rx="1" fill="white"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4l14 8-14 8V4z" fill="white"/>
                </svg>
              )}
            </button>
          </div>

          {/* Scrubber */}
          <div style={styles.scrubWrap}>
            <div style={styles.scrubTrack}>
              <div style={styles.scrubFill} />
              <div style={styles.scrubThumb} />
            </div>
          </div>

          {/* Controls bar */}
          <div style={styles.controlsBar}>
            <div style={styles.ctrlLeft}>
              <button style={styles.ctrlBtn} onClick={() => setIsPlaying(p => !p)}>
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 4l14 8-14 8V4z" fill="currentColor"/>
                  </svg>
                )}
              </button>
              <button style={styles.ctrlBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <span style={styles.timeCode}>01:24 / 04:20</span>
            </div>
            <div style={styles.ctrlRight}>
              <button style={styles.ctrlBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button style={styles.ctrlBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Subtitles toggle */}
        <div style={styles.subtitlesRow}>
          <div>
            <p style={styles.subtitlesTitle}>Subtitles Overlay</p>
            <p style={styles.subtitlesDesc}>Display generated captions on the video</p>
          </div>
          <Toggle enabled={subtitlesOn} onToggle={() => setSubtitlesOn(v => !v)} />
        </div>

        {/* Export + Share row */}
        <div style={styles.bottomGrid}>
          {/* Export & Download */}
          <div style={styles.card}>
            <div style={styles.cardTitleRow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={styles.cardTitle}>Export & Download</span>
            </div>
            <div style={styles.exportList}>
              {EXPORT_OPTIONS.map((opt, i) => (
                <button key={i} style={styles.exportRow}>
                  <div style={styles.exportIcon}>{opt.icon}</div>
                  <div style={styles.exportText}>
                    <span style={styles.exportTitle}>{opt.title}</span>
                    <span style={styles.exportDesc}>{opt.desc}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Share Link */}
          <div style={styles.card}>
            <div style={styles.cardTitleRow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="#00e5a0" strokeWidth="2"/>
                <circle cx="6" cy="12" r="3" stroke="#00e5a0" strokeWidth="2"/>
                <circle cx="18" cy="19" r="3" stroke="#00e5a0" strokeWidth="2"/>
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="#00e5a0" strokeWidth="2"/>
              </svg>
              <span style={styles.cardTitle}>Share Link</span>
            </div>

            {/* URL copy */}
            <div style={styles.urlRow}>
              <span style={styles.urlText}>{shareUrl}</span>
              <button style={styles.copyBtn} onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Privacy settings */}
            <p style={styles.privacyLabel}>PRIVACY SETTINGS</p>
            <div style={styles.privacyOptions}>
              <label style={styles.privacyRow} onClick={() => setPrivacy("public")}>
                <div style={styles.privacyIcon}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#00e5a0" strokeWidth="2"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="#00e5a0" strokeWidth="2"/>
                  </svg>
                </div>
                <div style={styles.privacyText}>
                  <span style={styles.privacyTitle}>Public Link</span>
                  <span style={styles.privacyDesc}>Anyone with the link can view</span>
                </div>
                <div style={{
                  ...styles.radio,
                  borderColor: privacy === "public" ? "#00e5a0" : "rgba(255,255,255,0.2)",
                }}>
                  {privacy === "public" && <div style={styles.radioDot} />}
                </div>
              </label>

              <label style={styles.privacyRow} onClick={() => setPrivacy("password")}>
                <div style={styles.privacyIcon}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={styles.privacyText}>
                  <span style={{ ...styles.privacyTitle, color: privacy === "password" ? "#fff" : "rgba(255,255,255,0.5)" }}>
                    Password Protected
                  </span>
                  <span style={styles.privacyDesc}>Requires password to view</span>
                </div>
                <div style={{
                  ...styles.radio,
                  borderColor: privacy === "password" ? "#00e5a0" : "rgba(255,255,255,0.2)",
                }}>
                  {privacy === "password" && <div style={styles.radioDot} />}
                </div>
              </label>
            </div>

            <button style={styles.updateBtn}>Update Sharing Preferences</button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerCopy}>© 2024 PolyGlot Dubs. All rights reserved.</span>
        <div style={styles.footerLinks}>
          {["Documentation", "Support", "Privacy Policy"].map(l => (
            <a key={l} href="#" style={styles.footerLink}>{l}</a>
          ))}
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
    maxWidth: 820,
    margin: "0 auto",
    width: "100%",
    padding: "24px 24px 40px",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#00e5a0",
    textDecoration: "none",
    marginBottom: 18,
    opacity: 0.85,
  },
  titleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    margin: "0 0 8px",
    letterSpacing: "-0.6px",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  langBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#00e5a0",
    background: "rgba(0,229,160,0.12)",
    border: "1px solid rgba(0,229,160,0.25)",
    borderRadius: 20,
    padding: "3px 10px",
  },
  duration: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
  },
  editBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },

  // Player
  playerCard: {
    background: "#000",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
  },
  videoArea: {
    position: "relative",
    width: "100%",
    paddingTop: "48%",
    cursor: "pointer",
    overflow: "hidden",
  },
  thumbnail: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  videoDim: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.25)",
  },
  bigPlayBtn: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#00e5a0",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 30px rgba(0,229,160,0.5)",
    transition: "transform 0.15s",
  },
  scrubWrap: {
    padding: "0 16px",
    background: "#0d1e1b",
  },
  scrubTrack: {
    height: 3,
    background: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    position: "relative",
    cursor: "pointer",
  },
  scrubFill: {
    width: "33%",
    height: "100%",
    background: "#00e5a0",
    borderRadius: 2,
  },
  scrubThumb: {
    position: "absolute",
    top: "50%",
    left: "33%",
    transform: "translate(-50%, -50%)",
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 0 6px rgba(0,229,160,0.7)",
  },
  controlsBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px 12px",
    background: "#0d1e1b",
  },
  ctrlLeft: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  ctrlRight: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  ctrlBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.65)",
    cursor: "pointer",
    padding: "5px 7px",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    fontFamily: "inherit",
  },
  timeCode: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginLeft: 4,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: 0.3,
  },

  // Subtitles toggle row
  subtitlesRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: "14px 20px",
    marginBottom: 20,
  },
  subtitlesTitle: {
    fontSize: 14,
    fontWeight: 600,
    margin: "0 0 3px",
  },
  subtitlesDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    margin: 0,
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

  // Bottom grid
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  card: {
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "20px",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
  },

  // Export list
  exportList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  exportRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontFamily: "inherit",
    transition: "background 0.15s, border-color 0.15s",
  },
  exportIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "rgba(0,229,160,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  exportText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  exportTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
  },
  exportDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.3,
  },

  // Share
  urlRow: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "9px 12px",
    gap: 10,
    marginBottom: 16,
  },
  urlText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  copyBtn: {
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 6,
    padding: "5px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
    transition: "opacity 0.2s",
  },
  privacyLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.3)",
    margin: "0 0 10px",
  },
  privacyOptions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },
  privacyRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    transition: "background 0.15s",
  },
  privacyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "rgba(0,229,160,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  privacyText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
  },
  privacyDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "border-color 0.2s",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00e5a0",
  },
  updateBtn: {
    width: "100%",
    background: "transparent",
    border: "1px solid rgba(0,229,160,0.3)",
    color: "#00e5a0",
    borderRadius: 10,
    padding: "11px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.2s",
  },

  // Footer
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 28px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "#0d2420",
  },
  footerCopy: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
  footerLinks: {
    display: "flex",
    gap: 24,
  },
  footerLink: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    textDecoration: "none",
  },
};