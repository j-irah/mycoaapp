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

  // Load COA record by QR ID
  useEffect(() => {
    if (!slug) return;

    const loadCoa = async () => {
      const { data, error } = await supabase
        .from("signatures")
        .select("*")
        .eq("qr_id", slug)
        .single();

      if (error || !data) {
        setError("Certificate not found.");
        setLoading(false);
        return;
      }

      setCoa(data as COA);
      setLoading(false);
    };

    loadCoa();
  }, [slug]);

  if (loading) return <p style={{ padding: "2rem" }}>Loading COA…</p>;
  if (error) return <p style={{ padding: "2rem", color: "red" }}>{error}</p>;
  if (!coa) return <p>No certificate available.</p>;

  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "700px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
        lineHeight: "1.6",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        Certificate of Authenticity
      </h1>

      {/* Display COA Image */}
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

      {/* Details Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          fontSize: "1rem",
        }}
      >
        <p>
          <strong>Title:</strong> {coa.comic_title}
        </p>

        <p>
          <strong>Issue #:</strong> {coa.issue_number || "—"}
        </p>

        <p>
          <strong>Signed by:</strong> {coa.signed_by || "—"}
        </p>

        <p>
          <strong>Signed date:</strong> {coa.signed_date || "—"}
        </p>

        <p>
          <strong>Signed location:</strong> {coa.signed_location || "—"}
        </p>

        <p>
          <strong>Witnessed by:</strong> {coa.witnessed_by || "—"}
        </p>
      </div>

      {/* Optional footer */}
      <div
        style={{
          marginTop: "2rem",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "#666",
        }}
      >
        <p>Verified through MyCOA Authentication System</p>
      </div>
    </div>
  );
}
