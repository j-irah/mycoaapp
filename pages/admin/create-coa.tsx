// @ts-nocheck

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';

const BUCKET_NAME = 'coa-images'; // change if your bucket name is different

export default function CreateCOAPage() {
  const [comicTitle, setComicTitle] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [signedBy, setSignedBy] = useState('');
  const [signedDate, setSignedDate] = useState('');
  const [signedLocation, setSignedLocation] = useState('');
  const [witnessedBy, setWitnessedBy] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCoa, setCreatedCoa] = useState<any | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setCreatedCoa(null);

    if (!comicTitle || !issueNumber || !signedBy) {
      setError('comic_title, issue_number, and signed_by are required.');
      return;
    }

    if (!file) {
      setError('Please choose an image file for the COA.');
      return;
    }

    try {
      setSubmitting(true);

      // 1) Upload image to Supabase Storage
      const ext = file.name.split('.').pop();
      const filePath = `signatures/${comicTitle.trim().replace(/\s+/g, '-')}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        setError('Error uploading file to storage: ' + uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData?.publicUrl;

      if (!imageUrl) {
        setError('Could not get public URL for uploaded image.');
        setSubmitting(false);
        return;
      }

      // 2) Call API to create COA row with all details + image_url
      const res = await fetch('/api/create-coa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comic_title: comicTitle,
          issue_number: issueNumber,
          signed_by: signedBy,
          signed_date: signedDate,
          signed_location: signedLocation,
          witnessed_by: witnessedBy,
          image_url: imageUrl,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error(result);
        setError(result.error || 'Error creating COA.');
        setSubmitting(false);
        return;
      }

      setCreatedCoa(result);
      setMessage('COA created successfully!');
      // Optionally clear form for next entry:
      // setComicTitle('');
      // setIssueNumber('');
      // setSignedBy('');
      // setSignedDate('');
      // setSignedLocation('');
      // setWitnessedBy('');
      // setFile(null);
    } catch (err) {
      console.error(err);
      setError('Unexpected error creating COA.');
    } finally {
      setSubmitting(false);
    }
  }

  const qrUrl =
    createdCoa && createdCoa.qr_id
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/cert/${createdCoa.qr_id}`
      : '';

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'Arial, sans-serif',
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      <h1>Create New COA</h1>
      <p>
        Fill out the comic details, choose an image, and submit. This will:
      </p>
      <ul>
        <li>Upload the image to Supabase Storage</li>
        <li>Create a COA row in Supabase</li>
        <li>Generate a QR ID and link it to the COA</li>
      </ul>

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Comic Title:
            <input
              type="text"
              value={comicTitle}
              onChange={(e) => setComicTitle(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              placeholder="e.g., Venom"
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Issue Number:
            <input
              type="text"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              placeholder="e.g., 7"
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Signed By:
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              placeholder="e.g., Clayton Crain"
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Signed Date:
            <input
              type="date"
              value={signedDate}
              onChange={(e) => setSignedDate(e.target.value)}
              style={{ display: 'block', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Signed Location:
            <input
              type="text"
              value={signedLocation}
              onChange={(e) => setSignedLocation(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              placeholder="e.g., FanExpo Boston"
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Witnessed By:
            <input
              type="text"
              value={witnessedBy}
              onChange={(e) => setWitnessedBy(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              placeholder="e.g., Metaverse Comics"
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            COA Image:
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
          disabled={submitting}
          style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}
        >
          {submitting ? 'Creating COA...' : 'Create COA'}
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

      {createdCoa && (
        <div
          style={{
            marginTop: '2rem',
            borderTop: '1px solid #ccc',
            paddingTop: '1rem',
          }}
        >
          <h2>COA Created</h2>

          {createdCoa.image_url && (
            <div style={{ margin: '1rem 0' }}>
              <img
                src={createdCoa.image_url}
                alt={`${createdCoa.comic_title} cover`}
                style={{
                  maxWidth: '250px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
              />
            </div>
          )}

          <p>
            <strong>Title:</strong> {createdCoa.comic_title}
          </p>
          <p>
            <strong>Issue #:</strong> {createdCoa.issue_number}
          </p>
          <p>
            <strong>Signed by:</strong> {createdCoa.signed_by}
          </p>
          <p>
            <strong>Signed date:</strong> {createdCoa.signed_date}
          </p>
          <p>
            <strong>Signed location:</strong> {createdCoa.signed_location}
          </p>
          <p>
            <strong>Witnessed by:</strong> {createdCoa.witnessed_by}
          </p>
          <p>
            <strong>QR ID:</strong> {createdCoa.qr_id}
          </p>

          {qrUrl && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3>QR code:</h3>
              <QRCodeCanvas value={qrUrl} size={200} />
              <p style={{ marginTop: '0.5rem' }}>
                This links to: <code>{qrUrl}</code>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
