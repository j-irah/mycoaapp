// pages/admin/requests.tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "../../components/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

/* --- helpers unchanged --- */
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

const PROOF_BUCKET = "request-proofs";
const BOOK_PHOTO_BUCKET = "request-books";

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, any>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [openReqId, setOpenReqId] = useState<string | null>(null);
  const openReq = useMemo(() => rows.find((r) => r.id === openReqId) || null, [rows, openReqId]);

  async function load() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("coa_requests")
      .select(
        "id, status, comic_title, issue_number, created_at, collector_user_id, event_id, rejection_reason, issued_coa_id, attested, witness_name, proof_image_path, book_image_url"
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

    const eventIds = Array.from(new Set(reqs.map((r: any) => r.event_id).filter(Boolean)));
    const evMap: Record<string, any> = {};
    if (eventIds.length) {
      const ev = await supabase
        .from("events")
        .select("id, artist_name, event_name, event_date, event_end_date, event_location")
        .in("id", eventIds);

      if (!ev.error && ev.data) {
        for (const e of ev.data) evMap[e.id] = e;
      }
    }
    setEventsMap(evMap);

    const userIds = Array.from(new Set(reqs.map((r: any) => r.collector_user_id).filter(Boolean)));
    const prMap: Record<string, any> = {};
    if (userIds.length) {
      const pr = await supabase.from("profiles").select("id, full_name").in("id", userIds);
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

  async function approveRequest(req: any) {
    setBusyId(req.id);
    setError(null);

    try {
      // ✅ FIX: witness full name first, never email
      const witnessFullName =
        profilesMap?.[req.collector_user_id]?.full_name ||
        req.witness_name ||
        null;

      const res = await fetch("/api/create-coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_title: req.comic_title,
          issue_number: req.issue_number,
          signed_by: eventsMap?.[req.event_id]?.artist_name || "Unknown",
          signed_date: eventsMap?.[req.event_id]?.event_date || null,
          signed_location: eventsMap?.[req.event_id]?.event_location || null,

          // ✅ FIXED
          witnessed_by: req.attested ? witnessFullName : null,

          book_image_url: req.book_image_url || null,
        }),
      });

      const created = await res.json();
      if (!res.ok) throw new Error(created?.error || "Failed to create COA");

      const issuedId = created?.id ?? created?.coa?.id ?? null;

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
      setOpenReqId(null);
    } catch (e: any) {
      setError(e.message || "Approve failed");
    }

    setBusyId(null);
  }

  /* rest of file unchanged (UI, modal, styles) */
  return (
    <AdminLayout requireStaff={true}>
      {/* existing UI */}
    </AdminLayout>
  );
}
