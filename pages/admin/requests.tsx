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

      const { error: upErr } = await supabase
        .from("coa_requests")
        .update({
          status: "approved",
          issued_coa_id: created?.id || null,
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

                      {r.issued_coa_id && (
                        <div style={{ marginTop: "0.35rem" }}>
                          <Link href={`http://localhost:3000/cert/${generateSlug(r.issued_coa_id)}`} style={linkStyle}>
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
              <h2 style={{ margin: 0 }}>Request Review</h2>
              <button onClick={closeModal} style={secondaryBtn}>
                Close
              </button>
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <div style={row}>
                <span style={k}>Comic:</span> {openReq.comic_title || "—"} #{openReq.issue_number || "—"}
              </div>

              <div style={row}>
                <span style={k}>Collector Email:</span> {profilesMap?.[openReq.collector_user_id]?.email || "—"}
              </div>

              <div style={row}>
                <span style={k}>Collector Name:</span> {profilesMap?.[openReq.collector_user_id]?.full_name || "—"}
              </div>

              <div style={row}>
                <span style={k}>Attested:</span> {openReq.attested ? "Yes" : "No"}
              </div>

              <div style={row}>
                <span style={k}>Witness (name):</span> {openReq.witness_name || "—"}
              </div>
            </div>

            {/* Images grid (same sizing) */}
            <div style={imageGrid}>
              <div>
                <div style={{ fontWeight: 900, marginBottom: "0.35rem" }}>Book Photo</div>
                {openReq.book_image_url ? (
                  bookLoading ? (
                    <div>Loading book photo…</div>
                  ) : bookPhotoUrl ? (
                    <a href={bookPhotoUrl} target="_blank" rel="noreferrer">
                      <img src={bookPhotoUrl} alt="Book Photo" style={imagePreview} />
                    </a>
                  ) : (
                    <div style={{ color: "#666" }}>Book photo exists but could not be loaded.</div>
                  )
                ) : (
                  <div style={{ color: "#666" }}>No book photo uploaded.</div>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: "0.35rem" }}>Proof Submitted</div>
                {openReq.proof_image_path ? (
                  proofLoading ? (
                    <div>Loading proof…</div>
                  ) : proofSignedUrl ? (
                    <a href={proofSignedUrl} target="_blank" rel="noreferrer">
                      <img src={proofSignedUrl} alt="Proof" style={imagePreview} />
                    </a>
                  ) : (
                    <div style={{ color: "#666" }}>Proof exists but could not be loaded.</div>
                  )
                ) : (
                  <div style={{ color: "#666" }}>No proof uploaded.</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button disabled={busyId === openReq.id} onClick={() => approveRequest(openReq)} style={approveBtn}>
                {busyId === openReq.id ? "Working…" : "Approve"}
              </button>

              <button
                disabled={busyId === openReq.id}
                onClick={() => {
                  const reason = prompt("Rejection reason?") || "Rejected";
                  rejectRequest(openReq, reason);
                }}
                style={rejectBtn}
              >
                {busyId === openReq.id ? "Working…" : "Reject"}
              </button>
            </div>

            {openReq.rejection_reason && (
              <div style={{ marginTop: "0.75rem", color: "#7a0000", fontWeight: 900 }}>
                Rejection Reason: {openReq.rejection_reason}
              </div>
            )}

            {openReq.book_image_url && (
              <div style={{ marginTop: "0.75rem", color: "#666", fontWeight: 800, fontSize: "0.92rem" }}>
                Book image stored as: <code>{openReq.book_image_url}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const th: React.CSSProperties = { textAlign: "left", padding: "0.7rem 0.5rem", fontWeight: 900, color: "#333" };
const td: React.CSSProperties = { padding: "0.7rem 0.5rem", verticalAlign: "top" };

const badgePending: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  background: "#fff7e6",
  border: "1px solid #ffe0a3",
  color: "#7a4b00",
  fontWeight: 900,
};

const badgeApproved: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
};

const badgeRejected: React.CSSProperties = {
  display: "inline-block",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
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

const primaryBtnSmall: React.CSSProperties = {
  padding: "0.6rem 0.85rem",
  background: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 900,
};

const secondaryBtn: React.CSSProperties = {
  padding: "0.6rem 0.9rem",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: 900,
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 9999,
};

const modalCard: React.CSSProperties = {
  background: "#fff",
  width: "min(980px, 96vw)",
  borderRadius: 14,
  padding: "1.25rem",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

// Same-size previews (click still opens full image)
const imageGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "1rem",
  marginTop: "1rem",
};

const imagePreview: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  height: 360,
  objectFit: "contain",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fafafa",
};

const approveBtn: React.CSSProperties = {
  padding: "0.7rem 0.95rem",
  borderRadius: 12,
  border: "1px solid #b7ebc6",
  background: "#e9f7ef",
  color: "#14532d",
  cursor: "pointer",
  fontWeight: 900,
};

const rejectBtn: React.CSSProperties = {
  padding: "0.7rem 0.95rem",
  borderRadius: 12,
  border: "1px solid #ffb3b3",
  background: "#ffe6e6",
  color: "#7a0000",
  cursor: "pointer",
  fontWeight: 900,
};

const row: React.CSSProperties = { marginTop: "0.35rem" };
const k: React.CSSProperties = { fontWeight: 900, color: "#333" };
