import { useRouter } from "next/router";
import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "../../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";

type COA = {
  id: string;
  comic_title: string;
  issue_number: string | null;
  signed_by: string | null;
  signed_date: string | null;
  signed_location: string | null;
  witnessed_by: string | null;
  qr_id: string;
  image_url: string | null;
  serial_number: string | null;
};

export default function COAPage() {
  const router = useRouter();

  const slug = Array.isArray(router.query.slug)
    ? router.query.slug[0]
    : router.query.slug;

  const [coa, setCoa] = useState<COA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function fetchCOA() {
      const { data, error } = await supabase
        .from("signatures")
        .select("*")
        .eq("qr_id", slug)
        .single();

      if (error) {
        console.error(error);
      } else {
        setCoa(data);
      }
      setLoading(false);
    }

    fetchCOA();
  }, [slug]);

  if (loading) return <p>Loading...</p>;
  if (!coa) return <p>COA not found.</p>;

  const qrUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cert/${coa.qr_id}`;

  // Larger label/value styles (Option A, upgraded)
  const labelStyle: CSSProperties = {
    fontSize: "13px",              // was 11px
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#b08a3c",
    marginBottom: "4px",
  };

  const valueStyle: CSSProperties = {
    fontSize: "20px",              // was 18px
    color: "#2c2c2c",
    marginBottom: "12px",
  };

  const fieldGroupStyle: CSSProperties = {
    marginBottom: "12px",
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "850px",
            background: "#fdf9ee",
            border: "12px double #bfa76f",
            padding: "40px",
          }}
        >
          {/* TITLE */}
          <h1
            style={{
              textAlign: "center",
              fontSize: "34px",
              marginBottom: "10px",
              letterSpacing: "2px",
            }}
          >
            Certificate of Authenticity
          </h1>

          {/* SERIAL NUMBER */}
          {coa.serial_number && (
            <p
              style={{
                textAlign: "center",
                marginTop: "-5px",
                marginBottom: "20px",
                fontSize: "14px",
                color: "#555",
              }}
            >
              Serial #{coa.serial_number}
            </p>
          )}

          {/* MAIN INFO SECTION: details left + image right */}
          <div
            className="coa-main-row"
            style={{
              marginTop: "30px",
              display: "flex",
              gap: "40px",
              alignItems: "flex-start",
            }}
          >
            {/* LEFT SIDE DETAILS */}
            <div style={{ flex: 1 }}>
              {/* Comic Title */}
              <div style={fieldGroupStyle}>
                <div style={labelStyle}>Comic Title</div>
                <div style={valueStyle}>{coa.comic_title}</div>
              </div>

              {/* Issue # */}
              {coa.issue_number && (
                <div style={fieldGroupStyle}>
                  <div style={labelStyle}>Issue #</div>
                  <div style={valueStyle}>{coa.issue_number}</div>
                </div>
              )}

              {/* Signed By */}
              {coa.signed_by && (
                <div style={fieldGroupStyle}>
                  <div style={labelStyle}>Signed By</div>
                  <div style={valueStyle}>{coa.signed_by}</div>
                </div>
              )}

              {/* Signed Date */}
              {coa.signed_date && (
                <div style={fieldGroupStyle}>
                  <div style={labelStyle}>Signed Date</div>
                  <div style={valueStyle}>{coa.signed_date}</div>
                </div>
              )}

              {/* Signing Location */}
              {coa.signed_location && (
                <div style={fieldGroupStyle}>
                  <div style={labelStyle}>Signing Location</div>
                  <div style={valueStyle}>{coa.signed_location}</div>
                </div>
              )}

              {/* Witnessed By */}
              {coa.witnessed_by && (
                <div style={fieldGroupStyle}>
                  <div style={labelStyle}>Witnessed By</div>
                  <div style={valueStyle}>{coa.witnessed_by}</div>
                </div>
              )}
            </div>

            {/* RIGHT SIDE — larger COMIC IMAGE with gold border + shadow */}
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
              }}
            >
              {coa.image_url && (
                <img
                  src={coa.image_url}
                  alt="COA Comic"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "420px",
                    border: "2px solid #c9a86a",
                    borderRadius: "10px",
                    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
                    objectFit: "contain",
                    backgroundColor: "#fff",
                  }}
                />
              )}
            </div>
          </div>

          {/* SEAL ABOVE QR – centered column */}
          <div
            style={{
              marginTop: "40px",
              display: "flex",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {/* VERIFIED SEAL v4 */}
              <img
                src="/verified-seal-v4.png"
                alt="Verified Seal"
                style={{
                  width: "180px",
                  height: "180px",
                  objectFit: "contain",
                  background: "transparent",
                }}
              />

              {/* QR CODE */}
              <QRCodeCanvas
                value={qrUrl}
                size={140}
                style={{
                  background: "transparent",
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid #c9b37a",
                }}
              />
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "11px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#666",
                }}
              >
                Scan to Verify
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Basic responsiveness: stack details + image on small screens */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .coa-main-row {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
