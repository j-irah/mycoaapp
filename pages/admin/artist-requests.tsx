// pages/admin/artist-requests.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

export default function AdminArtistRequests() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const res = await supabase
      .from("artist_requests")
      .select("id, user_id, full_name, portfolio_url, message, status, reviewed_by, reviewed_at, created_at")
      .order("created_at", { ascending: false });

    if (res.error) {
      setError(res.error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(res.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(row: any, status: "approved" | "rejected") {
    setBusyId(row.id);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const upd = await supabase
      .from("artist_requests")
      .update({
        status,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (upd.error) {
      setError(upd.error.message);
      setBusyId(null);
      return;
    }

    if (status === "approved") {
      const pr = await supabase.from("profiles").update({ role: "artist" }).eq("id", row.user_id);
      if (pr.error) {
        setError(pr.error.message);
        setBusyId(null);
        return;
      }
    }

    await load();
    setBusyId(null);
  }

  return (
    <AdminLayout requireStaff={true}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Artist Requests</h1>
        <button onClick={load} style={secondaryBtn}>Refresh</button>
      </div>

      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={{ marginTop: 12, ...card }}>
        {loading ? (
          <div>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: "#64748b" }}>No requests found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={th}>Requester</th>
                <th style={th}>Portfolio</th>
                <th style={th}>Message</th>
                <th style={th}>Created</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
                  <td style={td}>
                    <span style={r.status === "pending" ? badgePending : r.status === "approved" ? badgeApproved : badgeRejected}>
                      {r.status}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 900 }}>{r.full_name || "—"}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>
                      user_id: <code style={codePill}>{r.user_id}</code>
                    </div>
                  </td>
                  <td style={td}>
                    {r.portfolio_url ? (
                      <a href={r.portfolio_url} target="_blank" rel="noreferrer" style={{ fontWeight: 900, color: "#1976d2", textDecoration: "none" }}>
                        {r.portfolio_url}
                      </a>
                    ) : (
                      <span style={{ color: "#64748b" }}>—</span>
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ whiteSpace: "pre-wrap", color: "#0f172a" }}>{r.message || "—"}</div>
                  </td>
                  <td style={td}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={td}>
                    {r.status === "pending" ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          style={approveBtn}
                          disabled={busyId === r.id}
                          onClick={() => setStatus(r, "approved")}
                        >
                          {busyId === r.id ? "Working…" : "Approve"}
                        </button>
                        <button
                          style={rejectBtn}
                          disabled={busyId === r.id}
                          onClick={() => setStatus(r, "rejected")}
                        >
                          {busyId === r.id ? "Working…" : "Reject"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#64748b" }}>—</span>
                    )}
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

const card: React.CSSProperties = { background: "white", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 16, padding: 14, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" };
const th: React.CSSProperties = { textAlign: "left", padding: 12, fontSize: 13, color: "#475569", fontWeight: 900 };
const td: React.CSSProperties = { padding: 12, verticalAlign: "top" };
const codePill: React.CSSProperties = { display: "inline-block", padding: "4px 8px", borderRadius: 999, background: "#f5f5f5", border: "1px solid #eee", fontWeight: 900, fontSize: 12 };

const badgePending: React.CSSProperties = { display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontWeight: 900, fontSize: 13 };
const badgeApproved: React.CSSProperties = { display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#e9f7ef", border: "1px solid #b7ebc6", color: "#14532d", fontWeight: 900, fontSize: 13 };
const badgeRejected: React.CSSProperties = { display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#fff1f2", border: "1px solid rgba(225, 29, 72, 0.25)", color: "#9f1239", fontWeight: 900, fontSize: 13 };

const approveBtn: React.CSSProperties = { padding: "10px 12px", borderRadius: 12, background: "#16a34a", color: "white", fontWeight: 900, border: "1px solid #15803d", cursor: "pointer" };
const rejectBtn: React.CSSProperties = { padding: "10px 12px", borderRadius: 12, background: "#b91c1c", color: "white", fontWeight: 900, border: "1px solid #991b1b", cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { padding: "10px 12px", borderRadius: 12, background: "rgba(15, 23, 42, 0.06)", color: "#0f172a", fontWeight: 900, border: "1px solid rgba(15, 23, 42, 0.12)", cursor: "pointer" };
const errorBox: React.CSSProperties = { marginTop: 12, background: "#ffe6e6", border: "1px solid #ffb3b3", color: "#7a0000", padding: 12, borderRadius: 12, fontWeight: 900 };
