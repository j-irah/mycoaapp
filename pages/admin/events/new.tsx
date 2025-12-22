// pages/admin/events/new.tsx
// Create a new event (Owner/Admin/Reviewer/Staff via AdminLayout).
// This fixes the "New Event" button routing into /admin/events/[slug].

import { useRouter } from "next/router";
import { useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { supabase } from "../../../lib/supabaseClient";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rand4() {
  return Math.random().toString(16).slice(2, 6);
}

export default function AdminNewEventPage() {
  const router = useRouter();

  const [eventName, setEventName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD
  const [eventEndDate, setEventEndDate] = useState(""); // YYYY-MM-DD
  const [isActive, setIsActive] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!eventName.trim()) return setError("Event name is required.");
    if (!artistName.trim()) return setError("Artist name is required.");
    if (!eventDate.trim()) return setError("Start date is required.");

    const start = eventDate.trim();
    const end = eventEndDate.trim() || start;

    if (end < start) return setError("End date cannot be before the start date.");

    setBusy(true);

    try {
      const base = `${slugify(artistName)}-${slugify(eventName)}-${start}`;
      const slug = `${base}-${rand4()}`;

      const { data, error: insErr } = await supabase
        .from("events")
        .insert({
          slug,
          artist_name: artistName.trim(),
          event_name: eventName.trim(),
          event_location: eventLocation.trim() || null,
          event_date: start,
          event_end_date: end,
          is_active: isActive,
        })
        .select("slug")
        .single();

      if (insErr) throw new Error(insErr.message);

      // Go to QR/Preview for the newly created event
      router.push(`/admin/events/${data.slug}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create event.");
      setBusy(false);
      return;
    }

    setBusy(false);
  }

  return (
    <AdminLayout requireStaff={true}>
      <div style={topRow}>
        <h1 style={{ margin: 0, fontWeight: 900 }}>New Event</h1>

        <button onClick={() => router.push("/admin/events")} style={secondaryBtn}>
          Back to Events
        </button>
      </div>

      <div style={{ ...card, marginTop: "1rem" }}>
        {error ? <div style={errorBox}>{error}</div> : null}

        <form onSubmit={onCreate}>
          <label style={label}>Event name *</label>
          <input style={input} value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="FanExpo Raleigh 2025" />

          <label style={label}>Artist name *</label>
          <input style={input} value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="John Giang" />

          <label style={label}>Location</label>
          <input style={input} value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Raleigh NC" />

          <div style={grid2}>
            <div>
              <label style={label}>Start date *</label>
              <input style={input} value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>

            <div>
              <label style={label}>End date</label>
              <input style={input} value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (QR submissions allowed during event dates)
            </label>
          </div>

          <button style={primaryBtn} disabled={busy}>
            {busy ? "Creating…" : "Create Event"}
          </button>

          <div style={{ marginTop: 10, color: "#666", fontWeight: 900 }}>
            After creation, you’ll be taken to the **Event QR / Preview** page automatically.
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

const topRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: "1.25rem",
  border: "1px solid #eee",
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
};

const label: React.CSSProperties = {
  display: "block",
  marginTop: 14,
  marginBottom: 6,
  fontWeight: 900,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #ddd",
  boxSizing: "border-box",
  fontWeight: 800,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 6,
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 18,
  borderRadius: 12,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  padding: "0.95rem 1rem",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.6rem 0.9rem",
  fontWeight: 900,
  cursor: "pointer",
};

const errorBox: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ffb3b3",
  background: "#ffe6e6",
  padding: "0.9rem",
  fontWeight: 900,
  color: "#7a0000",
  marginBottom: 12,
};
