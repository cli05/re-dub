import { useState, useRef } from "react";
import Header from "./Header";

// --- Transcript data ---
const INITIAL_SEGMENTS = [
  {
    id: 1,
    start: "00:00",
    end: "00:05",
    original: "Welcome to the future of translation technology.",
    translated: "Bienvenue dans le futur de la technologie de traduction.",
  },
  {
    id: 2,
    start: "00:05",
    end: "00:12",
    original: "Today we learn about AI and its impact on global communication.",
    translated: "Aujourd'hui, nous découvrons l'IA et son impact sur la communication mondiale.",
  },
  {
    id: 3,
    start: "00:12",
    end: "00:15",
    original: "Let's get started with our first example.",
    translated: "Commençons par notre premier exemple.",
  },
  {
    id: 4,
    start: "00:15",
    end: "00:22",
    original: "Notice how the neural network preserves the original tone.",
    translated: "Remarquez comment le réseau neuronal préserve le ton original.",
  },
];

const SUBTITLES_DATA = [
  { id: 1, start: "00:00", end: "00:05", text: "Bienvenue dans le futur de la technologie de traduction." },
  { id: 2, start: "00:05", end: "00:12", text: "Aujourd'hui, nous découvrons l'IA et son impact sur la communication mondiale." },
  { id: 3, start: "00:12", end: "00:15", text: "Commençons par notre premier exemple." },
  { id: 4, start: "00:15", end: "00:22", text: "Remarquez comment le réseau neuronal préserve le ton original." },
];

// --- Sub-components ---

function TimeStamp({ start, end }) {
  return (
    <div style={ts.wrap}>
      <span style={ts.time}>{start}</span>
      <span style={ts.sep}>-</span>
      <span style={ts.time}>{end}</span>
    </div>
  );
}
const ts = {
  wrap: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, minWidth: 44, flexShrink: 0 },
  time: { fontSize: 11, fontWeight: 700, color: "#00e5a0", letterSpacing: 0.3, fontVariantNumeric: "tabular-nums" },
  sep: { fontSize: 10, color: "rgba(0,229,160,0.4)" },
};

function TranscriptSegment({ segment, isActive, onClick, onChange }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...seg.row,
        borderLeft: isActive ? "3px solid #00e5a0" : "3px solid transparent",
        background: isActive ? "rgba(0,229,160,0.04)" : "transparent",
      }}
    >
      <TimeStamp start={segment.start} end={segment.end} />
      <div style={seg.cols}>
        <div style={seg.col}>
          <span style={seg.colLabel}>ORIGINAL (EN)</span>
          <p style={seg.originalText}>{segment.original}</p>
        </div>
        <div style={seg.col}>
          <span style={{ ...seg.colLabel, color: "#00e5a0" }}>TRANSLATED (FR)</span>
          <textarea
            value={segment.translated}
            onChange={e => onChange(segment.id, e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{
              ...seg.textarea,
              borderColor: isActive ? "rgba(0,229,160,0.35)" : "rgba(255,255,255,0.08)",
              background: isActive ? "rgba(0,229,160,0.04)" : "rgba(255,255,255,0.03)",
            }}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
const seg = {
  row: {
    display: "flex",
    gap: 14,
    padding: "16px 18px",
    cursor: "pointer",
    transition: "background 0.15s, border-left-color 0.15s",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  cols: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    flex: 1,
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.3)",
  },
  originalText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontStyle: "italic",
    margin: 0,
    lineHeight: 1.5,
  },
  textarea: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    lineHeight: 1.5,
    padding: "8px 10px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.2s, background 0.2s",
    width: "100%",
    boxSizing: "border-box",
  },
};

function SubtitleRow({ sub, isActive, onClick, onChange }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...seg.row,
        borderLeft: isActive ? "3px solid #00e5a0" : "3px solid transparent",
        background: isActive ? "rgba(0,229,160,0.04)" : "transparent",
      }}
    >
      <TimeStamp start={sub.start} end={sub.end} />
      <div style={{ flex: 1 }}>
        <span style={{ ...seg.colLabel, color: "#00e5a0" }}>SUBTITLE (FR)</span>
        <textarea
          value={sub.text}
          onChange={e => onChange(sub.id, e.target.value)}
          onClick={e => e.stopPropagation()}
          rows={2}
          style={{
            ...seg.textarea,
            marginTop: 6,
            borderColor: isActive ? "rgba(0,229,160,0.35)" : "rgba(255,255,255,0.08)",
            background: isActive ? "rgba(0,229,160,0.04)" : "rgba(255,255,255,0.03)",
          }}
        />
      </div>
    </div>
  );
}

