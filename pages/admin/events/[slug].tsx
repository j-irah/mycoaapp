// pages/admin/events/qr/[slug].tsx
// @ts-nocheck

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../../components/AdminLayout";
import { supabase } from "../../../../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";

export default function AdminEventQRPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [eventRow, setEventRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventUrl = useMemo(() => {
    if (!eventRow?.slug) return "";
    return `http://localhost:3000/e/${eventRow.slug}`;
  }, [eventRow]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!slug) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("events")
        .select("id, slug, artist_name, event_name, event_location, event_date, event_end_date, is_active")
        .eq("slug", slug)
        .single();

      if (!active) return;

      if (error || !data) {
        setEventRow(null);
        setError(error?.message || "Event not found.");
        setLoading(false);
        return;
      }

      setEventRow(data);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  function handlePrint() {
    window.print();
  }

  return (
    <AdminLayout requireStaff={true}>
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Printable Event QR</h1>
        <button onClick={handlePrint} style={btn}>
          Print
        </button>
      </div>

      {loading ? <div style={{ marginTop: 16 }}>Loading…</div> : null}
      {error ? <div style={{ ...box, borderColor: "#ffb3b3", background: "#ffe6e6", color: "#7a0000" }}>{error}</div> : null}

      {!loading && eventRow ? (
        <div className="print-card" style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ minWidth: 280 }}>
              <h2 style={{ marginTop: 0, marginBottom: 6 }}>{eventRow.artist_name || "Artist"}</h2>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{eventRow.event_name || "Event"}</div>
              <div style={{ color: "#555", marginTop: 6 }}>{eventRow.event_location || "—"}</div>
              <div style={{ color: "#555", marginTop: 6 }}>
                {eventRow.event_date}
                {eventRow.event_end_date && eventRow.event_end_date !== eventRow.event_date ? ` → ${eventRow.event_end_date}` : ""}
              </div>

              <div style={{ marginTop: 12, color: "#333" }}>
                Scan to submit a COA request:
                <div style={{ marginTop: 6 }}>
                  <code style={codePill}>{eventUrl}</code>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              {eventUrl ? <QRCodeCanvas value={eventUrl} size={260} /> : null}
              <div style={{ marginTop: 10, fontWeight: 900 }}>SCAN ME</div>
            </div>
          </div>

          <hr style={{ margin: "18px 0", border: 0, borderTop: "1px solid #eee" }} />

          <div style={{ color: "#555", lineHeight: 1.35 }}>
            <div style={{ fontWeight: 900, color: "#111" }}>Instructions for collectors</div>
            <ol style={{ marginTop: 8, paddingLeft: 18 }}>
              <li>Scan the QR code.</li>
              <li>Create an account or log in.</li>
              <li>You’ll be returned to this event page automatically.</li>
              <li>Upload proof + book photo and submit.</li>
            </ol>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "#1976d2",
  color: "white",
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
};

const card: React.CSSProperties = {
  marginTop: 16,
  background: "white",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

const box: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "white",
};

const codePill: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #eee",
  fontWeight: 900,
};
