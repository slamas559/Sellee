"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { AiRefineButton } from "@/components/ai/ai-refine-button";
import {
  DEFAULT_STOREFRONT_CONFIG,
  DEFAULT_STOREFRONT_SECTIONS_ORDER,
  STOREFRONT_TEMPLATE_OPTIONS,
  STOREFRONT_THEME_PRESETS,
  normalizeStoreTemplate,
  normalizeStorefrontConfig,
  normalizeThemePreset,
} from "@/lib/storefront";
import type { StoreRecord, StoreTemplate, StorefrontSectionId } from "@/types";

type StoreSetupFormProps = {
  initialStore: StoreRecord | null;
};

type UploadKind = "logo" | "hero" | "banner";

type UploadState = {
  isUploading: boolean;
  progress: number;
  fileName: string | null;
  error: string | null;
};

type NicheOption = {
  id: string;
  slug: string;
  name: string;
  categories: Array<{ id: string; slug: string; name: string }>;
};

type MeResponse = {
  user?: { phone?: string | null };
};

type VerificationChallenge = { id: string; command: string; wa_link: string | null };

const INITIAL_UPLOAD_STATE: UploadState = {
  isUploading: false,
  progress: 0,
  fileName: null,
  error: null,
};

const SECTION_LABELS: Record<StorefrontSectionId, string> = {
  featured_products: "Featured products",
  promo_strip: "Promo strip",
  reviews: "Reviews",
};

// ─── Template visual card ──────────────────────────────────────────────────

function TemplateCard({
  option,
  selected,
  onSelect,
}: {
  option: (typeof STOREFRONT_TEMPLATE_OPTIONS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex-shrink-0 snap-start rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? "border-emerald-500 bg-emerald-50 shadow-md"
          : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
      } min-w-[200px] max-w-[240px] sm:min-w-[220px]`}
    >
      {/* Visual icon area */}
      <div className="mb-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50" style={{ height: 100 }}>
        {option.key === "grocery_promo" && (
          <div className="h-full w-full p-2" style={{ background: `linear-gradient(135deg, ${option.accent}15, ${option.accent}05)` }}>
            {/* Bold hero bar */}
            <div className="h-5 w-full rounded-md" style={{ backgroundColor: option.accent }} />
            {/* Product grid */}
            <div className="mt-2 grid grid-cols-3 gap-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 rounded-md bg-white shadow-sm" />
              ))}
            </div>
          </div>
        )}
        {option.key === "fashion_editorial" && (
          <div className="relative h-full w-full overflow-hidden bg-slate-900">
            {/* Dark full-bleed */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <div className="h-2 w-20 rounded bg-white/80" />
              <div className="mt-1 h-1.5 w-14 rounded bg-white/40" />
              <div className="mt-2 flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 flex-1 rounded-md bg-white/20" />
                ))}
              </div>
            </div>
          </div>
        )}
        {option.key === "lifestyle_showcase" && (
          <div className="grid h-full grid-cols-2 gap-1 p-2" style={{ background: `${option.accent}08` }}>
            {/* Split screen */}
            <div className="flex flex-col gap-1">
              <div className="h-3 w-12 rounded bg-slate-300" />
              <div className="h-2 w-10 rounded bg-slate-200" />
              <div className="mt-auto h-5 w-14 rounded-full" style={{ backgroundColor: option.accent }} />
            </div>
            <div className="overflow-hidden rounded-xl" style={{ backgroundColor: `${option.accent}20` }}>
              <div className="h-full w-full rounded-xl bg-gradient-to-br from-transparent to-white/40" />
            </div>
          </div>
        )}
        {option.key === "modern_grid" && (
          <div className="grid h-full grid-cols-[40px_1fr] gap-1 p-2" style={{ backgroundColor: `${option.accent}08` }}>
            {/* Sidebar + grid */}
            <div className="flex flex-col gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-2.5 rounded" style={{ backgroundColor: i === 0 ? option.accent : "#e2e8f0" }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-md bg-white shadow-sm" />
              ))}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="h-3 w-3"><path d="m5 12 5 5 9-9" /></svg>
        </div>
      )}

      <p className="text-sm font-bold text-slate-900">{option.label}</p>
      <p className="mt-0.5 text-xs leading-4 text-slate-500">{option.description}</p>
    </button>
  );
}

// ─── Theme colour card ─────────────────────────────────────────────────────

function ThemeCard({
  preset,
  selected,
  onSelect,
}: {
  preset: (typeof STOREFRONT_THEME_PRESETS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex-shrink-0 snap-start rounded-xl border-2 p-2.5 text-left transition-all ${
        selected ? "border-emerald-500 shadow-md" : "border-slate-200 hover:border-slate-300"
      } min-w-[100px]`}
    >
      {/* Colour swatches */}
      <div className="flex gap-1.5">
        <span className="h-7 w-7 rounded-full border border-white shadow-sm" style={{ backgroundColor: preset.primary }} />
        <span className="h-7 w-7 rounded-full border border-white shadow-sm" style={{ backgroundColor: preset.accent }} />
        <span className="h-7 w-7 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: preset.surface }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-700">{preset.label}</p>
      {selected && (
        <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="h-2.5 w-2.5"><path d="m5 12 5 5 9-9" /></svg>
        </div>
      )}
    </button>
  );
}

