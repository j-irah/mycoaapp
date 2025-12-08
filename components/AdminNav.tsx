// components/AdminNav.tsx

import Link from "next/link";

export default function AdminNav() {
  return (
    <nav style={navStyle}>
      <Link href="/admin/create" style={linkStyle}>
        Create COA
      </Link>
      <Link href="/admin/coas" style={linkStyle}>
        Manage COAs
      </Link>
      <Link href="/search" style={linkStyle}>
        Search
      </Link>
    </nav>
  );
}

const navStyle = {
  display: "flex",
  gap: "1.5rem",
  padding: "0.75rem 1.5rem",
  background: "#f5f5f5",
  borderBottom: "1px solid #ddd",
  fontSize: "1rem",
};

const linkStyle = {
  textDecoration: "none",
  color: "#333",
  fontWeight: 600,
};
