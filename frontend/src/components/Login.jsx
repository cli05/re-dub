import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import { login } from "../auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (id) => ({
    ...s.input,
    borderColor: error && !{ email: email, password: password }[id]
      ? "rgba(255,77,109,0.5)"
      : focusedField === id
      ? "rgba(0,229,160,0.45)"
      : "rgba(255,255,255,0.09)",
    background: focusedField === id
      ? "rgba(0,229,160,0.03)"
      : "rgba(255,255,255,0.04)",
    boxShadow: focusedField === id
      ? "0 0 0 3px rgba(0,229,160,0.08)"
      : "none",
  });

  return (
    <div style={s.app}>
      <Header hideSearch={true} hideNewDub={true} hideDropdown={true} />

      {/* Centered login area */}
      <main style={s.main}>
        {/* Subtle background glow */}
        <div style={s.glow} />

        <div style={s.card}>
          <h1 style={s.title}>Log In</h1>
          <p style={s.subtitle}>Welcome back to Redub.</p>

          <form onSubmit={handleSubmit} style={s.form}>
            {/* Email */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Username or Email</label>
              <input
                type="text"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your username or email"
                style={inputStyle("email")}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <div style={s.labelRow}>
                <label style={s.label}>Password</label>
              </div>
              <div style={s.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  style={{ ...inputStyle("password"), paddingRight: 42 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={s.eyeBtn}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={s.errorRow}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#ff4d6d" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={s.errorText}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              style={{
                ...s.submitBtn,
                opacity: loading ? 0.8 : 1,
              }}
              disabled={loading}
            >
              {loading ? (
                <span style={s.spinnerWrap}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={s.spinner}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(10,26,24,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="#0a1a18" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p style={s.signupRow}>
            Don't have an account?{" "}
            <a href="#" style={s.signupLink} onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Sign Up</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerLeft}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 5h12M9 3v2m4.5 13c0 2.485-2.015 4.5-4.5 4.5S4.5 20.485 4.5 18c0-2.484 2.015-4.5 4.5-4.5s4.5 2.016 4.5 4.5z" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
            <path d="M15 5c0 4-3 7-3 7m5-7c2 3 2 7 2 7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={s.footerCopy}>© 2024 Redub</span>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const s = {
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    position: "relative",
  },
  glow: {
    position: "absolute",
    top: "30%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(ellipse, rgba(0,229,160,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "36px 36px 32px",
    width: "100%",
    maxWidth: 420,
    position: "relative",
    zIndex: 1,
    boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.42)",
    margin: "0 0 28px",
    fontWeight: 400,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: "rgba(255,255,255,0.5)",
  },
  forgotLink: {
    fontSize: 12,
    color: "#00e5a0",
    textDecoration: "none",
    fontWeight: 500,
    opacity: 0.85,
  },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 13,
    fontWeight: 400,
    padding: "11px 14px",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
    boxSizing: "border-box",
  },
  passwordWrap: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.35)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s",
  },
  errorRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginTop: -6,
  },
  errorText: {
    fontSize: 12,
    color: "#ff4d6d",
  },
  submitBtn: {
    width: "100%",
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "-0.2px",
    boxShadow: "0 0 24px rgba(0,229,160,0.25)",
    marginTop: 2,
    transition: "opacity 0.2s",
  },
  spinnerWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinner: {
    animation: "spin 0.8s linear infinite",
  },
  signupRow: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
    margin: "22px 0 0",
    fontWeight: 400,
  },
  signupLink: {
    color: "#00e5a0",
    fontWeight: 700,
    textDecoration: "none",
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
  footerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  footerCopy: {
    fontSize: 12,
    color: "rgba(255,255,255,0.28)",
  },
  footerLinks: {
    display: "flex",
    gap: 24,
  },
  footerLink: {
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    textDecoration: "none",
  },
};