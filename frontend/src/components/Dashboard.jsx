import { useState } from "react";
import Header from "./Header";

const projects = [
  {
    id: 1,
    title: "Marketing Reel",
    lang: "ES",
    status: "ready",
    time: "2 hours ago",
    duration: "0:45",
    cost: "$2.50",
    thumbnail: null,
  },
  {
    id: 2,
    title: "Product Demo",
    lang: "ZH",
    status: "processing",
    time: "10 mins ago",
    progress: 55,
    est: "5 mins",
    thumbnail: null,
  },
  {
    id: 3,
    title: "CEO Interview",
    lang: "HI",
    status: "failed",
    time: "1 day ago",
    error: "Audio source too noisy",
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=280&fit=crop",
  },
];

const STATUS = {
  ready: { label: "READY", color: "#00e5a0", dot: "#00e5a0" },
  processing: { label: "PROCESSING", color: "#4fc3f7", dot: "#4fc3f7" },
  failed: { label: "FAILED", color: "#ff4d6d", dot: "#ff4d6d" },
};

const LANG_COLORS = {
  ES: "#00e5a0",
  ZH: "#4fc3f7",
  HI: "#a78bfa",
};

export default function PolyGlotDubs() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set([1, 2, 3]));
  const [view, setView] = useState("grid");
  const [selectAll, setSelectAll] = useState(true);

  const tabs = ["all", "processing", "ready", "failed"];

  const filtered = filter === "all" ? projects : projects.filter(p => p.status === filter);

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectAll) {
      setSelected(new Set());
      setSelectAll(false);
    } else {
      setSelected(new Set(projects.map(p => p.id)));
      setSelectAll(true);
    }
  }

  return (
    <div style={styles.app}>
      <Header />

      {/* Main */}
      <main style={styles.main}>
        {/* Tabs + Controls */}
        <div style={styles.toolbar}>
          <div style={styles.tabs}>
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  ...styles.tab,
                  ...(filter === t ? styles.tabActive : {}),
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1) + (t === "all" ? " Projects" : "")}
              </button>
            ))}
          </div>
          <div style={styles.controls}>
            <button style={styles.controlBtn}>
              Language
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M7 12h10M11 18h2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button style={styles.controlBtn}>
              Sort: Newest
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M7 12h10M11 18h2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
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

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div style={styles.bulkBar}>
            <label style={styles.bulkCheck}>
              <input type="checkbox" checked={selectAll} onChange={toggleAll} style={{ accentColor: "#00e5a0" }} />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>{selected.size} projects selected</span>
            </label>
            <div style={{ display: "flex", gap: 16 }}>
              <button style={styles.bulkBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Bulk Download
              </button>
              <button style={{ ...styles.bulkBtn, color: "#ff4d6d" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Bulk Delete
              </button>
            </div>
          </div>
        )}

        {/* Cards */}
        <div style={view === "grid" ? styles.grid : styles.listView}>
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              selected={selected.has(p.id)}
              onToggle={() => toggleSelect(p.id)}
            />
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={styles.statusDot} />
          <span style={styles.footerText}>System Operational</span>
          <span style={styles.footerDivider}>|</span>
          <span style={styles.footerText}>© 2024 PolyGlot Dubs AI</span>
        </div>
      </footer>
    </div>
  );
}

function ProjectCard({ project: p, selected, onToggle }) {
  const st = STATUS[p.status];
  const langColor = LANG_COLORS[p.lang] || "#00e5a0";

  return (
    <div style={{ ...styles.card, outline: selected ? "1.5px solid rgba(0,229,160,0.3)" : "none" }}>
      {/* Thumbnail */}
      <div style={styles.thumb}>
        {p.thumbnail ? (
          <img src={p.thumbnail} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : p.status === "processing" ? (
          <div style={styles.processingThumb}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${p.progress}%` }} />
            </div>
            <span style={styles.processingLabel}>PROCESSING</span>
            <span style={styles.processingSubLabel}>Voice Cloning...</span>
          </div>
        ) : (
          <div style={styles.playThumb}>
            <div style={styles.playBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            {p.duration && <span style={styles.duration}>{p.duration}</span>}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={styles.cardBody}>
        <div style={styles.cardRow}>
          <span style={styles.cardTitle}>{p.title}</span>
          <span style={{ ...styles.statusBadge, color: st.color, borderColor: `${st.color}33`, background: `${st.color}11` }}>
            <span style={{ ...styles.statusDotSmall, background: st.dot }} />
            {st.label}
          </span>
        </div>
        <div style={styles.cardMeta}>
          <span style={{ ...styles.langTag, background: `${langColor}22`, color: langColor }}>{p.lang}</span>
          <span style={styles.timeText}>• {p.time}</span>
        </div>
        <div style={styles.divider} />

        {/* Footer row */}
        {p.status === "ready" && (
          <div style={styles.cardFooter}>
            <span style={styles.costText}>Cost: <strong style={{ color: "#fff" }}>{p.cost}</strong></span>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                <path key="e" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>,
                <path key="d" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>,
                <path key="s" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
              ].map((path, i) => (
                <button key={i} style={styles.iconBtn}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    {path}
                    <line x1="18" y1="2" x2="22" y2="6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
        {p.status === "processing" && (
          <div style={styles.cardFooter}>
            <span style={styles.costText}>Est. completion: <strong style={{ color: "#fff" }}>{p.est}</strong></span>
            <button style={styles.iconBtn}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                <circle cx="19" cy="12" r="1" fill="currentColor"/>
                <circle cx="5" cy="12" r="1" fill="currentColor"/>
              </svg>
            </button>
          </div>
        )}
        {p.status === "failed" && (
          <div style={styles.cardFooter}>
            <span style={{ fontSize: 12, color: "#ff4d6d", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ff4d6d" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {p.error}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.iconBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M20.49 9A9 9 0 105.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button style={{ ...styles.iconBtn, color: "#ff4d6d" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
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
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tabs: {
    display: "flex",
    gap: 4,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  tab: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    padding: "10px 16px",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "all 0.2s",
  },
  tabActive: {
    color: "#00e5a0",
    borderBottom: "2px solid #00e5a0",
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
  bulkBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(0,229,160,0.05)",
    border: "1px solid rgba(0,229,160,0.15)",
    borderRadius: 10,
    padding: "12px 20px",
    marginBottom: 20,
  },
  bulkCheck: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  bulkBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    cursor: "pointer",
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
    cursor: "pointer",
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
  duration: {
    position: "absolute",
    bottom: 10,
    right: 10,
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 5,
    fontWeight: 500,
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
    fontSize: 15,
    fontWeight: 600,
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
  costText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.45)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    transition: "color 0.2s",
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