// pages/admin/events.tsx
// Admin events list (requires staff role).
// Adds Delete functionality back (with confirm + UI error handling).
// No localhost hardcoding.

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import AdminNav from "../../components/AdminNav";
import { supabase } from "../../lib/supabaseClient";

type Role = "owner" | "admin" | "reviewer" | "artist" | null;

type EventRow = {
  id: string;
  slug: string;
  artist_name: string | null;
  event_name: string | null;
  event_date: string | null;
  event_end_date: string | null;
  is_active: boolean;
};

function isStaff(role: Role) {
  return role === "owner" || role === "admin" || role === "reviewer";
}

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

export default function AdminEventsPage() {
  const [role, setRole] = useState<Role>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function loadEvents() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("events")
      .select("id, slug, artist_name, event_name, event_date, event_end_date, is_active")
      .order("event_date", { ascending: false });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as EventRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        setLoadingRole(false);
        return;
      }

      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!alive) return;

      setRole((data?.role ?? null) as Role);
      setLoadingRole(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      await loadEvents();
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDeleteEvent(row: EventRow) {
    setDeleteErr(null);

    const ok = window.confirm(
      `Delete this event?\n\n${row.event_name || "Event"} (${row.slug})\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(row.id);

    const { error } = await supabase.from("events").delete().eq("id", row.id);

    if (error) {
      // Most common if RLS doesn't allow it
      setDeleteErr(error.message);
      setDeletingId(null);
      return;
    }

    // Optimistic update
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setDeletingId(null);
  }

  return (
    <RequireAuth>
      <div style={pageStyle}>
        <AdminNav />

        <div style={containerStyle}>
          <div style={topRow}>
            <h1 style={{ margin: 0, fontWeight: 900 }}>Events</h1>
            <Link href="/admin/events/new" style={primaryLinkBtn}>
              New Event
            </Link>
          </div>

          {loadingRole ? (
            <div style={cardStyle}>Loading…</div>
          ) : !isStaff(role) ? (
            <div style={cardStyle}>
              <div style={{ fontWeight: 900 }}>Access denied</div>
              <div style={{ color: "#666", marginTop: 6 }}>You must be staff to view this page.</div>
              <div style={{ marginTop: 12 }}>
                <Link href="/dashboard" style={linkStyle}>
                  Go to dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              {deleteErr ? <div style={{ ...cardStyle, ...errorBox, marginTop: "1rem" }}>{deleteErr}</div> : null}

              {loading ? (
                <div style={{ ...cardStyle, marginTop: "1rem" }}>Loading events…</div>
              ) : err ? (
                <div style={{ ...cardStyle, ...errorBox, marginTop: "1rem" }}>{err}</div>
              ) : rows.length === 0 ? (
                <div style={{ ...cardStyle, marginTop: "1rem" }}>No events yet.</div>
              ) : (
                <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
                  {rows.map((r) => (
                    <div key={r.id} style={cardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>{r.event_name || "Event"}</div>
                          <div style={{ marginTop: 4, color: "#666", fontWeight: 900 }}>
                            {r.artist_name || "Artist"} • {fmtDateRange(r.event_date, r.event_end_date)}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <span style={r.is_active ? badgeActive : badgeInactive}>
                              {r.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <Link href={`/admin/events/${r.slug}`} style={secondaryLinkBtn}>
                            QR / Preview
                          </Link>
                          <Link href={`/e/${r.slug}`} style={secondaryLinkBtn} target="_blank" rel="noreferrer">
                            Public Page
                          </Link>

                          <button
                            onClick={() => onDeleteEvent(r)}
                            style={dangerBtn}
                            disabled={deletingId === r.id}
                            title="Delete event"
                          >
                            {deletingId === r.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, color: "#666", fontSize: "0.95rem" }}>
                        Slug: <code style={codePill}>{r.slug}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#f1f1f1", fontFamily: "Arial, sans-serif" };
const containerStyle: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "1.5rem" };

const topRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" };

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: "1.1rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const primaryLinkBtn: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 12,
  background: "#1976d2",
  color: "#fff",
  padding: "0.7rem 0.95rem",
  fontWeight: 900,
  textDecoration: "none",
};

const secondaryLinkBtn: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.65rem 0.9rem",
  fontWeight: 900,
  textDecoration: "none",
  color: "#111",
};

const dangerBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ffb3b3",
  background: "#ffe6e6",
  color: "#7a0000",
  padding: "0.65rem 0.9rem",
  fontWeight: 900,
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = { fontWeight: 900, color: "#1976d2", textDecoration: "none" };

const errorBox: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  fontWeight: 900,
};

const badgeActive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
  fontSize: "0.9rem",
};

const badgeInactive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
  fontSize: "0.9rem",
};

const codePill: React.CSSProperties = {
  display: "inline-block",
  background: "#f5f5f5",
  border: "1px solid #ddd",
  padding: "0.25rem 0.55rem",
  borderRadius: 10,
  fontWeight: 900,
  overflowWrap: "anywhere",
};
