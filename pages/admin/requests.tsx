// pages/admin/requests.tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { generateSlug } from "../../lib/generateSlug";

function requestDateAsYYYYMMDD(created_at: string | null) {
  if (!created_at) return null;
  return String(created_at).slice(0, 10);
}

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

// ✅ Your bucket from the screenshot:
const BOOK_PHOTO_BUCKET = "request-books";

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, any>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [openReqId, setOpenReqId] = useState<string | null>(null);
  const openReq = useMemo(() => rows.find((r) => r.id === openReqId) || null, [rows, openReqId]);

  // Proof image
  const [proofSignedUrl, setProofSignedUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  // Book photo
  const [bookPhotoUrl, setBookPhotoUrl] = useState<string | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("coa_requests")
      .select(
        "id, status, comic_title, issue_number, created_at, collector_user_id, event_id, rejection_reason, issued_coa_id, attested, witness_name, proof_image_path, book_image_url, reviewed_by, reviewed_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
      setEventsMap({});
      setProfilesMap({});
      setLoading(false);
      return;
    }

    const reqs = data || [];
    setRows(reqs);

    // Events map
    const eventIds = Array.from(new Set(reqs.map((r: any) => r.event_id).filter(Boolean)));
    const evMap: Record<string, any> = {};
    if (eventIds.length) {
      const ev = await supabase
        .from("events")
        .select("id, slug, artist_name, event_name, event_date, event_end_date, event_location, is_active")
        .in("id", eventIds);

      if (!ev.error && ev.data) {
        for (const e of ev.data) evMap[e.id] = e;
      }
    }
    setEventsMap(evMap);

    // Profiles map (collector email/name)
    const userIds = Array.from(new Set(reqs.map((r: any) => r.collector_user_id).filter(Boolean)));
    const prMap: Record<string, any> = {};
    if (userIds.length) {
      const pr = await supabase.from("profiles").select("id, email, full_name, role").in("id", userIds);
      if (!pr.error && pr.data) {
        for (const p of pr.data) prMap[p.id] = p;
      }
    }
    setProfilesMap(prMap);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function getProofSignedUrl(proofPath: string) {
    setProofLoading(true);
    setProofSignedUrl(null);

    try {
      const { data, error } = await supabase.storage.from("request-proofs").createSignedUrl(proofPath, 60 * 10);
      if (error) throw new Error(error.message);
      setProofSignedUrl(data?.signedUrl || null);
    } catch (e: any) {
      setError(e.message || "Failed to load proof image.");
      setProofSignedUrl(null);
    }

    setProofLoading(false);
  }

  async function resolveBookPhotoUrl(book_image_url: string) {
    setBookLoading(true);
    setBookPhotoUrl(null);

    try {
      if (looksLikeUrl(book_image_url)) {
        setBookPhotoUrl(book_image_url);
        setBookLoading(false);
        return;
      }

      const { data, error } = await supabase.storage.from(BOOK_PHOTO_BUCKET).createSignedUrl(book_image_url, 60 * 10);
      if (error) throw new Error(error.message);

      setBookPhotoUrl(data?.signedUrl || null);
    } catch (e: any) {
      setError(e.message || "Failed to load book photo.");
      setBookPhotoUrl(null);
    }

    setBookLoading(false);
  }

  async function openRequest(reqId: string) {
    setOpenReqId(reqId);

    // reset modal media
    setProofSignedUrl(null);
    setBookPhotoUrl(null);
    setProofLoading(false);
    setBookLoading(false);

    const req = rows.find((r) => r.id === reqId);

    if (req?.proof_image_path) {
      await getProofSignedUrl(req.proof_image_path);
    }

    if (req?.book_image_url) {
      await resolveBookPhotoUrl(req.book_image_url);
    }
  }

  function closeModal() {
    setOpenReqId(null);
    setProofSignedUrl(null);
    setBookPhotoUrl(null);
    setProofLoading(false);
    setBookLoading(false);
  }

  async function approveRequest(req: any) {
    setBusyId(req.id);
    setError(null);

    try {
      const res = await fetch("/api/create-coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_title: req.comic_title,
          issue_number: req.issue_number,
          signed_by: eventsMap?.[req.event_id]?.artist_name || "Unknown",
          signed_date: eventsMap?.[req.event_id]?.event_date || null,
          signed_location: eventsMap?.[req.event_id]?.event_location || null,
          witnessed_by: req.attested ? profilesMap?.[req.collector_user_id]?.email || req.witness_name || null : null,
          request_id: req.id,
        }),
      });

      const created = await res.json();
      if (!res.ok) throw new Error(created?.error || "Failed to create COA");

      // Support BOTH shapes:
      // - New: { id, qr_id, coa }
      // - Old: { coa: { id, qr_id, ... } }
      const coa = created?.coa ?? null;
      const issuedId = created?.id ?? coa?.id ?? null;

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

  async function rejectRequest(req: any, reason: string) {
    setBusyId(req.id);
    setError(null);

    try {
      const { error: upErr } = await supabase
        .from("coa_requests")
        .update({
          status: "rejected",
          rejection_reason: reason || "Rejected",
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

  const tableRows = rows.map((r) => {
    const ev = eventsMap[r.event_id] || null;
    const pr = profilesMap[r.collector_user_id] || null;

    const status = r.status || "pending";
    const createdDay = requestDateAsYYYYMMDD(r.created_at);
    const eventDates = ev ? fmtDateRange(ev.event_date, ev.event_end_date) : "—";

    return {
      ...r,
      _status: status,
      _createdDay: createdDay,
      _event: ev,
      _profile: pr,
      _eventDates: eventDates,
    };
  });

  return (
    <AdminLayout requireStaff={true}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h1 style={{ marginTop: 0 }}>Requests</h1>
        <button onClick={load} style={secondaryBtn}>
          Refresh
        </button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={card}>
        {loading ? (
          <div>Loading…</div>
        ) : tableRows.length === 0 ? (
          <div style={{ color: "#666" }}>No requests found.</div>
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
              {tableRows.map((r) => {
                const ev = r._event;
                const pr = r._profile;

                const collectorEmail = pr?.email || "—";
                const collectorName = pr?.full_name || "—";
                const eventLabel = ev ? `${ev.artist_name || "—"} • ${ev.event_name || "—"}` : "—";

                return (
                  <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={td}>
                      <span
                        style={
                          r._status === "approved"
                            ? badgeApproved
                            : r._status === "rejected"
                              ? badgeRejected
                              : badgePending
                        }
                      >
                        {r._status}
                      </span>
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
                      <div style={{ color: "#666" }}>{r._eventDates}</div>
                    </td>

                    <td style={td}>{fmtDateTime(r.created_at)}</td>

                    <td style={td}>
                      <button onClick={() => openRequest(r.id)} style={primaryBtnSmall}>
                        Open
                      </button>

                      {/* NOTE: This link may still be wrong until we wire issued_coa_id -> signatures.qr_id.
                          Step 1 is only fixing issued_coa_id being NULL. We’ll fix the link in Step 2. */}
                      {r.issued_coa_id && (
                        <div style={{ marginTop: "0.35rem" }}>
                          <Link href={`/admin/coas`} style={linkStyle}>
                            View COA
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {openReq && (
        <div style={modalOverlay} onClick={closeModal}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <h2 style={{ margin: 0 }}>Request details</h2>
              <button onClick={closeModal} style={secondaryBtnSmall}>
                Close
              </button>
            </div>

            <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <div>
                <div style={label}>Status</div>
                <div style={value}>{openReq.status || "pending"}</div>
              </div>

              <div>
                <div style={label}>Created</div>
                <div style={value}>{fmtDateTime(openReq.created_at)}</div>
              </div>

              <div>
                <div style={label}>Comic</div>
                <div style={value}>
                  {openReq.comic_title || "—"} {openReq.issue_number ? `#${openReq.issue_number}` : ""}
                </div>
              </div>

              <div>
                <div style={label}>Event</div>
                <div style={value}>
                  {eventsMap?.[openReq.event_id]?.event_name || "—"} • {eventsMap?.[openReq.event_id]?.event_location || "—"}
                </div>
              </div>

              <div>
                <div style={label}>Artist</div>
                <div style={value}>{eventsMap?.[openReq.event_id]?.artist_name || "—"}</div>
              </div>

              <div>
                <div style={label}>Event dates</div>
                <div style={value}>
                  {fmtDateRange(eventsMap?.[openReq.event_id]?.event_date || null, eventsMap?.[openReq.event_id]?.event_end_date || null)}
                </div>
              </div>

              <div>
                <div style={label}>Attested</div>
                <div style={value}>{openReq.attested ? "Yes" : "No"}</div>
              </div>

              <div>
                <div style={label}>Witness name</div>
                <div style={value}>{openReq.witness_name || "—"}</div>
              </div>
            </div>

            {/* Proof image */}
            <div style={{ marginTop: "1rem" }}>
              <div style={label}>Proof image</div>
              {proofLoading ? (
                <div style={{ color: "#666" }}>Loading proof…</div>
              ) : proofSignedUrl ? (
                <img
                  src={proofSignedUrl}
                  alt="Proof"
                  style={{ width: "100%", borderRadius: 12, border: "1px solid #eee" }}
                />
              ) : (
                <div style={{ color: "#666" }}>—</div>
              )}
            </div>

            {/* Book photo */}
            <div style={{ marginTop: "1rem" }}>
              <div style={label}>Book photo</div>
              {bookLoading ? (
                <div style={{ color: "#666" }}>Loading book photo…</div>
              ) : bookPhotoUrl ? (
                <img
                  src={bookPhotoUrl}
                  alt="Book"
                  style={{ width: "100%", borderRadius: 12, border: "1px solid #eee" }}
                />
              ) : (
                <div style={{ color: "#666" }}>—</div>
              )}
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => rejectRequest(openReq, "Rejected")}
                disabled={busyId === openReq.id}
                style={dangerBtn}
              >
                {busyId === openReq.id ? "Working…" : "Reject"}
              </button>

              <button onClick={() => approveRequest(openReq)} disabled={busyId === openReq.id} style={primaryBtn}>
                {busyId === openReq.id ? "Working…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: "1rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75rem",
  borderBottom: "1px solid #eee",
  fontWeight: 900,
  color: "#333",
  fontSize: "0.95rem",
};

const td: React.CSSProperties = {
  padding: "0.75rem",
  verticalAlign: "top",
  color: "#333",
};

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

const primaryBtnSmall: React.CSSProperties = {
  ...primaryBtn,
  padding: "0.45rem 0.7rem",
  fontSize: "0.9rem",
};

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

const dangerBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #dc3545",
  background: "#dc3545",
  padding: "0.7rem 1rem",
  fontWeight: 900,
  color: "#fff",
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#6a1b9a",
  textDecoration: "underline",
};

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

const label: React.CSSProperties = { color: "#666", fontWeight: 900, fontSize: "0.85rem" };
const value: React.CSSProperties = { color: "#222", fontWeight: 900 };
