// pages/cert/[slug].tsx
// @ts-nocheck

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  // If it's already YYYY-MM-DD, keep it clean
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return String(v);
  }
}

function safeText(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default function CertificatePage() {
  const router = useRouter();
  const { slug } = router.query; // treated as qr_id

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any>(null);
  const [eventRow, setEventRow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const qrId = useMemo(() => (typeof slug === "string" ? slug : ""), [slug]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!qrId) return;

      setLoading(true);
      setError(null);
      setRow(null);
      setEventRow(null);

      // Load issued COA (signatures) by qr_id
      const sig = await supabase
        .from("signatures")
        .select(
          "id, qr_id, serial_number, status, comic_title, issue_number, signed_by, signed_date, signed_location, witnessed_by, image_url, event_id, created_at"
        )
        .eq("qr_id", qrId)
        .single();

      if (!active) return;

      if (sig.error || !sig.data) {
        setError("Certificate not found.");
        setLoading(false);
        return;
      }

      setRow(sig.data);

      // Optional: event context (nice on COA)
      if (sig.data?.event_id) {
        const ev = await supabase
          .from("events")
          .select("id, artist_name, event_name, event_location, event_date, event_end_date")
          .eq("id", sig.data.event_id)
          .single();

        if (!ev.error && ev.data) setEventRow(ev.data);
      }

      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [qrId]);

  if (loading) {
    return <div style={pageStyle}>Loading certificate…</div>;
  }

  if (error || !row) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={{ marginTop: 0 }}>COA Not Found</h1>
          <p style={{ color: "#555" }}>
            This certificate link may be invalid, or the COA may not exist.
          </p>
          <div style={{ marginTop: "0.75rem" }}>
            <Link href="http://localhost:3000" style={{ fontWeight: 900 }}>
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isActive = row.status === "active";

  const witnessedLine =
    row.witnessed_by && String(row.witnessed_by).trim().length > 0
      ? String(row.witnessed_by)
      : null;

  // Prefer event details when present (more authoritative than free text)
  const signedLocation =
    eventRow?.event_location || eventRow?.event_name || row.signed_location;

  const signedBy = eventRow?.artist_name || row.signed_by;

  const eventName = eventRow?.event_name || null;

  const eventDates =
    eventRow?.event_date
      ? eventRow.event_end_date && eventRow.event_end_date !== eventRow.event_date
        ? `${eventRow.event_date} → ${eventRow.event_end_date}`
        : eventRow.event_date
      : null;

  return (
    <div style={pageStyle}>
      <div style={outer}>
        {/* Header */}
        <div style={headerRow}>
          <div>
            <div style={title}>Certificate of Authenticity</div>
            <div style={{ color: "#666", marginTop: "0.25rem" }}>
              Verification ID: <code style={codeStyle}>{row.qr_id}</code>
            </div>
            {row.serial_number && (
              <div style={{ color: "#666", marginTop: "0.25rem" }}>
                Serial: <strong>{row.serial_number}</strong>
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={isActive ? badgeVerified : badgeInactive}>
              {isActive ? "Verified" : safeText(row.status)}
            </span>
            <div style={{ marginTop: "0.6rem" }}>
              <button onClick={() => window.print()} style={printBtn}>
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={bodyGrid}>
          {/* Book image */}
          <div style={imgCard}>
            <div style={sectionTitle}>Book Image</div>
            {row.image_url ? (
              <a href={row.image_url} target="_blank" rel="noreferrer" style={openLink}>
                Open full size
              </a>
            ) : (
              <div style={{ color: "#666", marginBottom: "0.5rem" }}>No image provided.</div>
            )}

            <div style={{ marginTop: "0.75rem" }}>
              {row.image_url ? (
                <img src={row.image_url} alt="Book" style={bookImg} />
              ) : (
                <div style={imgPlaceholder}>No Image</div>
              )}
            </div>
          </div>

          {/* COA details */}
          <div style={detailsCard}>
            <div style={sectionTitle}>Details</div>

            <div style={detailList}>
              <Detail label="Comic Title" value={row.comic_title} />
              <Detail label="Issue #" value={row.issue_number} />
              <Detail label="Signed By" value={signedBy} />
              <Detail label="Signed Date" value={fmtDate(row.signed_date)} />
              <Detail label="Signing Location" value={signedLocation} />

              {eventName && <Detail label="Event" value={eventName} />}
              {eventDates && <Detail label="Event Dates" value={eventDates} />}

              {/* This is the key change requested */}
              <Detail
                label="Witnessed By"
                value={
                  witnessedLine
                    ? witnessedLine
                    : "—"
                }
              />
            </div>

            <div style={finePrint}>
              This COA is issued after review of a collector submission and supporting proof.
              The proof image is kept private. The witness line reflects the collector’s attestation
              when provided.
            </div>

            <div style={{ marginTop: "1rem" }}>
              <Link href="http://localhost:3000" style={{ fontWeight: 900 }}>
                Back to site
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }
          a {
            color: #000 !important;
            text-decoration: none !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div style={detailRow}>
      <div style={detailLabel}>{label}</div>
      <div style={detailValue}>{safeText(value)}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f1f1f1",
  fontFamily: "Arial, sans-serif",
  padding: "1.25rem",
};

const outer: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
  padding: "1.25rem",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "1rem",
  borderBottom: "1px solid #eee",
  paddingBottom: "1rem",
  marginBottom: "1rem",
};

const title: React.CSSProperties = {
  fontSize: "1.6rem",
  fontWeight: 900,
};

const codeStyle: React.CSSProperties = {
  background: "#f5f5f5",
  border: "1px solid #ddd",
  padding: "0.1rem 0.35rem",
  borderRadius: 8,
  fontWeight: 900,
};

const badgeVerified: React.CSSProperties = {
  display: "inline-block",
  padding: "0.35rem 0.75rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
};

const badgeInactive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.35rem 0.75rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
};

const printBtn: React.CSSProperties = {
  padding: "0.55rem 0.9rem",
  borderRadius: 12,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const bodyGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1rem",
};

const imgCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 14,
  padding: "1rem",
  background: "#fff",
};

const detailsCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 14,
  padding: "1rem",
  background: "#fff",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "1.1rem",
  marginBottom: "0.5rem",
};

const openLink: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};

const bookImg: React.CSSProperties = {
  width: "100%",
  height: 520,
  objectFit: "cover",
  borderRadius: 12,
  border: "1px solid #eee",
};

const imgPlaceholder: React.CSSProperties = {
  width: "100%",
  height: 520,
  borderRadius: 12,
  border: "1px dashed #bbb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#777",
  fontWeight: 900,
};

const detailList: React.CSSProperties = {
  display: "grid",
  gap: "0.55rem",
  marginTop: "0.5rem",
};

const detailRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "170px 1fr",
  gap: "0.75rem",
  alignItems: "baseline",
  borderBottom: "1px solid #f2f2f2",
  paddingBottom: "0.45rem",
};

const detailLabel: React.CSSProperties = {
  color: "#666",
  fontWeight: 900,
};

const detailValue: React.CSSProperties = {
  fontWeight: 900,
  color: "#111",
  wordBreak: "break-word",
};

const finePrint: React.CSSProperties = {
  marginTop: "1rem",
  color: "#666",
  fontSize: "0.92rem",
  lineHeight: 1.4,
};

const cardStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};
