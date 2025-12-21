// pages/admin/index.tsx
// @ts-nocheck

import Link from "next/link";
import AdminLayout from "../../components/AdminLayout";

export default function AdminDashboardPage() {
  return (
    <AdminLayout requireStaff={true}>
      <h1 style={{ marginTop: 0 }}>Admin Dashboard</h1>

      <div style={grid}>
        <div style={card}>
          <div style={cardTitle}>Events</div>
          <div style={cardDesc}>Create and manage active/inactive events.</div>
          <Link href="http://localhost:3000/admin/events" style={btnLink}>
            Go to Events →
          </Link>
        </div>

        <div style={card}>
          <div style={cardTitle}>Requests</div>
          <div style={cardDesc}>Review incoming COA requests and proofs.</div>
          <Link href="http://localhost:3000/admin/requests" style={btnLink}>
            Go to Requests →
          </Link>
        </div>

        <div style={card}>
          <div style={cardTitle}>Create</div>
          <div style={cardDesc}>Manually create a COA.</div>
          <Link href="http://localhost:3000/admin/create" style={btnLink}>
            Go to Create →
          </Link>
        </div>
      </div>

      <div style={{ marginTop: "1rem", color: "#666", fontWeight: 800 }}>
        Login entrypoint:
        <div style={{ marginTop: "0.35rem" }}>
          <code>http://localhost:3000/login?returnTo=/admin</code>
        </div>
      </div>
    </AdminLayout>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1rem",
};

const card: React.CSSProperties = {
  background: "#fff",
  padding: "1.25rem",
  borderRadius: 14,
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const cardTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "1.1rem",
  marginBottom: "0.35rem",
};

const cardDesc: React.CSSProperties = {
  color: "#666",
  fontWeight: 700,
  marginBottom: "0.85rem",
};

const btnLink: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  fontWeight: 900,
  color: "#1976d2",
};
