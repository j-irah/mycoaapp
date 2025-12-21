// components/AdminNav.tsx
// @ts-nocheck

import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const NAV_LINKS = [
  { label: "Dashboard", href: "http://localhost:3000/admin", match: "/admin" },
  { label: "Events", href: "http://localhost:3000/admin/events", match: "/admin/events" },
  { label: "Requests", href: "http://localhost:3000/admin/requests", match: "/admin/requests" },
  { label: "Create", href: "http://localhost:3000/admin/create", match: "/admin/create" },
  { label: "Artists", href: "http://localhost:3000/admin/artists", match: "/admin/artists" },
  { label: "Artist Requests", href: "http://localhost:3000/admin/artist-requests", match: "/admin/artist-requests" },
];

export default function AdminNav() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("http://localhost:3000/login?returnTo=/admin");
  }

  const isActive = (match: string) => {
    const path = router.pathname || "";
    if (match === "/admin") return path === "/admin";
    return path.startsWith(match);
  };

  return (
    <nav style={navStyle}>
      <div style={left}>
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} style={isActive(l.match) ? activeLink : linkStyle}>
            {l.label}
          </Link>
        ))}
      </div>

      <div style={right}>
        <button onClick={handleLogout} style={logoutBtn}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  padding: "0.75rem 1.25rem",
  background: "#f5f5f5",
  borderBottom: "1px solid #ddd",
  fontFamily: "Arial, sans-serif",
};

const left: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  alignItems: "center",
  flexWrap: "wrap",
};

const right: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  alignItems: "center",
};

const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#333",
  fontWeight: 900,
  padding: "0.35rem 0.6rem",
  borderRadius: 10,
};

const activeLink: React.CSSProperties = {
  ...linkStyle,
  background: "#e9f1ff",
  border: "1px solid #b7d0ff",
  color: "#0b3d91",
};

const logoutBtn: React.CSSProperties = {
  padding: "0.45rem 0.75rem",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};
