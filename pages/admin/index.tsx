// pages/admin/index.tsx
// Admin home (requires staff role). No localhost anywhere.

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import AdminNav from "../../components/AdminNav";
import { supabase } from "../../lib/supabaseClient";

type Role = "owner" | "admin" | "reviewer" | "artist" | null;

function isStaff(role: Role) {
  return role === "owner" || role === "admin" || role === "reviewer";
}

export default function AdminHomePage() {
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
        <AdminNav />
        <div style={containerStyle}>
          <h1 style={{ margin: 0, fontWeight: 900 }}>Admin</h1>

          {loading ? (
            <div style={cardStyle}>Loading…</div>
          ) : !isStaff(role) ? (
            <div style={cardStyle}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Access denied</div>
              <div style={{ color: "#666" }}>You must be staff to view this page.</div>
              <div style={{ marginTop: 12 }}>
                <Link href="/dashboard" style={linkStyle}>
                  Go to dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div style={gridStyle}>
              <Link href="/admin/events" style={tileStyle}>
                Events
              </Link>
              <Link href="/admin/requests" style={tileStyle}>
                Requests
              </Link>
              <Link href="/admin/create" style={tileStyle}>
                Create COA
              </Link>
              <Link href="/admin/artists" style={tileStyle}>
                Artists
              </Link>
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#f1f1f1", fontFamily: "Arial, sans-serif" };

const containerStyle: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "1.5rem" };

const cardStyle: React.CSSProperties = {
  background: "#fff",
  marginTop: "1rem",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const gridStyle: React.CSSProperties = {
  marginTop: "1rem",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "1rem",
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
