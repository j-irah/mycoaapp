// pages/admin/create-coa.tsx
// @ts-nocheck
//
// Legacy COA create page (admin). Avoids hardcoded localhost URLs.
// Uses NEXT_PUBLIC_SITE_URL (if set) or window.location.origin to display absolute cert URL + QR.

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";

const BUCKET_NAME = "coa-images"; // change if your bucket name is different

function getEnvBaseUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  return env ? env.replace(/\/$/, "") : "";
}

export default function CreateCOAPage() {
  const [comicTitle, setComicTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [signedLocation, setSignedLocation] = useState("");
  const [witnessedBy, setWitnessedBy] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [created, setCreated] = useState<any>(null);

  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    const env = getEnvBaseUrl();
    if (env) setBaseUrl(env);
    else if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  const certPath = useMemo(() => (created?.qr_id ? `/cert/${created.qr_id}` : ""), [created]);
  const certUrl = useMemo(() => {
    if (!created?.qr_id) return null;
    if (!baseUrl) return certPath || null;
    return `${baseUrl}${certPath}`;
  }, [baseUrl, certPath, created]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    setCreated(null);

    try {
      const res = await fetch("/api/create-coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_title: comicTitle,
          issue_number: issueNumber,
          signed_by: signedBy,
          signed_date: signedDate || null,
          signed_location: signedLocation || null,
          witnessed_by: witnessedBy || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create COA failed");

      // Optional upload image to Supabase bucket if a file was selected
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${data.qr_id}.${ext}`;

        const { error: upErr } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
        });

        if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);

        const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
        const imageUrl = pub?.publicUrl || null;

        // (Optional) update COA row with image_url if your schema supports it
        await supabase.from("coas").update({ image_url: imageUrl }).eq("id", data.id);
        data.image_url = imageUrl;
      }

      setCreated(data);
      setMessage("COA created successfully.");

      setComicTitle("");
      setIssueNumber("");
      setSignedBy("");
      setSignedDate("");
      setSignedLocation("");
      setWitnessedBy("");
      setFile(null);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }

    setLoading(false);
  }

  return (
    <AdminLayout requireStaff={true}>
      <h1 style={{ marginTop: 0 }}>Create COA (Legacy Page)</h1>

      <div style={{ color: "#666", fontWeight: 800, marginBottom: "1rem" }}>
        Note: Your primary create page is <code>/admin/create</code>. This page is kept for compatibility.
      </div>

      {message && <div style={okBox}>{message}</div>}
      {error && <div style={errorBox}>{error}</div>}

      <div style={card}>
        <form onSubmit={handleSubmit}>
          <label style={label}>Comic Title *</label>
          <input value={comicTitle} onChange={(e) => setComicTitle(e.target.value)} style={input} />

          <label style={label}>Issue # *</label>
          <input value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} style={input} />

          <label style={label}>Signed By *</label>
          <input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} style={input} />

          <label style={label}>Signed Date</label>
          <input value={signedDate} onChange={(e) => setSignedDate(e.target.value)} style={input} placeholder="YYYY-MM-DD" />

          <label style={label}>Signing Location</label>
          <input value={signedLocation} onChange={(e) => setSignedLocation(e.target.value)} style={input} />

          <label style={label}>Witnessed By</label>
          <input value={witnessedBy} onChange={(e) => setWitnessedBy(e.target.value)} style={input} />

          <label style={label}>Optional Image Upload</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ marginTop: "0.25rem" }}
          />

          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? "Working…" : "Create COA"}
          </button>
        </form>

        {created && (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 900 }}>Created ✅</div>

            <div style={{ marginTop: "0.35rem" }}>
              <div style={row}>
                <span style={k}>COA ID:</span> <code>{created.id}</code>
              </div>
              <div style={row}>
                <span style={k}>QR ID:</span> <code>{created.qr_id}</code>
              </div>
              {certUrl && (
                <div style={row}>
                  <span style={k}>Cert URL:</span>{" "}
                  <a href={certPath} target="_blank" rel="noreferrer" style={linkStyle}>
                    {certUrl}
                  </a>
                </div>
              )}
              {created.image_url && (
                <div style={row}>
                  <span style={k}>Image:</span>{" "}
                  <a href={created.image_url} target="_blank" rel="noreferrer" style={linkStyle}>
                    Open
                  </a>
                </div>
              )}
            </div>

            {certUrl && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ fontWeight: 900, marginBottom: "0.35rem" }}>QR Code</div>
                <QRCodeCanvas value={certUrl} size={160} />
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const label: React.CSSProperties = {
  display: "block",
  fontWeight: 900,
  marginTop: "0.65rem",
  marginBottom: "0.35rem",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem 1rem",
  marginTop: "1rem",
  background: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 900,
};

const okBox: React.CSSProperties = {
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  padding: "0.75rem",
  borderRadius: 12,
  fontWeight: 900,
  marginBottom: "1rem",
};

const errorBox: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  padding: "0.75rem",
  borderRadius: 12,
  fontWeight: 900,
  marginBottom: "1rem",
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};

const row: React.CSSProperties = { marginTop: "0.35rem" };
const k: React.CSSProperties = { fontWeight: 900, color: "#333" };
