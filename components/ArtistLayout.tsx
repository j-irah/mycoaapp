// components/ArtistLayout.tsx
// @ts-nocheck

import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import RequireAuth from "./RequireAuth";
import { supabase } from "../lib/supabaseClient";

export default function ArtistLayout({ title, children }: { title: string; children: any }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("http://localhost:3000/login");
      setLoggingOut(false);
    }
  }

  return (
    <RequireAuth requireArtist={true}>
      <div style={page}>
        <div style={container}>
          <header style={header}>
            <div>
              <div style={{ fontWeight: 900, color: "#334155" }}>Artist Portal</div>
              <h1 style={{ margin: "6px 0 0 0" }}>{title}</h1>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="http://localhost:3000/artist/dashboard" style={linkBtn}>
                Dashboard
              </Link>

              <button onClick={handleLogout} disabled={loggingOut} style={logoutBtn}>
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          </header>

          {children}
        </div>
      </div>
    </RequireAuth>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f6f7fb 0%, #eef1f7 100%)",
  padding: "28px 16px",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  color: "#0f172a",
};

const container: React.CSSProperties = { maxWidth: 1100, margin: "0 auto" };

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 16,
};

const linkBtn: React.CSSProperties = {
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
};

const logoutBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "rgba(15, 23, 42, 0.06)",
  color: "#0f172a",
  fontWeight: 900,
  border: "1px solid rgba(15, 23, 42, 0.12)",
  cursor: "pointer",
};
