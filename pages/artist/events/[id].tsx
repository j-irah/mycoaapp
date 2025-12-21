// pages/artist/events/[id].tsx
// @ts-nocheck

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import ArtistLayout from "../../../components/ArtistLayout";
import { supabase } from "../../../lib/supabaseClient";

export default function ArtistEventDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [eventRow, setEventRow] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventUrl = useMemo(() => (eventRow?.slug ? `http://localhost:3000/e/${eventRow.slug}` : ""), [eventRow]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) return;

      setLoading(true);
      setError(null);
      setEventRow(null);
      setRows([]);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace(`http://localhost:3000/login?next=${encodeURIComponent(`/artist/events/${id}`)}`);
        return;
      }

      const ev = await supabase
        .from("events")
        .select("id, slug, artist_user_id, artist_name, event_name, event_location, event_date, event_end_date, is_active")
        .eq("id", id)
        .single();

      if (!active) return;

      if (ev.error || !ev.data) {
        setError(ev.error?.message || "Event not found.");
        setLoading(false);
        return;
      }

      if (ev.data.artist_user_id !== user.id) {
        setError("Access denied. This event is not linked to your artist account.");
        setLoading(false);
        return;
      }

      setEventRow(ev.data);

      const req = await supabase
        .from("coa_requests")
        .select("id, status, comic_title, issue_number, witness_name, created_at")
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (req.error) {
        setError(req.error.message);
        setRows([]);
      } else {
        setRows(req.data || []);
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [id, router]);

  return (
    <ArtistLayout title={eventRow?.event_name ? `Event: ${eventRow.event_name}` : "Event"}>
      {error ? <div style={errorBox}>{error}</div> : null}

      {loading ? (
        <div style={{ marginTop: 12 }}>Loading…</div>
      ) : !eventRow ? null : (
        <>
          <div style={infoBox}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{eventRow.artist_name || "Artist"}</div>
            <div style={{ color: "#475569", marginTop: 6 }}>
              {eventRow.event_location || "—"} • {eventRow.event_date}
              {eventRow.event_end_date && eventRow.event_end_date !== eventRow.event_date ? ` → ${eventRow.event_end_date}` : ""}
            </div>
            <div style={{ marginTop: 10 }}>
              Public page:{" "}
              <a href={eventUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 900 }}>
                {eventUrl}
              </a>
            </div>
          </div>

          <div style={{ marginTop: 12, background: "white", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 16 }}>
            <div style={{ padding: 14, borderBottom: "1px solid rgba(15, 23, 42, 0.08)", fontWeight: 900 }}>
              Requests (read-only)
            </div>

            {rows.length === 0 ? (
              <div style={{ padding: 14, color: "#475569" }}>No requests yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Created</th>
                    <th style={th}>Status</th>
                    <th style={th}>Comic</th>
                    <th style={th}>Issue</th>
                    <th style={th}>Collector Name</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
                      <td style={td}>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={td}>{r.status}</td>
                      <td style={td}>{r.comic_title}</td>
                      <td style={td}>{r.issue_number || "—"}</td>
                      <td style={td}>{r.witness_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>
            Proof images are intentionally excluded from the artist view.
          </div>
        </>
      )}
    </ArtistLayout>
  );
}

const infoBox: React.CSSProperties = {
  background: "white",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  color: "#334155",
};

const errorBox: React.CSSProperties = {
  background: "#fff1f2",
  border: "1px solid rgba(225, 29, 72, 0.25)",
  borderRadius: 16,
  padding: 14,
  marginTop: 12,
  color: "#9f1239",
  fontWeight: 900,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  fontSize: 13,
  color: "#475569",
};

const td: React.CSSProperties = {
  padding: 12,
  fontSize: 14,
  color: "#0f172a",
};