// ─── Upload dropzone ────────────────────────────────────────────────────────

function UploadDropzone({
  title,
  hint,
  onFile,
  state,
  previewUrl,
}: {
  title: string;
  hint: string;
  onFile: (file: File) => void;
  state: UploadState;
  previewUrl?: string;
}) {
  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) onFile(file);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file) onFile(file);
  }

  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm transition hover:border-emerald-400 hover:bg-emerald-50/30"
    >
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <Image src={previewUrl} alt="preview" fill className="object-cover" sizes="56px" unoptimized />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6"><path d="M4 16l4-4 4 4 4-8 4 6" /><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-slate-700">{title}</p>
          <p className="text-xs text-slate-500">{hint}</p>
          {state.fileName && !state.isUploading && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-emerald-700">{state.fileName} ✓</p>
          )}
        </div>
      </div>
      <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
      {state.isUploading ? (
        <div>
          <div className="h-1.5 w-full rounded-full bg-slate-200">
            <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${state.progress}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{state.progress}% uploading…</p>
        </div>
      ) : null}
      {state.error ? <p className="text-[11px] font-medium text-red-600">{state.error}</p> : null}
    </label>
  );
}

// ─── Step section wrapper ──────────────────────────────────────────────────

function StepSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">{step}</span>
        <div>
          <p className="font-semibold text-slate-900 sm:text-base">{title}</p>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────

