// @ts-nocheck

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';

export default function TestQRPage() {
  const [slug, setSlug] = useState('');
  const [coa, setCoa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCoa() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('qr_id', slug)
      .single();

    if (error || !data) {
      setError('COA not found');
      setCoa(null);
    } else {
      setCoa(data);
    }

    setLoading(false);
  }

  const qrUrl = coa ? `${process.env.NEXT_PUBLIC_SITE_URL}/cert/${coa.qr_id}` : '';

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test COA QR Code</h1>

      <input
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="Enter QR ID"
        style={{ padding: '0.5rem', marginRight: '1rem' }}
      />
      <button onClick={fetchCoa} style={{ padding: '0.5rem 1rem' }}>
        Fetch COA
      </button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {coa && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Certificate of Authenticity</h2>
          <p>
            <strong>Comic:</strong> {coa.comic_title}
          </p>
          <p>
            <strong>Signed by:</strong> {coa.signed_by}
          </p>
          <p>
            <strong>QR ID:</strong> {coa.qr_id}
          </p>
          <div style={{ marginTop: '1rem' }}>
            <h3>Scan this QR code:</h3>
            <QRCodeCanvas value={qrUrl} size={200} />
          </div>
        </div>
      )}
    </div>
  );
}
