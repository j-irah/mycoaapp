// pages/dashboard.tsx
// Collector Dashboard

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "../components/RequireAuth";
import CollectorLayout, { styles } from "../components/CollectorLayout";
import { supabase } from "../lib/supabaseClient";

type RequestStatus = "pending" | "approved" | "rejected";
type CoaStatus = "active" | "revoked";

type CoaRequestRow = {
  id: string;
  status: RequestStatus;
  comic_title: string | null;
  issue_number: string | null;
  created_at: string;
};

type SignatureRow = {
  id: string;
  qr_id: string;
  comic_title: string | null;
  issue_number: string | null;
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

function badgeForRequest(status: RequestStatus): React.CSSProperties {
  if (status === "approved") return styles.badgeApproved;
  if (status === "rejected") return styles.badgeRejected;
  return styles.badgePending;
}

function badgeForCoa(status: CoaStatus): React.CSSProperties {
  if (status === "revoked") return styles.badgeRejected;
  return styles.badgeApproved;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] = useState<CoaRequestRow[]>([]);
  const [coas, setCoas] = useState<SignatureRow[]>([]);

  const counters = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const activeCoas = coas.filter((c) => c.status === "active").length;
    return { pending, approved, rejected, activeCoas };
  }, [requests, coas]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [{ data: reqData, error: reqErr }, { data: coaData, error: coaErr }] =
        await Promise.all([
          supabase
            .from("coa_requests")
            .select("id,status,comic_title,issue_number,created_at")
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("signatures")
            .select("id,qr_id,comic_title,issue_number,status,created_at")
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

      if (cancelled) return;

      if (reqErr) {
        setError(reqErr.message);
        setRequests([]);
        setCoas([]);
        setLoading(false);
        return;
      }

      setRequests((reqData ?? []) as CoaRequestRow[]);
      setCoas(((coaErr ? [] : coaData) ?? []) as SignatureRow[]);
      if (coaErr) setError(coaErr.message);

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RequireAuth>
      <CollectorLayout
        title="Collector Dashboard"
        subtitle="Manage requests and verify your issued certificates."
        actions={[
          { label: "Submit Request", href: "/my/requests", variant: "primary" },
          { label: "My COAs", href: "/my/coas", variant: "secondary" },
        ]}
      >
        {error && <div style={styles.errorBox}>{error}</div>}
        {loading && <div style={styles.infoBox}>Loading your dashboard…</div>}

        {!loading && (
          <section style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Pending</div>
              <div style={styles.statValue}>{counters.pending}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Approved</div>
              <div style={styles.statValue}>{counters.approved}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Rejected</div>
              <div style={styles.statValue}>{counters.rejected}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Active COAs</div>
              <div style={styles.statValue}>{counters.activeCoas}</div>
            </div>
          </section>
        )}

        {!loading && (
          <section style={styles.cardWide}>
            <div style={styles.cardWideTop}>
              <div>
                <h2 style={styles.cardTitle}>How to submit a request</h2>
                <p style={styles.cardText}>
                  Scan an event QR code at a signing to open the event page. Upload your proof photo and book image.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/my/requests" style={styles.linkPill}>
                  View my requests
                </Link>
                <Link href="/my/coas" style={styles.linkPill}>
                  View my COAs
                </Link>
              </div>
            </div>
          </section>
        )}

        {!loading && (
          <section style={styles.twoColGrid}>
            <div style={styles.card}>
              <div style={styles.cardHeaderRow}>
                <h2 style={styles.cardTitle}>Recent requests</h2>
                <Link href="/my/requests" style={styles.cardHeaderLink}>
                  View all
                </Link>
              </div>

              {requests.length === 0 ? (
                <div style={styles.emptyState}>
                  No requests yet. Scan a QR code at an event to submit your first request.
                </div>
              ) : (
                <div style={styles.list}>
                  {requests.slice(0, 6).map((r) => (
                    <div key={r.id} style={styles.listRow}>
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.rowTitle}>{formatTitleIssue(r.comic_title, r.issue_number)}</div>
                        <div style={styles.rowMeta}>{new Date(r.created_at).toLocaleString()}</div>
                      </div>
                      <span style={{ ...styles.badgeBase, ...badgeForRequest(r.status) }}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeaderRow}>
                <h2 style={styles.cardTitle}>Recent COAs</h2>
                <Link href="/my/coas" style={styles.cardHeaderLink}>
                  View all
                </Link>
              </div>

              {coas.length === 0 ? (
                <div style={styles.emptyState}>No COAs issued yet. Once a request is approved, it will appear here.</div>
              ) : (
                <div style={styles.list}>
                  {coas.slice(0, 6).map((c) => (
                    <div key={c.id} style={styles.listRow}>
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.rowTitle}>{formatTitleIssue(c.comic_title, c.issue_number)}</div>
                        <div style={styles.rowMeta}>{new Date(c.created_at).toLocaleString()}</div>
                        <Link href={`/cert/${c.qr_id}`} style={styles.inlineLink}>
                          View certificate
                        </Link>
                      </div>
                      <span style={{ ...styles.badgeBase, ...badgeForCoa(c.status) }}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </CollectorLayout>
    </RequireAuth>
  );
}
