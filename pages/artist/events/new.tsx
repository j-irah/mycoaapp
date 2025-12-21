// pages/artist/events/new.tsx
// @ts-nocheck
//
// Artist creates an event. No hardcoded localhost URLs.
// Uses NEXT_PUBLIC_SITE_URL (if set) or window.location.origin to display absolute links.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import RequireAuth from "../../../components/RequireAuth";
import { supabase } from "../../../lib/supabaseClient";

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

function getEnvBaseUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  return env ? env.replace(/\/$/, "") : "";
}

export default function ArtistCreateEventPage() {
  const router = useRouter();

  const [roleOk, setRoleOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());

  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    const env = getEnvBaseUrl();
    if (env) setBaseUrl(env);
    else if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/artist/events/new")}`);
        return;
      }

      const pr = await supabase.from("profiles").select("role, full_name, email").eq("id", user.id).single();

      if (!alive) return;

      if (pr.error || pr.data?.role !== "artist") {
        router.replace("/login");
        return;
      }

      setRoleOk(true);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedSlug(null);

    if (!eventName.trim()) {
      setError("Event name is required.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    const profile = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();

    const artistName = profile.data?.full_name?.trim() || profile.data?.email?.trim() || "Unnamed Artist";

    const base = slugify(`${artistName}-${eventName}-${startDate}`);
    const slug = `${base}-${Math.random().toString(16).slice(2, 6)}`;

    const ins = await supabase.from("events").insert({
      slug,
      artist_user_id: user.id,
      artist_name: artistName,
      event_name: eventName.trim(),
      event_location: location.trim() || null,
      event_date: startDate,
      event_end_date: endDate,
      is_active: true,
    });

    if (ins.error) {
      setError(ins.error.message);
      setLoading(false);
      return;
    }

    setCreatedSlug(slug);
    setLoading(false);
  }

  const eventPath = useMemo(() => (createdSlug ? `/e/${createdSlug}` : ""), [createdSlug]);
  const qrPath = useMemo(() => (createdSlug ? `/artist/events/qr/${createdSlug}` : ""), [createdSlug]);

  const eventUrlDisplay = useMemo(() => {
    if (!eventPath) return "";
    if (!baseUrl) return eventPath;
    return `${baseUrl}${eventPath}`;
  }, [baseUrl, eventPath]);

  const qrUrlDisplay = useMemo(() => {
    if (!qrPath) return "";
    if (!baseUrl) return qrPath;
    return `${baseUrl}${qrPath}`;
  }, [baseUrl, qrPath]);

  return (
    <RequireAuth requireStaff={false}>
      <div style={wrap}>
        <div style={card}>
          <div style={headerRow}>
            <h1 style={{ margin: 0 }}>Create Event</h1>
            <button onClick={() => router.push("/artist/dashboard")} style={secondaryBtn}>
              Back to Dashboard
            </button>
          </div>

          {!roleOk ? (
            <div style={{ marginTop: 12, color: "#64748b" }}>Checking access…</div>
          ) : (
            <>
              {error && <div style={errorBox}>{error}</div>}

              <form onSubmit={createEvent} style={{ marginTop: 12 }}>
                <label style={label}>Event Name *</label>
                <input style={input} value={eventName} onChange={(e) => setEventName(e.target.value)} />

                <label style={label}>Location</label>
                <input style={input} value={location} onChange={(e) => setLocation(e.target.value)} />

                <div style={grid2}>
                  <div>
                    <label style={label}>Start Date *</label>
                    <input type="date" style={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>End Date *</label>
                    <input type="date" style={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <button type="submit" style={primaryBtn} disabled={loading}>
                  {loading ? "Creating…" : "Create Event"}
                </button>
              </form>

              {createdSlug && (
                <div style={successBox}>
                  <div style={{ fontWeight: 900 }}>Event created</div>

                  <div style={{ marginTop: 8 }}>
                    <a href={eventPath} target="_blank" rel="noreferrer" style={linkStyle}>
                      {eventUrlDisplay}
                    </a>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <a href={qrPath} target="_blank" rel="noreferrer" style={linkStyle}>
                      Print QR Code
                    </a>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {qrUrlDisplay}
                    </div>
                  </div>
                </div>
              )}
            </>
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

const card: React.CSSProperties = {
  maxWidth: 720,
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

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 6,
};

const label: React.CSSProperties = {
  display: "block",
  fontWeight: 900,
  color: "#0f172a",
  marginTop: 10,
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 23, 42, 0.16)",
  fontWeight: 800,
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 12,
  background: "#1976d2",
  color: "white",
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(15, 23, 42, 0.14)",
  background: "rgba(15, 23, 42, 0.06)",
  cursor: "pointer",
  fontWeight: 900,
};

const errorBox: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  padding: 12,
  borderRadius: 12,
  fontWeight: 900,
  marginTop: 12,
};

const successBox: React.CSSProperties = {
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  padding: 12,
  borderRadius: 12,
  fontWeight: 900,
  marginTop: 12,
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};
