// components/AdminLayout.tsx
// Staff/admin layout wrapper used across /admin/* pages.
// IMPORTANT: This file is the single source of truth for the admin nav.

import React from "react";
import AdminNav from "./AdminNav";
import RequireAuth from "./RequireAuth";

type Props = {
  children: React.ReactNode;
  requireStaff?: boolean;
};

export default function AdminLayout({ children, requireStaff = true }: Props) {
  return (
    <RequireAuth requireStaff={requireStaff}>
      <div style={pageStyle}>
        <AdminNav />
        <main style={mainStyle}>{children}</main>
      </div>
    </RequireAuth>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f3f3",
  fontFamily: "Arial, sans-serif",
};

const mainStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "1.5rem 1.25rem 3rem",
};
