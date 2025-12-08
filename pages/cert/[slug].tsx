import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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

  return (
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
          width: "850px",
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

        {/* IMAGE */}
        {coa.image_url && (
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <img
              src={coa.image_url}
              alt="COA Comic"
              style={{
                maxWidth: "320px",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
            />
          </div>
        )}

        {/* DETAILS */}
        <div style={{ marginTop: "10px", fontSize: "18px", lineHeight: 1.6 }}>
          <p>
            <strong>Comic Title:</strong> {coa.comic_title}
          </p>
          {coa.issue_number && (
            <p>
              <strong>Issue #:</strong> {coa.issue_number}
            </p>
          )}
          {coa.signed_by && (
            <p>
              <strong>Signed By:</strong> {coa.signed_by}
            </p>
          )}
          {coa.signed_date && (
            <p>
              <strong>Signed Date:</strong> {coa.signed_date}
            </p>
          )}
          {coa.signed_location && (
            <p>
              <strong>Signing Location:</strong> {coa.signed_location}
            </p>
          )}
          {coa.witnessed_by && (
            <p>
              <strong>Witnessed By:</strong> {coa.witnessed_by}
            </p>
          )}
        </div>

        {/* QR + VERIFIED SEAL CENTERED SIDE-BY-SIDE */}
        <div
          style={{
            marginTop: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "50px",
          }}
        >
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

          {/* VERIFIED SEAL */}
          <img
            src="/verified-seal.png"
            alt="Verified Seal"
            style={{
              width: "150px",
              height: "150px",
              objectFit: "contain",
              background: "transparent",
            }}
          />
        </div>
      </div>
    </div>
  );
}
