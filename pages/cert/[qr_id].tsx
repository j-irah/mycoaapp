// pages/cert/[qr_id].tsx
// Public certificate verification page.
// No localhost hardcoding. Uses NEXT_PUBLIC_SITE_URL or window.location.origin for absolute links.

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type CertRow = {
  id: string;
  qr_id: string;
  serial_number: string | null;
  created_at: string | null;
  owner_name: string | null;
  comic_title: string | null;
  issue_number: string | null;
  artist_name: string | null;
  event_name: string | null;
  witness_name: string | null;
  book_image_url: string | null;
};

export default function CertPage() {
  const router = useRouter();
  const qrId = typeof router.query.qr_id === "string" ? router.query.qr_id : null;

  const [baseUrl, setBaseUrl] = useState<string>("");
  const [row, setRow] = useState<CertRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (env) setBaseUrl(env);
    else if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!qrId) return;

      setLoading(true);
      setErr(null);

      // Preferred: SECURITY DEFINER RPC that returns safe public fields
      const { data, error } = await supabase
        .rpc("get_signature_public", { qr_id: qrId })
        .maybeSingle();

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setRow(null);
      } else {
        setRow((data ?? null) as CertRow | null);
      }

      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [qrId]);

  const shareUrl = useMemo(() => {
    if (!baseUrl || !qrId) return "";
    return `${baseUrl}/cert/${qrId}`;
  }, [baseUrl, qrId]);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {loading ? (
          <>
            <h1 style={h1}>Loading…</h1>
            <p style={muted}>Verifying certificate.</p>
          </>
        ) : err ? (
          <>
            <h1 style={h1}>Certificate not found</h1>
            <p style={muted}>{err}</p>
            <Link href="/" style={linkStyle}>
              Go home
            </Link>
          </>
        ) : !row ? (
          <>
            <h1 style={h1}>Certificate not found</h1>
            <p style={muted}>This certificate may be invalid or unavailable.</p>
            <Link href="/" style={linkStyle}>
              Go home
            </Link>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h1 style={h1}>Verified COA</h1>
              {shareUrl ? (
                <button
                  style={secondaryBtn}
                  onClick={() => navigator.clipboard?.writeText(shareUrl)}
                  title="Copy link"
                >
                  Copy link
                </button>
              ) : null}
            </div>

            <div style={{ marginTop: 10, color: "#444", fontWeight: 900 }}>
              Serial: {row.serial_number || "—"}
            </div>

            <div style={{ marginTop: 14, color: "#444", lineHeight: 1.6 }}>
              <div>
                <strong>Artist:</strong> {row.artist_name || "—"}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Event:</strong> {row.event_name || "—"}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Comic:</strong> {row.comic_title || "—"} {row.issue_number ? `#${row.issue_number}` : ""}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Witness:</strong> {row.witness_name || "—"}
              </div>
            </div>

            {row.book_image_url ? (
              <div style={{ marginTop: 16 }}>
                <img
                  src={row.book_image_url}
                  alt="Book image"
                  style={{ width: "100%", borderRadius: 14, border: "1px solid #eee" }}
                />
              </div>
            ) : null}

            <div style={{ marginTop: 16 }}>
              <Link href="/" style={linkStyle}>
                Go home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f3f3",
  padding: "2rem",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  fontFamily: "Arial, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 820,
  background: "#fff",
  borderRadius: 16,
  padding: "1.5rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
};

const h1: React.CSSProperties = { margin: 0, fontWeight: 900, fontSize: "2rem" };
const muted: React.CSSProperties = { marginTop: 10, color: "#666" };

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#6a1b9a",
  textDecoration: "underline",
};

const secondaryBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.65rem 0.9rem",
  fontWeight: 900,
  cursor: "pointer",
};
