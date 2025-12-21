// pages/artist/dashboard.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import RequireAuth from "../../components/RequireAuth";
import { supabase } from "../../lib/supabaseClient";

export default function ArtistDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.replace("http://localhost:3000/login");
      return;
    }

    const pr = await supabase.from("profiles").select("role").eq("id", user.id).single();

    if (pr.error) {
      setError(pr.error.message);
      setLoading(false);
      return;
    }

    if (pr.data?.role !== "artist") {
      router.replace("http://localhost:3000/login");
      return;
    }

    const ev = await supabase
      .from("events")
      .select("id, slug, event_name, event_location, event_date, event_end_date, is_active, created_at")
      .eq("artist_user_id", user.id)
      .order("created_at", { ascending: false });

    if (ev.error) {
      setError(ev.error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents(ev.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("http://localhost:3000/login");
  }

  return (
    <RequireAuth requireStaff={false}>
      <div style={wrap}>
        <div style={topBar}>
          <div>
            <div style={{ fontWeight: 900, color: "#475569" }}>Artist Portal</div>
            <h1 style={{ margin: 0, fontSize: 44 }}>Dashboard</h1>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => router.push("http://localhost:3000/artist/dashboard")} style={pillBtn}>
              Dashboard
            </button>
            <button onClick={logout} style={pillBtnMuted}>
              Logout
            </button>
          </div>
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}

        <div style={card}>
          <div style={headerRow}>
            <h2 style={{ margin: 0 }}>Your Events</h2>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => router.push("http://localhost:3000/artist/events/new")} style={primaryBtn}>
                Create Event
              </button>
              <button onClick={load} style={secondaryBtn}>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ marginTop: 12 }}>Loading…</div>
          ) : events.length === 0 ? (
            <div style={infoBox}>
              <div style={{ fontWeight: 900 }}>No events linked to your account.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={th}>Status</th>
                  <th style={th}>Event</th>
                  <th style={th}>Dates</th>
                  <th style={th}>Event URL</th>
                  <th style={th}>QR</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const dates =
                    e.event_date && e.event_end_date && e.event_end_date !== e.event_date
                      ? `${e.event_date} → ${e.event_end_date}`
                      : e.event_date || "—";

                  const eventUrl = `http://localhost:3000/e/${e.slug}`;
                  const qrUrl = `http://localhost:3000/artist/events/qr/${e.slug}`;

                  return (
                    <tr key={e.id} style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
                      <td style={td}>
                        <span style={e.is_active ? badgeActive : badgeInactive}>{e.is_active ? "Active" : "Inactive"}</span>
                      </td>

                      <td style={td}>
                        <div style={{ fontWeight: 900 }}>{e.event_name || "—"}</div>
                        <div style={{ color: "#64748b" }}>{e.event_location || "—"}</div>
                        <div style={{ marginTop: 6 }}>
                          <code style={codePill}>{e.slug}</code>
                        </div>
                      </td>

                      <td style={td}>{dates}</td>

                      <td style={td}>
                        <a href={eventUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                          {eventUrl}
                        </a>
                      </td>

                      <td style={td}>
                        <a href={qrUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                          QR Print
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f1f5f9",
  fontFamily: "Arial, sans-serif",
  padding: 18,
};

const topBar: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  padding: "8px 4px 16px",
};

const card: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  background: "white",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const infoBox: React.CSSProperties = {
  marginTop: 12,
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(15, 23, 42, 0.10)",
  background: "rgba(15, 23, 42, 0.03)",
};

const errorBox: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto 12px",
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  padding: 12,
  borderRadius: 12,
  fontWeight: 900,
};

const pillBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(15, 23, 42, 0.14)",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const pillBtnMuted: React.CSSProperties = {
  ...pillBtn,
  background: "rgba(15, 23, 42, 0.06)",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "none",
  background: "#1976d2",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(15, 23, 42, 0.14)",
  background: "rgba(15, 23, 42, 0.06)",
  cursor: "pointer",
  fontWeight: 900,
};

const th: React.CSSProperties = { textAlign: "left", padding: 12, fontWeight: 900, color: "#475569", fontSize: 13 };
const td: React.CSSProperties = { padding: 12, verticalAlign: "top" };

const badgeActive: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
};

const badgeInactive: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
};

const codePill: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #eee",
  fontWeight: 900,
  fontSize: 12,
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};
