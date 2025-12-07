// @ts-nocheck

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const BUCKET_NAME = 'coa-images'; // change if your bucket name is different

export default function UploadImagePage() {
  const [qrId, setQrId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!qrId) {
      setError('Please enter a QR ID.');
      return;
    }

    if (!file) {
      setError('Please choose an image file.');
      return;
    }

    try {
      setUploading(true);

      // Build a unique path for the file in the bucket
      const ext = file.name.split('.').pop();
      const filePath = `signatures/${qrId}-${Date.now()}.${ext}`;

      // 1) Upload to Supabase Storage (public bucket)
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        setError('Error uploading file to storage.');
        setUploading(false);
        return;
      }

      // 2) Get public URL for the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        setError('Could not get public URL for uploaded image.');
        setUploading(false);
        return;
      }

      // 3) Call API to update the COA record with this image_url
      const res = await fetch('/api/update-coa-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_id: qrId,
          image_url: publicUrl,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error(result);
        setError(result.error || 'Error updating COA with image URL.');
        setUploading(false);
        return;
      }

      setMessage('Image uploaded and COA updated successfully!');
      setFile(null);
    } catch (err) {
      console.error(err);
      setError('Unexpected error during upload.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'Arial, sans-serif',
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      <h1>Upload COA Image</h1>
      <p>
        Enter the <strong>QR ID</strong> for the COA, then choose an image to upload.
        The image will be stored in Supabase Storage and linked to that COA.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            QR ID:
            <input
              type="text"
              value={qrId}
              onChange={(e) => setQrId(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem',
                marginTop: '0.25rem',
              }}
              placeholder="Enter QR ID (e.g., slug from signatures.qr_id)"
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Image file:
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: 'block', marginTop: '0.25rem' }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={uploading}
          style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}
        >
          {uploading ? 'Uploading...' : 'Upload & Attach'}
        </button>
      </form>

      {message && (
        <p style={{ color: 'green', marginTop: '1rem' }}>
          {message}
        </p>
      )}
      {error && (
        <p style={{ color: 'red', marginTop: '1rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
