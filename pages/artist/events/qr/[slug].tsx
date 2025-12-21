// pages/artist/events/qr/[slug].tsx
// @ts-nocheck

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import RequireAuth from "../../../../components/RequireAuth";
import { supabase } from "../../../../lib/supabaseClient";

function buildQrUrl(data: string, size = 320) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function ArtistQrPrintPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : "";

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const landingUrl = useMemo(() => (slug ? `http://localhost:3000/e/${slug}` : ""), [slug]);
  const qrImg = useMemo(() => (landingUrl ? buildQrUrl(landingUrl, 360) : ""), [landingUrl]);

  useEffect(() => {
    (async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("http://localhost:3000/login");
        return;
      }

      const pr = await supabase.from("profiles").select("role").eq("id", user.id).single();

      if (pr.error || pr.data?.role !== "artist") {
        router.replace("http://localhost:3000/login");
        return;
      }

      const ev = await supabase
        .from("events")
        .select("id, slug, event_name, event_location, event_date, event_end_date, is_active, artist_user_id, artist_name")
        .eq("slug", slug)
        .single();

      if (ev.error) {
        setError(ev.error.message);
        setLoading(false);
        return;
      }

      if (ev.data?.artist_user_id !== user.id) {
        setError("You do not have access to this event.");
        setLoading(false);
        return;
      }

      setEvent(ev.data);
      setLoading(false);
    })();
  }, [slug, router]);

  function printNow() {
    window.print();
  }

  return (
    <RequireAuth requireStaff={false}>
      <div style={page}>
        <div style={noPrintBar} className="noPrint">
          <button onClick={() => router.push("http://localhost:3000/artist/dashboard")} style={btn}>
            Back
          </button>
          <button onClick={printNow} style={btnPrimary}>
            Print
          </button>
        </div>

        {loading ? (
          <div style={card}>Loading…</div>
        ) : error ? (
          <div style={cardError}>{error}</div>
        ) : (
          <div style={printCard}>
            <div style={grid}>
              <div>
                <div style={{ fontWeight: 900, color: "#475569" }}>Event QR Code</div>
                <div style={title}>{event?.event_name || "Untitled Event"}</div>

                {event?.artist_name ? (
                  <div style={{ marginTop: 6, color: "#475569", fontWeight: 800 }}>
                    Artist: {event.artist_name}
                  </div>
                ) : null}

                {event?.event_location ? (
                  <div style={{ marginTop: 6, color: "#475569" }}>{event.event_location}</div>
                ) : null}

                <div style={{ marginTop: 6, color: "#475569" }}>
                  {event?.event_date || ""}
                  {event?.event_end_date && event.event_end_date !== event.event_date ? ` → ${event.event_end_date}` : ""}
                </div>

                <div style={{ marginTop: 12, fontWeight: 900 }}>Scan to submit request</div>
                <div style={{ marginTop: 6 }}>
                  <code style={code}>{landingUrl}</code>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <img src={qrImg} alt="Event QR" style={{ width: 320, height: 320 }} />
                <div style={{ marginTop: 10, fontWeight: 900 }}>Scan Me</div>
              </div>
            </div>

            <div style={footer}>
              Print this and place it at your booth/table. Collectors scan the code to open the event page.
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body { background: white !important; }
            .noPrint { display: none !important; }
          }
        `}</style>
      </div>
    </RequireAuth>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f1f5f9",
  fontFamily: "Arial, sans-serif",
  padding: 18,
};

const noPrintBar: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto 12px",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const card: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  background: "white",
  borderRadius: 18,
  padding: 16,
  border: "1px solid rgba(15, 23, 42, 0.10)",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
};

const printCard: React.CSSProperties = {
  ...card,
};

const cardError: React.CSSProperties = {
  ...card,
  background: "#ffe6e6",
  border: "1px solid #ffb3b3",
  color: "#7a0000",
  fontWeight: 900,
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(15, 23, 42, 0.14)",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const btnPrimary: React.CSSProperties = {
  ...btn,
  background: "#1976d2",
  border: "1px solid #1976d2",
  color: "white",
};

const grid: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const title: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  marginTop: 4,
};

const code: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f5f5f5",
  border: "1px solid #eee",
  fontWeight: 900,
};

const footer: React.CSSProperties = {
  marginTop: 14,
  borderTop: "1px solid #eee",
  paddingTop: 12,
  color: "#475569",
  fontWeight: 800,
};
