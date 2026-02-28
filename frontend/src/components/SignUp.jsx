import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!fullName.trim()) e.fullName = true;
    if (!email.includes("@")) e.email = true;
    if (password.length < 8) e.password = true;
    return e;
  }

  function handleSubmit(evt) {
    evt.preventDefault();
    navigate('/dashboard');
  }

  function inputStyle(id) {
    const hasError = errors[id];
    const isFocused = focusedField === id;
    return {
      ...s.input,
      borderColor: hasError
        ? "rgba(255,77,109,0.55)"
        : isFocused
        ? "rgba(0,229,160,0.45)"
        : "rgba(255,255,255,0.09)",
      background: isFocused
        ? "rgba(0,229,160,0.03)"
        : "rgba(255,255,255,0.04)",
      boxShadow: isFocused
        ? "0 0 0 3px rgba(0,229,160,0.08)"
        : hasError
        ? "0 0 0 3px rgba(255,77,109,0.08)"
        : "none",
    };
  }

  return (
    <div style={s.app}>
      <Header hideSearch={true} />

      <main style={s.main}>
        {/* Background glow */}
        <div style={s.glow} />

        <div style={s.content}>
          <h1 style={s.title}>Create account</h1>
          <p style={s.subtitle}>Start dubbing your content in minutes</p>

          <form onSubmit={handleSubmit} style={s.form} noValidate>

            {/* Full Name */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setErrors(v => ({ ...v, fullName: false })); }}
                onFocus={() => setFocusedField("fullName")}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your full name"
                style={inputStyle("fullName")}
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: false })); }}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                placeholder="email@example.com"
                style={inputStyle("email")}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Password</label>
              <div style={s.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: false })); }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Min. 8 characters"
                  style={{ ...inputStyle("password"), paddingRight: 44 }}
                  autoComplete="new-password"
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
              {/* Inline password strength hint */}
              {password.length > 0 && (
                <div style={s.strengthRow}>
                  {[...Array(4)].map((_, i) => {
                    const strength = password.length < 6 ? 1 : password.length < 8 ? 2 : password.length < 12 ? 3 : 4;
                    const colors = ["#ff4d6d", "#ff9f43", "#feca57", "#00e5a0"];
                    return (
                      <div key={i} style={{
                        ...s.strengthBar,
                        background: i < strength ? colors[strength - 1] : "rgba(255,255,255,0.08)",
                      }} />
                    );
                  })}
                  <span style={{ ...s.strengthLabel, color: password.length < 6 ? "#ff4d6d" : password.length < 8 ? "#ff9f43" : password.length < 12 ? "#feca57" : "#00e5a0" }}>
                    {password.length < 6 ? "Weak" : password.length < 8 ? "Fair" : password.length < 12 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
            </div>

            {/* Error summary */}
            {Object.values(errors).some(Boolean) && (
              <div style={s.errorRow}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#ff4d6d" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={s.errorText}>Please fix the highlighted fields above.</span>
              </div>
            )}

            {/* Terms */}
            <p style={s.terms}>
              By creating an account, you agree to our{" "}
              <a href="#" style={s.termsLink}>Terms of Service</a>
              {" "}and{" "}
              <a href="#" style={s.termsLink}>Privacy Policy</a>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.8 : 1 }}
            >
              {loading ? (
                <span style={s.spinnerRow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={s.spinner}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(10,26,24,0.25)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="#0a1a18" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </form>

          {/* Log in redirect */}
          <p style={s.loginRow}>
            Already have an account?{" "}
            <a href="#" style={s.loginLink} onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Log in</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerLeft}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M3 5h12M9 3v2m4.5 13c0 2.485-2.015 4.5-4.5 4.5S4.5 20.485 4.5 18c0-2.484 2.015-4.5 4.5-4.5s4.5 2.016 4.5 4.5z" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
            <path d="M15 5c0 4-3 7-3 7m5-7c2 3 2 7 2 7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={s.footerCopy}>© 2024 POLYGLOT DUBS</span>
        </div>
        <div style={s.footerLinks}>
          {["Support", "Contact", "Status"].map((l, i) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {i > 0 && <span style={s.footerDot}>·</span>}
              <a href="#" style={s.footerLink}>{l}</a>
            </span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        input::placeholder { color: rgba(255,255,255,0.22); }
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
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 560,
    height: 360,
    borderRadius: "50%",
    background: "radial-gradient(ellipse, rgba(0,229,160,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  content: {
    width: "100%",
    maxWidth: 420,
    position: "relative",
    zIndex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: 800,
    margin: "0 0 6px",
    letterSpacing: "-0.6px",
  },
  subtitle: {
    fontSize: 13,
    color: "#00e5a0",
    margin: "0 0 30px",
    fontWeight: 500,
    opacity: 0.85,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.7)",
  },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 13,
    fontWeight: 400,
    padding: "12px 14px",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
  },
  passwordWrap: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 13,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "rgba(0,229,160,0.55)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  strengthRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    transition: "background 0.3s",
  },
  strengthLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    marginLeft: 4,
    minWidth: 36,
  },
  errorRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginTop: -4,
  },
  errorText: {
    fontSize: 12,
    color: "#ff4d6d",
  },
  terms: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    lineHeight: 1.6,
    margin: "-2px 0 0",
    fontWeight: 400,
  },
  termsLink: {
    color: "#00e5a0",
    textDecoration: "none",
    fontWeight: 500,
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
    transition: "opacity 0.2s",
    marginTop: 2,
  },
  spinnerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinner: {
    animation: "spin 0.8s linear infinite",
  },
  loginRow: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
    marginTop: 22,
    fontWeight: 400,
  },
  loginLink: {
    color: "#00e5a0",
    fontWeight: 700,
    textDecoration: "none",
  },

  // Footer
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 28px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    background: "#071412",
  },
  footerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  footerCopy: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    color: "rgba(255,255,255,0.25)",
  },
  footerLinks: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  footerDot: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 14,
  },
  footerLink: {
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    textDecoration: "none",
  },
};