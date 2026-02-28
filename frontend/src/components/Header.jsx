import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ hideSearch = false }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header style={styles.header}>
      <div style={styles.headerLeft}>
        <div style={styles.logo} onClick={() => navigate('/dashboard')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 5h12M9 3v2m4.5 13c0 2.485-2.015 4.5-4.5 4.5S4.5 20.485 4.5 18c0-2.484 2.015-4.5 4.5-4.5s4.5 2.016 4.5 4.5z" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
            <path d="M15 5c0 4-3 7-3 7m5-7c2 3 2 7 2 7" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={styles.logoText}>PolyGlot Dubs</span>
        </div>
        {!hideSearch && <div style={styles.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
            <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input placeholder="Search projects..." style={styles.search} />
        </div>}
      </div>
      <div style={styles.headerRight}>
        <button style={styles.newDubBtn} onClick={() => navigate('/new-dub')}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          <span>New Dub</span>
        </button>
        <div style={styles.avatarWrap} ref={dropdownRef}>
          <div style={styles.avatar} onClick={() => setDropdownOpen(v => !v)}>
            <img src="https://i.pravatar.cc/32?img=5" alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          {dropdownOpen && (
            <div style={styles.dropdown}>
              <button
                style={styles.dropdownItem}
                onClick={() => { setDropdownOpen(false); navigate('/account-settings'); }}
              >
                Account Settings
              </button>
              <button
                style={{ ...styles.dropdownItem, ...styles.dropdownItemLogout }}
                onClick={() => { setDropdownOpen(false); navigate('/login'); }}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    height: 60,
    background: "#0d2420",
    borderBottom: "1px solid rgba(0,229,160,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  logoText: {
    fontSize: 16,
    fontWeight: 600,
    color: "#fff",
    letterSpacing: "-0.3px",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "8px 14px",
    width: 280,
  },
  search: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    width: "100%",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  newDubBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#00e5a0",
    color: "#0a1a18",
    border: "none",
    borderRadius: 8,
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 180,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    zIndex: 200,
  },
  dropdownItem: {
    display: "block",
    width: "100%",
    padding: "11px 16px",
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s",
  },
  dropdownItemLogout: {
    color: "#ff4d6d",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
};
