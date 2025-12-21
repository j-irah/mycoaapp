// pages/e/[slug].tsx
// @ts-nocheck

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  if (!end || end === start) return new Date(start).toLocaleDateString();
  return `${new Date(start).toLocaleDateString()} → ${new Date(end).toLocaleDateString()}`;
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function randSuffix() {
  return Math.random().toString(16).slice(2);
}

export default function EventLandingPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [eventRow, setEventRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  const [comicTitle, setComicTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");

  const [witnessName, setWitnessName] = useState(""); // typed “signature”
  const [attested, setAttested] = useState(false);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateRange = useMemo(() => formatDateRange(eventRow?.event_date, eventRow?.event_end_date), [eventRow]);

  const isInactive = eventRow ? !eventRow.is_active : false;

  const isWithinEventWindow = useMemo(() => {
    if (!eventRow?.event_date) return false;
    const start = eventRow.event_date; // YYYY-MM-DD
    const end = eventRow.event_end_date || eventRow.event_date;
    const today = todayISODate();
    return today >= start && today <= end;
  }, [eventRow]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!slug) return;

      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      const { data, error } = await supabase
        .from("events")
        .select("id, slug, artist_name, event_name, event_location, event_date, event_end_date, is_active")
        .eq("slug", slug)
        .single();

      if (!active) return;

      if (error || !data) {
        setEventRow(null);
        setLoading(false);
        return;
      }

      setEventRow(data);
      setLoading(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setNeedsLogin(!user);
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  async function uploadToBucket(bucket: string, path: string, file: File) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error(`Upload failed (${bucket}): ${error.message}`);
  }

  async function ensureProfile(userId: string, email: string | null, fullName: string | null) {
    // Best-effort upsert so admin can see email/name
    // If your profiles policies exist, this will succeed for the signed-in user.
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        email: email || null,
        full_name: fullName || null,
      });
    } catch {
      // ignore; request submission can still proceed if profile upsert fails
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!eventRow?.id) return setError("Event not found.");
    if (!eventRow.is_active) return setError("This event is inactive and is not accepting new requests.");
    if (!isWithinEventWindow) return setError("This event is not currently accepting submissions (outside event dates).");

    if (!comicTitle.trim()) return setError("Comic title is required.");
    if (!witnessName.trim()) return setError("Witness name is required (your typed signature).");
    if (!attested) return setError("You must confirm the attestation checkbox.");
    if (!proofFile) return setError("Proof is required (ticket or photo of signing).");
    if (!bookFile) return setError("A book photo is required (it will appear on your COA).");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Return-to-event auth flow:
      router.replace(`http://localhost:3000/login?next=${encodeURIComponent(`/e/${eventRow.slug}`)}`);
      return;
    }

    setSubmitting(true);

    try {
      const requestId = (crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const proofExt = (proofFile.name.split(".").pop() || "jpg").toLowerCase();
      const bookExt = (bookFile.name.split(".").pop() || "jpg").toLowerCase();
      const unique = `${Date.now()}-${randSuffix()}`;

      const proofPath = `${user.id}/${requestId}/proof-${unique}.${proofExt}`;
      const bookPath = `${user.id}/${requestId}/book-${unique}.${bookExt}`;

      await uploadToBucket("request-proofs", proofPath, proofFile);
      await uploadToBucket("request-books", bookPath, bookFile);

      const {
        data: { publicUrl: bookPublicUrl },
      } = supabase.storage.from("request-books").getPublicUrl(bookPath);

      // Ensure profile exists for admin review (email + name)
      await ensureProfile(user.id, user.email || null, witnessName.trim());

      const { error: insertError } = await supabase.from("coa_requests").insert({
        id: requestId,
        event_id: eventRow.id,
        collector_user_id: user.id,

        comic_title: comicTitle.trim(),
        issue_number: issueNumber ? issueNumber.trim() : null,

        status: "pending",

        witness_name: witnessName.trim(),
        attested: true,

        proof_image_path: proofPath,
        book_image_path: bookPath,
        book_image_url: bookPublicUrl,

        payment_mode: "disabled",
        payment_status: "not_required",
      });

      if (insertError) throw new Error(insertError.message);

      setSuccessMsg("Request submitted! You can track it in your account.");
      setComicTitle("");
      setIssueNumber("");
      setWitnessName("");
      setAttested(false);
      setProofFile(null);
      setBookFile(null);

      const proofInput = document.getElementById("proofFile") as HTMLInputElement | null;
      const bookInput = document.getElementById("bookFile") as HTMLInputElement | null;
      if (proofInput) proofInput.value = "";
      if (bookInput) bookInput.value = "";
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
    }

    setSubmitting(false);
  }

  if (loading) return <div style={pageStyle}>Loading event…</div>;

  if (!eventRow) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={{ marginTop: 0 }}>Event not found</h1>
          <p style={{ color: "#555" }}>This QR code may be invalid, or the event may not be available.</p>
          <Link href="/" style={{ fontWeight: 900 }}>
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const submissionsBlocked = isInactive || !isWithinEventWindow;

  const attestationText = `I confirm this comic was signed by ${eventRow.artist_name} at ${eventRow.event_name} on ${dateRange}.`;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div>
            <h1 style={{ marginTop: 0, marginBottom: "0.25rem" }}>{eventRow.artist_name}</h1>
            <div style={{ color: "#444", fontWeight: 700 }}>{eventRow.event_name}</div>
          </div>
          <span style={submissionsBlocked ? badgeInactive : badgeActive}>{submissionsBlocked ? "Submissions closed" : "Open"}</span>
        </div>

        <div style={{ marginTop: "0.35rem", color: "#666" }}>
          <div>
            <strong>Dates:</strong> {dateRange}
          </div>
          <div>
            <strong>Location:</strong> {eventRow.event_location || "—"}
          </div>
        </div>

        <hr style={{ margin: "1rem 0", border: 0, borderTop: "1px solid #eee" }} />

        {isInactive && <div style={inactiveStyle}>This event is inactive and is not accepting new requests.</div>}

        {!isInactive && !isWithinEventWindow && (
          <div style={inactiveStyle}>This event is not currently accepting submissions (outside event dates).</div>
        )}

        {needsLogin && !submissionsBlocked && (
          <div style={warnStyle}>
            Please{" "}
            <Link href={`http://localhost:3000/login?next=${encodeURIComponent(`/e/${eventRow.slug}`)}`}>
              sign in
            </Link>{" "}
            (or{" "}
            <Link href={`http://localhost:3000/login?next=${encodeURIComponent(`/e/${eventRow.slug}`)}`}>
              create an account
            </Link>
            ) to submit your COA request.
          </div>
        )}

        {error && <div style={errorStyle}>{error}</div>}
        {successMsg && <div style={successStyle}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Comic Title *</label>
          <input value={comicTitle} onChange={(e) => setComicTitle(e.target.value)} style={inputStyle} disabled={submissionsBlocked} />

          <label style={labelStyle}>Issue #</label>
          <input value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} style={inputStyle} disabled={submissionsBlocked} />

          <label style={labelStyle}>Witness Name (your signature) *</label>
          <input
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
            style={inputStyle}
            disabled={submissionsBlocked}
            placeholder="Type your full name"
          />

          <div style={{ marginTop: "0.9rem" }}>
            <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontWeight: 800 }}>
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                disabled={submissionsBlocked}
                style={{ marginTop: 4 }}
              />
              <span>{attestationText}</span>
            </label>
          </div>

          <label style={labelStyle}>Proof (required): ticket photo OR photo of signing *</label>
          <input
            id="proofFile"
            type="file"
            accept="image/*"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            disabled={submissionsBlocked}
            style={{ marginBottom: "0.75rem" }}
          />

          <label style={labelStyle}>Book photo (required): will appear on COA *</label>
          <input
            id="bookFile"
            type="file"
            accept="image/*"
            onChange={(e) => setBookFile(e.target.files?.[0] ?? null)}
            disabled={submissionsBlocked}
            style={{ marginBottom: "0.25rem" }}
          />

          <button type="submit" disabled={submitting || submissionsBlocked} style={buttonStyle}>
            {submissionsBlocked ? "Submissions closed" : submitting ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <div style={{ marginTop: "0.65rem" }}>
          <Link href="http://localhost:3000/account/requests" style={{ fontWeight: 900 }}>
            View my requests
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f1f1f1",
  fontFamily: "Arial, sans-serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  background: "#fff",
  padding: "1.5rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const labelStyle: React.CSSProperties = { display: "block", fontWeight: 800, marginTop: "0.75rem", marginBottom: "0.35rem" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem 1rem",
  marginTop: "1rem",
  background: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 900,
  fontSize: "1rem",
};

const warnStyle: React.CSSProperties = {
  background: "#fff3cd",
  border: "1px solid #ffeeba",
  padding: "0.75rem",
  borderRadius: 10,
  marginBottom: "0.75rem",
  color: "#664d03",
  fontWeight: 700,
};

const inactiveStyle: React.CSSProperties = {
  background: "#f5f5f5",
  border: "1px solid #ddd",
  padding: "0.75rem",
  borderRadius: 10,
  marginBottom: "0.75rem",
  color: "#444",
  fontWeight: 800,
};

const errorStyle: React.CSSProperties = {
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  padding: "0.75rem",
  borderRadius: 10,
  marginBottom: "0.75rem",
  color: "#7a0000",
  fontWeight: 700,
};

const successStyle: React.CSSProperties = {
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  padding: "0.75rem",
  borderRadius: 10,
  marginBottom: "0.75rem",
  color: "#14532d",
  fontWeight: 800,
};

const badgeActive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.6rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
  fontSize: "0.9rem",
};

const badgeInactive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.6rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
  fontSize: "0.9rem",
};
