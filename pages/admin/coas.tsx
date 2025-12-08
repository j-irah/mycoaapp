// pages/admin/coas.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import AdminNav from "../../components/AdminNav";

const ADMIN_PASSWORD = "New3ngland";

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

export default function AdminCOAsPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");

  const [coas, setCoas] = useState<COA[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCoa, setSelectedCoa] = useState<COA | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [search, setSearch] = useState("");

  // Check localStorage for existing admin session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("adminAuthed");
    if (stored === "true") {
      setAuthed(true);
      loadCoas();
    } else {
      setLoading(false);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("adminAuthed", "true");
      }
      loadCoas();
    } else {
      alert("Incorrect password");
    }
  }

  async function loadCoas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("signatures")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      setError("Failed to load COAs");
    } else {
      setCoas(data as COA[]);
      setError(null);
    }
    setLoading(false);
  }

  function handleSelectCoa(coa: COA) {
    setSelectedCoa({ ...coa });
  }

  function handleFieldChange(field: keyof COA, value: string) {
    if (!selectedCoa) return;
    setSelectedCoa({ ...selectedCoa, [field]: value });
  }

  async function handleSave() {
    if (!selectedCoa) return;
    setSaving(true);

    const { id, ...updateData } = selectedCoa;
    const { error } = await supabase
      .from("signatures")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to save changes: " + error.message);
    } else {
      alert("COA updated");
      await loadCoas();
    }
    setSaving(false);
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedCoa) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileExt = file.name.split(".").pop();
    const filePath = `coa-${selectedCoa.qr_id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("coa-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      alert("Failed to upload image");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("coa-images").getPublicUrl(filePath);

    const updated = { ...selectedCoa, image_url: publicUrl };
    setSelectedCoa(updated);

    const { error: updateError } = await supabase
      .from("signatures")
      .update({ image_url: publicUrl })
      .eq("id", selectedCoa.id);

    if (updateError) {
      console.error(updateError);
      alert("Failed to update image URL");
    } else {
      alert("Image uploaded and COA updated");
      await loadCoas();
    }
  }

  const filteredCoas = coas.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.comic_title.toLowerCase().includes(s) ||
      (c.qr_id || "").toLowerCase().includes(s) ||
      (c.signed_by || "").toLowerCase().includes(s)
    );
  });

  // Login screen
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
            Enter admin password to manage COAs.
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

  // Authenticated view
  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f1f1f1",
      }}
    >
      <AdminNav />

      <div style={{ padding: "1.5rem" }}>
        <h1>Admin – COA Manager</h1>

        {loading && <p>Loading COAs...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {/* Search */}
        <div style={{ marginBottom: "1rem", marginTop: "0.5rem" }}>
          <input
            type="text"
            placeholder="Search by title, serial, or signer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "0.4rem", width: "100%", maxWidth: "400px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* COA list */}
          <div style={{ flex: "1 1 280px", minWidth: "260px" }}>
            <h2>All COAs</h2>
            <div
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                border: "1px solid #ddd",
                backgroundColor: "#fff",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Serial (qr_id)</th>
                    <th style={thStyle}>Signed by</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoas.map((coa) => (
                    <tr key={coa.id}>
                      <td style={tdStyle}>{coa.comic_title}</td>
                      <td style={tdStyle}>{coa.qr_id}</td>
                      <td style={tdStyle}>{coa.signed_by}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleSelectCoa(coa)}
                          style={{ padding: "0.25rem 0.5rem" }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCoas.length === 0 && (
                    <tr>
                      <td style={tdStyle} colSpan={4}>
                        No COAs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit panel */}
          <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
            <h2>Edit COA</h2>
            {!selectedCoa && <p>Select a COA from the list to edit.</p>}

            {selectedCoa && (
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: "1rem",
                  borderRadius: "6px",
                  backgroundColor: "#fff",
                }}
              >
                <div style={fieldRowStyle}>
                  <label style={labelEditStyle}>Title</label>
                  <input
                    type="text"
                    value={selectedCoa.comic_title || ""}
                    onChange={(e) =>
                      handleFieldChange("comic_title", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelEditStyle}>Issue #</label>
                  <input
                    type="text"
                    value={selectedCoa.issue_number || ""}
                    onChange={(e) =>
                      handleFieldChange("issue_number", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelEditStyle}>Signed by</label>
                  <input
                    type="text"
                    value={selectedCoa.signed_by || ""}
                    onChange={(e) =>
                      handleFieldChange("signed_by", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelEditStyle}>Signed date</label>
                  <input
                    type="text"
                    value={selectedCoa.signed_date || ""}
                    onChange={(e) =>
                      handleFieldChange("signed_date", e.target.value)
                    }
                    style={inputStyle}
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelEditStyle}>Signed location</label>
                  <input
                    type="text"
                    value={selectedCoa.signed_location || ""}
                    onChange={(e) =>
                      handleFieldChange("signed_location", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelEditStyle}>Witnessed by</label>
                  <input
                    type="text"
                    value={selectedCoa.witnessed_by || ""}
                    onChange={(e) =>
                      handleFieldChange("witnessed_by", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelEditStyle}>Image URL</label>
                  <input
                    type="text"
                    value={selectedCoa.image_url || ""}
                    onChange={(e) =>
                      handleFieldChange("image_url", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldRowStyle}>
                  <label style={labelEditStyle}>Replace image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: "0.4rem 0.8rem",
                      backgroundColor: "#1976d2",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  borderBottom: "1px solid #ccc",
  textAlign: "left" as const,
  padding: "0.4rem",
  backgroundColor: "#f5f5f5",
};

const tdStyle = {
  borderBottom: "1px solid #eee",
  padding: "0.35rem",
};

const fieldRowStyle = {
  display: "flex",
  flexDirection: "column" as const,
  marginBottom: "0.6rem",
};

const labelEditStyle = {
  fontSize: "0.85rem",
  marginBottom: "0.2rem",
};

const inputStyle = {
  padding: "0.35rem",
  fontSize: "0.9rem",
};
