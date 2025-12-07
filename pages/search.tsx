// pages/search.tsx
// @ts-nocheck

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

type COA = {
  id: string;
  comic_title: string;
  issue_number: string | null;
  signed_by: string | null;
  signed_date: string | null;
  signed_location: string | null;
  witnessed_by: string | null;
  qr_id: string;
};

export default function PublicSearchPage() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [coa, setCoa] = useState<COA | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!serial.trim()) return;

    setLoading(true);
    setError(null);
    setCoa(null);

    const { data, error } = await supabase
      .from("signatures")
      .select("*")
      .eq("qr_id", serial.trim())
      .single();

    if (error || !data) {
      console.error(error);
      setError("No certificate found for that serial.");
      setCoa(null);
    } else {
      setCoa(data as COA);
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem 1rem",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f1f1f1",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#fff",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h1>Verify Certificate of Authenticity</h1>
        <p style={{ fontSize: "0.95rem", color: "#555" }}>
          Enter the COA Serial number printed on your certificate to confirm its authenticity.
        </p>

        <form onSubmit={handleSearch} style={{ marginTop: "1rem" }}>
          <input
            type="text"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Enter COA Serial (qr_id)"
            style={{
              padding: "0.5rem",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              marginBottom: "0.75rem",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <p style={{ marginTop: "1rem", color: "red" }}>
            {error}
          </p>
        )}

        {coa && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "6px",
              backgroundColor: "#fafafa",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
              Certificate found
            </h2>
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
              <strong>Serial:</strong> {coa.qr_id}
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <Link href={`/cert/${coa.qr_id}`}>
                View full certificate →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
