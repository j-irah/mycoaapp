// pages/admin/create.tsx
// @ts-nocheck

import { useState } from "react";
import AdminLayout from "../../components/AdminLayout";

type COA = {
  id: string;
  qr_id: string;
};

export default function AdminCreateCOAPage() {
  const [comicTitle, setComicTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [signedDate, setSignedDate] = useState<string>("");
  const [signedLocation, setSignedLocation] = useState("");
  const [witnessedBy, setWitnessedBy] = useState("");

  const [createdCoa, setCreatedCoa] = useState<COA | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedCoa(null);

    if (!comicTitle.trim() || !signedBy.trim() || !issueNumber.trim()) {
      setError("comic_title, signed_by, and issue_number are required");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/create-coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_title: comicTitle.trim(),
          issue_number: issueNumber.trim(),
          signed_by: signedBy.trim(),
          signed_date: signedDate ? signedDate : null,
          signed_location: signedLocation ? signedLocation.trim() : null,
          witnessed_by: witnessedBy ? witnessedBy.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create COA failed");

      setCreatedCoa({ id: data.id, qr_id: data.qr_id });

      setComicTitle("");
      setIssueNumber("");
      setSignedBy("");
      setSignedDate("");
      setSignedLocation("");
      setWitnessedBy("");
    } catch (err: any) {
      setError(err.message || "Create COA failed");
    }

    setBusy(false);
  }

  return (
    <AdminLayout requireStaff={true}>
      <h1 style={{ marginTop: 0 }}>Create COA</h1>

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
          <input
            value={signedDate}
            onChange={(e) => setSignedDate(e.target.value)}
            style={input}
            placeholder="YYYY-MM-DD"
          />

          <label style={label}>Signing Location</label>
          <input value={signedLocation} onChange={(e) => setSignedLocation(e.target.value)} style={input} />

          <label style={label}>Witnessed By</label>
          <input value={witnessedBy} onChange={(e) => setWitnessedBy(e.target.value)} style={input} />

          <button type="submit" disabled={busy} style={primaryBtn}>
            {busy ? "Working…" : "Create COA"}
          </button>
        </form>

        {createdCoa && (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
            <div style={{ fontWeight: 900, marginBottom: "0.25rem" }}>COA Created ✅</div>

            <div style={{ marginTop: "0.35rem" }}>
              <div style={row}>
                <span style={k}>COA ID:</span> <code>{createdCoa.id}</code>
              </div>
              <div style={row}>
                <span style={k}>QR ID:</span> <code>{createdCoa.qr_id}</code>
              </div>
              <div style={row}>
                <span style={k}>Cert URL:</span>{" "}
                <a
                  href={`http://localhost:3000/cert/${createdCoa.qr_id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={linkStyle}
                >
                  {`http://localhost:3000/cert/${createdCoa.qr_id}`}
                </a>
              </div>
            </div>
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
