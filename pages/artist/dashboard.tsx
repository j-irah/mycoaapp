// pages/artist/dashboard.tsx
// Artist dashboard (requires role === 'artist').

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import { supabase } from "../../lib/supabaseClient";

type Role = "owner" | "admin" | "reviewer" | "artist" | null;

function isArtist(role: Role) {
  return role === "artist";
}

export default function ArtistDashboardPage() {
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

  return (
    <RequireAuth>
      <div style={pageStyle}>
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

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#f3f3f3", fontFamily: "Arial, sans-serif" };

const containerStyle: React.CSSProperties = { maxWidth: 900, margin: "0 auto", padding: "1.5rem" };

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

const linkStyle: React.CSSProperties = { fontWeight: 900, color: "#1976d2", textDecoration: "none" };
