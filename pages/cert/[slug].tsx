// pages/cert/[slug].tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

type COA = {
  id: string;
  comic_title: string;
  issue_number: string | null;
  signed_by: string | null;
  signed_date: string | null;
  signed_location: string | null;
  witnessed_by: string | null;
  image_url: string | null;
  qr_id: string;
};

export default function COAPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [coa, setCoa] = useState<COA | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // DEBUG TEXT so we know this version is live
  const debugLabel = "COA LAYOUT v2";

  useEffect(() => {
    if (!slug) return;

    const qrId = Array.isArray(slug) ? slug[0] : slug;

    const loadCoa = async () => {
      const { data, error } = await supabase
        .from("signatures")
        .select("*")
        .eq("qr_id", qrId)
        .single();

      if (error || !data) {
        console.error(error);
        setError("Certificate not found.");
        setLoading(false);
        return;
      }

      setCoa(data as COA);
      setLoading(false);
    };

    loadCoa();
  }, [slug]);

  if (loading) {
    return (
      <div style={pageBackgroundStyle}>
        <p style={{ padding: "2rem" }}>Loading certificate…</p>
      </div>
    );
  }

  if (error || !coa) {
    return (
      <div style={pageBackgroundStyle}>
        <p style={{ padding: "2rem", color: "red" }}>
          {error || "Certificate not found."}
        </p>
        {/* Debug label so we can see new layout */}
        <p style={{ padding: "2rem" }}>{debugLabel}</p>
      </div>
    );
  }

  return (
    <div style={pageBackgroundStyle}>
      <div style={certificateStyle}>
        {/* DEBUG label small at top-left so we know this version is live */}
        <div style={{ fontSize: "0.7rem", color: "#999", marginBottom: "0.25rem" }}>
          {debugLabel}
        </div>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img
            src="/logo.png" // must match file name in /public
            alt="MyCOA Logo"
            style={{ maxWidth: "180px", height: "auto" }}
          />
        </div>

        {/* Heading */}
        <h1 style={headingStyle}>Certificate of Authenticity</h1>
        <p style={subtitleStyle}>
          This document certifies the authenticity of the signed comic detailed
          below.
        </p>

        {/* Divider */}
        <hr style={dividerStyle} />

        {/* Comic Image */}
        {coa.image_url && (
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <img
              src={coa.image_url}
              alt="COA Comic"
              style={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        )}

        {/* Details */}
        <div style={detailsListStyle}>
          <p>
            <span style={labelStyle}>Title:</span> {coa.comic_title}
          </p>
          <p>
            <span style={labelStyle}>Issue #:</span>{" "}
            {coa.issue_number || "—"}
          </p>
          <p>
            <span style={labelStyle}>Signed by:</span>{" "}
            {coa.signed_by || "—"}
          </p>
          <p>
            <span style={labelStyle}>Signed date:</span>{" "}
            {coa.signed_date || "—"}
          </p>
          <p>
            <span style={labelStyle}>Signed location:</span>{" "}
            {coa.signed_location || "—"}
          </p>
          <p>
            <span style={labelStyle}>Witnessed by:</span>{" "}
            {coa.witnessed_by || "—"}
          </p>
        </div>

        {/* Footer / seal area */}
        <div style={footerStyle}>
          <div>
            <p style={{ marginBottom: "0.25rem" }}>Verified by</p>
            <p style={{ fontWeight: "bold" }}>MyCOA Authentication System</p>
          </div>
          <div style={sealStyle}>
            <span style={sealTextStyle}>Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Styles */

const pageBackgroundStyle: React.CSSProperties = {
  minHeight: "100vh",
  margin: 0,
  padding: "2rem 1rem",
  backgroundColor: "#e5e5e5",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const certificateStyle: React.CSSProperties = {
  backgroundColor: "#fdfaf4", // cream
  border: "2px solid #c9a86a", // gold-ish
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
  maxWidth: "800px",
  width: "100%",
  padding: "2rem 2.5rem",
  borderRadius: "12px",
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const headingStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "1.8rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "0.5rem",
};

const subtitleStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "0.95rem",
  color: "#555",
  marginBottom: "1.5rem",
};

const dividerStyle: React.CSSProperties = {
  border: 0,
  borderTop: "1px solid #d3c19b",
  marginBottom: "1.5rem",
};

const detailsListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
  fontSize: "1rem",
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontWeight: "bold",
  minWidth: "140px",
  display: "inline-block",
};

const footerStyle: React.CSSProperties = {
  marginTop: "2rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1.5rem",
  flexWrap: "wrap",
  fontSize: "0.9rem",
};

const sealStyle: React.CSSProperties = {
  width: "90px",
  height: "90px",
  borderRadius: "50%",
  border: "3px solid #c9a86a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const sealTextStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
