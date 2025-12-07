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
      </div>
    );
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <>
      <div style={pageBackgroundStyle}>
        <div style={certificateOuterWrapperStyle}>
          <div style={certificateOuterStyle}>
            <div style={certificateStyle}>
              {/* Print button (hidden when printing) */}
              <div style={printButtonWrapperStyle} id="print-button-wrapper">
                <button type="button" style={printButtonStyle} onClick={handlePrint}>
                  Print / Save as PDF
                </button>
              </div>

              {/* Heading */}
              <h1 style={headingStyle}>Certificate of Authenticity</h1>
              <p style={subtitleStyle}>
                This document certifies the authenticity of the signed comic detailed below.
              </p>

              {/* Serial number (using qr_id) */}
              <p style={serialNumberStyle}>
                COA Serial: <span>{coa.qr_id}</span>
              </p>

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
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
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

              {/* Footer with circular logo + verified seal */}
              <div style={footerStyle}>
                <p style={{ marginBottom: "0.25rem" }}>Verified by</p>
                <p style={{ fontWeight: "bold", marginBottom: "0.75rem" }}>
                  MyCOA Authentication System
                </p>

                <div style={footerCirclesStyle}>
                  {/* Circular logo */}
                  <div style={logoCircleStyle}>
                    <img
                      src="/logo.png"
                      alt="MyCOA Logo"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  {/* Verified seal */}
                  <div style={sealStyle}>
                    <span style={sealTextStyle}>Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-friendly styles */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }
          #print-button-wrapper {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

/* Styles */

const pageBackgroundStyle = {
  minHeight: "100vh",
  margin: 0,
  padding: "1rem 0.5rem",
  backgroundColor: "#e5e5e5",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  boxSizing: "border-box" as const,
};

const certificateOuterWrapperStyle = {
  width: "100%",
  maxWidth: "800px",
  margin: "0 auto",
  boxSizing: "border-box" as const,
};

const certificateOuterStyle = {
  padding: "3px",
  borderRadius: "14px",
  backgroundImage:
    "linear-gradient(135deg, #f7d488, #c9a86a, #9f7f4f, #c9a86a, #f7d488)",
  boxSizing: "border-box" as const,
};

const certificateStyle = {
  backgroundColor: "#fdfaf4",
  borderRadius: "12px",
  width: "100%",
  padding: "1.5rem 1.5rem",
  fontFamily: 'Georgia, "Times New Roman", serif',
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
  boxSizing: "border-box" as const,
};

const printButtonWrapperStyle = {
  display: "flex",
  justifyContent: "flex-end" as const,
  marginBottom: "0.75rem",
};

const printButtonStyle = {
  padding: "0.4rem 0.8rem",
  fontSize: "0.9rem",
  borderRadius: "6px",
  border: "1px solid #c9a86a",
  backgroundColor: "#f7e4b8",
  cursor: "pointer",
};

const headingStyle = {
  textAlign: "center" as const,
  fontSize: "1.6rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  marginBottom: "0.5rem",
};

const subtitleStyle = {
  textAlign: "center" as const,
  fontSize: "0.9rem",
  color: "#555",
  marginBottom: "1rem",
};

const serialNumberStyle = {
  textAlign: "center" as const,
  fontSize: "0.8rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "#777",
  marginBottom: "1.25rem",
};

const dividerStyle = {
  border: 0,
  borderTop: "1px solid #d3c19b",
  marginBottom: "1.25rem",
};

const detailsListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "0.35rem",
  fontSize: "0.95rem",
  lineHeight: 1.5,
};

const labelStyle = {
  fontWeight: "bold",
  minWidth: "130px",
  display: "inline-block",
};

const footerStyle = {
  marginTop: "1.25rem",
  textAlign: "center" as const,
  fontSize: "0.9rem",
};

const footerCirclesStyle = {
  marginTop: "0.75rem",
  display: "flex",
  justifyContent: "center" as const,
  gap: "1.25rem",
  flexWrap: "wrap" as const,
};

const logoCircleStyle = {
  width: 80,
  height: 80,
  borderRadius: "50%",
  border: "3px solid #c9a86a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  backgroundColor: "#ffffff",
};

const sealStyle = {
  width: 80,
  height: 80,
  borderRadius: "50%",
  border: "3px solid #c9a86a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
  background:
    "radial-gradient(circle at 30% 30%, #ffffff, #f5e4c3, #c9a86a, #b0894f)",
};

const sealTextStyle = {
  fontSize: "0.75rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};
