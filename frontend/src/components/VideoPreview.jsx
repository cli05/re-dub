import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "./Header";
import { authFetch } from "../auth";

export default function VideoPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { downloadUrl, job_id, target_language, project_name } = location.state ?? {};
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [name, setName] = useState(project_name || job_id || "Dubbed Video");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function handleTogglePlay() {
    if (videoRef.current) {
      isPlaying ? videoRef.current.pause() : videoRef.current.play();
    }
    setIsPlaying(p => !p);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function handleFullscreen() {
    videoRef.current?.requestFullscreen?.();
  }

  async function handleDownload() {
    if (!job_id) return;
    setDownloading(true);
    try {
      const res = await authFetch(`/api/dub/${job_id}/download`);
      const data = await res.json();
      window.location.href = data.download_url;
    } finally {
      setDownloading(false);
    }
  }

  function startEdit() { setDraft(name); setEditing(true); }

  async function commitEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) { setEditing(false); return; }
    try {
      const res = await authFetch(`/api/dub/${job_id}/name`, {
        method: "PATCH",
        body: JSON.stringify({ project_name: trimmed }),
      });
      if (res.ok) setName(trimmed);
    } finally {
      setEditing(false);
    }
  }

  function cancelEdit() { setEditing(false); }

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
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                style={styles.titleInput}
              />
            ) : (
              <h1 style={styles.title} onClick={startEdit}>
                {name}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={styles.editIcon}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </h1>
            )}
            <div style={styles.metaRow}>
              <span style={styles.langBadge}>{target_language?.toUpperCase() ?? "—"}</span>
              {duration > 0 && <span style={styles.duration}>• {formatTime(duration)}</span>}
            </div>
          </div>
        </div>

        {/* Video player */}
        <div style={styles.playerCard}>
          {/* Video area */}
          <div style={styles.videoArea} onClick={handleTogglePlay}>
            {downloadUrl ? (
              <video
                ref={videoRef}
                src={downloadUrl}
                style={styles.thumbnail}
                playsInline
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
                onLoadedMetadata={() => setDuration(videoRef.current.duration)}
              />
            ) : (
              <img
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&h=400&fit=crop"
                alt="Video thumbnail"
                style={styles.thumbnail}
              />
            )}
            {/* Dim overlay */}
            <div style={{ ...styles.videoDim, opacity: isPlaying ? 0 : 1 }} />

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
              <div style={{ ...styles.scrubFill, width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={e => { videoRef.current.currentTime = parseFloat(e.target.value); }}
                style={styles.scrubInput}
              />
            </div>
          </div>

          {/* Controls bar */}
          <div style={styles.controlsBar}>
            <div style={styles.ctrlLeft}>
              <button style={styles.ctrlBtn} onClick={handleTogglePlay}>
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
              <span style={styles.timeCode}>{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div style={styles.ctrlRight}>
              <button style={styles.ctrlBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button style={styles.ctrlBtn} onClick={handleFullscreen}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Download card */}
        <div style={styles.card}>
          <div style={styles.cardTitleRow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={styles.cardTitle}>Download</span>
          </div>
          <button
            style={{
              ...styles.downloadBtn,
              opacity: (!job_id || downloading) ? 0.5 : 1,
              cursor: (!job_id || downloading) ? "not-allowed" : "pointer",
            }}
            onClick={handleDownload}
            disabled={!job_id || downloading}
          >
            {downloading ? "Preparing\u2026" : "Download Dubbed Video"}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerCopy}>© 2024 Redub. All rights reserved.</span>
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
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  },
  titleInput: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: "-0.6px",
    background: "rgba(0,229,160,0.05)",
    border: "1px solid rgba(0,229,160,0.4)",
    borderRadius: 8,
    color: "#fff",
    padding: "2px 10px",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 8,
  },
  editIcon: {
    marginLeft: 10,
    opacity: 0.55,
    verticalAlign: "middle",
    cursor: "pointer",
    flexShrink: 0,
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
    objectFit: "contain",
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
    height: "100%",
    background: "#00e5a0",
    borderRadius: 2,
  },
  scrubInput: {
    position: "absolute",
    inset: 0,
    width: "100%",
    opacity: 0,
    cursor: "pointer",
    margin: 0,
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

  // Download card
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
  downloadBtn: {
    width: "100%",
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 10,
    padding: "12px",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "inherit",
    transition: "opacity 0.2s",
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
