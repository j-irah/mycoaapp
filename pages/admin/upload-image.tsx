// pages/admin/upload-image.tsx
// @ts-nocheck

import { useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

const BUCKET_NAME = "coa-images"; // change if your bucket name is different

export default function UploadImagePage() {
  const [qrId, setQrId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!qrId.trim()) return setError("QR ID is required.");
    if (!file) return setError("Please select an image file.");

    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${qrId.trim()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
      const imageUrl = pub?.publicUrl || null;

      // If your coas table has image_url, update it here
      const { error: dbErr } = await supabase.from("coas").update({ image_url: imageUrl }).eq("qr_id", qrId.trim());

      if (dbErr) throw new Error(`Uploaded, but failed to update coas.image_url: ${dbErr.message}`);

      setMessage(`Upload successful. Updated coas.image_url for qr_id=${qrId.trim()}`);
      setQrId("");
      setFile(null);
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    }

    setUploading(false);
  }

  return (
    <AdminLayout requireStaff={true}>
      <h1 style={{ marginTop: 0 }}>Upload COA Image</h1>

      <div style={{ color: "#666", fontWeight: 800, marginBottom: "1rem" }}>
        This uploads to bucket <code>{BUCKET_NAME}</code> and updates <code>coas.image_url</code> for the given QR ID.
      </div>

      {message && <div style={okBox}>{message}</div>}
      {error && <div style={errorBox}>{error}</div>}

      <div style={card}>
        <form onSubmit={handleSubmit}>
          <label style={label}>QR ID *</label>
          <input value={qrId} onChange={(e) => setQrId(e.target.value)} style={input} />

          <label style={label}>Image File *</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <button type="submit" disabled={uploading} style={primaryBtn}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
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
