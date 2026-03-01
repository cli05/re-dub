import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authFetch } from "../auth";

// Labels match the 5 step numbers emitted by the orchestrator
const STEPS = [
  { label: "Preparing",     detail: "Downloading video and extracting voice sample" },
  { label: "Transcribing",  detail: "Converting speech to text with Whisper large-v3" },
  { label: "Translating",   detail: "Translating segments with Llama 3.3-70B" },
  { label: "Cloning Voice", detail: "Synthesizing dubbed audio with XTTS v2" },
  { label: "Lip Syncing",   detail: "Rendering lip movements with LatentSync" },
];

const POLL_INTERVAL_MS = 3000;

export default function LoadingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const jobId = location.state?.job_id;

  // currentStep is 0-indexed (0 = Preparing, 4 = Lip Syncing)
  // Backend sends step 1-5; we store step-1 here.
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const intervalRef = useRef(null);

  // overallProgress: 0-100 fill for the progress bar
  // step 1 active → 0%, step 2 active → 20%, …, COMPLETED → 100%
  const overallProgress = done
    ? 100
    : (currentStep / STEPS.length) * 100;

  useEffect(() => {
    if (!jobId) {
      navigate("/new-dub");
      return;
    }

    async function poll() {
      try {
        const res = await authFetch(`/api/dub/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "COMPLETED") {
          clearInterval(intervalRef.current);
          setCurrentStep(STEPS.length - 1);
          setDone(true);
          setTimeout(() => navigate("/preview", { state: { downloadUrl: data.download_url } }), 1000);
          return;
        }

        if (data.status === "FAILED") {
          clearInterval(intervalRef.current);
          setFailed(true);
          setErrorMsg(data.error || "The pipeline encountered an error.");
          return;
        }

        // PROCESSING: step is 1-5 from orchestrator
        if (data.step >= 1) {
          setCurrentStep(data.step - 1); // convert to 0-indexed
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }

    poll(); // immediate first poll
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [jobId, navigate]);

  return (
    <div style={styles.page}>
      {/* Wordmark */}
      <div style={styles.wordmark}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 5h12M9 3v2m4.5 13c0 2.485-2.015 4.5-4.5 4.5S4.5 20.485 4.5 18c0-2.484 2.015-4.5 4.5-4.5s4.5 2.016 4.5 4.5z"
            stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"
          />
          <path
            d="M15 5c0 4-3 7-3 7m5-7c2 3 2 7 2 7"
            stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"
          />
        </svg>
        <span style={styles.wordmarkText}>Redub</span>
      </div>

      <div style={styles.content}>
        {/* Spinner / check icon */}
        <div style={styles.spinnerWrap}>
          <svg
            width="64" height="64" viewBox="0 0 64 64" fill="none"
            style={done || failed ? {} : styles.spin}
          >
            <circle cx="32" cy="32" r="28" stroke="rgba(0,229,160,0.12)" strokeWidth="4"/>
            {!done && !failed && (
              <circle
                cx="32" cy="32" r="28"
                stroke="url(#spinGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="44 132"
              />
            )}
            {(done || failed) && (
              <circle
                cx="32" cy="32" r="28"
                stroke={failed ? "#ff6b6b" : "#00e5a0"}
                strokeWidth="4"
              />
            )}
            <defs>
              <linearGradient id="spinGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00e5a0"/>
                <stop offset="1" stopColor="#4fc3f7"/>
              </linearGradient>
            </defs>
          </svg>

          {done && (
            <svg style={styles.spinnerIcon} width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#00e5a0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {failed && (
            <svg style={styles.spinnerIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#ff6b6b" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          )}
          {!done && !failed && (
            <svg style={styles.spinnerIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                stroke="#00e5a0" strokeWidth="1.5" strokeLinecap="round"
              />
              <path d="M10 9l5 3-5 3V9z" fill="#00e5a0"/>
            </svg>
          )}
        </div>

        <h1 style={styles.title}>
          {failed ? "Something went wrong" : done ? "Dub complete!" : "Processing your dub\u2026"}
        </h1>
        <p style={{ ...styles.subtitle, color: failed ? "#ff6b6b" : "rgba(255,255,255,0.4)" }}>
          {failed
            ? errorMsg
            : done
            ? "Your video is ready. Redirecting\u2026"
            : STEPS[currentStep].detail}
        </p>

        {/* Progress bar */}
        {!failed && (
          <div style={styles.barWrap}>
            <div style={styles.track}>
              <div style={{ ...styles.fill, width: `${overallProgress}%` }} />

              {STEPS.map((_, i) => {
                const pos = ((i + 1) / STEPS.length) * 100;
                const reached = overallProgress >= pos - 0.5;
                const active = currentStep === i && !done;
                return (
                  <div
                    key={i}
                    style={{
                      ...styles.dot,
                      left: `${pos}%`,
                      background: reached
                        ? "#00e5a0"
                        : active
                        ? "rgba(0,229,160,0.35)"
                        : "#0d2420",
                      borderColor: reached
                        ? "#00e5a0"
                        : active
                        ? "rgba(0,229,160,0.5)"
                        : "rgba(255,255,255,0.15)",
                      boxShadow: reached ? "0 0 10px rgba(0,229,160,0.45)" : "none",
                    }}
                  />
                );
              })}
            </div>

            <div style={styles.labelRow}>
              {STEPS.map((step, i) => {
                const pos = ((i + 1) / STEPS.length) * 100;
                const reached = overallProgress >= pos - 0.5;
                const active = currentStep === i && !done;
                return (
                  <span
                    key={i}
                    style={{
                      ...styles.stepLabel,
                      left: `${pos}%`,
                      color: reached
                        ? "#00e5a0"
                        : active
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(255,255,255,0.28)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {step.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {!failed && (
          <p style={styles.stepCounter}>
            {done
              ? `${STEPS.length} of ${STEPS.length} steps complete`
              : `Step ${currentStep + 1} of ${STEPS.length}`}
          </p>
        )}

        {failed && (
          <button style={styles.retryBtn} onClick={() => navigate("/new-dub")}>
            Try Again
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a1a18",
    fontFamily: "'DM Sans', 'Sora', sans-serif",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    position: "absolute",
    top: 24,
    left: 28,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  wordmarkText: {
    fontSize: 16,
    fontWeight: 600,
    color: "#fff",
    letterSpacing: "-0.3px",
  },
  content: {
    width: "100%",
    maxWidth: 560,
    padding: "0 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  spinnerWrap: {
    position: "relative",
    width: 64,
    height: 64,
    marginBottom: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spin: {
    animation: "spin 1.4s linear infinite",
  },
  spinnerIcon: {
    position: "absolute",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    margin: "0 0 8px",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    margin: "0 0 44px",
    textAlign: "center",
  },
  barWrap: {
    width: "100%",
    marginBottom: 36,
  },
  track: {
    position: "relative",
    height: 6,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 99,
    marginBottom: 30,
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    background: "linear-gradient(90deg, #00e5a0, #4fc3f7)",
    borderRadius: 99,
    transition: "width 0.4s ease",
  },
  dot: {
    position: "absolute",
    top: "50%",
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid",
    transform: "translate(-50%, -50%)",
    transition: "all 0.35s",
    zIndex: 2,
  },
  labelRow: {
    position: "relative",
    height: 18,
  },
  stepLabel: {
    position: "absolute",
    top: 0,
    fontSize: 11,
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    transition: "color 0.35s",
    letterSpacing: "0.2px",
  },
  stepCounter: {
    fontSize: 12,
    color: "rgba(255,255,255,0.2)",
    margin: 0,
    letterSpacing: "0.3px",
  },
  retryBtn: {
    marginTop: 16,
    background: "transparent",
    border: "1px solid rgba(255,107,107,0.4)",
    color: "#ff6b6b",
    borderRadius: 8,
    padding: "10px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};