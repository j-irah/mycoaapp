// components/AdminLayout.tsx
// @ts-nocheck

import AdminNav from "./AdminNav";
import RequireAuth from "./RequireAuth";

export default function AdminLayout({
  children,
  requireStaff = true,
}: {
  children: any;
  requireStaff?: boolean;
}) {
  return (
    <RequireAuth requireStaff={requireStaff}>
      <div style={{ minHeight: "100vh", background: "#f1f1f1", fontFamily: "Arial, sans-serif" }}>
        <AdminNav />
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>{children}</main>
      </div>
    </RequireAuth>
  );
}
