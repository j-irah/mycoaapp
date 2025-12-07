// pages/cert/[slug].tsx
// @ts-nocheck

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';

type COA = {
  id: string;
  comic_title: string;
  issue_number: string;
  signed_by: string;
  signed_date: string;
  signed_location: string;
  witnessed_by: string;
  image_url?: string;
  qr_id: string;
};

export default function COAPage() {
  const router = useRouter();
  const slugParam = router.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const [coa, setCoa] = useState<COA | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function fetchCoa() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from<COA>('signatures')
        .select('*')
        .eq('qr_id', slug)
        .single();

      if (error || !data) {
        console.error(error);
        setError('Certificate not found.');
        setCoa(null);
      } else {
        setCoa(data);
      }

      setLoading(false);
    }

    fetchCoa();
  }, [slug]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <p>Loading certificate...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  if (!coa) {
    return (
      <div style={containerStyle}>
        <p>No certificate data available.</p>
      </div>
    );
  }

  const qrUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cert/${coa.qr_id}`;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Certificate of Authenticity</h1>

        {/* Optional image */}
        {coa.image_url && (
          <div style={{ margin: '1.5rem 0' }}>
            <img
              src={coa.image_url}
              alt={`${coa.comic_title} cover`}
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            />
          </div>
        )}

        <div style={detailsGridStyle}>
          <div>
            <p>
              <strong>Title:</strong> {coa.comic_title}
            </p>
            <p>
              <strong>Issue #:</strong> {coa.issue_number}
            </p>
            <p>
              <strong>Signed by:</strong> {coa.signed_by}
            </p>
          </div>
          <div>
            <p>
              <strong>Signed date:</strong> {coa.signed_date}
            </p>
            <p>
              <strong>Signed location:</strong> {coa.signed_location}
            </p>
            <p>
              <strong>Witnessed by:</strong> {coa.witnessed_by}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Verified QR Code</h2>
          <QRCodeCanvas value={qrUrl} size={200} />
          {/* QR ID is intentionally NOT displayed here */}
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: '2rem 1rem',
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#f5f5f5',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  maxWidth: 800,
  width: '100%',
  padding: '2rem',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  border: '1px solid #e0e0e0',
};

const titleStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '1.5rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const detailsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1.5rem',
  marginTop: '0.5rem',
};
