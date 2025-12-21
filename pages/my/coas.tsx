import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../components/RequireAuth";
import CollectorLayout, { styles } from "../../components/CollectorLayout";
import { supabase } from "../../lib/supabaseClient";

type CoaStatus = "active" | "revoked";

type SignatureRow = {
  id: string;
  qr_id: string;
  comic_title: string;
  issue_number: string;
  status: CoaStatus;
  created_at: string;
};

function formatTitleIssue(title: string, issue: string) {
  const t = (title || "").trim();
  const i = (issue || "").trim();
  if (!t && !i) return "Untitled";
  if (!i) return t;
  return `${t} #${i}`;
}

function badgeForCoa(status: CoaStatus): React.CSSProperties {
  if (status === "revoked") return styles.badgeRejected;
  return styles.badgeApproved;
}

export default function MyCoasPage() {
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const active = rows.filter((r) => r.status === "active").length;
    const revoked = rows.filter((r) => r.status === "revoked").length;
    return { active, revoked };
  }, [rows]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("signatures")
        .select("id, qr_id, comic_title, issue_number, status, created_at")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as SignatureRow[]);
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
        title="My COAs"
        subtitle="Your issued certificates and public verification links."
        actions={[
          { label: "Dashboard", href: "/dashboard", variant: "secondary" },
          { label: "My Requests", href: "/my/requests", variant: "primary" },
        ]}
      >
        {error && <div style={styles.errorBox}>{error}</div>}
        {loading && <div style={styles.infoBox}>Loading your COAs…</div>}

        {!loading && (
          <section style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Active</div>
              <div style={styles.statValue}>{counts.active}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Revoked</div>
              <div style={styles.statValue}>{counts.revoked}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Verify</div>
              <div style={styles.statValueSmall}>Open certificate link</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Share</div>
              <div style={styles.statValueSmall}>Public cert page</div>
            </div>
          </section>
        )}

        {!loading && rows.length === 0 && !error && (
          <div style={styles.emptyState}>
            No COAs issued yet. Once a request is approved, it will appear here.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <section style={styles.cardWide}>
            <div style={styles.cardHeaderRow}>
              <h2 style={styles.cardTitle}>Issued certificates</h2>
              <Link href="/dashboard" style={styles.cardHeaderLink}>
                Back to dashboard
              </Link>
            </div>

            <div style={styles.list}>
              {rows.map((c) => (
                <div key={c.id} style={styles.listRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.rowTitle}>{formatTitleIssue(c.comic_title, c.issue_number)}</div>
                    <div style={styles.rowMeta}>{new Date(c.created_at).toLocaleString()}</div>

                    <Link href={`/cert/${c.qr_id}`} style={styles.inlineLink}>
                      View public certificate
                    </Link>
                  </div>

                  <span style={{ ...styles.badgeBase, ...badgeForCoa(c.status) }}>{c.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </CollectorLayout>
    </RequireAuth>
  );
}
