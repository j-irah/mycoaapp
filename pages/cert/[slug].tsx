import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import QRCode from 'qrcode.react'; // install with `npm i qrcode.react`

type COA = {
id: string;
comic_title: string;
signed_by: string;
qr_id: string;
};

export default function COAPage() {
const router = useRouter();
const { slug } = router.query;

const [coa, setCoa] = useState<COA | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
if (!slug) return;

```
async function fetchCoa() {
  setLoading(true);
  const { data, error } = await supabase
    .from<COA>('signatures')
    .select('*')
    .eq('qr_id', slug)
    .single();

  if (error) {
    console.error(error);
    setError('COA not found');
    setCoa(null);
  } else {
    setCoa(data);
    setError(null);
  }
  setLoading(false);
}

fetchCoa();
```

}, [slug]);

if (loading) return <p>Loading COA...</p>;
if (error) return <p>{error}</p>;
if (!coa) return <p>No COA data available</p>;

// Construct the URL that the QR code will point to
const qrUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/cert/${coa.qr_id}`;

return (
<div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}> <h1>Certificate of Authenticity</h1> <p><strong>Comic:</strong> {coa.comic_title}</p> <p><strong>Signed by:</strong> {coa.signed_by}</p> <p><strong>QR ID:</strong> {coa.qr_id}</p>

```
  <div style={{ marginTop: '2rem' }}>
    <h2>Scan this QR code:</h2>
    <QRCode value={qrUrl} size={200} />
  </div>
</div>
```

);
}
