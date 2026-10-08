// lib/verification-constants.ts
//
// Pure constants + types shared by server code and client components.
// Keep server-only imports (supabase admin etc.) OUT of this file.

export const VERIFICATION_BUCKET = "vendor-verification-docs";

export const ID_DOCUMENT_TYPES = [
  { value: "nin", label: "NIN slip or card" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "voters_card", label: "Voter's card" },
  { value: "intl_passport", label: "International passport" },
] as const;

export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number]["value"];

export const ID_DOCUMENT_TYPE_VALUES = ID_DOCUMENT_TYPES.map((item) => item.value) as [
  IdDocumentType,
  ...IdDocumentType[],
];

// ID photo retention (see supabase/verification-retention.sql).
export const REJECTED_PHOTO_RETENTION_DAYS = 30;
export const DELETED_ACCOUNT_PHOTO_RETENTION_DAYS = 730;

export type VerificationStatus = "pending" | "approved" | "rejected";

export const ALLOWED_VERIFICATION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_VERIFICATION_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Safe-for-the-browser shape: never includes storage paths.
export type IdSubmissionPublic = {
  id: string;
  status: VerificationStatus;
  document_type: IdDocumentType | null;
  id_full_name: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};