function PitchSlider({ value, onChange }) {
  return (
    <div style={slid.wrap}>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={slid.input}
      />
      <style>{`
        input[type=range] {
          -webkit-appearance: none;
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(to right, #00e5a0 ${value}%, rgba(255,255,255,0.12) ${value}%);
          outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(0,229,160,0.5);
        }
      `}</style>
    </div>
  );
}
const slid = {
  wrap: { width: "100%" },
  input: { width: "100%", cursor: "pointer" },
};

// --- Main Component ---
export default function TranscriptEditor() {
  const [segments, setSegments] = useState(INITIAL_SEGMENTS);
  const [subtitles, setSubtitles] = useState(SUBTITLES_DATA);
  const [activeSegment, setActiveSegment] = useState(2);
  const [tab, setTab] = useState("voiceover"); // "voiceover" | "subtitles"
  const [pitch, setPitch] = useState(55);
  const [isPlaying, setIsPlaying] = useState(false);

  function updateTranslation(id, value) {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, translated: value } : s));
  }

  function updateSubtitle(id, value) {
    setSubtitles(prev => prev.map(s => s.id === id ? { ...s, text: value } : s));
  }

  const activeSegData = segments.find(s => s.id === activeSegment);

  return (
    <div style={styles.app}>
      <Header hideSearch />

      <div style={styles.layout}>
        {/* LEFT — Transcript panel */}
        <div style={styles.leftPanel}>
          {/* Panel header */}
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>Transcript Editor</h2>
              <p style={styles.projectId}>Project ID: PGD-78291</p>
            </div>
            <div style={styles.undoRedo}>
              <button style={styles.iconBtn} title="Undo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 7v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 13A9 9 0 1021 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button style={styles.iconBtn} title="Redo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 7v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 13A9 9 0 113 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Segments */}
          <div style={styles.segmentList}>
            {segments.map(s => (
              <TranscriptSegment
                key={s.id}
                segment={s}
                isActive={activeSegment === s.id}
                onClick={() => setActiveSegment(s.id)}
                onChange={updateTranslation}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — Video + controls */}
        <div style={styles.rightPanel}>
          {/* Video player */}
          <div style={styles.videoWrap}>
            <div style={styles.videoArea}>
              {/* Subtitle overlay */}
              {activeSegData && (
                <div style={styles.subtitleOverlay}>
                  <span style={styles.subtitleText}>
                    {activeSegData.translated.length > 40
                      ? activeSegData.translated.slice(0, 40) + "..."
                      : activeSegData.translated}
                  </span>
                </div>
              )}
            </div>

            {/* Scrubber */}
            <div style={styles.scrubberWrap}>
              <div style={styles.scrubberTrack}>
                <div style={styles.scrubberFill} />
                <div style={styles.scrubberThumb} />
              </div>
            </div>

            {/* Controls */}
            <div style={styles.controls}>
              <div style={styles.controlsLeft}>
                <button style={styles.ctrlBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 20L9 12l10-8v16z" fill="currentColor"/>
                    <line x1="5" y1="4" x2="5" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  style={{ ...styles.ctrlBtn, ...styles.playBtn }}
                  onClick={() => setIsPlaying(p => !p)}
                >
                  {isPlaying ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M6 4l14 8-14 8V4z" fill="currentColor"/>
                    </svg>
                  )}
                </button>
                <button style={styles.ctrlBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 4l10 8-10 8V4z" fill="currentColor"/>
                    <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <span style={styles.timeCode}>00:07 / 03:45</span>
              </div>
              <div style={styles.controlsRight}>
                <button style={styles.ctrlBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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

          {/* Tabs */}
          <div style={styles.tabs}>
            {["voiceover", "subtitles"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  ...styles.tabBtn,
                  ...(tab === t ? styles.tabBtnActive : {}),
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "voiceover" ? (
            <div style={styles.tabContent}>
              <div style={styles.twoCol}>
                {/* Audio Management */}
                <div>
                  <p style={styles.sectionLabel}>AUDIO MANAGEMENT</p>
                  <div style={styles.actionCards}>
                    <button style={styles.actionCard}>
                      <div style={styles.actionIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <polyline points="16 16 12 12 8 16" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="12" y1="12" x2="12" y2="21" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div style={styles.actionText}>
                        <span style={styles.actionTitle}>Upload Custom Voice</span>
                        <span style={styles.actionDesc}>MP3, WAV, M4A up to 50MB</span>
                      </div>
                    </button>
                    <button style={styles.actionCard}>
                      <div style={styles.actionIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M1 4v6h6" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div style={styles.actionText}>
                        <span style={styles.actionTitle}>Re-synthesize Line</span>
                        <span style={styles.actionDesc}>Apply current AI voice settings</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Voice Profile */}
                <div>
                  <p style={styles.sectionLabel}>VOICE PROFILE</p>
                  <div style={styles.voiceCard}>
                    <div style={styles.voiceAvatar}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" stroke="#00e5a0" strokeWidth="2"/>
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.voiceName}>Pierre (Male, FR)</p>
                      <p style={styles.voiceEngine}>Premium Neural Engine</p>
                    </div>
                  </div>
                  <div style={styles.pitchRow}>
                    <span style={styles.pitchLabel}>Pitch</span>
                    <PitchSlider value={pitch} onChange={setPitch} />
                    <span style={styles.pitchLabel}>Stable</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.tabContent}>
              <div style={styles.subtitleList}>
                {subtitles.map(s => (
                  <SubtitleRow
                    key={s.id}
                    sub={s}
                    isActive={activeSegment === s.id}
                    onClick={() => setActiveSegment(s.id)}
                    onChange={updateSubtitle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <div style={styles.savedInfo}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(0,229,160,0.6)" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="rgba(0,229,160,0.6)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={styles.savedText}>Last saved: 2 minutes ago</span>
        </div>
        <div style={styles.bottomActions}>
          <button style={styles.saveDraftBtn}>Save Draft</button>
          <button style={styles.renderBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
            </svg>
            Re-render Final
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    height: "100vh",
    background: "#0a1a18",
    fontFamily: "'DM Sans', 'Sora', sans-serif",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    flex: 1,
    overflow: "hidden",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },

  // LEFT PANEL
  leftPanel: {
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    flexShrink: 0,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.4px",
  },
  projectId: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    margin: "3px 0 0",
  },
  undoRedo: {
    display: "flex",
    gap: 4,
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.45)",
    cursor: "pointer",
    padding: "6px 8px",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    transition: "background 0.15s, color 0.15s",
  },
  segmentList: {
    overflowY: "auto",
    flex: 1,
  },

  // RIGHT PANEL
  rightPanel: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#0a1e1a",
  },
  videoWrap: {
    background: "#061410",
    flexShrink: 0,
  },
  videoArea: {
    height: 220,
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBottom: 20,
    background: "linear-gradient(180deg, #061410 0%, #0a1e1a 100%)",
  },
  subtitleOverlay: {
    background: "rgba(0,0,0,0.72)",
    borderRadius: 6,
    padding: "8px 16px",
    maxWidth: "80%",
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 15,
    fontWeight: 500,
    color: "#fff",
    lineHeight: 1.4,
  },
  scrubberWrap: {
    padding: "0 16px 4px",
  },
  scrubberTrack: {
    height: 3,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    position: "relative",
    cursor: "pointer",
  },
  scrubberFill: {
    width: "3.1%",
    height: "100%",
    background: "#00e5a0",
    borderRadius: 2,
  },
  scrubberThumb: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#fff",
    position: "absolute",
    top: "50%",
    left: "3.1%",
    transform: "translate(-50%, -50%)",
    boxShadow: "0 0 6px rgba(0,229,160,0.6)",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px 12px",
  },
  controlsLeft: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  controlsRight: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  ctrlBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    padding: "5px 7px",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
  },
  playBtn: {
    background: "#fff",
    color: "#0a1a18",
    borderRadius: "50%",
    width: 36,
    height: 36,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  timeCode: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontVariantNumeric: "tabular-nums",
    marginLeft: 6,
    letterSpacing: 0.3,
  },

  // Tabs
  tabs: {
    display: "flex",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    padding: "0 20px",
    flexShrink: 0,
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: 500,
    padding: "12px 16px",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    fontFamily: "inherit",
    transition: "color 0.2s",
  },
  tabBtnActive: {
    color: "#00e5a0",
    borderBottom: "2px solid #00e5a0",
    fontWeight: 600,
  },
  tabContent: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
  },

  // Voiceover tab
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.3)",
    marginBottom: 10,
    marginTop: 0,
  },
  actionCards: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left",
    transition: "border-color 0.2s, background 0.2s",
    width: "100%",
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "rgba(0,229,160,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionText: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
  },
  actionDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
  },
  voiceCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 14,
  },
  voiceAvatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "rgba(0,229,160,0.12)",
    border: "1.5px solid rgba(0,229,160,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  voiceName: {
    fontSize: 13,
    fontWeight: 600,
    margin: 0,
    color: "#fff",
  },
  voiceEngine: {
    fontSize: 11,
    color: "#00e5a0",
    margin: "2px 0 0",
  },
  pitchRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  pitchLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  subtitleList: {
    display: "flex",
    flexDirection: "column",
  },

  // Bottom bar
  bottomBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    background: "#0d2420",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    flexShrink: 0,
  },
  savedInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  savedText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  bottomActions: {
    display: "flex",
    gap: 10,
  },
  saveDraftBtn: {
    background: "transparent",
    border: "1px solid rgba(0,229,160,0.35)",
    color: "#00e5a0",
    borderRadius: 8,
    padding: "8px 22px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  renderBtn: {
    background: "#00e5a0",
    border: "none",
    color: "#0a1a18",
    borderRadius: 8,
    padding: "8px 22px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
};