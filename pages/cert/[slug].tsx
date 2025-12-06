// pages/cert/[slug].tsx
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function CertPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [coa, setCoa] = useState(null);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('signatures')
      .select('*')
      .eq('qr_id', slug)
      .single()
      .then(({ data }) => setCoa(data));
  }, [slug]);

  if (!coa) return <div>Loading COA...</div>;

  return (
    <div>
      <h1>Certificate of Authenticity</h1>
      <p>Comic: {coa.comic_title}</p>
      <p>Signed by: {coa.signed_by}</p>
      <p>QR ID: {coa.qr_id}</p>
    </div>
  );
}
