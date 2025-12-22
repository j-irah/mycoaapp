// pages/admin/create.tsx
// Issue a COA manually (staff-only via AdminLayout).
// Now supports uploading a book cover image that appears on the COA.

import { useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

function randSuffix() {
  return Math.random().toString(16).slice(2);
}

export default function AdminCreateCOAPage() {
  const [comicTitle, setComicTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [signingLocation, setSigningLocation] = useState("");
  const [witnessedBy, setWitnessedBy] = useState("");

  const [bookFile, setBookFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdQrId, setCreatedQrId] = useState<string | null>(null);

  async function uploadBookImage(file: File) {
    // store under request-books so the cert page can use the same pattern
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not logged in.");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `manual/${user.id}/${Date.now()}-${randSuffix()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("request-books").upload(path, file, { upsert: false });
    if (upErr) throw new Error(`Book image upload failed: ${upErr.message}`);

    const {
      data: { publicUrl },
    } = supabase.storage.from("request-books").getPublicUrl(path);

    if (!publicUrl) throw new Error("Could not get public URL for uploaded book image.");
    return publicUrl;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatedQrId(null);

    if (!comicTitle.trim()) return setError("Comic Title is required.");
    if (!issueNumber.trim()) return setError("Issue # is required.");
    if (!signedBy.trim()) return setError("Signed By is required.");

    setBusy(true);

    try {
      let bookImageUrl: string | null = null;

      if (bookFile) {
        bookImageUrl = await uploadBookImage(bookFile);
      }

      const res = await fetch("/api/create-coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_title: comicTitle.trim(),
          issue_number: issueNumber.trim(),
          signed_by: signedBy.trim(),
          signed_date: signedDate ? signedDate.trim() : null,
          signed_location: signingLocation ? signingLocation.trim() : null,
          witnessed_by: witnessedBy ? witnessedBy.trim() : null,
          book_image_url: bookImageUrl, // ✅ now included
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to issue COA.");
      }

      const qr = json?.qr_id || json?.coa?.qr_id || null;
      setCreatedQrId(qr);
      setSuccess("COA issued successfully.");

      // Reset form
      setComicTitle("");
      setIssueNumber("");
      setSignedBy("");
      setSignedDate("");
      setSigningLocation("");
      setWitnessedBy("");
      setBookFile(null);

      const bookInput = document.getElementById("bookFile") as HTMLInputElement | null;
      if (bookInput) bookInput.value = "";
    } catch (err: any) {
      setError(err?.message || "Failed to issue COA.");
    }

    setBusy(false);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AdminLayout requireStaff={true}>
      <div style={topWrap}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 900 }}>Issue COA</h1>
          <div style={{ marginTop: 8, color: "#666", fontWeight: 900 }}>
            Use this to manually issue a certificate (not tied to a collector request).
          </div>
        </div>
      </div>

      <div style={{ ...card, marginTop: "1rem" }}>
        {error ? <div style={errorBox}>{error}</div> : null}
        {success ? <div style={successBox}>{success}</div> : null}

        {createdQrId ? (
          <div style={noticeBox}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Verification link</div>
            <div style={{ fontWeight: 900 }}>
              {origin ? `${origin}/cert/${createdQrId}` : `/cert/${createdQrId}`}
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
          <label style={label}>Comic Title *</label>
          <input style={input} value={comicTitle} onChange={(e) => setComicTitle(e.target.value)} />

          <label style={label}>Issue # *</label>
          <input style={input} value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} />

          <label style={label}>Signed By *</label>
          <input style={input} value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />

          <label style={label}>Signed Date</label>
          <input
            style={input}
            value={signedDate}
            onChange={(e) => setSignedDate(e.target.value)}
            placeholder="YYYY-MM-DD"
          />

          <label style={label}>Signing Location</label>
          <input style={input} value={signingLocation} onChange={(e) => setSigningLocation(e.target.value)} />

          <label style={label}>Witnessed By</label>
          <input style={input} value={witnessedBy} onChange={(e) => setWitnessedBy(e.target.value)} />

          <label style={label}>Book photo (optional, shows on COA)</label>
          <input
            id="bookFile"
            type="file"
            accept="image/*"
            onChange={(e) => setBookFile(e.target.files?.[0] ?? null)}
            style={{ marginBottom: 6 }}
          />

          <button style={primaryBtn} disabled={busy}>
            {busy ? "Issuing…" : "Issue COA"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

const topWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: "1.25rem",
  border: "1px solid #eee",
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
};

const label: React.CSSProperties = {
  display: "block",
  marginTop: 14,
  marginBottom: 6,
  fontWeight: 900,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #ddd",
  boxSizing: "border-box",
  fontWeight: 800,
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 18,
  borderRadius: 12,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  padding: "0.95rem 1rem",
  fontWeight: 900,
  cursor: "pointer",
};

const errorBox: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ffb3b3",
  background: "#ffe6e6",
  padding: "0.9rem",
  fontWeight: 900,
  color: "#7a0000",
  marginBottom: 12,
};

const successBox: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #b7ebc6",
  background: "#e9f7ef",
  padding: "0.9rem",
  fontWeight: 900,
  color: "#14532d",
  marginBottom: 12,
};

const noticeBox: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fafafa",
  padding: "0.9rem",
  marginBottom: 12,
};
