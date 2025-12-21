// pages/account/requests.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import { supabase } from "../../lib/supabaseClient";

export default function MyRequestsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("coa_requests")
        .select("id, status, comic_title, issue_number, created_at, rejection_reason, issued_coa_id, event_id")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setError(error.message);
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(data || []);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <RequireAuth allowedRoles={["collector", "partner", "owner", "admin", "reviewer"]}>
      <div style={{ minHeight: "100vh", background: "#f1f1f1", fontFamily: "Arial, sans-serif", padding: "1.5rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0 }}>My COA Requests</h1>

          {loading && <div style={cardStyle}>Loading…</div>}
          {error && <div style={{ ...cardStyle, ...errorStyle }}>{error}</div>}

          {!loading && !error && (
            <div style={cardStyle}>
              {rows.length === 0 ? (
                <div style={{ color: "#666" }}>No requests yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Comic</th>
                      <th style={thStyle}>Issue</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>COA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                        <td style={tdStyle}>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                        <td style={tdStyle}>{r.comic_title}</td>
                        <td style={tdStyle}>{r.issue_number || "—"}</td>
                        <td style={tdStyle}>
                          <span style={pillStyle}>{r.status}</span>
                          {r.status === "rejected" && r.rejection_reason && (
                            <div style={{ marginTop: "0.35rem", color: "#7a0000", fontWeight: 700 }}>
                              Reason: {r.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {r.status === "approved" && r.issued_coa_id ? (
                            <span style={{ color: "#14532d", fontWeight: 800 }}>
                              Approved — issued
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ marginTop: "0.85rem", color: "#666", fontSize: "0.92rem" }}>
                Approved requests will receive an official COA after review.
              </div>

              <div style={{ marginTop: "0.65rem" }}>
                <Link href="/">Home</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 12,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const errorStyle: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  fontWeight: 800,
};

const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.7rem 0.5rem", fontWeight: 900, color: "#333" };
const tdStyle: React.CSSProperties = { padding: "0.7rem 0.5rem", verticalAlign: "top" };

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  fontWeight: 900,
  fontSize: "0.9rem",
};
