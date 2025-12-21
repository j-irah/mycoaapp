// components/CollectorLayout.tsx
// Collector layout wrapper with exported shared styles.
// Logout redirects to current site origin (no localhost hardcoding).

import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type Action = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: Action[];
};

export const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f3f3f3",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "1.5rem",
  },

  nav: {
    background: "#fff",
    borderBottom: "1px solid #eaeaea",
  },

  navInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0.9rem 1.25rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    justifyContent: "space-between",
  },

  brand: {
    fontWeight: 900,
    textDecoration: "none",
    color: "#111",
    fontSize: "1.05rem",
    whiteSpace: "nowrap",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "1.1rem",
    flexWrap: "wrap",
    justifyContent: "center",
    flex: 1,
  },

  navLink: {
    textDecoration: "none",
    color: "#111",
    fontWeight: 900,
    padding: "0.25rem 0.15rem",
  },

  navLinkActive: {
    color: "#1976d2",
    textDecoration: "underline",
    textUnderlineOffset: 6,
  },

  logoutBtn: {
    border: "1px solid #ddd",
    background: "#f7f7f7",
    padding: "0.5rem 0.75rem",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontWeight: 900,
    fontSize: "1.9rem",
  },

  subtitle: {
    marginTop: 6,
    color: "#666",
    fontWeight: 700,
  },

  actionsRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  actionPrimary: {
    display: "inline-block",
    borderRadius: 12,
    background: "#1976d2",
    color: "#fff",
    padding: "0.7rem 0.95rem",
    fontWeight: 900,
    textDecoration: "none",
  },

  actionSecondary: {
    display: "inline-block",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "#f7f7f7",
    padding: "0.7rem 0.95rem",
    fontWeight: 900,
    textDecoration: "none",
    color: "#111",
  },

  // shared UI blocks
  errorBox: {
    background: "#ffe6e6",
    border: "1px solid #ffb3b3",
    color: "#7a0000",
    fontWeight: 900,
    borderRadius: 12,
    padding: "0.9rem",
    marginTop: "1rem",
  },

  infoBox: {
    background: "#fafafa",
    border: "1px solid #ddd",
    color: "#333",
    fontWeight: 900,
    borderRadius: 12,
    padding: "0.9rem",
    marginTop: "1rem",
  },

  // dashboard-style components used by your pages
  statsGrid: {
    marginTop: "1rem",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.75rem",
  },

  statCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "1rem",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },

  statLabel: {
    color: "#666",
    fontWeight: 900,
  },

  statValue: {
    fontWeight: 900,
    fontSize: "2rem",
    marginTop: 6,
  },

  statValueSmall: {
    fontWeight: 900,
    fontSize: "1rem",
    marginTop: 6,
    color: "#333",
  },

  cardWide: {
    background: "#fff",
    borderRadius: 14,
    padding: "1.1rem",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    marginTop: "1rem",
  },

  cardWideTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  cardTitle: {
    margin: 0,
    fontWeight: 900,
    fontSize: "1.2rem",
  },

  cardText: {
    marginTop: 8,
    color: "#666",
    fontWeight: 700,
    maxWidth: 680,
  },

  linkPill: {
    display: "inline-block",
    borderRadius: 999,
    border: "1px solid #ddd",
    background: "#f7f7f7",
    padding: "0.45rem 0.75rem",
    fontWeight: 900,
    textDecoration: "none",
    color: "#111",
  },

  twoColGrid: {
    marginTop: "1rem",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "0.75rem",
  },

  card: {
    background: "#fff",
    borderRadius: 14,
    padding: "1.1rem",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },

  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 10,
  },

  cardHeaderLink: {
    fontWeight: 900,
    color: "#1976d2",
    textDecoration: "none",
  },

  emptyState: {
    color: "#666",
    fontWeight: 800,
    lineHeight: 1.5,
  },

  list: {
    display: "grid",
    gap: "0.6rem",
  },

  listRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: "0.8rem",
  },

  rowTitle: {
    fontWeight: 900,
    color: "#111",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  rowMeta: {
    marginTop: 4,
    color: "#666",
    fontWeight: 700,
    fontSize: "0.9rem",
  },

  inlineLink: {
    display: "inline-block",
    marginTop: 6,
    fontWeight: 900,
    color: "#1976d2",
    textDecoration: "none",
  },

  badgeBase: {
    display: "inline-block",
    padding: "0.2rem 0.55rem",
    borderRadius: 999,
    border: "1px solid transparent",
    fontWeight: 900,
    fontSize: "0.9rem",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },

  badgeApproved: {
    background: "#e9f7ef",
    border: "1px solid #b7ebc6",
    color: "#14532d",
  },

  badgeRejected: {
    background: "#ffe6e6",
    border: "1px solid #ffb3b3",
    color: "#7a0000",
  },

  badgePending: {
    background: "#fff3cd",
    border: "1px solid #ffeeba",
    color: "#664d03",
  },
};

export default function CollectorLayout({ children, title, subtitle, actions }: Props) {
  const router = useRouter();

  async function onLogout() {
    await supabase.auth.signOut();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    router.replace(origin ? `${origin}/login` : "/login");
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Requests", href: "/my/requests" },
    { label: "My COAs", href: "/my/coas" },
  ];

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <Link href="/dashboard" style={styles.brand}>
            Raw Authentics
          </Link>

          <div style={styles.navLinks}>
            {navItems.map((item) => {
              const active =
                router.pathname === item.href ||
                (item.href !== "/dashboard" && router.asPath.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ ...styles.navLink, ...(active ? styles.navLinkActive : null) }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <button onClick={onLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </nav>

      <div style={styles.container}>
        {(title || subtitle || (actions && actions.length)) && (
          <div style={styles.headerRow}>
            <div>
              {title && <h1 style={styles.title}>{title}</h1>}
              {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
            </div>

            {actions && actions.length > 0 && (
              <div style={styles.actionsRow}>
                {actions.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    style={a.variant === "primary" ? styles.actionPrimary : styles.actionSecondary}
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
