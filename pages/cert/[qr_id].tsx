// pages/cert/[qr_id].tsx
// Public certificate page (no RPC).
// Fetches certificate by qr_id directly from `signatures`.
//
// Option 1 fix: Always generate verification URL + QR using canonical site origin.
// Priority:
// 1) NEXT_PUBLIC_SITE_URL (recommended: https://www.rawauthentics.com)
// 2) window.location.origin fallback
// This prevents localhost URLs from ever appearing in production QR/print.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabaseClient";

type SignatureRow = {
  id: string;
  qr_id: string;
  comic_title: string | null;
  issue_number: string | null;

  signed_by: string | null;
  signed_date: string | null;
  signed_location: string | null;

  witnessed_by: string | null;

  image_url: string | null; // cover image if stored here (optional)
  status: "active" | "revoked";
  created_at: string;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

function titleIssue(title?: string | null, issue?: string | null) {
  const t = (title || "").trim();
  const i = (issue || "").trim();
  if (!t && !i) return "Certificate of Authenticity";
  if (!i) return t;
  return `${t} #${i}`;
}

function getCanonicalOrigin() {
  // Expected value: https://www.rawauthentics.com
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (env) return env.replace(/\/+$/, ""); // remove trailing slash

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

export default function PublicCertPage() {
  const router = useRouter();
  const qr_id = useMemo(() => (router.query.qr_id ? String(router.query.qr_id) : ""), [router.query.qr_id]);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<SignatureRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const publicUrl = useMemo(() => {
    if (!qr_id) return "";
    const origin = getCanonicalOrigin();
    // Fallback to relative if origin missing (rare)
    return origin ? `${origin}/cert/${qr_id}` : `/cert/${qr_id}`;
  }, [qr_id]);

  useEffect(() => {
    if (!qr_id) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setRow(null);
      setQrDataUrl(null);

      const { data, error } = await supabase
        .from("signatures")
        .select(
          "id, qr_id, comic_title, issue_number, signed_by, signed_date, signed_location, witnessed_by, image_url, status, created_at"
        )
        .eq("qr_id", qr_id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Certificate not found.");
        setLoading(false);
        return;
      }

      setRow(data as any);
      setLoading(false);

      // Generate QR image client-side using canonical public URL
      try {
        const url = await QRCode.toDataURL(publicUrl, { margin: 1, width: 220 });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [qr_id, publicUrl]);

  const heading = row ? titleIssue(row.comic_title, row.issue_number) : "Certificate";

  return (
    <div style={page}>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
        }
      `}</style>

      <div style={topBar} className="no-print">
        <Link href="/" style={brand}>
          Raw Authentics
        </Link>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button onClick={() => window.print()} style={btn}>
            Print
          </button>
        </div>
      </div>

      <main style={sheetWrap}>
        <section style={sheet}>
          {loading ? (
            <div style={{ padding: "2rem", color: "#444", fontWeight: 800 }}>Loading certificate…</div>
          ) : error ? (
            <div style={{ padding: "2rem" }}>
              <h1 style={{ marginTop: 0 }}>Certificate not found</h1>
              <p style={{ color: "#666", fontWeight: 700 }}>{error}</p>
              <Link href="/" className="no-print" style={link}>
                Go home
              </Link>
            </div>
          ) : row ? (
            <>
              <header style={header}>
                <div>
                  <div style={kicker}>Raw Authentics</div>
                  <h1 style={h1}>Certificate of Authenticity</h1>
                  <div style={sub}>{heading}</div>

                  {row.status === "revoked" && (
                    <div style={revokedBanner}>REVOKED — This certificate is no longer valid.</div>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={miniLabel}>Certificate ID</div>
                  <div style={mono}>{row.id}</div>
                  <div style={{ height: 8 }} />
                  <div style={miniLabel}>QR ID</div>
                  <div style={mono}>{row.qr_id}</div>
                </div>
              </header>

              <div style={bodyGrid}>
                {/* Left: cover */}
                <div style={left}>
                  <div style={coverBox}>
                    {row.image_url ? (
                      <img src={row.image_url} alt="Book cover" style={coverImg} />
                    ) : (
                      <div style={coverPlaceholder}>No cover image</div>
                    )}
                  </div>

                  <div style={verifyCard}>
                    <div style={verifyTitle}>Verify this COA</div>
                    <div style={verifyText}>Scan the QR code or visit:</div>
                    <div style={verifyLink}>{publicUrl}</div>
                  </div>
                </div>

                {/* Right: details */}
                <div style={right}>
                  <div style={detailRow}>
                    <div style={label}>Comic title</div>
                    <div style={value}>{row.comic_title || "—"}</div>
                  </div>

                  <div style={detailRow}>
                    <div style={label}>Issue number</div>
                    <div style={value}>{row.issue_number || "—"}</div>
                  </div>

                  <div style={detailRow}>
                    <div style={label}>Signed by</div>
                    <div style={value}>{row.signed_by || "—"}</div>
                  </div>

                  <div style={detailRow}>
                    <div style={label}>Event / location</div>
                    <div style={value}>{row.signed_location || "—"}</div>
                  </div>

                  <div style={detailRow}>
                    <div style={label}>Event date(s)</div>
                    <div style={value}>{fmtDate(row.signed_date)}</div>
                  </div>

                  <div style={detailRow}>
                    <div style={label}>Issued date</div>
                    <div style={value}>{fmtDate(row.created_at)}</div>
                  </div>

                  <div style={detailRow}>
                    <div style={label}>Witness / attestation</div>
                    <div style={value}>{row.witnessed_by || "—"}</div>
                  </div>

                  <div style={qrWrap}>
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR code" style={qrImg} />
                    ) : (
                      <div style={qrFallback}>QR</div>
                    )}
                  </div>
                </div>
              </div>

              <footer style={footer}>
                <div style={{ color: "#666", fontWeight: 700 }}>
                  This certificate verifies the listed signature details for the referenced collectible.
                </div>
              </footer>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f6f6f6",
};

const topBar: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "1rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const brand: React.CSSProperties = {
  textDecoration: "none",
  fontWeight: 900,
  color: "#111",
};

const btn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  padding: "0.55rem 0.85rem",
  fontWeight: 900,
  cursor: "pointer",
};

const sheetWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 1rem 2rem",
};

const sheet: React.CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  border: "1px solid #eaeaea",
  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  padding: "1.6rem 1.6rem 1.1rem",
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  borderBottom: "1px solid #eee",
};

const kicker: React.CSSProperties = { fontWeight: 900, color: "#666", letterSpacing: 0.6, textTransform: "uppercase" };
const h1: React.CSSProperties = { margin: "0.2rem 0 0", fontSize: "2rem", fontWeight: 900, color: "#111" };
const sub: React.CSSProperties = { marginTop: 6, fontWeight: 800, color: "#333" };

const revokedBanner: React.CSSProperties = {
  marginTop: 10,
  display: "inline-block",
  padding: "0.35rem 0.6rem",
  borderRadius: 999,
  fontWeight: 900,
  background: "#fff3cd",
  border: "1px solid #ffe69c",
};

const miniLabel: React.CSSProperties = { color: "#666", fontWeight: 900, fontSize: "0.8rem" };
const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 900 };

const bodyGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.2fr",
  gap: "1.2rem",
  padding: "1.6rem",
};

const left: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "1rem" };
const right: React.CSSProperties = { position: "relative" };

const coverBox: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 16,
  overflow: "hidden",
  background: "#fafafa",
  aspectRatio: "3 / 4",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const coverImg: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const coverPlaceholder: React.CSSProperties = { color: "#999", fontWeight: 900 };

const verifyCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 16,
  padding: "1rem",
  background: "#fff",
};

const verifyTitle: React.CSSProperties = { fontWeight: 900, marginBottom: 6 };
const verifyText: React.CSSProperties = { color: "#666", fontWeight: 700, marginBottom: 6 };
const verifyLink: React.CSSProperties = { wordBreak: "break-all", fontWeight: 900, fontSize: "0.95rem" };

const detailRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "170px 1fr",
  gap: "0.8rem",
  padding: "0.55rem 0",
  borderBottom: "1px dashed #eee",
};

const label: React.CSSProperties = { color: "#666", fontWeight: 900 };
const value: React.CSSProperties = { color: "#111", fontWeight: 900 };

const qrWrap: React.CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: 0,
  border: "1px solid #eee",
  borderRadius: 16,
  padding: "0.75rem",
  background: "#fff",
};

const qrImg: React.CSSProperties = { width: 220, height: 220, display: "block" };
const qrFallback: React.CSSProperties = { width: 220, height: 220, display: "grid", placeItems: "center", fontWeight: 900 };

const footer: React.CSSProperties = {
  padding: "1rem 1.6rem 1.6rem",
  borderTop: "1px solid #eee",
};

const link: React.CSSProperties = { fontWeight: 900, textDecoration: "underline", color: "#6a1b9a" };
