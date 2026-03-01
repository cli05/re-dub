import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import { authFetch } from "../auth";

const STATUS = {
  COMPLETED: { label: "READY", color: "#00e5a0", dot: "#00e5a0" },
  PROCESSING: { label: "PROCESSING", color: "#4fc3f7", dot: "#4fc3f7" },
  PENDING: { label: "PROCESSING", color: "#4fc3f7", dot: "#4fc3f7" },
  FAILED: { label: "FAILED", color: "#ff4d6d", dot: "#ff4d6d" },
};

function relativeTime(isoString) {
  if (!isoString) return "";
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function PolyGlotDubs() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");

  useEffect(() => {
    authFetch("/api/projects")
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleCardClick(p) {
    if (p.status === "COMPLETED") {
      navigate("/preview", { state: { downloadUrl: p.download_url, job_id: p.job_id, target_language: p.target_language } });
    } else if (p.status === "PROCESSING" || p.status === "PENDING") {
      navigate("/loading", { state: { job_id: p.job_id } });
    }
  }

  return (
    <div style={styles.app}>
      <Header />

      <main style={styles.main}>
        {/* Controls */}
        <div style={styles.toolbar}>
          <div style={styles.controls}>
            <div style={styles.viewToggle}>
              {["grid", "list"].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{ ...styles.viewBtn, ...(view === v ? styles.viewBtnActive : {}) }}
                >
                  {v === "grid" ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <p style={styles.emptyText}>Loading projects…</p>
        ) : projects.length === 0 ? (
          <p style={styles.emptyText}>No projects yet — start a New Dub.</p>
        ) : (
          <div style={view === "grid" ? styles.grid : styles.listView}>
            {projects.map(p => (
              <ProjectCard key={p.job_id} project={p} onClick={() => handleCardClick(p)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project: p, onClick }) {
  const st = STATUS[p.status] || STATUS.FAILED;
  const isClickable = p.status !== "FAILED";

  return (
    <div
      style={{ ...styles.card, cursor: isClickable ? "pointer" : "default" }}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Thumbnail */}
      <div style={styles.thumb}>
        {p.status === "COMPLETED" ? (
          <div style={styles.playThumb}>
            <div style={styles.playBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        ) : p.status === "PROCESSING" || p.status === "PENDING" ? (
          <div style={styles.processingThumb}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${Math.round(((p.step || 0) / 5) * 100)}%` }} />
            </div>
            <span style={styles.processingLabel}>PROCESSING</span>
            <span style={styles.processingSubLabel}>{Math.round(((p.step || 0) / 5) * 100)}% complete</span>
          </div>
        ) : (
          <div style={styles.playThumb}>
            <div style={{ ...styles.playBtn, background: "rgba(255,77,109,0.15)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ff4d6d" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={styles.cardBody}>
        <div style={styles.cardRow}>
          <span style={styles.cardTitle}>{p.job_id}</span>
          <span style={{ ...styles.statusBadge, color: st.color, borderColor: `${st.color}33`, background: `${st.color}11` }}>
            <span style={{ ...styles.statusDotSmall, background: st.dot }} />
            {st.label}
          </span>
        </div>
        <div style={styles.cardMeta}>
          <span style={{ ...styles.langTag, background: "rgba(0,229,160,0.13)", color: "#00e5a0" }}>
            {p.target_language}
          </span>
          <span style={styles.timeText}>• {relativeTime(p.created_at)}</span>
        </div>
        <div style={styles.divider} />

        {/* Footer row */}
        {p.status === "FAILED" && (
          <div style={styles.cardFooter}>
            <span style={{ fontSize: 12, color: "#ff4d6d", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ff4d6d" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {p.error || "Processing failed"}
            </span>
          </div>
        )}
        {(p.status === "PROCESSING" || p.status === "PENDING") && (
          <div style={styles.cardFooter}>
            <span style={styles.metaText}>Step {p.step || 0} of 5</span>
          </div>
        )}
        {p.status === "COMPLETED" && (
          <div style={styles.cardFooter}>
            <span style={styles.metaText}>Ready to view</span>
          </div>
        )}
      </div>
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
    padding: "24px 28px",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  controlBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "rgba(255,255,255,0.7)",
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
  viewToggle: {
    display: "flex",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    overflow: "hidden",
  },
  viewBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.4)",
    padding: "7px 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  viewBtnActive: {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
  },
  emptyText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    marginTop: 40,
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 20,
  },
  listView: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  thumb: {
    height: 200,
    background: "#0d1f1c",
    position: "relative",
    overflow: "hidden",
  },
  playThumb: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0d2420 0%, #1a3530 100%)",
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(4px)",
  },
  processingThumb: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    background: "#0a1a17",
  },
  progressBar: {
    width: "60%",
    height: 4,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #00e5a0, #4fc3f7)",
    borderRadius: 4,
    transition: "width 0.3s",
  },
  processingLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#4fc3f7",
    fontWeight: 600,
  },
  processingSubLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  cardBody: {
    padding: "14px 16px",
  },
  cardRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "55%",
    fontVariantNumeric: "tabular-nums",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    border: "1px solid",
    borderRadius: 20,
    padding: "3px 9px",
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  langTag: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 5,
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "10px 0",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00e5a0",
    boxShadow: "0 0 6px #00e5a0",
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
  footerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  footerDivider: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 12,
  },
};
