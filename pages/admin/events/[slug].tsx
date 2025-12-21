// pages/admin/events/[slug].tsx
// Admin QR/Preview page (staff-only)
// This version removes AdminLayout and uses RequireAuth + AdminNav (Option A).

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import AdminNav from "../../../components/AdminNav";
import { supabase } from "../../../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";

type EventRow = {
  id: string;
  slug: string;
  artist_name: string | null;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  is_active: boolean;
};

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

export default function AdminEventQRPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : null;

  const [row, setRow] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Prefer Vercel/Prod base URL if set; fallback to localhost for local dev.
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

  const eventUrl = useMemo(() => {
    if (!slug) return null;
    return `${baseUrl}/e/${slug}`;
  }, [baseUrl, slug]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!slug) return;

      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("events")
        .select("id, slug, artist_name, event_name, event_location, event_date, event_end_date, is_active")
        .eq("slug", slug)
        .single();

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setRow(null);
      } else {
        setRow(data as any);
      }

      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <RequireAuth>
      <div style={pageStyle}>
        <AdminNav />

        <div style={containerStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
            <h1 style={{ margin: 0 }}>Event QR</h1>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                onClick={() => router.push("http://localhost:3000/admin/events")}
                style={secondaryBtn}
              >
                Back to Events
              </button>
              <button
                onClick={() => window.print()}
                style={primaryBtn}
                disabled={!eventUrl}
                title={!eventUrl ? "Waiting for slug…" : "Print"}
              >
                Print
              </button>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            {loading ? (
              <div style={cardStyle}>Loading…</div>
            ) : err ? (
              <div style={{ ...cardStyle, ...errorBox }}>{err}</div>
            ) : !row || !eventUrl ? (
              <div style={cardStyle}>Event not found.</div>
            ) : (
              <>
                {/* Printable section */}
                <div style={printCardStyle} className="print-area">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.25rem" }}>
                    <div>
                      <div style={titleStyle}>{row.event_name || "Event"}</div>
                      <div style={subTitleStyle}>{row.artist_name || "Artist"}</div>

                      <div style={{ marginTop: "0.75rem", color: "#444", lineHeight: 1.5 }}>
                        <div>
                          <strong>Dates:</strong> {fmtDateRange(row.event_date, row.event_end_date)}
                        </div>
                        <div style={{ marginTop: "0.25rem" }}>
                          <strong>Location:</strong> {row.event_location || "—"}
                        </div>
                        <div style={{ marginTop: "0.25rem" }}>
                          <strong>Status:</strong>{" "}
                          <span style={row.is_active ? badgeActive : badgeInactive}>
                            {row.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div style={{ marginTop: "0.85rem" }}>
                          <div style={{ fontWeight: 900 }}>Collector link</div>
                          <div style={{ marginTop: "0.35rem" }}>
                            <code style={codePill}>{eventUrl}</code>
                          </div>
                        </div>

                        <div style={{ marginTop: "0.85rem", color: "#666", fontSize: "0.95rem" }}>
                          Place this QR code at the artist table. Collectors scan to open the event page and submit a COA
                          request.
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 900, marginBottom: "0.75rem" }}>Scan to Request COA</div>
                      <div style={qrBox}>
                        <QRCodeCanvas value={eventUrl} size={280} includeMargin={true} />
                      </div>
                      <div style={{ marginTop: "0.65rem", color: "#444", fontWeight: 900 }}>
                        {row.artist_name || "Artist"} • {row.event_name || "Event"}
                      </div>
                      <div style={{ marginTop: "0.25rem", color: "#666" }}>
                        {fmtDateRange(row.event_date, row.event_end_date)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Non-print helper info */}
                <div style={{ ...cardStyle, marginTop: "1rem" }}>
                  <div style={{ fontWeight: 900 }}>Open event page</div>
                  <div style={{ marginTop: "0.4rem" }}>
                    <a href={eventUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                      {eventUrl}
                    </a>
                  </div>
                  <div style={{ marginTop: "0.65rem", color: "#666", fontSize: "0.95rem" }}>
                    Tip: In Vercel, set <code>NEXT_PUBLIC_SITE_URL</code> to your production domain so the QR points to
                    production instead of localhost.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Print CSS */}
        <style jsx global>{`
          @media print {
            body {
              background: #fff !important;
            }
            nav,
            header,
            .no-print {
              display: none !important;
            }
            .print-area {
              box-shadow: none !important;
              border: none !important;
            }
          }
        `}</style>
      </div>
    </RequireAuth>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f1f1f1",
  fontFamily: "Arial, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "1.5rem",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const printCardStyle: React.CSSProperties = {
  ...cardStyle,
  padding: "1.4rem",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.7rem",
  fontWeight: 900,
};

const subTitleStyle: React.CSSProperties = {
  marginTop: "0.25rem",
  fontSize: "1.1rem",
  fontWeight: 900,
  color: "#555",
};

const qrBox: React.CSSProperties = {
  display: "inline-block",
  padding: "0.75rem",
  borderRadius: 16,
  border: "1px solid #eee",
  background: "#fff",
};

const primaryBtn: React.CSSProperties = {
  padding: "0.65rem 0.95rem",
  borderRadius: 12,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const secondaryBtn: React.CSSProperties = {
  padding: "0.65rem 0.95rem",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: 900,
};

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
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};
