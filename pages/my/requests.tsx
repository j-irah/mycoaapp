import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import CollectorLayout, { styles } from "../../components/CollectorLayout";
import { supabase } from "../../lib/supabaseClient";

type RequestStatus = "pending" | "approved" | "rejected";

type CoaRequestRow = {
  id: string;
  status: RequestStatus;
  comic_title: string;
  issue_number: string;
  created_at: string;
  rejection_reason: string | null;
};

function formatTitleIssue(title: string, issue: string) {
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

export default function MyRequestsPage() {
  const [rows, setRows] = useState<CoaRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending").length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    return { pending, approved, rejected };
  }, [rows]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("coa_requests")
        .select("id, status, comic_title, issue_number, created_at, rejection_reason")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as CoaRequestRow[]);
      }

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
        title="My Requests"
        subtitle="Your COA submissions and review results."
        actions={[
          { label: "Dashboard", href: "/dashboard", variant: "secondary" },
          { label: "My COAs", href: "/my/coas", variant: "primary" },
        ]}
      >
        {error && <div style={styles.errorBox}>{error}</div>}
        {loading && <div style={styles.infoBox}>Loading your requests…</div>}

        {!loading && (
          <section style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Pending</div>
              <div style={styles.statValue}>{counts.pending}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Approved</div>
              <div style={styles.statValue}>{counts.approved}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Rejected</div>
              <div style={styles.statValue}>{counts.rejected}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Next</div>
              <div style={styles.statValueSmall}>Scan QR at event</div>
            </div>
          </section>
        )}

        {!loading && rows.length === 0 && !error && (
          <div style={styles.emptyState}>
            No requests yet. To submit one, scan an event QR code and complete the form on the event page.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <section style={styles.cardWide}>
            <div style={styles.cardHeaderRow}>
              <h2 style={styles.cardTitle}>Submissions</h2>
              <Link href="/dashboard" style={styles.cardHeaderLink}>
                Back to dashboard
              </Link>
            </div>

            <div style={styles.list}>
              {rows.map((r) => (
                <div key={r.id} style={styles.listRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.rowTitle}>{formatTitleIssue(r.comic_title, r.issue_number)}</div>
                    <div style={styles.rowMeta}>{new Date(r.created_at).toLocaleString()}</div>

                    {r.status === "rejected" && r.rejection_reason && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 12,
                          background: "rgba(244, 63, 94, 0.08)",
                          border: "1px solid rgba(244, 63, 94, 0.18)",
                          color: "#9f1239",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        <strong>Rejected:</strong> {r.rejection_reason}
                      </div>
                    )}

                    {r.status === "approved" && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 12,
                          background: "rgba(34, 197, 94, 0.10)",
                          border: "1px solid rgba(34, 197, 94, 0.18)",
                          color: "#14532d",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        Approved ✅ Check{" "}
                        <Link href="/my/coas" style={styles.inlineLink}>
                          My COAs
                        </Link>{" "}
                        for your certificate.
                      </div>
                    )}
                  </div>

                  <span style={{ ...styles.badgeBase, ...badgeForRequest(r.status) }}>{r.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </CollectorLayout>
    </RequireAuth>
  );
}
