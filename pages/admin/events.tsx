// pages/admin/events.tsx
// Admin events list (Owner/Admin/Reviewer/Staff via AdminLayout requireStaff).
// Uses AdminLayout + updated AdminNav (no duplicate nav / no extra role check).
// No localhost hardcoding.

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

type EventRow = {
  id: string;
  slug: string;
  artist_name: string | null;
  event_name: string | null;
  event_location?: string | null;
  event_date: string | null;
  event_end_date: string | null;
  is_active: boolean;
};

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

export default function AdminEventsPage() {
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
      .select("id, slug, artist_name, event_name, event_location, event_date, event_end_date, is_active")
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
    loadEvents();
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
      setDeleteErr(error.message);
      setDeletingId(null);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setDeletingId(null);
  }

  return (
    <AdminLayout requireStaff={true}>
      <div style={topRow}>
        <h1 style={{ margin: 0, fontWeight: 900 }}>Events</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={loadEvents} style={secondaryBtn}>
            Refresh
          </button>

          {/* NOTE: This route must exist in your app. If it doesn't, tell me and we’ll create it next. */}
          <Link href="/admin/events/new" style={primaryLinkBtn}>
            New Event
          </Link>
        </div>
      </div>

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

                  {r.event_location ? (
                    <div style={{ marginTop: 4, color: "#666", fontWeight: 900 }}>{r.event_location}</div>
                  ) : null}

                  <div style={{ marginTop: 8 }}>
                    <span style={r.is_active ? badgeActive : badgeInactive}>{r.is_active ? "Active" : "Inactive"}</span>
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
    </AdminLayout>
  );
}

const topRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: "1.1rem 1.2rem",
  borderRadius: 16,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  border: "1px solid #eee",
};

const primaryLinkBtn: React.CSSProperties = {
  display: "inline-block",
  background: "#1976d2",
  color: "#fff",
  padding: "0.65rem 0.95rem",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
};

const secondaryLinkBtn: React.CSSProperties = {
  display: "inline-block",
  background: "#fff",
  color: "#111",
  padding: "0.55rem 0.85rem",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #ddd",
};

const secondaryBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.6rem 0.9rem",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #f2bcbc",
  color: "#b42318",
  padding: "0.55rem 0.85rem",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 900,
};

const badgeActive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.55rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
};

const badgeInactive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.55rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
};

const codePill: React.CSSProperties = {
  background: "#f3f3f3",
  padding: "0.15rem 0.45rem",
  borderRadius: 8,
  border: "1px solid #e5e5e5",
};

const errorBox: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  fontWeight: 900,
};
