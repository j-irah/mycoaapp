// pages/artist/dashboard.tsx
// Artist dashboard (requires role === 'artist').
// Uses inline nav and logout redirecting to current origin.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import RequireAuth from "../../components/RequireAuth";
import { supabase } from "../../lib/supabaseClient";

type Role = "owner" | "admin" | "reviewer" | "artist" | null;

function isArtist(role: Role) {
  return role === "artist";
}

export default function ArtistDashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!alive) return;

      setRole((data?.role ?? null) as Role);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

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
    <RequireAuth>
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
          <h1 style={{ margin: 0, fontWeight: 900 }}>Artist Dashboard</h1>

          {loading ? (
            <div style={cardStyle}>Loading…</div>
          ) : !isArtist(role) ? (
            <div style={cardStyle}>
              <div style={{ fontWeight: 900 }}>Access denied</div>
              <div style={{ color: "#666", marginTop: 6 }}>You must be an approved artist to view this page.</div>
              <div style={{ marginTop: 12 }}>
                <Link href="/dashboard" style={linkStyle}>
                  Go to dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
              <Link href="/artist/events/new" style={tileStyle}>
                Create Event
              </Link>
              <Link href="/artist/events" style={tileStyle}>
                View My Events
              </Link>
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f3f3",
  fontFamily: "Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "1.5rem",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  marginTop: "1rem",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const tileStyle: React.CSSProperties = {
  display: "block",
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  fontWeight: 900,
  textDecoration: "none",
  color: "#111",
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};

// Nav styles
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
