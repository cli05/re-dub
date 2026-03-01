import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import { getToken, authFetch } from "../auth";

const API_BASE = "http://127.0.0.1:8000";

// All 17 languages supported by XTTS v2 with their exact ISO codes
const LANGUAGES = [
  { code: "en", name: "English",    flag: "🇬🇧", dialects: [] },
  { code: "es", name: "Spanish",    flag: "🇪🇸", dialects: ["Latin American", "Castilian (Spain)", "Neutral"] },
  { code: "fr", name: "French",     flag: "🇫🇷", dialects: ["France", "Canadian", "Belgian"] },
  { code: "de", name: "German",     flag: "🇩🇪", dialects: [] },
  { code: "it", name: "Italian",    flag: "🇮🇹", dialects: [] },
  { code: "pt", name: "Portuguese", flag: "🇧🇷", dialects: ["Brazilian", "European"] },
  { code: "pl", name: "Polish",     flag: "🇵🇱", dialects: [] },
  { code: "tr", name: "Turkish",    flag: "🇹🇷", dialects: [] },
  { code: "ru", name: "Russian",    flag: "🇷🇺", dialects: [] },
  { code: "nl", name: "Dutch",      flag: "🇳🇱", dialects: [] },
  { code: "cs", name: "Czech",      flag: "🇨🇿", dialects: [] },
  { code: "ar", name: "Arabic",     flag: "🇸🇦", dialects: ["Modern Standard", "Egyptian", "Gulf"] },
  { code: "zh-cn", name: "Chinese", flag: "🇨🇳", dialects: [] },
  { code: "ja", name: "Japanese",   flag: "🇯🇵", dialects: [] },
  { code: "hu", name: "Hungarian",  flag: "🇭🇺", dialects: [] },
  { code: "ko", name: "Korean",     flag: "🇰🇷", dialects: [] },
  { code: "hi", name: "Hindi",      flag: "🇮🇳", dialects: [] },
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

export default function NewDub() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState("es");
  const [dialect, setDialect] = useState("Latin American");
  const [langSearch, setLangSearch] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [voicePresets, setVoicePresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null); // null = use original voice
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch("/api/presets")
      .then(r => r.ok ? r.json() : { presets: [] })
      .then(data => setVoicePresets((data.presets || []).filter(p => p.status === "READY")))
      .catch(() => {});
  }, []);

  const canSubmit = !!file;

  async function handleStartDubbing() {
    if (!canSubmit) { setAttempted(true); return; }
    setUploading(true);
    setUploadError(null);
    try {
      // 1. Upload source video to R2 via backend
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { file_key } = await uploadRes.json();

      // 2. Create dubbing job
      const dubBody = {
        file_key,
        project_id: crypto.randomUUID().slice(0, 8),
        target_language: selectedLang.code,
      };
      if (selectedPreset) dubBody.voice_preset_id = selectedPreset;

      const dubRes = await authFetch("/api/dub", {
        method: "POST",
        body: JSON.stringify(dubBody),
      });
      if (!dubRes.ok) throw new Error("Failed to start dubbing job");
      const { job_id } = await dubRes.json();

      // 3. Hand off to loading screen
      navigate("/loading", { state: { job_id } });
    } catch (err) {
      setUploadError(err.message || "Something went wrong");
      setUploading(false);
    }
  }

  const selectedLang = LANGUAGES.find(l => l.code === selected);
  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase())
  );

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (f) setFile(f);
  }

  function handleSelectLang(code) {
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
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>New Dub</h1>
          <p style={styles.subtitle}>Translate and dub your video content effortlessly.</p>
        </div>

        <div style={styles.card}>
          {/* Upload section */}
          <p style={styles.sectionLabel}>Upload your video</p>

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

          <div style={styles.formatBar}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
              <path d="M12 16v-4M12 8h.01" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={styles.formatText}>
              Supported formats: <strong style={{ color: "rgba(255,255,255,0.65)" }}>MP4</strong>
              {/*<span style={styles.formatDot}>·</span>*/}
              {/*Max file size: <strong style={{ color: "rgba(255,255,255,0.65)" }}>500MB</strong>*/}
            </span>
          </div>

          {attempted && !file && (
            <p style={styles.fieldError}>Please upload a video before starting.</p>
          )}

          <div style={styles.divider} />

          {/* Language selection section */}
          <p style={styles.sectionLabel}>Select target language</p>

          <div style={styles.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              value={langSearch}
              onChange={e => setLangSearch(e.target.value)}
              placeholder="Search for a language (e.g. Japanese, German...)"
              style={styles.searchInput}
            />
          </div>

          <div style={styles.langGrid}>
            {filtered.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleSelectLang(lang.code)}
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

          {/* Voice Preset selector */}
          {voicePresets.length > 0 && (
            <>
              <div style={styles.divider} />
              <p style={styles.sectionLabel}>Voice preset (optional)</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "-4px 0 12px", lineHeight: 1.5 }}>
                Use a fine-tuned voice model for higher quality dubbing, or keep the default to clone directly from the video.
              </p>
              <div style={styles.presetRow}>
                <button
                  onClick={() => setSelectedPreset(null)}
                  style={{
                    ...styles.presetChip,
                    ...(selectedPreset === null ? styles.presetChipActive : {}),
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Default (from video)
                </button>
                {voicePresets.map(p => (
                  <button
                    key={p.voice_preset_id}
                    onClick={() => setSelectedPreset(p.voice_preset_id)}
                    style={{
                      ...styles.presetChip,
                      ...(selectedPreset === p.voice_preset_id ? styles.presetChipActive : {}),
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {uploadError && (
            <p style={styles.fieldError}>{uploadError}</p>
          )}

          <div style={styles.navRow}>
            <button
              style={{ ...styles.startBtn, ...((canSubmit && !uploading) ? {} : styles.startBtnDisabled) }}
              onClick={handleStartDubbing}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Start Dubbing"}
            </button>
          </div>
        </div>

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

      <footer style={styles.footer}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: 600,
    margin: "0 0 14px",
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
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "24px 0",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "11px 16px",
    marginBottom: 16,
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
    gap: 10,
    marginBottom: 20,
  },
  langCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
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
    fontSize: 26,
    lineHeight: 1,
  },
  langName: {
    fontSize: 13,
    fontWeight: 600,
  },
  dialectSection: {
    marginBottom: 24,
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
  presetRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  presetChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: "7px 16px",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    cursor: "pointer",
    transition: "all 0.18s",
    fontFamily: "inherit",
  },
  presetChipActive: {
    background: "rgba(0,229,160,0.12)",
    border: "1px solid #00e5a0",
    color: "#00e5a0",
  },
  navRow: {
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: 20,
    borderTop: "1px solid rgba(255,255,255,0.06)",
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
  startBtnDisabled: {
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.25)",
    cursor: "not-allowed",
  },
  fieldError: {
    fontSize: 12,
    color: "#ff6b6b",
    margin: "8px 0 0",
    textAlign: "center",
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