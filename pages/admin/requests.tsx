// pages/admin/requests.tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

function fmtDateTime(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

function looksLikeUrl(v: string) {
  return /^https?:\/\//i.test(v);
}

// Buckets
const PROOF_BUCKET = "request-proofs";
const BOOK_PHOTO_BUCKET = "request-books";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

export default function AdminRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<any[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, any>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});

  // ✅ New: filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [query, setQuery] = useState("");

  // Modal
  const [openReqId, setOpenReqId] = useState<string | null>(null);
  const openReq = useMemo(() => rows.find((r) => r.id === openReqId) || null, [rows, openReqId]);

  // Images in modal
  const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  const [bookSignedUrl, setBookSignedUrl] = useState<string | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    const { data: reqs, error: reqErr } = await supabase
      .from("coa_requests")
      .select(
        "id, status, comic_title, issue_number, created_at, collector_user_id, event_id, rejection_reason, issued_coa_id, reviewed_at, attested, witness_name, proof_image_path, book_image_url"
      )
      .order("created_at", { ascending: false });

    if (reqErr) {
      setError(reqErr.message);
      setRows([]);
      setEventsMap({});
      setProfilesMap({});
      setLoading(false);
      return;
    }

    const reqRows = reqs || [];
    setRows(reqRows);

    // Events
    const eventIds = Array.from(new Set(reqRows.map((r: any) => r.event_id).filter(Boolean)));
    const evMap: Record<string, any> = {};
    if (eventIds.length) {
      const ev = await supabase
        .from("events")
        .select("id, artist_name, event_name, event_date, event_end_date, event_location")
        .in("id", eventIds);

      if (ev.error) {
        setError(ev.error.message);
      } else {
        for (const e of ev.data || []) evMap[e.id] = e;
      }
    }
    setEventsMap(evMap);

    // Profiles (collector)
    const userIds = Array.from(new Set(reqRows.map((r: any) => r.collector_user_id).filter(Boolean)));
    const prMap: Record<string, any> = {};
    if (userIds.length) {
      const pr = await supabase.from("profiles").select("id, email, full_name, role").in("id", userIds);
      if (pr.error) {
        setError(pr.error.message);
      } else {
        for (const p of pr.data || []) prMap[p.id] = p;
      }
    }
    setProfilesMap(prMap);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function openRequest(reqId: string) {
    setOpenReqId(reqId);
    setProofSignedUrl(null);
    setBookSignedUrl(null);
    setProofLoading(false);
    setBookLoading(false);

    const req = rows.find((r) => r.id === reqId);
    if (!req) return;

    if (req.proof_image_path) {
      setProofLoading(true);
      const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(req.proof_image_path, 60 * 10);
      if (!error) setProofSignedUrl(data?.signedUrl || null);
      setProofLoading(false);
    }

    if (req.book_image_url) {
      setBookLoading(true);
      if (looksLikeUrl(req.book_image_url)) {
        setBookSignedUrl(req.book_image_url);
      } else {
        const { data, error } = await supabase.storage
          .from(BOOK_PHOTO_BUCKET)
          .createSignedUrl(req.book_image_url, 60 * 10);
        if (!error) setBookSignedUrl(data?.signedUrl || null);
      }
      setBookLoading(false);
    }
  }

  function closeModal() {
    setOpenReqId(null);
    setProofSignedUrl(null);
    setBookSignedUrl(null);
    setProofLoading(false);
    setBookLoading(false);
  }

  async function approveRequest(req: any) {
    setBusyId(req.id);
    setError(null);

    try {
      const ev = eventsMap?.[req.event_id] || null;
      const profile = profilesMap?.[req.collector_user_id] || null;

      // witness should be full name, not email
      const witnessFullName = (profile?.full_name || req.witness_name || null)?.toString().trim() || null;

      const res = await fetch("/api/create-coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_title: req.comic_title,
          issue_number: req.issue_number,

          signed_by: ev?.artist_name || "Unknown",
          signed_date: ev?.event_date || null,
          signed_location: ev?.event_location || null,

          witnessed_by: req.attested ? witnessFullName : null,

          // Persist cover image on COA
          book_image_url: req.book_image_url || null,
        }),
      });

      const created = await res.json();
      if (!res.ok) throw new Error(created?.error || "Failed to create COA");

      const issuedId = created?.id ?? created?.coa?.id ?? null;
      if (!issuedId) throw new Error("COA created but no id returned");

      const { error: upErr } = await supabase
        .from("coa_requests")
        .update({
          status: "approved",
          issued_coa_id: issuedId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      if (upErr) throw new Error(upErr.message);

      await load();
      closeModal();
    } catch (e: any) {
      setError(e.message || "Approve failed");
    }

    setBusyId(null);
  }

  async function rejectRequest(req: any) {
    const reason = window.prompt("Rejection reason:", "Rejected") || "Rejected";

    setBusyId(req.id);
    setError(null);

    try {
      const { error: upErr } = await supabase
        .from("coa_requests")
        .update({
          status: "rejected",
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      if (upErr) throw new Error(upErr.message);

      await load();
      closeModal();
    } catch (e: any) {
      setError(e.message || "Reject failed");
    }

    setBusyId(null);
  }

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (rows || [])
      .map((r: any) => {
        const ev = eventsMap?.[r.event_id] || null;
        const pr = profilesMap?.[r.collector_user_id] || null;
        return { ...r, _event: ev, _profile: pr };
      })
      .filter((r: any) => {
        const status = (r.status || "pending").toLowerCase();

        if (statusFilter !== "all" && status !== statusFilter) return false;

        if (!q) return true;

        const ev = r._event;
        const pr = r._profile;

        const blob = [
          r.comic_title,
          r.issue_number,
          status,
          pr?.full_name,
          pr?.email,
          ev?.event_name,
          ev?.artist_name,
          ev?.event_location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return blob.includes(q);
      });
  }, [rows, eventsMap, profilesMap, statusFilter, query]);

  return (
    <AdminLayout requireStaff={true}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h1 style={{ marginTop: 0 }}>Requests</h1>
        <button onClick={load} style={secondaryBtn}>
          Refresh
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {/* ✅ Filter bar */}
      <div style={{ ...card, marginBottom: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "0.75rem", alignItems: "end" }}>
          <div>
            <div style={filterLabel}>Status</div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={input}>
              <option value="pending">Pending (default)</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>

          <div>
            <div style={filterLabel}>Search</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search comic, collector, event, location…"
              style={input}
            />
          </div>

          <button
            onClick={() => {
              setStatusFilter("pending");
              setQuery("");
            }}
            style={secondaryBtn}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={card}>
        {loading ? (
          <div>Loading…</div>
        ) : tableRows.length === 0 ? (
          <div style={{ color: "#666" }}>
            No requests found for this filter.
            {statusFilter === "pending" ? " (Try Approved or All.)" : ""}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={th}>Collector</th>
                <th style={th}>Comic</th>
                <th style={th}>Event</th>
                <th style={th}>Created</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {tableRows.map((r: any) => {
                const ev = r._event;
                const pr = r._profile;

                const collectorName = pr?.full_name || "—";
                const collectorEmail = pr?.email || "—";
                const eventLabel = ev ? `${ev.event_name || "—"} • ${ev.artist_name || "—"}` : "—";
                const eventDates = ev ? fmtDateRange(ev.event_date, ev.event_end_date) : "—";

                const status = (r.status || "pending").toLowerCase();
                const badge =
                  status === "approved" ? badgeApproved : status === "rejected" ? badgeRejected : badgePending;

                return (
                  <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={td}>
                      <span style={badge}>{status}</span>
                    </td>

                    <td style={td}>
                      <div style={{ fontWeight: 900 }}>{collectorName}</div>
                      <div style={{ color: "#666" }}>{collectorEmail}</div>
                    </td>

                    <td style={td}>
                      <div style={{ fontWeight: 900 }}>{r.comic_title || "—"}</div>
                      <div style={{ color: "#666" }}>#{r.issue_number || "—"}</div>
                    </td>

                    <td style={td}>
                      <div style={{ fontWeight: 900 }}>{eventLabel}</div>
                      <div style={{ color: "#666" }}>{eventDates}</div>
                      <div style={{ color: "#666" }}>{ev?.event_location || "—"}</div>
                    </td>

                    <td style={td}>{fmtDateTime(r.created_at)}</td>

                    <td style={td}>
                      <button onClick={() => openRequest(r.id)} style={primaryBtnSmall}>
                        Open
                      </button>

                      {r.issued_coa_id ? (
                        <div style={{ marginTop: 8 }}>
                          <Link href="/admin/coas" style={linkStyle}>
                            View COAs
                          </Link>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {openReq ? (
        <div style={modalOverlay} onClick={closeModal}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <h2 style={{ margin: 0 }}>Request details</h2>
              <button onClick={closeModal} style={secondaryBtnSmall}>
                Close
              </button>
            </div>

            <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <Info label="Status" value={openReq.status || "pending"} />
              <Info label="Created" value={fmtDateTime(openReq.created_at)} />
              <Info
                label="Comic"
                value={`${openReq.comic_title || "—"}${openReq.issue_number ? ` #${openReq.issue_number}` : ""}`}
              />
              <Info
                label="Event"
                value={`${eventsMap?.[openReq.event_id]?.event_name || "—"} • ${
                  eventsMap?.[openReq.event_id]?.event_location || "—"
                }`}
              />
              <Info label="Artist" value={eventsMap?.[openReq.event_id]?.artist_name || "—"} />
              <Info
                label="Event dates"
                value={fmtDateRange(
                  eventsMap?.[openReq.event_id]?.event_date || null,
                  eventsMap?.[openReq.event_id]?.event_end_date || null
                )}
              />
              <Info label="Attested" value={openReq.attested ? "Yes" : "No"} />
              <Info label="Witness name (submitted)" value={openReq.witness_name || "—"} />
            </div>

            <div style={{ marginTop: "1rem" }}>
              <div style={modalSectionTitle}>Proof image</div>
              {proofLoading ? (
                <div style={{ color: "#666" }}>Loading…</div>
              ) : proofSignedUrl ? (
                <img src={proofSignedUrl} alt="Proof" style={modalImg} />
              ) : (
                <div style={{ color: "#666" }}>—</div>
              )}
            </div>

            <div style={{ marginTop: "1rem" }}>
              <div style={modalSectionTitle}>Book photo</div>
              {bookLoading ? (
                <div style={{ color: "#666" }}>Loading…</div>
              ) : bookSignedUrl ? (
                <img src={bookSignedUrl} alt="Book photo" style={modalImg} />
              ) : (
                <div style={{ color: "#666" }}>—</div>
              )}
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
              <button onClick={() => rejectRequest(openReq)} disabled={busyId === openReq.id} style={dangerBtn}>
                {busyId === openReq.id ? "Working…" : "Reject"}
              </button>

              <button onClick={() => approveRequest(openReq)} disabled={busyId === openReq.id} style={primaryBtn}>
                {busyId === openReq.id ? "Working…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={infoLabel}>{label}</div>
      <div style={infoValue}>{value}</div>
    </div>
  );
}

// ---- styles ----
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: "1rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
};

const filterLabel: React.CSSProperties = { color: "#666", fontWeight: 900, fontSize: "0.85rem", marginBottom: 6 };

const input: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  borderRadius: 12,
  border: "1px solid #ddd",
  outline: "none",
  fontWeight: 800,
  boxSizing: "border-box",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75rem",
  borderBottom: "1px solid #eee",
  fontWeight: 900,
  color: "#333",
  fontSize: "0.95rem",
};

const td: React.CSSProperties = { padding: "0.75rem", verticalAlign: "top", color: "#333" };

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.55rem",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: "0.8rem",
};

const badgeApproved: React.CSSProperties = { ...badgeBase, background: "#e7f6ea", border: "1px solid #bfe6c7" };
const badgeRejected: React.CSSProperties = { ...badgeBase, background: "#fde7e7", border: "1px solid #f2bcbc" };
const badgePending: React.CSSProperties = { ...badgeBase, background: "#f2f2f2", border: "1px solid #ddd" };

const primaryBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #0b5ed7",
  background: "#0d6efd",
  padding: "0.7rem 1rem",
  fontWeight: 900,
  color: "#fff",
  cursor: "pointer",
};

const primaryBtnSmall: React.CSSProperties = { ...primaryBtn, padding: "0.45rem 0.7rem", fontSize: "0.9rem" };

const secondaryBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.6rem 0.9rem",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtnSmall: React.CSSProperties = { ...secondaryBtn, padding: "0.45rem 0.7rem", fontSize: "0.9rem" };

const dangerBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #dc3545",
  background: "#dc3545",
  padding: "0.7rem 1rem",
  fontWeight: 900,
  color: "#fff",
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = { fontWeight: 900, color: "#6a1b9a", textDecoration: "underline" };

const errorBox: React.CSSProperties = {
  background: "#fff0f0",
  border: "1px solid #ffd0d0",
  color: "#8a1f1f",
  borderRadius: 12,
  padding: "0.75rem 1rem",
  marginBottom: "1rem",
  fontWeight: 800,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 50,
};

const modalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 900,
  background: "#fff",
  borderRadius: 16,
  padding: "1rem",
  boxShadow: "0 2px 18px rgba(0,0,0,0.20)",
  maxHeight: "85vh",
  overflow: "auto",
};

const infoLabel: React.CSSProperties = { color: "#666", fontWeight: 900, fontSize: "0.85rem" };
const infoValue: React.CSSProperties = { color: "#222", fontWeight: 900 };

const modalSectionTitle: React.CSSProperties = { fontWeight: 900, marginBottom: 8, color: "#333" };

const modalImg: React.CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid #eee" };
