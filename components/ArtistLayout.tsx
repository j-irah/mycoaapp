// components/ArtistLayout.tsx
// Layout wrapper for artist pages.
// Includes top navigation + logout redirecting to current origin.
// Uses relative routes only.

import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type Props = {
  children: React.ReactNode;
  title?: string;
};

export default function ArtistLayout({ children, title }: Props) {
  const router = useRouter();

  async function onLogout() {
    await supabase.auth.signOut();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    router.replace(origin ? `${origin}/login` : "/login");
  }

  const items = [
    { label: "Dashboard", href: "/artist/dashboard" },
    { label: "My Events", href: "/artist/events" },
    { label: "Create Event", href: "/artist/events/new" },
  ];

  return (
    <div style={pageStyle}>
      <nav style={navStyle}>
        <div style={navInner}>
          <Link href="/artist/dashboard" style={brandStyle}>
            Raw Authentics
          </Link>

          <div style={navLinks}>
            {items.map((item) => {
              const active =
                router.pathname === item.href ||
                (item.href !== "/artist/dashboard" && router.asPath.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ ...navLinkStyle, ...(active ? activeNavLinkStyle : null) }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <button onClick={onLogout} style={logoutBtn}>
            Logout
          </button>
        </div>
      </nav>

      <div style={containerStyle}>
        {title ? <h1 style={h1}>{title}</h1> : null}
        {children}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f3f3",
  fontFamily: "Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "1.5rem",
};

const h1: React.CSSProperties = { margin: "0 0 1rem 0", fontWeight: 900 };

const navStyle: React.CSSProperties = {
  background: "#fff",
  borderBottom: "1px solid #eaeaea",
};

const navInner: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0.9rem 1.25rem",
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  justifyContent: "space-between",
};

const brandStyle: React.CSSProperties = {
  fontWeight: 900,
  textDecoration: "none",
  color: "#111",
  fontSize: "1.05rem",
  whiteSpace: "nowrap",
};

const navLinks: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1.1rem",
  flexWrap: "wrap",
  justifyContent: "center",
  flex: 1,
};

const navLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#111",
  fontWeight: 900,
  padding: "0.25rem 0.15rem",
};

const activeNavLinkStyle: React.CSSProperties = {
  color: "#1976d2",
  textDecoration: "underline",
  textUnderlineOffset: 6,
};

const logoutBtn: React.CSSProperties = {
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.5rem 0.75rem",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};
