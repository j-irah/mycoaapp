// pages/admin/coas.tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

type COA = {
  id: string;
  qr_id: string;
  serial_number?: string | null;

  comic_title: string | null;
  issue_number: string | null;
  signed_by: string | null;
  signed_date: string | null;
  signed_location: string | null;
  witnessed_by: string | null;

  image_url: string | null;

  status?: string | null;
  needs_review?: boolean | null;
  created_by?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export default function AdminCOAsPage() {
  const [loading, setLoading] = useState(true);
  const [coas, setCoas] = useState<COA[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("coas")
        .select(
          "id, qr_id, serial_number, comic_title, issue_number, signed_by, signed_date, signed_location, witnessed_by, image_url, status, needs_review, created_by, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setError(error.message);
        setCoas([]);
        setLoading(false);
        return;
      }

      setCoas((data || []) as any);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coas;

    return coas.filter((c) => {
      const hay = [
        c.id,
        c.qr_id,
        c.serial_number,
        c.comic_title,
        c.issue_number,
        c.signed_by,
        c.witnessed_by,
        c.signed_location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [coas, query]);

  return (
    <AdminLayout requireStaff={true}>
      <h1 style={{ marginTop: 0 }}>COAs</h1>

      {error && <div style={errorBox}>{error}</div>}

      <div style={card}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, qr_id, serial, etc…"
            style={input}
          />
        </div>

        {loading ? (
          <div style={{ marginTop: "1rem" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ marginTop: "1rem", color: "#666" }}>No COAs found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={th}>COA</th>
                <th style={th}>Comic</th>
                <th style={th}>Signed</th>
                <th style={th}>Witness</th>
                <th style={th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 900 }}>{c.id}</div>
                    <div style={{ color: "#666" }}>
                      QR: <code>{c.qr_id}</code>
                    </div>
                    {c.serial_number && (
                      <div style={{ color: "#666" }}>
                        Serial: <code>{c.serial_number}</code>
                      </div>
                    )}
                  </td>

                  <td style={td}>
                    <div style={{ fontWeight: 900 }}>{c.comic_title || "—"}</div>
                    <div style={{ color: "#666" }}>#{c.issue_number || "—"}</div>
                  </td>

                  <td style={td}>
                    <div style={{ fontWeight: 900 }}>{c.signed_by || "—"}</div>
                    <div style={{ color: "#666" }}>{c.signed_date || "—"}</div>
                    <div style={{ color: "#666" }}>{c.signed_location || "—"}</div>
                  </td>

                  <td style={td}>{c.witnessed_by || "—"}</td>

                  <td style={td}>
                    <div style={{ fontWeight: 900 }}>{c.created_at ? String(c.created_at).slice(0, 10) : "—"}</div>
                    <div style={{ color: "#666", fontSize: "0.92rem" }}>{c.created_at || "—"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

const input: React.CSSProperties = {
  width: "min(520px, 100%)",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #ccc",
  boxSizing: "border-box",
  fontWeight: 800,
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

const th: React.CSSProperties = { textAlign: "left", padding: "0.7rem 0.5rem", fontWeight: 900, color: "#333" };
const td: React.CSSProperties = { padding: "0.7rem 0.5rem", verticalAlign: "top" };
