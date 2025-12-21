// pages/admin/events.tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

type EventRow = {
  id: string;
  slug: string;
  artist_user_id: string | null;
  artist_name: string | null;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  is_active: boolean;
  created_at?: string;
};

type ArtistProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminEventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [artistUserId, setArtistUserId] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDate, setEventDate] = useState(todayISO());
  const [eventEndDate, setEventEndDate] = useState(todayISO());

  const [filter, setFilter] = useState<"active" | "inactive" | "all">("active");

  const selectedArtist = useMemo(() => artists.find((a) => a.id === artistUserId) || null, [artists, artistUserId]);

  async function loadArtists() {
    const res = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "artist")
      .order("full_name", { ascending: true });

    if (res.error) {
      setError(res.error.message);
      setArtists([]);
      return;
    }

    setArtists(res.data || []);
  }

  async function loadEvents() {
    setLoading(true);
    setError(null);

    let q = supabase
      .from("events")
      .select("id, slug, artist_user_id, artist_name, event_name, event_location, event_date, event_end_date, is_active, created_at")
      .order("created_at", { ascending: false });

    if (filter === "active") q = q.eq("is_active", true);
    if (filter === "inactive") q = q.eq("is_active", false);

    const { data, error } = await q;

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data || []) as any);
    setLoading(false);
  }

  async function loadAll() {
    await loadArtists();
    await loadEvents();
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!artistUserId) return setError("Artist is required (select an artist account).");
    if (!eventName.trim()) return setError("Event name is required.");
    if (!eventDate) return setError("Event start date is required.");
    if (!eventEndDate) return setError("Event end date is required.");

    const artistName = selectedArtist?.full_name?.trim() || selectedArtist?.email?.trim() || "Unnamed Artist";

    const base = slugify(`${artistName}-${eventName}-${eventDate}`);
    const slug = `${base}-${Math.random().toString(16).slice(2, 6)}`;

    const { error } = await supabase.from("events").insert({
      slug,
      artist_user_id: artistUserId,
      artist_name: artistName,
      event_name: eventName.trim(),
      event_location: eventLocation.trim() || null,
      event_date: eventDate,
      event_end_date: eventEndDate,
      is_active: true,
    });

    if (error) return setError(error.message);

    setArtistUserId("");
    setEventName("");
    setEventLocation("");
    setEventDate(todayISO());
    setEventEndDate(todayISO());

    await loadEvents();
  }

  async function setActive(row: EventRow, makeActive: boolean) {
    setBusyId(row.id);
    setError(null);

    const { error } = await supabase.from("events").update({ is_active: makeActive }).eq("id", row.id);

    if (error) setError(error.message);
    await loadEvents();

    setBusyId(null);
  }

  async function linkArtist(row: EventRow, newArtistId: string) {
    setBusyId(row.id);
    setError(null);

    const artist = artists.find((a) => a.id === newArtistId) || null;
    const newArtistName = artist?.full_name?.trim() || artist?.email?.trim() || null;

    const { error } = await supabase
      .from("events")
      .update({ artist_user_id: newArtistId || null, artist_name: newArtistName })
      .eq("id", row.id);

    if (error) setError(error.message);
    await loadEvents();

    setBusyId(null);
  }

  async function deleteEvent(row: EventRow) {
    const ok = window.confirm(
      `Delete this event permanently?\n\nEvent: ${row.event_name || "(no name)"}\nSlug: ${row.slug}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setBusyId(row.id);
    setError(null);

    const res = await supabase.from("events").delete().eq("id", row.id);

    if (res.error) setError(res.error.message);
    await loadEvents();

    setBusyId(null);
  }

  return (
    <AdminLayout requireStaff={true}>
      <h1 style={{ marginTop: 0 }}>Events</h1>

      {error && <div style={errorBox}>{error}</div>}

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Create Event</h2>

        <form onSubmit={createEvent}>
          <div style={grid2}>
            <div>
              <label style={label}>Artist Account *</label>
              <select value={artistUserId} onChange={(e) => setArtistUserId(e.target.value)} style={selectStyle}>
                <option value="">Select an artist…</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.full_name || "Unnamed Artist") + (a.email ? ` — ${a.email}` : "")}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 6, color: "#666", fontSize: "0.92rem" }}>
                Artists are managed at <code>http://localhost:3000/admin/artists</code>
              </div>
            </div>

            <div>
              <label style={label}>Event Name *</label>
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} style={input} />
            </div>

            <div>
              <label style={label}>Location</label>
              <input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} style={input} />
            </div>

            <div>
              <label style={label}>Start Date *</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={input} />
            </div>

            <div>
              <label style={label}>End Date *</label>
              <input type="date" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} style={input} />
            </div>
          </div>

          <button type="submit" style={primaryBtn}>
            Create Event
          </button>
        </form>

        <div style={{ marginTop: "1rem", color: "#666" }}>
          Event landing page format:
          <div style={{ marginTop: "0.35rem" }}>
            <code>http://localhost:3000/e/&lt;slug&gt;</code>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Manage Events</h2>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontWeight: 900, color: "#555" }}>Filter:</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} style={selectStyleSmall}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>

            <button onClick={loadAll} style={secondaryBtn}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: "1rem" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ marginTop: "1rem", color: "#666" }}>No events found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={th}>Artist / Event</th>
                <th style={th}>Dates</th>
                <th style={th}>Slug</th>
                <th style={th}>Event URL</th>
                <th style={th}>Owner Link</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const dates =
                  r.event_date && r.event_end_date && r.event_end_date !== r.event_date
                    ? `${r.event_date} → ${r.event_end_date}`
                    : r.event_date || "—";

                const eventUrl = `http://localhost:3000/e/${r.slug}`;
                const qrPrintUrl = `http://localhost:3000/admin/events/qr/${r.slug}`;

                return (
                  <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={td}>
                      <span style={r.is_active ? badgeActive : badgeInactive}>{r.is_active ? "Active" : "Inactive"}</span>
                    </td>

                    <td style={td}>
                      <div style={{ fontWeight: 900 }}>{r.artist_name || "—"}</div>
                      <div style={{ color: "#666" }}>{r.event_name || "—"}</div>
                      <div style={{ color: "#666", fontSize: "0.92rem" }}>{r.event_location || "—"}</div>
                      <div style={{ marginTop: 6, color: "#666", fontSize: "0.9rem" }}>
                        artist_user_id: <code style={codePill}>{r.artist_user_id || "NULL"}</code>
                      </div>
                    </td>

                    <td style={td}>{dates}</td>

                    <td style={td}>
                      <code style={codePill}>{r.slug}</code>
                    </td>

                    <td style={td}>
                      <a href={eventUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                        {eventUrl}
                      </a>
                    </td>

                    <td style={td}>
                      <select
                        value={r.artist_user_id || ""}
                        onChange={(e) => linkArtist(r, e.target.value)}
                        style={selectStyleSmall}
                        disabled={busyId === r.id}
                      >
                        <option value="">Unassigned</option>
                        {artists.map((a) => (
                          <option key={a.id} value={a.id}>
                            {(a.full_name || "Unnamed Artist") + (a.email ? ` — ${a.email}` : "")}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a href={qrPrintUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                          QR Print
                        </a>

                        {r.is_active ? (
                          <button disabled={busyId === r.id} onClick={() => setActive(r, false)} style={dangerBtn}>
                            {busyId === r.id ? "Working…" : "Deactivate"}
                          </button>
                        ) : (
                          <button disabled={busyId === r.id} onClick={() => setActive(r, true)} style={primaryBtnSmall}>
                            {busyId === r.id ? "Working…" : "Reactivate"}
                          </button>
                        )}

                        <button disabled={busyId === r.id} onClick={() => deleteEvent(r)} style={dangerBtnSolid}>
                          {busyId === r.id ? "Working…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: "0.85rem", color: "#666", fontSize: "0.92rem" }}>
          Artists will only see events where <code>events.artist_user_id</code> matches their user id.
        </div>
      </div>
    </AdminLayout>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "0.85rem",
};

const label: React.CSSProperties = {
  display: "block",
  fontWeight: 900,
  marginTop: "0.5rem",
  marginBottom: "0.35rem",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #ccc",
  background: "white",
  fontWeight: 900,
};

const selectStyleSmall: React.CSSProperties = {
  padding: "0.55rem 0.7rem",
  borderRadius: 10,
  border: "1px solid #ccc",
  fontWeight: 800,
  background: "white",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem 1rem",
  marginTop: "1rem",
  background: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 900,
};

const primaryBtnSmall: React.CSSProperties = {
  padding: "0.6rem 0.85rem",
  background: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 900,
};

const secondaryBtn: React.CSSProperties = {
  padding: "0.6rem 0.9rem",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: 900,
};

const dangerBtn: React.CSSProperties = {
  padding: "0.6rem 0.85rem",
  borderRadius: 12,
  border: "1px solid #ffb3b3",
  background: "#ffe6e6",
  color: "#7a0000",
  cursor: "pointer",
  fontWeight: 900,
};

const dangerBtnSolid: React.CSSProperties = {
  padding: "0.6rem 0.85rem",
  borderRadius: 12,
  border: "1px solid #b91c1c",
  background: "#b91c1c",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const errorBox: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  padding: "0.75rem",
  borderRadius: 12,
  fontWeight: 900,
  marginBottom: "1rem",
};

const th: React.CSSProperties = { textAlign: "left", padding: "0.7rem 0.5rem", fontWeight: 900, color: "#333" };
const td: React.CSSProperties = { padding: "0.7rem 0.5rem", verticalAlign: "top" };

const badgeActive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
};

const badgeInactive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
};

const codePill: React.CSSProperties = {
  background: "#f5f5f5",
  border: "1px solid #ddd",
  padding: "0.15rem 0.45rem",
  borderRadius: 10,
  fontWeight: 900,
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};
