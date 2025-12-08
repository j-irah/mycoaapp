// pages/admin/create.tsx
import React, { useState, useRef, FormEvent } from "react";
import Head from "next/head";

const API_ROUTE = "/api/admin/create-coa"; 
// ⬆️ CHANGE THIS IF NEEDED to match your existing API endpoint.

const CreateCoaPage: React.FC = () => {
  const [comicTitle, setComicTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [signedLocation, setSignedLocation] = useState("");
  const [witnessedBy, setWitnessedBy] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError(null);
    setSuccess(null);

    if (!comicTitle.trim()) {
      setError("Comic title is required.");
      return;
    }

    if (!issueNumber.trim()) {
      setError("Issue number is required.");
      return;
    }

    if (!signedBy.trim()) {
      setError("Signed by is required.");
      return;
    }

    if (!file) {
      setError("Please upload an image for the COA.");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("comic_title", comicTitle.trim());
      formData.append("issue_number", issueNumber.trim());
      formData.append("signed_by", signedBy.trim());
      formData.append("signed_date", signedDate);
      formData.append("signed_location", signedLocation.trim());
      formData.append("witnessed_by", witnessedBy.trim());
      formData.append("file", file);

      const res = await fetch(API_ROUTE, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          data?.error || data?.message || `Request failed with status ${res.status}`;
        throw new Error(message);
      }

      // If your API returns JSON with details, you can read it here if needed
      // const created = await res.json();

      // Reset controlled fields
      setComicTitle("");
      setIssueNumber("");
      setSignedBy("");
      setSignedDate("");
      setSignedLocation("");
      setWitnessedBy("");
      setFile(null);

      // Reset file input element safely (no optional chaining on LHS!)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccess("COA created successfully.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create COA.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin – Create COA</title>
      </Head>

      <main className="min-h-screen bg-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold mb-6">Create New COA</h1>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-lg bg-white p-6 shadow-sm border border-slate-200"
          >
            {/* Comic Title */}
            <div>
              <label
                htmlFor="comic_title"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Comic Title *
              </label>
              <input
                id="comic_title"
                type="text"
                value={comicTitle}
                onChange={(e) => setComicTitle(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Amazing Spider-Man"
              />
            </div>

            {/* Issue Number */}
            <div>
              <label
                htmlFor="issue_number"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Issue Number *
              </label>
              <input
                id="issue_number"
                type="text"
                value={issueNumber}
                onChange={(e) => setIssueNumber(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>

            {/* Signed By */}
            <div>
              <label
                htmlFor="signed_by"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Signed By *
              </label>
              <input
                id="signed_by"
                type="text"
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Stan Lee"
              />
            </div>

            {/* Signed Date */}
            <div>
              <label
                htmlFor="signed_date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Signed Date
              </label>
              <input
                id="signed_date"
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Signed Location */}
            <div>
              <label
                htmlFor="signed_location"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Signed Location
              </label>
              <input
                id="signed_location"
                type="text"
                value={signedLocation}
                onChange={(e) => setSignedLocation(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="New York Comic Con"
              />
            </div>

            {/* Witnessed By */}
            <div>
              <label
                htmlFor="witnessed_by"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Witnessed By
              </label>
              <input
                id="witnessed_by"
                type="text"
                value={witnessedBy}
                onChange={(e) => setWitnessedBy(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Witness name (optional)"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label
                htmlFor="coa-image-input"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                COA Image *
              </label>
              <input
                id="coa-image-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-700"
              />
              <p className="mt-1 text-xs text-slate-500">
                Upload the scan/photo of the signed comic for this COA.
              </p>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isSubmitting ? "Creating COA…" : "Create COA"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
};

export default CreateCoaPage;
