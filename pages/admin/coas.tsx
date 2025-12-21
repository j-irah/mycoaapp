// pages/admin/coas.tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

type CoaStatus = "active" | "revoked";

type SignatureRow = {
  id: string;
  qr_id: string;
  comic_title: string | null;
  issue_number: string | null;

  signed_by: string | null;
  signed_date: string | null;
  signed_location: string | null;

  witnessed_by: string | null;

  image_url?: string | null; // (optional – if you have it)
  status: CoaStatus;
  created_at: string;
};

function formatTitleIssue(title?: string | null, issue?: string | null) {
  const t = (title || "").trim();
  const i = (issue || "").trim();
  if (!t && !i) return "Untitled";
  if (!i) return t;
  return `${t} #${i}`;
}

function fmtDateTime(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function AdminCOAsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "revoked">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("signatures")
      .select("id, qr_id, comic_title, issue_number, signed_by, signed_date, signed_location, witnessed_by, image_url, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as SignatureRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;

      const hay = [
        r.id,
        r.qr_id,
        r.comic_title,
        r.issue_number,
        r.signed_by,
        r.signed_location,
        r.witnessed_by,
        r.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query, status]);

  async function revokeCOA(id: string) {
    const ok = window.confirm("Revoke this COA? The public cert should show it as revoked.");
    if (!ok) return;

    setBusyId(id);
    setError(null);

    try {
      const { error } = await supabase.from("signatures").update({ status: "revoked" }).eq("id", id);
      if (error) throw new Error(error.message);
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to revoke");
    }

    setBusyId(null);
  }

  async function deleteCOA(id: string) {
    const ok = window.confirm(
      "Delete this COA permanently? This will break any public QR link. Click OK to continue."
    );
    if (!ok) return;

    setBusyId(id);
    setError(null);

    try {
      // Unlink any requests that point to this COA (if your table uses issued_coa_id)
      const unlink = await supabase.from("coa_requests").update({ issued_coa_id: null }).eq("issued_coa_id", id);
      if (unlink.error) {
        // Not fatal if table/column differs, but in your app it exists
        throw new Error(unlink.error.message);
      }

      const { error } = await supabase.from("signatures").delete().eq("id", id);
      if (error) throw new Error(error.message);

      await load();
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    }

    setBusyId(null);
  }

  return (
    <AdminLayout requireStaff={true}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h1 style={{ marginTop: 0 }}>COAs</h1>
        <button onClick={load} style={secondaryBtn}>
          Refresh
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", alignItems: "end" }}>
          <div>
            <div style={label}>Search</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, qr_id, signer, witness…"
              style={input}
            />
          </div>

          <div>
            <div style={label}>Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={input}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: "1rem" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ marginTop: "1rem", color: "#666" }}>No COAs found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={th}>COA</th>
                <th style={th}>Signed</th>
                <th style={th}>Witness</th>
                <th style={th}>Created</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isBusy = busyId === c.id;

                return (
                  <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={td}>
                      <span style={c.status === "active" ? badgeActive : badgeRevoked}>{c.status}</span>
                    </td>

                    <td style={td}>
                      <div style={{ fontWeight: 900 }}>{formatTitleIssue(c.comic_title, c.issue_number)}</div>
                      <div style={{ color: "#666" }}>
                        QR: <code>{c.qr_id}</code>
                      </div>
                      <div style={{ color: "#666" }}>
                        ID: <code>{c.id}</code>
                      </div>
                    </td>

                    <td style={td}>
                      <div style={{ fontWeight: 900 }}>{c.signed_by || "—"}</div>
                      <div style={{ color: "#666" }}>{c.signed_location || "—"}</div>
                      <div style={{ color: "#666" }}>{c.signed_date || "—"}</div>
                    </td>

                    <td style={td}>{c.witnessed_by || "—"}</td>

                    <td style={td}>{fmtDateTime(c.created_at)}</td>

                    <td style={td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <Link href={`/cert/${c.qr_id}`} style={linkStyle}>
                          View public cert
                        </Link>

                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button onClick={() => revokeCOA(c.id)} disabled={isBusy} style={secondaryBtnSmall}>
                            {isBusy ? "Working…" : "Revoke"}
                          </button>
                          <button onClick={() => deleteCOA(c.id)} disabled={isBusy} style={dangerBtnSmall}>
                            {isBusy ? "Working…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

const label: React.CSSProperties = {
  color: "#666",
  fontWeight: 900,
  fontSize: "0.85rem",
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%",
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

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.55rem",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: "0.8rem",
};

const badgeActive: React.CSSProperties = { ...badgeBase, background: "#e7f6ea", border: "1px solid #bfe6c7" };
const badgeRevoked: React.CSSProperties = { ...badgeBase, background: "#fff3cd", border: "1px solid #ffe69c" };

const secondaryBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.6rem 0.9rem",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtnSmall: React.CSSProperties = {
  ...secondaryBtn,
  padding: "0.45rem 0.7rem",
  fontSize: "0.9rem",
};

const dangerBtnSmall: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #dc3545",
  background: "#dc3545",
  padding: "0.45rem 0.7rem",
  fontWeight: 900,
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.9rem",
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#6a1b9a",
  textDecoration: "underline",
};
