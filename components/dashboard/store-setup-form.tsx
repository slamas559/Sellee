"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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

const INITIAL_UPLOAD_STATE: UploadState = {
  isUploading: false,
  progress: 0,
  fileName: null,
  error: null,
};

const PREVIEW_PRODUCTS = [
  { name: "Eco Flask", price: "NGN 14,500" },
  { name: "Kitchen Set", price: "NGN 22,000" },
  { name: "Daily Essentials", price: "NGN 8,900" },
  { name: "Smart Organizer", price: "NGN 12,300" },
];

const SECTION_LABELS: Record<StorefrontSectionId, string> = {
  featured_products: "Featured products",
  promo_strip: "Promo strip",
  reviews: "Reviews",
};

function useObjectUrl(file: File | null, fallback: string): string {
  const objectUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  return objectUrl ?? fallback;
}

function UploadDropzone({
  title,
  hint,
  onFile,
  state,
}: {
  title: string;
  hint: string;
  onFile: (file: File) => void;
  state: UploadState;
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
      className="flex min-h-36 cursor-pointer flex-col justify-between rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm transition hover:border-emerald-400 hover:bg-emerald-50/30"
    >
      <div className="space-y-1">
        <span className="block font-medium text-slate-700">{title}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </div>
      <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <div className="space-y-2">
        {state.fileName ? (
          <p className="line-clamp-1 text-xs font-medium text-slate-700">{state.fileName}</p>
        ) : (
          <p className="text-xs text-slate-400">Drop file here or click to browse</p>
        )}
      </div>
      {state.isUploading ? (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">{state.progress}% uploading...</p>
        </div>
      ) : null}
      {state.error ? <p className="text-xs font-medium text-red-600">{state.error}</p> : null}
    </label>
  );
}

function PreviewImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-white/60 text-xs text-slate-500 ${className ?? ""}`}>
        Add image
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-contain"
      />
    </div>
  );
}

function LiveStorefrontPreview(props: {
  template: StoreTemplate;
  viewport?: "desktop" | "phone";
  storeName: string;
  promoText: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroImageUrl: string;
  secondaryBannerUrl: string;
  bannerUrls: string[];
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
}) {
  const {
    template,
    viewport = "desktop",
    storeName,
    promoText,
    heroTitle,
    heroSubtitle,
    heroCtaText,
    heroImageUrl,
    secondaryBannerUrl,
    bannerUrls,
    primaryColor,
    accentColor,
    surfaceColor,
  } = props;
  const isPhone = viewport === "phone";
  const activeBannerUrl = bannerUrls[0] ?? secondaryBannerUrl;

  if (template === "fashion_editorial") {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{storeName || "Store"}</p>
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600">Live preview</span>
        </div>
        <div className={`grid gap-3 ${isPhone ? "grid-cols-1" : "md:grid-cols-[1.3fr_1fr]"}`}>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <PreviewImage src={heroImageUrl} alt="Hero" className={isPhone ? "h-44" : "h-44 md:h-52"} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{promoText}</p>
            <h4 className="mt-2 line-clamp-2 text-lg font-black text-slate-900">{heroTitle}</h4>
            <p className="mt-2 line-clamp-3 text-xs text-slate-600">{heroSubtitle}</p>
            <button
              type="button"
              className="mt-3 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {heroCtaText}
            </button>
          </div>
        </div>
        <div className={`grid gap-2 ${isPhone ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
          {PREVIEW_PRODUCTS.map((product) => (
            <article key={product.name} className="rounded-lg border border-slate-200 p-2">
              <p className="line-clamp-1 text-xs font-semibold text-slate-900">{product.name}</p>
              <p className="mt-1 text-[11px] text-slate-600">{product.price}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (template === "lifestyle_showcase") {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 p-3" style={{ backgroundColor: surfaceColor }}>
        <div className={`grid gap-3 ${isPhone ? "grid-cols-1" : "lg:grid-cols-[1.4fr_1fr]"}`}>
          <div className="rounded-lg bg-white/80 p-3">
            <p className="text-xs font-semibold" style={{ color: primaryColor }}>{promoText}</p>
            <h4 className="mt-2 line-clamp-2 text-xl font-black text-slate-900">{heroTitle}</h4>
            <p className="mt-2 line-clamp-3 text-xs text-slate-700">{heroSubtitle}</p>
            <button
              type="button"
              className="mt-3 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {heroCtaText}
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <PreviewImage src={heroImageUrl} alt="Hero" className={isPhone ? "h-44" : "h-44 lg:h-full"} />
          </div>
        </div>
        <div className={`grid gap-2 ${isPhone ? "grid-cols-1" : "sm:grid-cols-3"}`}>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <PreviewImage src={activeBannerUrl} alt="Secondary banner" className="h-24" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">Story card</div>
          <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">Review highlights</div>
        </div>
      </div>
    );
  }

  if (template === "modern_grid") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
        <div className={`grid gap-3 ${isPhone ? "grid-cols-1" : "lg:grid-cols-[160px_1fr]"}`}>
          <aside className="space-y-2 rounded-lg bg-white p-2">
            {["All", "Top rated", "Deals", "New arrivals"].map((item) => (
              <p key={item} className="rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-700">{item}</p>
            ))}
          </aside>
          <div className="space-y-2">
            <article className="rounded-lg bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: primaryColor }}>{promoText}</p>
              <h4 className="line-clamp-1 text-lg font-black text-slate-900">{heroTitle}</h4>
            </article>
            <div className={`grid gap-2 ${isPhone ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
              {PREVIEW_PRODUCTS.map((product) => (
                <article key={product.name} className="rounded-lg bg-white p-2">
                  <p className="line-clamp-1 text-[11px] font-semibold text-slate-900">{product.name}</p>
                  <p className="text-[10px] text-slate-600">{product.price}</p>
                  <button type="button" className="mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                    Buy
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3" style={{ backgroundColor: surfaceColor }}>
      <div className={`grid gap-3 ${isPhone ? "grid-cols-1" : "md:grid-cols-[1.2fr_1fr]"}`}>
        <article className="rounded-lg bg-white/85 p-3">
          <p className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: primaryColor }}>
            {promoText}
          </p>
          <h4 className="mt-2 line-clamp-2 text-xl font-black text-slate-900">{heroTitle}</h4>
          <p className="mt-2 line-clamp-3 text-xs text-slate-700">{heroSubtitle}</p>
          <button type="button" className="mt-3 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-900" style={{ backgroundColor: accentColor }}>
            {heroCtaText}
          </button>
        </article>
        <div className="overflow-hidden rounded-lg border border-white/70 bg-white/70">
          <PreviewImage src={heroImageUrl} alt="Hero" className={isPhone ? "h-40" : "h-40 md:h-48"} />
        </div>
      </div>
      <div className={`grid gap-2 ${isPhone ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {PREVIEW_PRODUCTS.map((product) => (
          <article key={product.name} className="rounded-lg border border-white/80 bg-white p-2">
            <p className="line-clamp-1 text-[11px] font-semibold text-slate-900">{product.name}</p>
            <p className="text-[10px] text-slate-600">{product.price}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function StoreSetupForm({ initialStore }: StoreSetupFormProps) {
  const initialConfig = normalizeStorefrontConfig(initialStore?.storefront_config);
  const [store, setStore] = useState<StoreRecord | null>(initialStore);
  const [draggedSection, setDraggedSection] = useState<StorefrontSectionId | null>(null);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "phone">("desktop");
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  });

  const shareablePath = store?.slug ? `/store/${store.slug}` : null;
  const hasCoordinates = Boolean(form.latitude && form.longitude);
  const selectedTheme = useMemo(
    () =>
      STOREFRONT_THEME_PRESETS.find((preset) => preset.key === form.store_theme_preset) ??
      STOREFRONT_THEME_PRESETS[0],
    [form.store_theme_preset],
  );
  const previewLogoUrl = useObjectUrl(logoFile, form.logo_url);
  const previewHeroUrl = useObjectUrl(heroImageFile, form.hero_image_url);
  const previewSecondaryBannerUrl = useObjectUrl(secondaryBannerFile, form.secondary_banner_url);
  const isAnyUploading = Object.values(uploadState).some((state) => state.isUploading);

  function pushBannerUrl(url: string) {
    const normalized = url.trim();
    if (!normalized) return;
    setForm((prev) => {
      const next = Array.from(new Set([normalized, ...prev.banner_urls])).slice(0, 8);
      return {
        ...prev,
        banner_urls: next,
        secondary_banner_url: next[0] ?? prev.secondary_banner_url,
      };
    });
  }

  function removeBannerUrl(url: string) {
    setForm((prev) => {
      const next = prev.banner_urls.filter((item) => item !== url);
      return {
        ...prev,
        banner_urls: next,
        secondary_banner_url: next[0] ?? "",
      };
    });
  }

  function updateFormField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateUpload(kind: UploadKind, patch: Partial<UploadState>) {
    setUploadState((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        ...patch,
      },
    }));
  }

  function moveSectionByDrag(target: StorefrontSectionId) {
    if (!draggedSection || draggedSection === target) {
      return;
    }
    setForm((prev) => {
      const next = [...prev.sections_order];
      const from = next.indexOf(draggedSection);
      const to = next.indexOf(target);
      if (from === -1 || to === -1) {
        return prev;
      }
      next.splice(from, 1);
      next.splice(to, 0, draggedSection);
      return { ...prev, sections_order: next };
    });
  }

  function applyThemePreset(key: (typeof form)["store_theme_preset"]) {
    const nextTheme =
      STOREFRONT_THEME_PRESETS.find((preset) => preset.key === key) ??
      STOREFRONT_THEME_PRESETS[0];
    setForm((prev) => ({
      ...prev,
      store_theme_preset: nextTheme.key,
      theme_color: nextTheme.primary,
    }));
  }

  async function uploadAsset(kind: UploadKind, file: File) {
    if (kind === "logo") setLogoFile(file);
    if (kind === "hero") setHeroImageFile(file);
    if (kind === "banner") setSecondaryBannerFile(file);

    updateUpload(kind, {
      isUploading: true,
      progress: 0,
      fileName: file.name,
      error: null,
    });

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      const body = new FormData();
      body.append("kind", kind);
      body.append("file", file);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const next = Math.max(1, Math.round((event.loaded / event.total) * 100));
        updateUpload(kind, { progress: next });
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;

        let payload: { url?: string; error?: string } = {};
        if (xhr.responseText) {
          try {
            payload = JSON.parse(xhr.responseText) as { url?: string; error?: string };
          } catch {
            payload = {};
          }
        }

        if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
          if (kind === "logo") updateFormField("logo_url", payload.url);
          if (kind === "hero") updateFormField("hero_image_url", payload.url);
          if (kind === "banner") pushBannerUrl(payload.url);
          updateUpload(kind, { isUploading: false, progress: 100, error: null });
          setMessage(`${kind} image uploaded successfully.`);
        } else {
          updateUpload(kind, {
            isUploading: false,
            error: payload.error ?? `Upload failed (${xhr.status}).`,
          });
        }

        resolve();
      };

      xhr.onerror = () => {
        updateUpload(kind, {
          isUploading: false,
          error: "Network error while uploading file.",
        });
        resolve();
      };

      xhr.open("POST", "/api/stores/upload");
      xhr.send(body);
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setIsDetectingLocation(true);
    setError(null);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);

        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          location_source: "gps",
        }));

        setMessage("Location detected. You can still edit address details manually.");
        setIsDetectingLocation(false);
      },
      () => {
        setError("Could not detect your location. Please enter it manually.");
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAnyUploading) {
      setError("Please wait for uploads to complete before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    setShowVendorSuccessBanner(false);

    const parsedLatitude = form.latitude.trim() ? Number.parseFloat(form.latitude) : null;
    const parsedLongitude = form.longitude.trim() ? Number.parseFloat(form.longitude) : null;

    if ((parsedLatitude === null) !== (parsedLongitude === null)) {
      setError("Enter both latitude and longitude, or leave both empty.");
      setIsSaving(false);
      return;
    }

    if (parsedLatitude !== null && Number.isNaN(parsedLatitude)) {
      setError("Latitude must be a valid number.");
      setIsSaving(false);
      return;
    }

    if (parsedLongitude !== null && Number.isNaN(parsedLongitude)) {
      setError("Longitude must be a valid number.");
      setIsSaving(false);
      return;
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
      body.append(
        "location_source",
        parsedLatitude !== null && parsedLongitude !== null ? form.location_source : "",
      );
      body.append("store_template", form.store_template);
      body.append("store_theme_preset", form.store_theme_preset);
      body.append("theme_color", form.theme_color);
      body.append("logo_url", form.logo_url);
      body.append("is_active", String(form.is_active));
      body.append("storefront_config", JSON.stringify(storefrontConfig));

      const response = await fetch("/api/stores", {
        method: "POST",
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Could not save store setup.");
        setIsSaving(false);
        return;
      }

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
        theme_color: nextStore.theme_color ?? selectedTheme.primary,
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
      });

      setMessage(
        payload.action === "created"
          ? "Store created successfully."
          : "Store updated successfully.",
      );
      setShowVendorSuccessBanner(Boolean(payload.became_vendor));
    } catch {
      setError("Network error while saving store setup.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">Store Setup</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {store ? "Update your store" : "Create your store"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Control storefront structure, content, color palette, and location.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="col-span-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Live Storefront Preview</p>
            <p className="text-xs text-slate-500">Updates instantly before save</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewViewport("desktop")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                previewViewport === "desktop"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewViewport("phone")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                previewViewport === "phone"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              Phone
            </button>
          </div>

          {previewViewport === "phone" ? (
            <div className="mx-auto w-full max-w-[410px] rounded-[2rem] border-[10px] border-slate-900 bg-slate-900 p-2 shadow-lg">
              <div className="mb-2 flex justify-center">
                <span className="h-1.5 w-16 rounded-full bg-slate-700" />
              </div>
              <div className="max-h-[620px] overflow-auto rounded-[1.4rem] bg-white p-2">
                <LiveStorefrontPreview
                  template={form.store_template}
                  viewport="phone"
                  storeName={form.name}
                  promoText={form.promo_text}
                  heroTitle={form.hero_title}
                  heroSubtitle={form.hero_subtitle}
                  heroCtaText={form.hero_cta_text}
                  heroImageUrl={previewHeroUrl}
                  secondaryBannerUrl={previewSecondaryBannerUrl}
                  bannerUrls={form.banner_urls}
                  primaryColor={form.theme_color}
                  accentColor={selectedTheme.accent}
                  surfaceColor={selectedTheme.surface}
                />
              </div>
            </div>
          ) : (
            <LiveStorefrontPreview
              template={form.store_template}
              viewport="desktop"
              storeName={form.name}
              promoText={form.promo_text}
              heroTitle={form.hero_title}
              heroSubtitle={form.hero_subtitle}
              heroCtaText={form.hero_cta_text}
              heroImageUrl={previewHeroUrl}
              secondaryBannerUrl={previewSecondaryBannerUrl}
              bannerUrls={form.banner_urls}
              primaryColor={form.theme_color}
              accentColor={selectedTheme.accent}
              surfaceColor={selectedTheme.surface}
            />
          )}
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Store name</span>
          <input
            required
            value={form.name}
            onChange={(event) => updateFormField("name", event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            placeholder="Sellee Home Essentials"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">WhatsApp number</span>
          <input
            required
            value={form.whatsapp_number}
            onChange={(event) => updateFormField("whatsapp_number", event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            placeholder="2348012345678"
          />
        </label>

        <div className="col-span-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Storefront Template Gallery</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STOREFRONT_TEMPLATE_OPTIONS.map((option) => {
              const selected = form.store_template === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => updateFormField("store_template", option.key)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-emerald-500 bg-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div
                    className={`relative mb-3 h-28 overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br ${option.previewClass}`}
                  >
                    <div className="absolute inset-x-2 top-2 h-3 rounded-full bg-white/80" />
                    <div className="absolute inset-x-2 top-7 grid grid-cols-3 gap-1">
                      <div className="h-6 rounded bg-white/80" />
                      <div className="h-6 rounded bg-emerald-200/80" />
                      <div className="h-6 rounded bg-amber-200/80" />
                    </div>
                    <div className="absolute inset-x-2 bottom-2 h-10 rounded bg-white/75" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                  <p className="mt-1 text-xs text-slate-600">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Color Presets</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {STOREFRONT_THEME_PRESETS.map((preset) => {
              const selected = form.store_theme_preset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyThemePreset(preset.key)}
                  className={`rounded-lg border p-2 text-left ${
                    selected
                      ? "border-emerald-500 bg-white"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div className="mb-2 flex gap-1">
                    <span
                      className="h-5 w-5 rounded-full border border-slate-200"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span
                      className="h-5 w-5 rounded-full border border-slate-200"
                      style={{ backgroundColor: preset.accent }}
                    />
                    <span
                      className="h-5 w-5 rounded-full border border-slate-200"
                      style={{ backgroundColor: preset.surface }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">{preset.label}</p>
                </button>
              );
            })}
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Primary color override</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.theme_color}
                onChange={(event) => updateFormField("theme_color", event.target.value)}
                className="h-10 w-12 rounded border border-slate-300 bg-white"
              />
              <input
                value={form.theme_color}
                onChange={(event) => updateFormField("theme_color", event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              />
            </div>
          </label>
        </div>

        <div className="col-span-full grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <p className="col-span-full text-sm font-semibold text-slate-800">
            Template Content Inputs
          </p>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Hero title</span>
            <input
              value={form.hero_title}
              onChange={(event) => updateFormField("hero_title", event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Hero subtitle</span>
            <textarea
              value={form.hero_subtitle}
              onChange={(event) => updateFormField("hero_subtitle", event.target.value)}
              className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Hero CTA text</span>
            <input
              value={form.hero_cta_text}
              onChange={(event) => updateFormField("hero_cta_text", event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              placeholder="Shop now"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Promo text</span>
            <input
              value={form.promo_text}
              onChange={(event) => updateFormField("promo_text", event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Hero image URL (fallback)</span>
            <input
              value={form.hero_image_url}
              onChange={(event) => updateFormField("hero_image_url", event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              placeholder="https://..."
            />
          </label>
          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <UploadDropzone
              title="Upload hero image"
              hint="Best ratio: 16:9"
              onFile={(file) => void uploadAsset("hero", file)}
              state={uploadState.hero}
            />
            <UploadDropzone
              title="Upload banner image"
              hint="Each upload is added to your banner slider (max 8)"
              onFile={(file) => void uploadAsset("banner", file)}
              state={uploadState.banner}
            />
          </div>
          <div className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Banner URLs</span>
            <div className="flex flex-wrap gap-2">
              <input
                value={bannerUrlInput}
                onChange={(event) => setBannerUrlInput(event.target.value)}
                className="min-w-[220px] flex-1 rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    if (!bannerUrlInput.trim()) return;
                    const normalized = new URL(bannerUrlInput.trim()).toString();
                    pushBannerUrl(normalized);
                    setBannerUrlInput("");
                  } catch {
                    setError("Please enter a valid banner URL.");
                  }
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Add banner
              </button>
            </div>
            <p className="text-xs text-slate-500">
              First banner is used as fallback/primary banner. Max 8 banners.
            </p>
            <div className="flex flex-wrap gap-2">
              {form.banner_urls.map((url) => (
                <div
                  key={url}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                >
                  <span className="max-w-[180px] truncate">
                    {url}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBannerUrl(url)}
                    className="font-semibold text-red-600 hover:text-red-700"
                    aria-label="Remove banner"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
            <p className="text-sm font-semibold text-slate-800">Section order (drag and drop)</p>
            <p className="text-xs text-slate-500">
              Drag sections to control how they appear on your storefront page.
            </p>
            <div className="space-y-2 pt-1">
              {form.sections_order.map((section) => (
                <div
                  key={section}
                  draggable
                  onDragStart={() => setDraggedSection(section)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    moveSectionByDrag(section);
                    setDraggedSection(null);
                  }}
                  onDragEnd={() => setDraggedSection(null)}
                  className={`flex cursor-grab items-center justify-between rounded-md border px-3 py-2 text-sm transition active:cursor-grabbing ${
                    draggedSection === section
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span>{SECTION_LABELS[section]}</span>
                  <span className="text-xs text-slate-400">Drag</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Store Location</p>
              <p className="text-xs text-slate-600">
                Buyers can find your store by location and nearby search.
              </p>
            </div>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isDetectingLocation}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
            >
              {isDetectingLocation ? "Detecting..." : "Use current location"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Address line</span>
              <input
                value={form.address_line1}
                onChange={(event) => updateFormField("address_line1", event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="12 Allen Avenue"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">City</span>
              <input
                value={form.city}
                onChange={(event) => updateFormField("city", event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="Ikeja"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">State</span>
              <input
                value={form.state}
                onChange={(event) => updateFormField("state", event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="Lagos"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Country</span>
              <input
                value={form.country}
                onChange={(event) => updateFormField("country", event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="Nigeria"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Location source</span>
              <select
                value={form.location_source}
                onChange={(event) =>
                  updateFormField("location_source", event.target.value as "manual" | "gps")
                }
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              >
                <option value="manual">Manual</option>
                <option value="gps">GPS</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Latitude (optional)</span>
              <input
                value={form.latitude}
                onChange={(event) => updateFormField("latitude", event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="6.601838"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Longitude (optional)</span>
              <input
                value={form.longitude}
                onChange={(event) => updateFormField("longitude", event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="3.351486"
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-slate-600">
            {hasCoordinates
              ? "Coordinates captured. Nearby search will use precise distance."
              : "Tip: Add coordinates for accurate nearby search results."}
          </p>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Logo URL (fallback)</span>
          <input
            value={form.logo_url}
            onChange={(event) => updateFormField("logo_url", event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            placeholder="https://..."
          />
        </label>
        <div className="space-y-2 text-sm rounded-xl border border-slate-200 bg-slate-50 p-3">
          <UploadDropzone
            title="Upload logo"
            hint="Square image recommended"
            onFile={(file) => void uploadAsset("logo", file)}
            state={uploadState.logo}
          />
          {previewLogoUrl ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              <Image
                src={previewLogoUrl}
                alt="Logo preview"
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>

        <label className="col-span-full flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateFormField("is_active", event.target.checked)}
          />
          Store is active and visible publicly.
        </label>

        {error ? (
          <p className="col-span-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="col-span-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        {showVendorSuccessBanner ? (
          <p className="col-span-full rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
            You are now a vendor.
          </p>
        ) : null}

        <div className="col-span-full flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving || isAnyUploading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSaving
              ? "Saving..."
              : isAnyUploading
                ? "Uploading files..."
                : store
                  ? "Update store"
                  : "Create store"}
          </button>

          {shareablePath ? (
            <a
              href={shareablePath}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Open public store
            </a>
          ) : null}
        </div>

        {store?.slug ? (
          <p className="col-span-full text-sm text-slate-600">
            Shareable link: <span className="font-medium">{shareablePath}</span>
          </p>
        ) : null}
      </form>
    </section>
  );
}
