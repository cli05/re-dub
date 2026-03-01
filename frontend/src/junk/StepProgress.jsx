import React from "react";

const STEPS = [
  {
    id: 1,
    label: "Upload",
    icon: (active, done) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        {done
          ? <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        }
      </svg>
    ),
  },
  {
    id: 2,
    label: "Language",
    icon: (active, done) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        {done
          ? <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          : <>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="2"/>
            </>
        }
      </svg>
    ),
  },
  {
    id: 3,
    label: "Preferences",
    icon: (active, done) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        {done
          ? <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        }
      </svg>
    ),
  },
  {
    id: 4,
    label: "Confirm",
    icon: (active, done) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function StepProgress({ activeStep = 1 }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.inner}>
        {STEPS.map((step, i) => {
          const isActive = step.id === activeStep;
          const isDone = step.id < activeStep;

          return (
            <React.Fragment key={step.id}>
              {i > 0 && (
                <div style={{
                  ...styles.line,
                  background: STEPS[i - 1].id < activeStep
                    ? "#00e5a0"
                    : "rgba(255,255,255,0.1)",
                }} />
              )}
              <div style={styles.stepItem}>
                <div style={{
                  ...styles.iconWrap,
                  background: isActive
                    ? "#00e5a0"
                    : isDone
                    ? "rgba(0,229,160,0.15)"
                    : "rgba(255,255,255,0.07)",
                  border: isActive
                    ? "none"
                    : isDone
                    ? "1.5px solid #00e5a0"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: isActive
                    ? "#0a1a18"
                    : isDone
                    ? "#00e5a0"
                    : "rgba(255,255,255,0.25)",
                  boxShadow: isActive ? "0 0 18px rgba(0,229,160,0.35)" : "none",
                }}>
                  {step.icon(isActive, isDone)}
                </div>
                <div style={styles.stepLabels}>
                  <span style={{
                    ...styles.stepName,
                    color: isActive ? "#fff" : isDone ? "#00e5a0" : "rgba(255,255,255,0.35)",
                    fontWeight: isActive || isDone ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                  <span style={{
                    ...styles.stepStatus,
                    color: isActive
                      ? "#00e5a0"
                      : isDone
                      ? "rgba(0,229,160,0.6)"
                      : "rgba(255,255,255,0.2)",
                  }}>
                    {isActive ? "ACTIVE" : isDone ? "COMPLETED" : "PENDING"}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    background: "#0f2420",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "20px 28px",
    marginBottom: 20,
  },
  inner: {
    display: "flex",
    alignItems: "center",
  },
  line: {
    flex: 1,
    height: 1.5,
    marginBottom: 22,
    transition: "background 0.3s",
  },
  stepItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    width: 80,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s",
  },
  stepLabels: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  stepName: {
    fontSize: 13,
    transition: "color 0.3s",
  },
  stepStatus: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: 600,
  },
};