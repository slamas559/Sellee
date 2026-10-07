"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { compareNames } from "@/lib/name-match";
import {
  ALLOWED_VERIFICATION_IMAGE_TYPES,
  ID_DOCUMENT_TYPES,
  MAX_VERIFICATION_IMAGE_BYTES,
  VERIFICATION_BUCKET,
  type IdDocumentType,
  type IdSubmissionPublic,
} from "@/lib/verification-constants";

type IdVerificationCardProps = {
  submission: IdSubmissionPublic | null;
  // Name the bank returned for the vendor's payout account, if any.
  payoutAccountName: string | null;
};

type UploadKind = "id" | "selfie";

// Literal env references so Next inlines them into the browser bundle.
function getBrowserStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function validateImage(file: File): string | null {
  if (!(ALLOWED_VERIFICATION_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Use a JPG, PNG or WebP image.";
  }
  if (file.size > MAX_VERIFICATION_IMAGE_BYTES) {
    return "Image is too large. Max 5MB.";
  }
  return null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function PhotoPicker(props: {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  capture?: "user";
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  const previewUrl = useMemo(() => (props.file ? URL.createObjectURL(props.file) : null), [props.file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-2">
      <label htmlFor={props.id} className="block text-sm font-medium text-slate-700">
        {props.label}
      </label>
      <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-slate-200 text-xs text-slate-500">
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">{props.hint}</p>
          <input
            id={props.id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture={props.capture}
            disabled={props.disabled}
            onChange={(event) => props.onChange(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700 disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}

export function IdVerificationCard({ submission, payoutAccountName }: IdVerificationCardProps) {
  const router = useRouter();

  const [documentType, setDocumentType] = useState<IdDocumentType | "">("");
  const [fullName, setFullName] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = stage !== "idle";

  const nameHint = useMemo(() => {
    if (!payoutAccountName || fullName.trim().split(/\s+/).length < 2) return null;
    return compareNames(fullName, payoutAccountName);
  }, [fullName, payoutAccountName]);

  const canSubmit = Boolean(documentType) && fullName.trim().split(/\s+/).length >= 2 && Boolean(idFile) && Boolean(selfieFile) && !busy;

  function handleFile(kind: UploadKind, file: File | null) {
    setError(null);
    if (file) {
      const problem = validateImage(file);
      if (problem) {
        setError(problem);
        return;
      }
    }
    if (kind === "id") setIdFile(file);
    else setSelfieFile(file);
  }

  async function uploadPhoto(kind: UploadKind, file: File): Promise<string> {
    const storage = getBrowserStorageClient();
    if (!storage) throw new Error("Uploads aren't configured. Please contact support.");

    const response = await fetch("/api/vendor/verification/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, content_type: file.type }),
    });
    const payload = (await response.json()) as { path?: string; token?: string; error?: string };
    if (!response.ok || !payload.path || !payload.token) {
      throw new Error(payload.error ?? "Could not start the upload.");
    }

    const { error: uploadError } = await storage.storage
      .from(VERIFICATION_BUCKET)
      .uploadToSignedUrl(payload.path, payload.token, file, { contentType: file.type });
    if (uploadError) {
      throw new Error("Upload failed. Check your connection and try again.");
    }

    return payload.path;
  }

  async function handleSubmit() {
    if (!canSubmit || !idFile || !selfieFile || !documentType) return;

    setError(null);
    setStage("uploading");

    try {
      const idPath = await uploadPhoto("id", idFile);
      const selfiePath = await uploadPhoto("selfie", selfieFile);

      setStage("submitting");
      const response = await fetch("/api/vendor/verification/id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: documentType,
          id_full_name: fullName.trim(),
          id_path: idPath,
          selfie_path: selfiePath,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not submit your ID.");
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    } finally {
      setStage("idle");
    }
  }

  if (submission?.status === "pending") {
    return (
      <div id="id-verification" className="scroll-mt-24 rounded-lg border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
        <h2 className="text-lg font-black tracking-tight text-slate-900">ID under review</h2>
        <p className="mt-1 text-sm text-slate-600">
          You submitted your ID on {formatDate(submission.created_at)}. We&apos;ll update this page once it&apos;s been reviewed.
          You don&apos;t need to do anything else.
        </p>
      </div>
    );
  }

  if (submission?.status === "approved") {
    return (
      <div id="id-verification" className="scroll-mt-24 rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
        <h2 className="text-lg font-black tracking-tight text-slate-900">ID approved</h2>
        <p className="mt-1 text-sm text-slate-600">
          Your identity was confirmed{submission.reviewed_at ? ` on ${formatDate(submission.reviewed_at)}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div id="id-verification" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-black tracking-tight text-slate-900">
        {submission?.status === "rejected" ? "Resubmit your ID" : "Submit your ID"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Upload a clear photo of a government-issued ID and a selfie holding it. Only our review team can see these.
      </p>

      {submission?.status === "rejected" ? (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Your last submission was rejected{submission.rejection_reason ? `: ${submission.rejection_reason}` : "."}
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="id-document-type" className="block text-sm font-medium text-slate-700">
              ID type
            </label>
            <select
              id="id-document-type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as IdDocumentType | "")}
              disabled={busy}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
            >
              <option value="">Select ID type</option>
              {ID_DOCUMENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="id-full-name" className="block text-sm font-medium text-slate-700">
              Full name on your ID
            </label>
            <input
              id="id-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="As printed on the ID"
              disabled={busy}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
            />
          </div>
        </div>

        {nameHint === "match" ? (
          <p className="text-sm text-emerald-700">This matches the name on your payout account.</p>
        ) : null}
        {nameHint === "partial" || nameHint === "mismatch" ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This doesn&apos;t fully match your payout account name ({payoutAccountName}). The names must belong to the same
            person or business, or your verification may be rejected.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <PhotoPicker
            id="id-photo"
            label="Photo of your ID"
            hint="Front of the ID. All four corners visible, no glare."
            file={idFile}
            disabled={busy}
            onChange={(file) => handleFile("id", file)}
          />
          <PhotoPicker
            id="selfie-photo"
            label="Selfie holding your ID"
            hint="Your face and the ID clearly visible together."
            file={selfieFile}
            capture="user"
            disabled={busy}
            onChange={(file) => handleFile("selfie", file)}
          />
        </div>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {stage === "uploading" ? "Uploading photos..." : stage === "submitting" ? "Submitting..." : "Submit for review"}
        </button>
      </div>
    </div>
  );
}
