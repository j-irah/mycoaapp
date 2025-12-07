// @ts-nocheck

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';

export default function COAPage() {
  const router = useRouter();
  const slug = Array.isArray(router.query.slug) ? router.query.slug[0] : router.query.slug;

  const [coa, setCoa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function fetchCoa() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('qr_id', slug)
        .single();

      if (error || !data) {
        console.error(error);
        setError('COA not found');
        setCoa(null);
      } else {
        setCoa(data);
      }

      setLoading(false);
    }

    fetchCoa();
  }, [slug]);

  if (loading) return <p>Loading COA...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!coa) return <p>No COA data available</p>;

  const qrUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cert/${coa.qr_id}`;

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'Arial, sans-serif',
        maxWidth: 700,
        margin: '0 auto',
      }}
    >
      <h1>Certificate of Authenticity</h1>

      {/* IMAGE SECTION */}
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

      {/* DETAILS */}
      <p>
        <strong>Title:</strong> {coa.comic_title}
      </p>
      <p>
        <strong>Issue #:</strong> {coa.issue_number}
      </p>
      <p>
        <strong>Signed by:</strong> {coa.signed_by}
      </p>
      <p>
        <strong>Signed date:</strong> {coa.signed_date}
      </p>
      <p>
        <strong>Signed location:</strong> {coa.signed_location}
      </p>
      <p>
        <strong>Witnessed by:</strong> {coa.witnessed_by}
      </p>
      <p>
        <strong>QR ID:</strong> {coa.qr_id}
      </p>

      <div style={{ marginTop: '2rem' }}>
        <h2>Scan this QR code:</h2>
        <QRCodeCanvas value={qrUrl} size={200} />
      </div>
    </div>
  );
}
