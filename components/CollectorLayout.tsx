import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type LayoutAction =
  | { label: string; href: string; variant: "primary" | "secondary" }
  | { label: string; href: string; variant: "link" };

export type CollectorLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: LayoutAction[];
  children: React.ReactNode;
};

export default function CollectorLayout({ title, subtitle, actions, children }: CollectorLayoutProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      // Always send the user back to login
      router.replace("http://localhost:3000/login");
      setLoggingOut(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <h1 style={styles.title}>{title}</h1>
            {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
          </div>

          <div style={styles.headerRight}>
            {actions?.length ? (
              <div style={styles.headerActions}>
                {actions.map((a) => {
                  if (a.variant === "primary") {
                    return (
                      <Link key={a.href + a.label} href={a.href} style={styles.primaryBtn}>
                        {a.label}
                      </Link>
                    );
                  }
                  if (a.variant === "secondary") {
                    return (
                      <Link key={a.href + a.label} href={a.href} style={styles.secondaryBtn}>
                        {a.label}
                      </Link>
                    );
                  }
                  return (
                    <Link key={a.href + a.label} href={a.href} style={styles.linkBtn}>
                      {a.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                ...styles.logoutBtn,
                opacity: loggingOut ? 0.7 : 1,
                cursor: loggingOut ? "not-allowed" : "pointer",
              }}
              aria-label="Logout"
            >
              {loggingOut ? "Logging out…" : "Logout"}
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

/** Shared styling for all collector pages */
export const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f6f7fb 0%, #eef1f7 100%)",
    padding: "28px 16px",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
    color: "#0f172a",
  },
  container: { maxWidth: 1100, margin: "0 auto" },

  header: {
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerRight: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  title: { margin: 0, fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.02em" },
  subtitle: { margin: "8px 0 0 0", color: "#475569", fontSize: 16 },

  headerActions: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },

  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    background: "white",
    color: "#0f172a",
    fontWeight: 900,
    textDecoration: "none",
    border: "1px solid rgba(15, 23, 42, 0.12)",
  },
  linkBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    background: "transparent",
    color: "#2563eb",
    fontWeight: 900,
    textDecoration: "none",
  },

  logoutBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    background: "rgba(15, 23, 42, 0.06)",
    color: "#0f172a",
    fontWeight: 900,
    border: "1px solid rgba(15, 23, 42, 0.12)",
  },

  infoBox: {
    background: "white",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    color: "#334155",
  },
  errorBox: {
    background: "#fff1f2",
    border: "1px solid rgba(225, 29, 72, 0.25)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    color: "#9f1239",
    fontWeight: 900,
  },

  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    gridColumn: "span 3",
    background: "white",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  statLabel: {
    color: "#64748b",
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
  statValue: { marginTop: 6, fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" },
  statValueSmall: { marginTop: 8, fontSize: 14, fontWeight: 900, color: "#334155" },

  // Cards + grids
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: 14,
    marginTop: 14,
  },
  card: {
    gridColumn: "span 6",
    background: "white",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  cardWide: {
    background: "white",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  cardWideTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  cardHeaderRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  cardHeaderLink: {
    color: "#2563eb",
    fontWeight: 900,
    textDecoration: "none",
    fontSize: 14,
  },
  cardTitle: { margin: 0, fontSize: 18, letterSpacing: "-0.01em" },
  cardText: { marginTop: 8, marginBottom: 0, color: "#475569", lineHeight: 1.5 },

  // Lists
  list: { display: "grid", gap: 10, marginTop: 10 },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "rgba(15, 23, 42, 0.02)",
  },
  rowTitle: { fontWeight: 900, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  rowMeta: { marginTop: 4, color: "#64748b", fontSize: 12 },

  // Badges
  badgeBase: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    whiteSpace: "nowrap",
  },
  badgePending: { background: "rgba(59, 130, 246, 0.10)", color: "#1d4ed8" },
  badgeApproved: { background: "rgba(34, 197, 94, 0.14)", color: "#15803d" },
  badgeRejected: { background: "rgba(244, 63, 94, 0.12)", color: "#be123c" },

  // Extras
  emptyState: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    background: "rgba(15, 23, 42, 0.03)",
    border: "1px dashed rgba(15, 23, 42, 0.15)",
    color: "#475569",
    lineHeight: 1.5,
  },
  inlineLink: {
    color: "#2563eb",
    fontWeight: 900,
    textDecoration: "none",
  },
  linkPill: {
    display: "inline-flex",
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(15, 23, 42, 0.06)",
    color: "#0f172a",
    textDecoration: "none",
    fontWeight: 900,
    border: "1px solid rgba(15, 23, 42, 0.08)",
  },
};
