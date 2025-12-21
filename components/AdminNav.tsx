// components/AdminNav.tsx
// @ts-nocheck
//
// Staff admin navigation.
// - Uses relative routes (no hardcoded localhost).
// - Logout redirects using window.location.origin.

import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type NavItem = {
  label: string;
  href: string;
};

const ITEMS: NavItem[] = [
  { label: "Events", href: "/admin/events" },
  { label: "Requests", href: "/admin/requests" },
  { label: "COAs", href: "/admin/coas" },
  { label: "Create", href: "/admin/create" },
  { label: "Artists", href: "/admin/artists" },
  { label: "Artist Requests", href: "/admin/artist-requests" },
];

export default function AdminNav() {
  const router = useRouter();

  async function onLogout() {
    await supabase.auth.signOut();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    router.replace(origin ? `${origin}/login` : "/login");
  }

  return (
    <nav style={navStyle}>
      <div style={innerStyle}>
        <Link href="/admin" style={brandStyle}>
          Raw Authentics
        </Link>

        <div style={linksWrapStyle}>
          {ITEMS.map((item) => {
            const active =
              router.pathname === item.href ||
              (item.href !== "/admin" && router.asPath.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ ...linkStyle, ...(active ? activeLinkStyle : null) }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div style={rightStyle}>
          <button onClick={onLogout} style={logoutBtnStyle}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  background: "#fff",
  borderBottom: "1px solid #eaeaea",
  fontFamily: "Arial, sans-serif",
};

const innerStyle: React.CSSProperties = {
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

const linksWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1.1rem",
  flexWrap: "wrap",
  justifyContent: "center",
  flex: 1,
};

const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#111",
  fontWeight: 900,
  padding: "0.25rem 0.15rem",
};

const activeLinkStyle: React.CSSProperties = {
  color: "#1976d2",
  textDecoration: "underline",
  textUnderlineOffset: 6,
};

const rightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const logoutBtnStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.5rem 0.75rem",
  borderRadius: 10,
  fontWeight: 900,
  cursor: "pointer",
};
