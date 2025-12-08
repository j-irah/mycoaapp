// pages/admin/create.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const ADMIN_PASSWORD = "ChangeThisAdminPassword!"; // use SAME password as coas.tsx

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

export default function AdminCreateCOAPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");

  const [comicTitle, setComicTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [signedLocation, setSignedLocation] = useState("");
  const [witnessedBy, setWitnessedBy] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [creating, setCreating] = useState(false);
  const [createdCoa, setCreatedCoa] = useState<COA | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("adminAuthed");
    if (stored === "true") {
      setAuthed(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("adminAuthed", "true");
      }
    } else {
      alert("Incorrect password");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedCoa(null);

    if (!comicTitle.trim()) {
      setError("Comic title is required");
      return;
    }

    setCreating(true);

    try {
      // 1) Create COA via API (this generates qr_id and inserts into Supabase)
      const res = await fetch("/api/create-coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_title: comicTitle,
          issue_number: issueNumber || null,
          signed_by: signedBy || null,
          signed_date: signedDate || null,
          signed_location: signedLocation || null,
          witnessed_by: witnessedBy || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error("Create COA failed: " + text);
      }

      const data = await res.json();
      // our API returns an array of inserted rows or a single row
      const newCoa: COA = Array.isArray(data) ? data[0] : data;

      // 2) If file selected, upload to Supabase Storage and update record
      if (file) {
        const fileExt = file.name.split(".").pop();
        const filePath = `coa-${newCoa.qr_id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("coa-images")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error(uploadError);
          throw new Error("Failed to upload image: " + uploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("coa-images").getPublicUrl(filePath);

        const { error: updateError } = await supabase
          .from("signatures")
          .update({ image_url: publicUrl })
          .eq("qr_id", newCoa.qr_id);

        if (updateError) {
          console.error(updateError);
          throw new Error("Failed to update COA with image URL");
        }

        newCoa.image_url = publicUrl;
      }

      setCreatedCoa(newCoa);

      // Clear form
      setComicTitle("");
      setIssueNumber("");
      setSignedBy("");
      setSignedDate("");
      setSignedLocation("");
      setWitnessedBy("");
      setFile(null);

      const imgInput = document.getElementById(
        "coa-image-input"
      ) as HTMLInputElement | null;
      if (imgInput) {
        imgInput.value = "";
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create COA");
    }

    setCreating(false);
  }

  if (!authed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f1f1f1",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            backgroundColor: "#fff",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            minWidth: "280px",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Admin Login</h1>
          <p style={{ fontSize: "0.9rem", color: "#555" }}>
            Enter admin password to create COAs.
          </p>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Admin password"
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.75rem",
              marginBottom: "0.75rem",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "1.5rem",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f1f1f1",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          backgroundColor: "#fff",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h1>Create New COA</h1>
        <p style={{ fontSize: "0.9rem", color: "#555" }}>
          Fill in the details below to create a new Certificate of Authenticity.
        </p>

        {error && (
          <p style={{ color: "red", marginTop: "0.75rem" }}>{error}</p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
          <div style={fieldRowStyle}>
            <label style={labelStyle}>Comic title *</label>
            <input
              type="text"
              value={comicTitle}
              onChange={(e) => setComicTitle(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldRowStyle}>
            <label style={labelStyle}>Issue #</label>
            <input
              type="text"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldRowStyle}>
            <label style={labelStyle}>Signed by</label>
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldRowStyle}>
            <label style={labelStyle}>Signed date (YYYY-MM-DD)</label>
            <input
              type="text"
              value={signedDate}
              onChange={(e) => setSignedDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldRowStyle}>
            <label style={labelStyle}>Signed location</label>
            <input
              type="text"
              value={signedLocation}
              onChange={(e) => setSignedLocation(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldRowStyle}>
            <label style={labelStyle}>Witnessed by</label>
            <input
              type="text"
              value={witnessedBy}
              onChange={(e) => setWitnessedBy(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldRowStyle}>
            <label style={labelStyle}>Comic image (optional)</label>
            <input
              id="coa-image-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const files = e.target.files;
                setFile(files && files[0] ? files[0] : null);
              }}
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {creating ? "Creating..." : "Create COA"}
          </button>
        </form>

        {createdCoa && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              borderRadius: "6px",
              border: "1px solid #ddd",
              backgroundColor: "#fafafa",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
              COA created successfully
            </h2>
            <p>
              <strong>Serial (qr_id):</strong> {createdCoa.qr_id}
            </p>
            <p style={{ marginTop: "0.5rem" }}>
              View certificate:{" "}
              <a
                href={`/cert/${createdCoa.qr_id}`}
                target="_blank"
                rel="noreferrer"
              >
                /cert/{createdCoa.qr_id}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const fieldRowStyle = {
  display: "flex",
  flexDirection: "column" as const,
  marginBottom: "0.75rem",
};

const labelStyle = {
  fontSize: "0.9rem",
  marginBottom: "0.2rem",
};

const inputStyle = {
  padding: "0.4rem",
  fontSize: "0.9rem",
};