export function StoreSetupForm({ initialStore }: StoreSetupFormProps) {
  const initialConfig = normalizeStorefrontConfig(initialStore?.storefront_config);
  const [store, setStore] = useState<StoreRecord | null>(initialStore);
  const [draggedSection, setDraggedSection] = useState<StorefrontSectionId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [secondaryBannerFile, setSecondaryBannerFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<Record<UploadKind, UploadState>>({
    logo: { ...INITIAL_UPLOAD_STATE },
    hero: { ...INITIAL_UPLOAD_STATE },
    banner: { ...INITIAL_UPLOAD_STATE },
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showVendorSuccessBanner, setShowVendorSuccessBanner] = useState(false);
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [nicheOptions, setNicheOptions] = useState<NicheOption[]>([]);
  const [showCustomNicheInput, setShowCustomNicheInput] = useState(false);
  const [customNicheInput, setCustomNicheInput] = useState("");
  const [isLoadingNiches, setIsLoadingNiches] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"number" | "command" | null>(null);

  const [form, setForm] = useState({
    name: initialStore?.name ?? "",
    whatsapp_number: initialStore?.whatsapp_number ?? "",
    address_line1: initialStore?.address_line1 ?? "",
    city: initialStore?.city ?? "",
    state: initialStore?.state ?? "",
    country: initialStore?.country ?? "Nigeria",
    latitude: initialStore?.latitude?.toString() ?? "",
    longitude: initialStore?.longitude?.toString() ?? "",
    location_source: initialStore?.location_source ?? "manual",
    store_template: normalizeStoreTemplate(initialStore?.store_template),
    store_theme_preset: normalizeThemePreset(initialStore?.store_theme_preset),
    theme_color: initialStore?.theme_color ?? "#059669",
    logo_url: initialStore?.logo_url ?? "",
    is_active: initialStore?.is_active ?? true,
    hero_title: initialConfig.hero_title,
    hero_subtitle: initialConfig.hero_subtitle,
    hero_cta_text: initialConfig.hero_cta_text,
    hero_image_url: initialConfig.hero_image_url,
    promo_text: initialConfig.promo_text,
    secondary_banner_url: initialConfig.secondary_banner_url,
    banner_urls: initialConfig.banner_urls,
    sections_order: initialConfig.sections_order ?? DEFAULT_STOREFRONT_SECTIONS_ORDER,
    niche_ids: initialStore?.niche_ids ?? [],
    custom_niches: initialStore?.custom_niches ?? [],
  });

  const shareablePath = store?.slug ? `/store/${store.slug}` : null;
  const hasCoordinates = Boolean(form.latitude && form.longitude);
  const shouldPrefillAccountPhone = !initialStore?.whatsapp_number?.trim();
  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.trim() ?? "";
  const displayBotNumber = botNumber ? (botNumber.startsWith("+") ? botNumber : `+${botNumber}`) : "Sellee WhatsApp bot";

  // Live preview URLs
  const previewLogoUrl = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return form.logo_url;
  }, [logoFile, form.logo_url]);

  const previewHeroUrl = useMemo(() => {
    if (heroImageFile) return URL.createObjectURL(heroImageFile);
    return form.hero_image_url;
  }, [heroImageFile, form.hero_image_url]);

  const previewBannerUrl = useMemo(() => {
    if (secondaryBannerFile) return URL.createObjectURL(secondaryBannerFile);
    return form.banner_urls[0] ?? form.secondary_banner_url;
  }, [secondaryBannerFile, form.banner_urls, form.secondary_banner_url]);

  const isAnyUploading = Object.values(uploadState).some((s) => s.isUploading);

  const selectedAllNicheNames = useMemo(() => {
    const fromIds = nicheOptions.filter((n) => form.niche_ids.includes(n.id)).map((n) => n.name);
    return [...fromIds, ...form.custom_niches];
  }, [form.niche_ids, form.custom_niches, nicheOptions]);

  useEffect(() => {
    let ignore = false;
    async function loadCatalog() {
      setIsLoadingNiches(true);
      try {
        const response = await fetch("/api/catalog", { cache: "no-store" });
        const payload = (await response.json()) as { niches?: NicheOption[] };
        if (!response.ok || ignore) return;
        setNicheOptions(payload.niches ?? []);
      } catch {
        if (!ignore) setNicheOptions([]);
      } finally {
        if (!ignore) setIsLoadingNiches(false);
      }
    }
    void loadCatalog();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!shouldPrefillAccountPhone) return;
    let ignore = false;
    async function loadAccountPhone() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const payload = (await response.json()) as MeResponse;
        if (!response.ok || ignore) return;
        const phone = payload.user?.phone?.trim();
        if (!phone) return;
        setForm((prev) => (prev.whatsapp_number.trim() ? prev : { ...prev, whatsapp_number: phone }));
      } catch {}
    }
    void loadAccountPhone();
    return () => { ignore = true; };
  }, [shouldPrefillAccountPhone]);

  useEffect(() => {
    if (!message && !error) return;
    const timeout = setTimeout(() => { setMessage(null); setError(null); }, 5000);
    return () => clearTimeout(timeout);
  }, [message, error]);

  function updateFormField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function startVerification() {
    setVerifyError(null); setVerifyMessage(null);
    try {
      const response = await fetch("/api/vendor/whatsapp-verification/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: form.whatsapp_number }) });
      const payload = (await response.json()) as { error?: string; challenge?: VerificationChallenge };
      if (!response.ok || !payload.challenge) { setVerifyError(payload.error ?? "Could not start verification."); return; }
      setChallenge(payload.challenge); setVerifyMessage("Choose either option below to verify your store number.");
    } catch { setVerifyError("Network error while starting verification."); }
  }

  async function checkVerificationStatus() {
    if (!challenge?.id) return;
    setIsCheckingVerification(true);
    setVerifyError(null);
    try {
      const response = await fetch(
        `/api/vendor/whatsapp-verification/status?challenge_id=${challenge.id}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        error?: string;
        status?: { status: "pending" | "completed" | "expired" | "cancelled" };
      };
      if (!response.ok) {
        setVerifyError(payload.error ?? "Could not check verification status.");
        return;
      }

      const status = payload.status?.status;
      if (status === "completed") {
        setChallenge(null);
        setVerifyMessage("Your store's WhatsApp number is verified.");
        setStore((prev) => prev ? {
          ...prev,
          whatsapp_verified_at: new Date().toISOString(),
          whatsapp_number: form.whatsapp_number,
        } : prev);
        return;
      }
      if (status === "expired") {
        setChallenge(null);
        setVerifyError('Verification code expired. Click "Verify Now" to try again.');
        return;
      }
      setVerifyMessage("Not verified yet. Send the VERIFY command in WhatsApp, then check again.");
    } catch {
      setVerifyError("Network error while checking verification status.");
    } finally {
      setIsCheckingVerification(false);
    }
  }

  async function copyToClipboard(value: string, kind: "number" | "command") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setVerifyError("Could not copy. Please select and copy it manually.");
    }
  }

  function updateUpload(kind: UploadKind, patch: Partial<UploadState>) {
    setUploadState((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));
  }

  function pushBannerUrl(url: string) {
    const normalized = url.trim();
    if (!normalized) return;
    setForm((prev) => {
      const next = Array.from(new Set([normalized, ...prev.banner_urls])).slice(0, 8);
      return { ...prev, banner_urls: next, secondary_banner_url: next[0] ?? prev.secondary_banner_url };
    });
  }

  function removeBannerUrl(url: string) {
    setForm((prev) => {
      const next = prev.banner_urls.filter((item) => item !== url);
      return { ...prev, banner_urls: next, secondary_banner_url: next[0] ?? "" };
    });
  }

  function applyThemePreset(key: (typeof form)["store_theme_preset"]) {
    const nextTheme = STOREFRONT_THEME_PRESETS.find((p) => p.key === key) ?? STOREFRONT_THEME_PRESETS[0];
    setForm((prev) => ({ ...prev, store_theme_preset: nextTheme.key, theme_color: nextTheme.primary }));
  }

  function addCustomNiche() {
    const name = customNicheInput.trim();
    if (!name) return;
    setForm((prev) => ({ ...prev, custom_niches: Array.from(new Set([...prev.custom_niches, name])).slice(0, 8) }));
    setCustomNicheInput("");
  }

  function moveSectionByDrag(target: StorefrontSectionId) {
    if (!draggedSection || draggedSection === target) return;
    setForm((prev) => {
      const next = [...prev.sections_order];
      const from = next.indexOf(draggedSection);
      const to = next.indexOf(target);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, draggedSection);
      return { ...prev, sections_order: next };
    });
  }

  async function uploadAsset(kind: UploadKind, file: File) {
    if (kind === "logo") setLogoFile(file);
    if (kind === "hero") setHeroImageFile(file);
    if (kind === "banner") setSecondaryBannerFile(file);

    updateUpload(kind, { isUploading: true, progress: 0, fileName: file.name, error: null });

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      const body = new FormData();
      body.append("kind", kind);
      body.append("file", file);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        updateUpload(kind, { progress: Math.max(1, Math.round((event.loaded / event.total) * 100)) });
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;
        let payload: { url?: string; error?: string } = {};
        try { payload = JSON.parse(xhr.responseText); } catch {}

        if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
          if (kind === "logo") updateFormField("logo_url", payload.url);
          if (kind === "hero") updateFormField("hero_image_url", payload.url);
          if (kind === "banner") pushBannerUrl(payload.url);
          updateUpload(kind, { isUploading: false, progress: 100, error: null });
          setMessage(`${kind} image uploaded.`);
        } else {
          updateUpload(kind, { isUploading: false, error: payload.error ?? `Upload failed (${xhr.status}).` });
        }
        resolve();
      };

      xhr.onerror = () => { updateUpload(kind, { isUploading: false, error: "Network error." }); resolve(); };
      xhr.open("POST", "/api/stores/upload");
      xhr.send(body);
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setError("Geolocation is not supported."); return; }
    setIsDetectingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        try {
          const response = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`, { cache: "no-store" });
          if (response.ok) {
            const payload = (await response.json()) as { location?: { street?: string | null; city?: string | null; state?: string | null; country?: string | null } };
            setForm((prev) => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              location_source: "gps",
              address_line1: payload.location?.street?.trim() || prev.address_line1,
              city: payload.location?.city?.trim() || prev.city,
              state: payload.location?.state?.trim() || prev.state,
              country: payload.location?.country?.trim() || prev.country,
            }));
            const locationLabel = [payload.location?.city, payload.location?.state].filter(Boolean).join(", ") || "your location";
            setMessage(`Location detected: ${locationLabel}.`);
          } else {
            setForm((prev) => ({ ...prev, latitude: lat, longitude: lng, location_source: "gps" }));
            setMessage("Coordinates saved.");
          }
        } catch {
          setForm((prev) => ({ ...prev, latitude: lat, longitude: lng, location_source: "gps" }));
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => { setError("Could not detect location. Enter manually."); setIsDetectingLocation(false); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isAnyUploading) { setError("Please wait for uploads to complete."); return; }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    setShowVendorSuccessBanner(false);

    const parsedLatitude = form.latitude.trim() ? Number.parseFloat(form.latitude) : null;
    const parsedLongitude = form.longitude.trim() ? Number.parseFloat(form.longitude) : null;

    if ((parsedLatitude === null) !== (parsedLongitude === null)) {
      setError("Enter both latitude and longitude, or leave both empty.");
      setIsSaving(false); return;
    }

    if (form.niche_ids.length === 0 && form.custom_niches.length === 0) {
      setError("Select at least one niche for your store.");
      setIsSaving(false); return;
    }

    const storefrontConfig = normalizeStorefrontConfig({
      hero_title: form.hero_title || DEFAULT_STOREFRONT_CONFIG.hero_title,
      hero_subtitle: form.hero_subtitle || DEFAULT_STOREFRONT_CONFIG.hero_subtitle,
      hero_cta_text: form.hero_cta_text || DEFAULT_STOREFRONT_CONFIG.hero_cta_text,
      hero_image_url: form.hero_image_url || "",
      promo_text: form.promo_text || DEFAULT_STOREFRONT_CONFIG.promo_text,
      secondary_banner_url: form.secondary_banner_url || "",
      banner_urls: form.banner_urls,
      sections_order: form.sections_order,
    });

    try {
      const body = new FormData();
      body.append("name", form.name);
      body.append("whatsapp_number", form.whatsapp_number);
      body.append("address_line1", form.address_line1);
      body.append("city", form.city);
      body.append("state", form.state);
      body.append("country", form.country);
      body.append("latitude", parsedLatitude !== null ? String(parsedLatitude) : "");
      body.append("longitude", parsedLongitude !== null ? String(parsedLongitude) : "");
      body.append("location_source", parsedLatitude !== null ? form.location_source : "");
      body.append("store_template", form.store_template);
      body.append("store_theme_preset", form.store_theme_preset);
      body.append("theme_color", form.theme_color);
      body.append("logo_url", form.logo_url);
      body.append("is_active", String(form.is_active));
      body.append("storefront_config", JSON.stringify(storefrontConfig));
      body.append("niche_ids", JSON.stringify(form.niche_ids));
      body.append("custom_niches", JSON.stringify(form.custom_niches));

      const response = await fetch("/api/stores", { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) { setError(payload.error ?? "Could not save store."); setIsSaving(false); return; }

      const nextStore = payload.store as StoreRecord;
      const nextConfig = normalizeStorefrontConfig(nextStore.storefront_config);
      setStore(nextStore);
      setForm({
        name: nextStore.name,
        whatsapp_number: nextStore.whatsapp_number,
        address_line1: nextStore.address_line1 ?? "",
        city: nextStore.city ?? "",
        state: nextStore.state ?? "",
        country: nextStore.country ?? "Nigeria",
        latitude: nextStore.latitude?.toString() ?? "",
        longitude: nextStore.longitude?.toString() ?? "",
        location_source: nextStore.location_source ?? "manual",
        store_template: normalizeStoreTemplate(nextStore.store_template),
        store_theme_preset: normalizeThemePreset(nextStore.store_theme_preset),
        theme_color: nextStore.theme_color ?? "#059669",
        logo_url: nextStore.logo_url ?? "",
        is_active: nextStore.is_active,
        hero_title: nextConfig.hero_title,
        hero_subtitle: nextConfig.hero_subtitle,
        hero_cta_text: nextConfig.hero_cta_text,
        hero_image_url: nextConfig.hero_image_url,
        promo_text: nextConfig.promo_text,
        secondary_banner_url: nextConfig.secondary_banner_url,
        banner_urls: nextConfig.banner_urls,
        sections_order: nextConfig.sections_order ?? DEFAULT_STOREFRONT_SECTIONS_ORDER,
        niche_ids: nextStore.niche_ids ?? [],
        custom_niches: nextStore.custom_niches ?? form.custom_niches,
      });
      setMessage(payload.action === "created" ? "Store created!" : "Store updated successfully.");
      setShowVendorSuccessBanner(Boolean(payload.became_vendor));
    } catch {
      setError("Network error while saving.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Store Setup</p>
          <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{store ? "Update your store" : "Set up your store"}</h2>
          <p className="mt-1 text-sm text-slate-500">Configure branding, template, content, and location.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
          <input type="checkbox" className="accent-emerald-600" checked={form.is_active} onChange={(e) => updateFormField("is_active", e.target.checked)} />
          Visible publicly
        </label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pb-24 sm:pb-0">
        {showVendorSuccessBanner && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">🎉 You are now a vendor!</div>
        )}

        {/* ── Step 1: Basics ─────────────────────────────────────── */}
        <StepSection step="1" title="Store basics" description="Name, WhatsApp number, logo and niches.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Store name <span className="text-red-500">*</span></span>
              <input required value={form.name} onChange={(e) => updateFormField("name", e.target.value)} placeholder="e.g. Moores Furniture" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
            </label>

            <div className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">WhatsApp number</span>
              <input
                required
                value={form.whatsapp_number}
                onChange={(e) => {
                  updateFormField("whatsapp_number", e.target.value);
                  setChallenge(null);
                  setVerifyMessage(null);
                  setVerifyError(null);
                }}
                placeholder="e.g. +2348012345678"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2"
              />
              {store?.whatsapp_verified_at && store.whatsapp_number === form.whatsapp_number ? (
                <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" /> Verified</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Not verified — orders will still work, but shoppers won&apos;t see a Verified badge on your store.</p>
                  <button type="button" onClick={() => void startVerification()} disabled={!store || !form.whatsapp_number.trim()} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">Verify Now</button>
                  {!store ? <p className="text-xs text-slate-500">Save your store first, then verify this number.</p> : null}
                </div>
              )}
              {challenge ? (
                <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-slate-700">
                  <p className="leading-5">Verify from the same WhatsApp number saved above. The easiest way is to open the bot with the command already filled in.</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {challenge.wa_link ? <a href={challenge.wa_link} target="_blank" rel="noreferrer" className="inline-flex justify-center rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-700">Open WhatsApp &amp; send</a> : null}
                    <span className="text-slate-500">or copy the details below.</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => void copyToClipboard(displayBotNumber, "number")} disabled={!botNumber} className="min-w-0 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">1. Bot number</span>
                      <span className="mt-0.5 block truncate font-semibold text-emerald-800">{copied === "number" ? "Copied!" : displayBotNumber}</span>
                    </button>
                    <button type="button" onClick={() => void copyToClipboard(challenge.command, "command")} className="min-w-0 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left transition hover:bg-emerald-50 cursor-pointer">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">2. Verify command</span>
                      <code className="mt-0.5 block truncate font-semibold text-emerald-800">{copied === "command" ? "Copied!" : challenge.command}</code>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void checkVerificationStatus()}
                    disabled={isCheckingVerification}
                    className="w-full cursor-pointer rounded-lg border border-emerald-300 bg-white px-3 py-2 text-center font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCheckingVerification ? "Checking..." : "I've sent it — check status"}
                  </button>
                  <p className="text-[11px] leading-4 text-slate-500">Open a chat with the Sellee bot, paste the command, then send it. Your store will be marked verified once the bot confirms it.</p>
                </div>
              ) : null}
              {verifyError ? <p className="text-xs text-red-700">{verifyError}</p> : null}
              {verifyMessage ? <p className="text-xs text-emerald-700">{verifyMessage}</p> : null}
            </div>

            {/* Logo */}
            <div className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Logo</span>
              <UploadDropzone
                title="Upload logo"
                hint="Square image · max 10 MB"
                onFile={(file) => void uploadAsset("logo", file)}
                state={uploadState.logo}
                previewUrl={previewLogoUrl || undefined}
              />
              <input value={form.logo_url} onChange={(e) => updateFormField("logo_url", e.target.value)} placeholder="Or paste logo URL…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 transition focus:ring-2" />
            </div>

            {/* Niches */}
            <div className="space-y-1.5 text-sm sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Store niches <span className="text-red-500">*</span></span>
                <span className="text-[11px] text-slate-400">{selectedAllNicheNames.length} selected</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                {isLoadingNiches ? (
                  <p className="text-xs text-slate-400">Loading niches…</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {nicheOptions.map((niche) => {
                      const sel = form.niche_ids.includes(niche.id);
                      return (
                        <button key={niche.id} type="button"
                          onClick={() => setForm((prev) => ({ ...prev, niche_ids: sel ? prev.niche_ids.filter((id) => id !== niche.id) : [...prev.niche_ids, niche.id].slice(0, 8) }))}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${sel ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 text-slate-700 hover:border-emerald-300"}`}
                        >{niche.name}</button>
                      );
                    })}
                    <button type="button" onClick={() => setShowCustomNicheInput((v) => !v)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${showCustomNicheInput ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-700 hover:border-amber-300"}`}
                    >Others</button>
                  </div>
                )}
                {showCustomNicheInput && (
                  <div className="mt-3 flex gap-2">
                    <input value={customNicheInput} onChange={(e) => setCustomNicheInput(e.target.value)} placeholder="Type custom niche" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-emerald-300 focus:ring-2" />
                    <button type="button" onClick={addCustomNiche} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Add</button>
                  </div>
                )}
                {form.custom_niches.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.custom_niches.map((n) => (
                      <button key={n} type="button" onClick={() => setForm((prev) => ({ ...prev, custom_niches: prev.custom_niches.filter((item) => item !== n) }))}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                      >{n} ×</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </StepSection>

        {/* ── Step 2: Template ───────────────────────────────────── */}
        <StepSection step="2" title="Storefront template" description="Choose the layout style for your public store page.">
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 touch-pan-x">
            {STOREFRONT_TEMPLATE_OPTIONS.map((option) => (
              <TemplateCard
                key={option.key}
                option={option}
                selected={form.store_template === option.key}
                onSelect={() => updateFormField("store_template", option.key)}
              />
            ))}
          </div>
        </StepSection>

        {/* ── Step 3: Colours ────────────────────────────────────── */}
        <StepSection step="3" title="Colour theme" description="Pick a preset or set a custom primary colour.">
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 touch-pan-x">
            {STOREFRONT_THEME_PRESETS.map((preset) => (
              <ThemeCard
                key={preset.key}
                preset={preset}
                selected={form.store_theme_preset === preset.key}
                onSelect={() => applyThemePreset(preset.key)}
              />
            ))}
          </div>
          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium text-slate-700">Custom primary colour</span>
            <div className="flex items-center gap-3">
              <input type="color" value={form.theme_color} onChange={(e) => updateFormField("theme_color", e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
              <input value={form.theme_color} onChange={(e) => updateFormField("theme_color", e.target.value)} className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono outline-none ring-emerald-300 transition focus:ring-2" />
            </div>
          </label>
        </StepSection>

        {/* ── Step 4: Content & media ────────────────────────────── */}
        <StepSection step="4" title="Content & media" description="Hero text, promo label, images and banners.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Hero title</span>
              <input value={form.hero_title} onChange={(e) => updateFormField("hero_title", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
            </label>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Hero subtitle</span>
              <textarea rows={2} value={form.hero_subtitle} onChange={(e) => updateFormField("hero_subtitle", e.target.value)} className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
              <AiRefineButton
                value={form.hero_subtitle}
                kind="store_hero_subtitle"
                onApply={(refined) => updateFormField("hero_subtitle", refined)}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">CTA button text</span>
              <input value={form.hero_cta_text} onChange={(e) => updateFormField("hero_cta_text", e.target.value)} placeholder="Shop now" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Promo label</span>
              <input value={form.promo_text} onChange={(e) => updateFormField("promo_text", e.target.value)} placeholder="e.g. Fresh picks this week" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
            </label>

            {/* Hero image upload */}
            <div className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Hero image</span>
              <UploadDropzone title="Upload hero image" hint="16:9 ratio · max 10 MB" onFile={(file) => void uploadAsset("hero", file)} state={uploadState.hero} previewUrl={previewHeroUrl || undefined} />
              <input value={form.hero_image_url} onChange={(e) => updateFormField("hero_image_url", e.target.value)} placeholder="Or paste URL…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 transition focus:ring-2" />
            </div>

            {/* Banner upload */}
            <div className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Banner images</span>
              <UploadDropzone title="Upload banner" hint="Added to banner slider (max 8)" onFile={(file) => void uploadAsset("banner", file)} state={uploadState.banner} previewUrl={previewBannerUrl || undefined} />
              <div className="flex gap-2">
                <input value={bannerUrlInput} onChange={(e) => setBannerUrlInput(e.target.value)} placeholder="Or paste URL and Add…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 transition focus:ring-2" />
                <button type="button" onClick={() => { try { const n = new URL(bannerUrlInput.trim()).toString(); pushBannerUrl(n); setBannerUrlInput(""); } catch { setError("Invalid URL."); } }} className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Add</button>
              </div>
              {form.banner_urls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.banner_urls.map((url) => (
                    <span key={url} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">
                      <span className="max-w-[140px] truncate">{url}</span>
                      <button type="button" onClick={() => removeBannerUrl(url)} className="font-bold text-red-400 hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sections order */}
            <div className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Section order</span>
              <p className="text-[11px] text-slate-400">Drag to reorder sections on your store page.</p>
              <div className="space-y-1.5">
                {form.sections_order.map((section) => (
                  <div
                    key={section}
                    draggable
                    onDragStart={() => setDraggedSection(section)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { moveSectionByDrag(section); setDraggedSection(null); }}
                    onDragEnd={() => setDraggedSection(null)}
                    className={`flex cursor-grab items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition active:cursor-grabbing ${draggedSection === section ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`}
                  >
                    <span className="font-medium">{SECTION_LABELS[section]}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-400"><path d="M8 9h8M8 15h8" /></svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </StepSection>

        {/* ── Step 5: Location ──────────────────────────────────── */}
        <StepSection step="5" title="Location" description="Help customers find your store in nearby search.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-end gap-2 sm:col-span-2">
              <label className="min-w-0 flex-1 space-y-1.5 text-sm">
                <span className="font-medium text-slate-700">Address line</span>
                <input value={form.address_line1} onChange={(e) => updateFormField("address_line1", e.target.value)} placeholder="12 Allen Avenue" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
              </label>
              <button type="button" onClick={useCurrentLocation} disabled={isDetectingLocation} className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60">
                {isDetectingLocation ? "Detecting…" : "📍 Detect"}
              </button>
            </div>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">City</span>
              <input value={form.city} onChange={(e) => updateFormField("city", e.target.value)} placeholder="Ikeja" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">State</span>
              <input value={form.state} onChange={(e) => updateFormField("state", e.target.value)} placeholder="Lagos" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Country</span>
              <input value={form.country} onChange={(e) => updateFormField("country", e.target.value)} placeholder="Nigeria" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Location source</span>
              <select value={form.location_source} onChange={(e) => updateFormField("location_source", e.target.value as "manual" | "gps")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-emerald-300 transition focus:ring-2">
                <option value="manual">Manual</option>
                <option value="gps">GPS</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Latitude</span>
              <input value={form.latitude} onChange={(e) => updateFormField("latitude", e.target.value)} placeholder="6.601838" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono outline-none ring-emerald-300 transition focus:ring-2" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Longitude</span>
              <input value={form.longitude} onChange={(e) => updateFormField("longitude", e.target.value)} placeholder="3.351486" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono outline-none ring-emerald-300 transition focus:ring-2" />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {hasCoordinates ? "✅ Coordinates captured. Nearby search will use precise distance." : "Tip: Use Detect or enter coordinates for accurate nearby results."}
          </p>
        </StepSection>

        {/* ── Sticky save bar ───────────────────────────────────── */}
        <div className="fixed bottom-16 left-1/2 z-30 flex w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:bottom-auto sm:left-auto sm:translate-x-0 sm:rounded-2xl sm:shadow-md">
          <button type="submit" disabled={isSaving || isAnyUploading} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
            {isSaving ? "Saving…" : isAnyUploading ? "Uploading…" : store ? "Update store" : "Create store"}
          </button>
          {shareablePath && (
            <a href={shareablePath} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              View store ↗
            </a>
          )}
          {store?.slug && (
            <p className="self-center text-xs text-slate-500">{shareablePath}</p>
          )}
          {error && <p className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
          {message && <p className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{message}</p>}
        </div>
      </form>
    </section>
  );
}
