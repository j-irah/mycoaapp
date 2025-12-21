// pages/admin/artists.tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// Matches DB constraint:
// role is null OR in ('owner','admin','reviewer','artist')
const ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: "collector (none)", value: "" }, // stored as NULL
  { label: "artist", value: "artist" },
  { label: "reviewer", value: "reviewer" },
  { label: "admin", value: "admin" },
  { label: "owner", value: "owner" },
];

export default function AdminArtistsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [draft, setDraft] = useState<Record<string, { full_name: string; role: string }>>({});

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((r) => {
      const email = (r.email || "").toLowerCase();
      const name = (r.full_name || "").toLowerCase();
      const role = (r.role || "").toLowerCase();
      return email.includes(term) || name.includes(term) || role.includes(term) || r.id.toLowerCase().includes(term);
    });
  }, [rows, q]);

  async function load() {
    setLoading(true);
    setError(null);

    const res = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (res.error) {
      setError(res.error.message);
      setRows([]);
      setDraft({});
      setLoading(false);
      return;
    }

    const data = (res.data || []) as ProfileRow[];
    setRows(data);

    const d: any = {};
    for (const r of data) {
      d[r.id] = { full_name: r.full_name || "", role: r.role || "" };
    }
    setDraft(d);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function setDraftField(id: string, field: "full_name" | "role", value: string) {
    setDraft((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { full_name: "", role: "" }),
        [field]: value,
      },
    }));
  }

  function isDirty(r: ProfileRow) {
    const d = draft[r.id];
    if (!d) return false;

    const currentName = (r.full_name || "").trim();
    const draftName = (d.full_name || "").trim();

    const currentRole = (r.role || "").trim();
    const draftRole = (d.role || "").trim();

    return currentName !== draftName || currentRole !== draftRole;
  }

  async function saveRow(r: ProfileRow) {
    setError(null);
    const d = draft[r.id];
    if (!d) return;

    const newName = (d.full_name || "").trim() || null; // optional
    const roleStr = (d.role || "").trim(); // '' means NULL
    const newRole = roleStr === "" ? null : roleStr;

    const allowed = new Set(["", "owner", "admin", "reviewer", "artist"]);
    if (!allowed.has(roleStr)) {
      setError("Invalid role value (must be blank/owner/admin/reviewer/artist).");
      return;
    }

    setSavingId(r.id);

    const res = await supabase.from("profiles").update({ full_name: newName, role: newRole }).eq("id", r.id);

    if (res.error) {
      setError(res.error.message);
      setSavingId(null);
      return;
    }

    setRows((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, full_name: newName, role: newRole, updated_at: new Date().toISOString() } : x))
    );

    setSavingId(null);
  }

  async function deleteUser(r: ProfileRow) {
    const ok = window.confirm(
      `Delete this user account permanently?\n\nEmail: ${r.email || "(no email)"}\nUser ID: ${r.id}\n\nThis deletes the Supabase Auth user and their profile row.\nThis cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(r.id);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) {
      setError("Missing session token. Please log in again.");
      setDeletingId(null);
      return;
    }

    const resp = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: r.id }),
    });

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      setError(json?.error || "Failed to delete user.");
      setDeletingId(null);
      return;
    }

    // Remove from UI
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    setDeletingId(null);

    if (json?.warning) {
      setError(`User deleted, but cleanup warning: ${json.warning}`);
    }
  }

  async function saveAllDirty() {
    const dirty = filtered.filter(isDirty);
    if (dirty.length === 0) return;

    for (const r of dirty) {
      // eslint-disable-next-line no-await-in-loop
      await saveRow(r);
    }
  }

  return (
    <AdminLayout requireStaff={true}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Users & Roles</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={load} style={secondaryBtn} disabled={loading}>
            Refresh
          </button>
          <button onClick={saveAllDirty} style={primaryBtnSmall} disabled={loading || filtered.filter(isDirty).length === 0}>
            Save all changes
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, ...card }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email, name, role, or user id…"
            style={input}
          />
          <div style={{ color: "#64748b", fontWeight: 900 }}>
            Showing {filtered.length} / {rows.length}
          </div>
        </div>

        <div style={{ marginTop: 10, color: "#64748b", lineHeight: 1.35 }}>
          <div style={{ fontWeight: 900, color: "#0f172a" }}>Artist onboarding (no SQL)</div>
          <ol style={{ marginTop: 8, paddingLeft: 18 }}>
            <li>Create the user in Supabase Auth (email/password or invite).</li>
            <li>Ensure a row exists in <code>profiles</code> (often created on first login).</li>
            <li>Set Role = <strong>artist</strong>. (Full Name is optional.)</li>
            <li>Assign events in <code>/admin/events</code> using Owner Link.</li>
          </ol>
        </div>
      </div>

      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={{ marginTop: 12, ...card }}>
        {loading ? (
          <div>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#64748b" }}>No profiles found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Email</th>
                <th style={th}>Full Name (optional)</th>
                <th style={th}>Role</th>
                <th style={th}>User ID</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const d = draft[r.id] || { full_name: r.full_name || "", role: r.role || "" };
                const dirty = isDirty(r);

                return (
                  <tr key={r.id} style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
                    <td style={td}>
                      <div style={{ fontWeight: 900 }}>{r.email || "—"}</div>
                    </td>

                    <td style={td}>
                      <input
                        value={d.full_name}
                        onChange={(e) => setDraftField(r.id, "full_name", e.target.value)}
                        style={inputSmall}
                        placeholder="(optional) display name"
                      />
                      <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                        Used for display. Ownership is controlled by <code>events.artist_user_id</code>.
                      </div>
                    </td>

                    <td style={td}>
                      <select value={d.role} onChange={(e) => setDraftField(r.id, "role", e.target.value)} style={selectStyle}>
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <code style={codePill}>{r.id}</code>
                    </td>

                    <td style={td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          onClick={() => saveRow(r)}
                          style={dirty ? primaryBtnSmall : secondaryBtn}
                          disabled={savingId === r.id || !dirty}
                        >
                          {savingId === r.id ? "Saving…" : "Save"}
                        </button>

                        {(d.role || "") === "artist" ? (
                          <a href="/artist/dashboard" target="_blank" rel="noreferrer" style={linkStyle}>
                            Open Artist Portal
                          </a>
                        ) : null}

                        <button
                          onClick={() => deleteUser(r)}
                          style={dangerBtnSolid}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? "Deleting…" : "Delete User"}
                        </button>
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
  background: "white",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  fontSize: 13,
  color: "#475569",
  fontWeight: 900,
};

const td: React.CSSProperties = {
  padding: 12,
  verticalAlign: "top",
};

const input: React.CSSProperties = {
  flex: "1 1 420px",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 23, 42, 0.16)",
  fontWeight: 800,
};

const inputSmall: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 23, 42, 0.16)",
  fontWeight: 800,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 23, 42, 0.16)",
  fontWeight: 900,
  background: "white",
};

const primaryBtnSmall: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  background: "#1976d2",
  color: "white",
  fontWeight: 900,
  border: "none",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(15, 23, 42, 0.06)",
  color: "#0f172a",
  fontWeight: 900,
  border: "1px solid rgba(15, 23, 42, 0.12)",
  cursor: "pointer",
};

const dangerBtnSolid: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #b91c1c",
  background: "#b91c1c",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const errorBox: React.CSSProperties = {
  marginTop: 12,
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  padding: "0.75rem",
  borderRadius: 12,
  fontWeight: 900,
};

const codePill: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #eee",
  fontWeight: 900,
  fontSize: 12,
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};
