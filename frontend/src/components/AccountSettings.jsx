import { useState } from "react";
import Header from "./Header";
import { getUser, authFetch } from "../auth";

const LANGUAGES = [
  "Spanish (Español)",
  "French (Français)",
  "Mandarin (普通话)",
  "Hindi (हिन्दी)",
  "Arabic (العربية)",
  "Portuguese (Português)",
  "German (Deutsch)",
  "Japanese (日本語)",
  "Korean (한국어)",
  "Italian (Italiano)",
  "Russian (Русский)",
  "Turkish (Türkçe)",
];

function SectionCard({ icon, title, children }) {
  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardIcon}>{icon}</div>
        <h2 style={s.cardTitle}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

export default function AccountSettings() {
  const storedUser = getUser();
  const [fullName, setFullName] = useState(storedUser?.display_name ?? "");
  const [email] = useState(storedUser?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [language, setLanguage] = useState(
    storedUser?.preferences?.preferred_language ?? "Spanish (Español)"
  );
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  async function handleSave() {
    setApiError("");

    // Validate password fields if the user is trying to change password
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setApiError("New passwords do not match.");
        return;
      }
      if (!currentPassword) {
        setApiError("Enter your current password to set a new one.");
        return;
      }
    }

    try {
      // Update profile (display_name + preferred_language preference)
      const profileRes = await authFetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: fullName,
          preferences: { preferred_language: language },
        }),
      });
      if (!profileRes.ok) {
        const err = await profileRes.json();
        throw new Error(err.detail || "Failed to save profile");
      }
      const updatedUser = await profileRes.json();
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));

      // Change password if requested
      if (newPassword) {
        const pwRes = await authFetch("/api/auth/me/password", {
          method: "POST",
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });
        if (!pwRes.ok) {
          const err = await pwRes.json();
          throw new Error(err.detail || "Failed to update password");
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setApiError(err.message);
    }
  }

  function handleDiscard() {
    const u = getUser();
    setFullName(u?.display_name ?? "");
    setLanguage(u?.preferences?.preferred_language ?? "Spanish (Español)");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setApiError("");
  }

  const inputStyle = (id) => ({
    ...s.input,
    borderColor: focusedField === id ? "rgba(0,229,160,0.5)" : "rgba(255,255,255,0.09)",
    background: focusedField === id ? "rgba(0,229,160,0.03)" : "rgba(255,255,255,0.04)",
    boxShadow: focusedField === id ? "0 0 0 3px rgba(0,229,160,0.08)" : "none",
  });

  return (
    <div style={s.app}>
      <Header />

      <main style={s.main}>
        {/* Page title */}
        <div style={s.titleBlock}>
          <h1 style={s.title}>Account Settings</h1>
          <p style={s.subtitle}>Manage your profile information and dubbing preferences.</p>
        </div>

        {/* Profile Settings */}
        <SectionCard
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#00e5a0" strokeWidth="2"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }
          title="Profile Settings"
        >
          <div style={s.fieldRow}>
            <Field label="Full Name">
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                style={inputStyle("name")}
              />
            </Field>
            <Field label="Email Address">
              <input
                value={email}
                readOnly
                style={{ ...inputStyle("email"), opacity: 0.55, cursor: "default" }}
                type="email"
              />
            </Field>
          </div>
        </SectionCard>

        {/* Password Section */}
        <SectionCard
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#00e5a0" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }
          title="Password Section"
        >
          <Field label="Current Password">
            <input
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              onFocus={() => setFocusedField("curpw")}
              onBlur={() => setFocusedField(null)}
              type="password"
              placeholder="Enter current password"
              style={{ ...inputStyle("curpw"), maxWidth: 280 }}
            />
          </Field>
          <div style={s.fieldRow}>
            <Field label="New Password">
              <input
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                onFocus={() => setFocusedField("newpw")}
                onBlur={() => setFocusedField(null)}
                type="password"
                placeholder="Min. 8 characters"
                style={inputStyle("newpw")}
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField("confpw")}
                onBlur={() => setFocusedField(null)}
                type="password"
                placeholder="Confirm password"
                style={{
                  ...inputStyle("confpw"),
                  borderColor: confirmPassword && newPassword && confirmPassword !== newPassword
                    ? "rgba(255,77,109,0.5)"
                    : focusedField === "confpw"
                    ? "rgba(0,229,160,0.5)"
                    : "rgba(255,255,255,0.09)",
                }}
              />
            </Field>
          </div>
          {confirmPassword && newPassword && confirmPassword !== newPassword && (
            <p style={s.errorMsg}>Passwords do not match</p>
          )}
        </SectionCard>

        {/* Preferences Section */}
        <SectionCard
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="#00e5a0" strokeWidth="2"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }
          title="Preferences Section"
        >
          <Field label="Preferred Target Language">
            <p style={s.fieldHint}>This will be the default output language for your new dubbing projects.</p>
            <div style={s.selectWrap}>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                style={s.select}
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={s.selectChevron}>
                <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </Field>
        </SectionCard>

        {/* Action buttons */}
        {apiError && <p style={{ color: "#ff4d6d", fontSize: 12, textAlign: "right", margin: "0 0 8px" }}>{apiError}</p>}
        <div style={s.actions}>
          <button style={s.discardBtn} onClick={handleDiscard}>
            Discard Changes
          </button>
          <button
            style={{
              ...s.saveBtn,
              background: saved ? "rgba(0,229,160,0.85)" : "#00e5a0",
            }}
            onClick={handleSave}
          >
            {saved ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#0a1a18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved!
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#0a1a18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerTop}>
          {/* Brand */}
          <div style={s.footerBrand}>
            <div style={s.footerLogo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 5h12M9 3v2m4.5 13c0 2.485-2.015 4.5-4.5 4.5S4.5 20.485 4.5 18c0-2.484 2.015-4.5 4.5-4.5s4.5 2.016 4.5 4.5z" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
                <path d="M15 5c0 4-3 7-3 7m5-7c2 3 2 7 2 7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span style={s.footerLogoText}>Redub</span>
            </div>
            <p style={s.footerTagline}>
              Breaking language barriers one video at a<br />time with cutting-edge AI technology.
            </p>
          </div>

          {/* Link columns */}
          {[
            {
              heading: "Product",
              links: ["Dashboard", "Pricing", "API Access"],
            },
            {
              heading: "Support",
              links: ["Help Center", "Community", "Contact Us"],
            },
            {
              heading: "Legal",
              links: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
            },
          ].map(col => (
            <div key={col.heading} style={s.footerCol}>
              <p style={s.footerColHeading}>{col.heading}</p>
              {col.links.map(l => (
                <a key={l} href="#" style={s.footerColLink}>{l}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={s.footerBottom}>
          <span style={s.footerCopy}>© 2024 Redub Inc. All rights reserved.</span>
          <div style={s.footerIcons}>
            {[
              <path key="g" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" stroke="none" fill="currentColor"/>,
              <><circle key="s1" cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/><circle key="s2" cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><circle key="s3" cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/><path key="s4" d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="2"/></>,
              <><rect key="m1" x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><polyline key="m2" points="22 7 12 13 2 7" stroke="currentColor" strokeWidth="2"/></>,
            ].map((icon, i) => (
              <button key={i} style={s.footerIconBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">{icon}</svg>
              </button>
            ))}
          </div>
        </div>
      </footer>
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
    maxWidth: 700,
    margin: "0 auto",
    width: "100%",
    padding: "36px 24px 48px",
  },
  titleBlock: {
    marginBottom: 28,
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
    margin: 0,
    fontWeight: 400,
  },

  // Card
  card: {
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "22px 24px 26px",
    marginBottom: 16,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "rgba(0,229,160,0.1)",
    border: "1px solid rgba(0,229,160,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.2px",
  },

  // Fields
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  fieldLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontWeight: 500,
  },
  fieldHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.32)",
    margin: "-3px 0 6px",
    lineHeight: 1.5,
  },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 9,
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    padding: "10px 14px",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
  },
  errorMsg: {
    fontSize: 11,
    color: "#ff4d6d",
    marginTop: 4,
  },
  selectWrap: {
    position: "relative",
    display: "inline-block",
    maxWidth: 280,
    width: "100%",
  },
  select: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 9,
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    padding: "10px 38px 10px 14px",
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
  },
  selectChevron: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },

  // Actions
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  discardBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: "10px 18px",
    borderRadius: 8,
    fontFamily: "inherit",
    transition: "color 0.18s",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 9,
    padding: "10px 24px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.2s",
    boxShadow: "0 0 20px rgba(0,229,160,0.25)",
  },

  // Footer
  footer: {
    background: "#0d2420",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "40px 48px 24px",
  },
  footerTop: {
    display: "grid",
    gridTemplateColumns: "1.8fr 1fr 1fr 1fr",
    gap: 32,
    marginBottom: 36,
    maxWidth: 900,
    margin: "0 auto 36px",
  },
  footerBrand: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  footerLogo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  footerLogoText: {
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.3px",
  },
  footerTagline: {
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    lineHeight: 1.7,
    margin: 0,
  },
  footerCol: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  footerColHeading: {
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 2px",
    letterSpacing: "0.2px",
  },
  footerColLink: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    textDecoration: "none",
    lineHeight: 1.4,
    transition: "color 0.15s",
  },
  footerBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    borderTop: "1px solid rgba(255,255,255,0.05)",
    maxWidth: 900,
    margin: "0 auto",
  },
  footerCopy: {
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
  },
  footerIcons: {
    display: "flex",
    gap: 6,
  },
  footerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 7,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
};