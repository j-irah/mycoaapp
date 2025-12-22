// pages/e/[slug].tsx
// Public Event QR landing + Collector COA request form.
// - If not logged in: shows login/signup (with next=/e/[slug]).
// - If logged in AND role is allowed: shows the submission form.
// - If logged in but role is NOT allowed (ex: artist): blocks submission + shows sign-out option.
// - No hardcoded localhost.

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type EventRow = {
  id: string;
  slug: string;
  artist_name: string | null;
  event_name: string | null;
  event_location: string | null;
  event_date: string | null; // YYYY-MM-DD
  event_end_date: string | null; // YYYY-MM-DD
  is_active: boolean;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
};

function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start) return "—";
  const s = new Date(start).toLocaleDateString();
  if (!end || end === start) return s;
  const e = new Date(end).toLocaleDateString();
  return `${s} → ${e}`;
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

const ALLOWED_SUBMIT_ROLES = ["collector", "partner", "owner", "admin", "reviewer"];

export default function PublicEventPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : null;

  const [eventRow, setEventRow] = useState<EventRow | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventErr, setEventErr] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  // Form fields
  const [comicTitle, setComicTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [attested, setAttested] = useState(false);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const nextUrl = useMemo(() => (slug ? `/e/${slug}` : "/"), [slug]);

  const isLoggedIn = !!userId;

  const role = (profile?.role || "").toLowerCase();
  const canSubmit = isLoggedIn && (!!role ? ALLOWED_SUBMIT_ROLES.includes(role) : true); // if role missing, allow but warn
  const isBlockedRole = isLoggedIn && !!role && !ALLOWED_SUBMIT_ROLES.includes(role);

  // Auth detection + profile
  useEffect(() => {
    let alive = true;

    async function loadAuth() {
      setAuthLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      setUserId(user?.id ?? null);
      setUserEmail(user?.email ?? null);

      if (user?.id) {
        const { data: p } = await supabase.from("profiles").select("id, full_name, role, email").eq("id", user.id).maybeSingle();
        if (!alive) return;
        setProfile((p as any) || null);
      } else {
        setProfile(null);
      }

      setAuthLoading(false);
    }

    loadAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);

      if (u?.id) {
        const { data: p } = await supabase.from("profiles").select("id, full_name, role, email").eq("id", u.id).maybeSingle();
        if (!alive) return;
        setProfile((p as any) || null);
      } else {
        setProfile(null);
      }

      setAuthLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load event
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!slug) return;

      setLoadingEvent(true);
      setEventErr(null);

      const { data, error } = await supabase
        .from("events")
        .select("id, slug, artist_name, event_name, event_location, event_date, event_end_date, is_active")
        .eq("slug", slug)
        .single();

      if (!alive) return;

      if (error || !data) {
        setEventRow(null);
        setEventErr(error?.message || "Event not found");
      } else {
        setEventRow(data as EventRow);
      }

      setLoadingEvent(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [slug]);

  const submissionsOpen = useMemo(() => {
    if (!eventRow) return false;
    if (!eventRow.is_active) return false;
    if (!eventRow.event_date) return false;

    const start = eventRow.event_date;
    const end = eventRow.event_end_date || start;
    const today = todayISODate();

    return today >= start && today <= end;
  }, [eventRow]);

  async function uploadToBucket(bucket: string, path: string, file: File) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error(`Upload failed (${bucket}): ${error.message}`);
  }

  async function signOutAndReload() {
    await supabase.auth.signOut();
    router.replace(nextUrl);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg(null);
    setOkMsg(null);

    if (!eventRow?.id) return setErrMsg("Event not found.");
    if (!submissionsOpen) return setErrMsg("This event is not accepting submissions right now.");

    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    // ✅ hard block if logged in as an artist (or any disallowed role)
    if (isBlockedRole) {
      setErrMsg("This account type cannot submit collector COA requests. Please sign out and create/login as a Collector.");
      return;
    }

    if (!comicTitle.trim()) return setErrMsg("Comic title is required.");
    if (!witnessName.trim()) return setErrMsg("Witness name is required (type your full name).");
    if (!attested) return setErrMsg("You must confirm the attestation checkbox.");
    if (!proofFile) return setErrMsg("Proof image is required.");
    if (!bookFile) return setErrMsg("Book image is required.");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    setSubmitting(true);

    try {
      const requestId =
        (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

      setOkMsg("Request submitted! You can track it in your account.");
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
      setErrMsg(err?.message || "Failed to submit request.");
    }

    setSubmitting(false);
  }

  if (loadingEvent) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Loading event…</div>
      </div>
    );
  }

  if (eventErr || !eventRow) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={{ marginTop: 0 }}>Event not found</h1>
          <p style={{ color: "#555" }}>{eventErr || "This QR code may be invalid, or the event may not be available."}</p>
          <Link href="/" style={linkStyle}>
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const dateRange = fmtDateRange(eventRow.event_date, eventRow.event_end_date);
  const attestationText = `I confirm this comic was signed by ${eventRow.artist_name || "the artist"} at ${
    eventRow.event_name || "this event"
  } on ${dateRange}.`;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>{eventRow.event_name || "Event"}</h1>
        <div style={{ fontWeight: 900, color: "#444" }}>{eventRow.artist_name || "Artist"}</div>

        <div style={{ marginTop: 12, color: "#444", lineHeight: 1.55 }}>
          <div>
            <strong>Dates:</strong> {dateRange}
          </div>
          <div>
            <strong>Location:</strong> {eventRow.event_location || "—"}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>Status:</strong>{" "}
            <span style={eventRow.is_active ? badgeActive : badgeInactive}>
              {eventRow.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* ✅ session banner to avoid confusion */}
        {!authLoading && isLoggedIn ? (
          <div style={{ ...noticeBox, marginTop: 16 }}>
            <div style={{ fontWeight: 900 }}>
              Signed in as: {profile?.full_name ? `${profile.full_name} — ` : ""}
              {userEmail || "account"} {role ? `(role: ${role})` : ""}
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={signOutAndReload} style={secondaryBtn}>
                Sign out / Switch account
              </button>
            </div>
          </div>
        ) : null}

        {!submissionsOpen ? (
          <div style={{ ...noticeBox, marginTop: 16 }}>This event is not accepting submissions right now.</div>
        ) : authLoading ? (
          <div style={{ ...noticeBox, marginTop: 16 }}>Checking login…</div>
        ) : !isLoggedIn ? (
          <div style={{ ...noticeBox, marginTop: 16 }}>
            Please{" "}
            <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} style={linkStyle}>
              log in
            </Link>{" "}
            (or{" "}
            <Link href={`/signup?next=${encodeURIComponent(nextUrl)}`} style={linkStyle}>
              create an account
            </Link>
            ) to submit your COA request.
          </div>
        ) : isBlockedRole ? (
          <div style={{ ...errorBox, marginTop: 16 }}>
            This account type cannot submit collector COA requests.
            <div style={{ marginTop: 8 }}>
              Please click <strong>Sign out / Switch account</strong> above and log in as a Collector.
            </div>
          </div>
        ) : (
          <>
            {errMsg ? <div style={errorBox}>{errMsg}</div> : null}
            {okMsg ? <div style={successBox}>{okMsg}</div> : null}

            <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
              <label style={labelStyle}>Comic Title *</label>
              <input style={inputStyle} value={comicTitle} onChange={(e) => setComicTitle(e.target.value)} />

              <label style={labelStyle}>Issue #</label>
              <input style={inputStyle} value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} />

              <label style={labelStyle}>Witness Name (your signature) *</label>
              <input
                style={inputStyle}
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Type your full name"
              />

              <div style={{ marginTop: 12 }}>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 900 }}>
                  <input
                    type="checkbox"
                    checked={attested}
                    onChange={(e) => setAttested(e.target.checked)}
                    style={{ marginTop: 4 }}
                  />
                  <span>{attestationText}</span>
                </label>
              </div>

              <label style={labelStyle}>Proof (ticket photo OR photo of signing) *</label>
              <input
                id="proofFile"
                type="file"
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                style={{ marginBottom: 10 }}
              />

              <label style={labelStyle}>Book photo (will appear on COA) *</label>
              <input
                id="bookFile"
                type="file"
                accept="image/*"
                onChange={(e) => setBookFile(e.target.files?.[0] ?? null)}
                style={{ marginBottom: 6 }}
              />

              <button style={primaryBtn} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit request"}
              </button>
            </form>

            <div style={{ marginTop: 12 }}>
              <Link href="/my/requests" style={linkStyle}>
                View my requests
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f3f3",
  padding: "2rem 1rem",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  fontFamily: "Arial, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  background: "#fff",
  borderRadius: 16,
  padding: "1.5rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 900,
  marginTop: 12,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: 12,
  border: "1px solid #ddd",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 14,
  borderRadius: 12,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  padding: "0.9rem 1rem",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#f7f7f7",
  padding: "0.55rem 0.85rem",
  fontWeight: 900,
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#1976d2",
  textDecoration: "none",
};

const noticeBox: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fafafa",
  padding: "0.9rem",
  fontWeight: 900,
  color: "#333",
};

const errorBox: React.CSSProperties = {
  marginTop: 12,
  borderRadius: 12,
  border: "1px solid #ffb3b3",
  background: "#ffe6e6",
  padding: "0.9rem",
  fontWeight: 900,
  color: "#7a0000",
};

const successBox: React.CSSProperties = {
  marginTop: 12,
  borderRadius: 12,
  border: "1px solid #b7ebc6",
  background: "#e9f7ef",
  padding: "0.9rem",
  fontWeight: 900,
  color: "#14532d",
};

const badgeActive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#e9f7ef",
  border: "1px solid #b7ebc6",
  color: "#14532d",
  fontWeight: 900,
  fontSize: "0.9rem",
};

const badgeInactive: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #ddd",
  color: "#555",
  fontWeight: 900,
  fontSize: "0.9rem",
};
