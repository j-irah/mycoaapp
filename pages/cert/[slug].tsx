// @ts-nocheck

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import QRCode from 'qrcode.react';

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
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Certificate of Authenticity</h1>
      <p>
        <strong>Comic:</strong> {coa.comic_title}
      </p>
      <p>
        <strong>Signed by:</strong> {coa.signed_by}
      </p>
      <p>
        <strong>QR ID:</strong> {coa.qr_id}
      </p>

      <div style={{ marginTop: '2rem' }}>
        <h2>Scan this QR code:</h2>
        <QRCode value={qrUrl} size={200} />
      </div>
    </div>
  );
}

