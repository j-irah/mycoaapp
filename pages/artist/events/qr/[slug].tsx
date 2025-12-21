// pages/artist/events/qr/[slug].tsx
// Artist QR/Preview page (requires role === 'artist').
// Version-safe QRCode import: supports qrcode.react variants without default export.

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import RequireAuth from "../../../../components/RequireAuth";
import { supabase } from "../../../../lib/supabaseClient";
import * as QRCodeReact from "qrcode.react";

type Role = "owner" | "admin" | "reviewer" | "artist" | null;

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

function isArtist(role: Role) {
  return role === "artist";
}

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

function getQrComponent() {
  // Works across qrcode.react versions:
  // - Some export QRCodeCanvas / QRCodeSVG named exports
  // - Some have default export
  const anyMod = QRCodeReact as any;
  return anyMod.QRCodeCanvas || anyMod.QRCodeSVG || anyMod.default || null;
}

export default function ArtistEventQRPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : null;

  const [role, setRole] = useState<Role>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [baseUrl, setBaseUrl] = useState<string>("");
  const [row, setRow] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
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

  const eventUrl = useMemo(() => {
    if (!slug || !baseUrl) return "";
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
        setRow(data as EventRow);
      }

      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [slug]);

  const QR = useMemo(() => getQrComponent(), []);

  return (
    <RequireAuth>
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
            <h1 style={{ margin: 0, fontWeight: 900 }}>Event QR</h1>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button onClick={() => router.push("/artist/events")} style={secondaryBtn}>
                Back to My Events
              </button>
              <button onClick={() => window.print()} style={primaryBtn} disabled={!eventUrl}>
                Print
              </button>
            </div>
          </div>

          {loadingRole ? (
            <div style={{ ...cardStyle, marginTop: "1rem" }}>Loading…</div>
          ) : !isArtist(role) ? (
            <div style={{ ...cardStyle, marginTop: "1rem" }}>
              <div style={{ fontWeight: 900 }}>Access denied</div>
              <div style={{ color: "#666", marginTop: 6 }}>You must be an approved artist to view this page.</div>
              <div style={{ marginTop: 12 }}>
                <Link href="/dashboard" style={linkStyle}>
                  Go to dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "1rem" }}>
              {loading ? (
                <div style={cardStyle}>Loading…</div>
              ) : err ? (
                <div style={{ ...cardStyle, ...errorBox }}>{err}</div>
              ) : !row || !eventUrl ? (
                <div style={cardStyle}>Event not found.</div>
              ) : !QR ? (
                <div style={{ ...cardStyle, ...errorBox }}>
                  QR component not available. Ensure <code>qrcode.react</code> is installed.
                </div>
              ) : (
                <>
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
                        </div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 900, marginBottom: "0.75rem" }}>Scan to Request COA</div>
                        <div style={qrBox}>
                          <QR value={eventUrl} size={280} includeMargin={true} />
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

                  <div style={{ ...cardStyle, marginTop: "1rem" }}>
                    <div style={{ fontWeight: 900 }}>Open event page</div>
                    <div style={{ marginTop: "0.4rem" }}>
                      <a href={`/e/${row.slug}`} target="_blank" rel="noreferrer" style={linkStyle}>
                        /e/{row.slug}
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

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
      </div>
    </RequireAuth>
  );
}

const pageStyle: CSSProperties = { minHeight: "100vh", background: "#f1f1f1", fontFamily: "Arial, sans-serif" };

const containerStyle: CSSProperties = { maxWidth: 1200, margin: "0 auto", padding: "1.5rem" };

const cardStyle: CSSProperties = {
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const printCardStyle: CSSProperties = { ...cardStyle, padding: "1.4rem" };

const titleStyle: CSSProperties = { fontSize: "1.7rem", fontWeight: 900 };

const subTitleStyle: CSSProperties = { marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 900, color: "#555" };

const qrBox: CSSProperties = {
  display: "inline-block",
  padding: "0.75rem",
  borderRadius: 16,
  border: "1px solid #eee",
  background: "#fff",
};

const primaryBtn: CSSProperties = {
  padding: "0.65rem 0.95rem",
  borderRadius: 12,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const secondaryBtn: CSSProperties = {
  padding: "0.65rem 0.95rem",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: 900,
};

const errorBox: CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  fontWeight: 900,
};

const badgeActive: CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
  fontSize: "0.9rem",
};

const badgeInactive: CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
  fontSize: "0.9rem",
};

const codePill: CSSProperties = {
  display: "inline-block",
  background: "#f5f5f5",
  border: "1px solid #ddd",
  padding: "0.25rem 0.55rem",
  borderRadius: 10,
  fontWeight: 900,
  maxWidth: "100%",
  overflowWrap: "anywhere",
};

const linkStyle: CSSProperties = { fontWeight: 900, color: "#1976d2", textDecoration: "none" };
