"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import logoText from "@/app/logos/image-text-logo.png";
import { UserMenu } from "@/components/layout/user-menu";
import { useSession } from "next-auth/react";

const HIDDEN_ON_ROUTES = ["/login", "/register"];

export default function SiteHeader() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const isLoggedIn = Boolean(session?.user?.id);
  const isVendor = session?.user?.role === "vendor";

  const [q, setQ] = useState<string>(() => searchParams?.get("q") ?? "");
  const [category, setCategory] = useState<string>(() => searchParams?.get("category") ?? "");

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestion, setFocusedSuggestion] = useState(-1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);

  // Sync with URL — all hooks must be declared before any conditional return
  useEffect(() => {
    const newQ = searchParams?.get("q") ?? "";
    const newCategory = searchParams?.get("category") ?? "";
    if (newQ !== q) setQ(newQ);
    if (newCategory !== category) setCategory(newCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounced suggestions
  useEffect(() => {
    const term = q?.trim();
    if (!term) {
      setSuggestions([]);
      setFocusedSuggestion(-1);
      return;
    }
    const controller = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(r)))
        .then((data) => {
          if (Array.isArray(data)) setSuggestions(data.slice(0, 8));
          else if (data?.suggestions) setSuggestions(data.suggestions.slice(0, 8));
        })
        .catch(() => setSuggestions([]));
    }, 280);
    return () => { clearTimeout(id); controller.abort(); };
  }, [q]);

  // Close suggestions on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // ── All hooks have run — now it is safe to conditionally return ──
  // Check if we're on the vendor store listing page (not product details)
  const pathSegments = pathname.split("/").filter(Boolean);
  const isStoreListingPage = pathSegments[0] === "store" && pathSegments.length === 2;

  const shouldHide =
    HIDDEN_ON_ROUTES.some((route) => pathname.startsWith(route)) ||
    isStoreListingPage ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/");

  if (shouldHide) return null;

  // Update URL bar silently
  const updateUrl = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    if (category) params.set("category", category);
    const url = params.toString() ? `/search?${params.toString()}` : "/search";
    try {
      window.history.replaceState({}, "", url);
    } catch (_) {
      router.replace(url);
    }
  };

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSuggestion((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && focusedSuggestion >= 0) {
      e.preventDefault();
      const s = suggestions[focusedSuggestion];
      setQ(s);
      setSuggestions([]);
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(s)}`);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function selectSuggestion(s: string) {
    setQ(s);
    setSuggestions([]);
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(s)}`);
  }

  function clearInput() {
    setQ("");
    setSuggestions([]);
    setShowSuggestions(false);
    desktopInputRef.current?.focus();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQ(v);
    updateUrl(v);
    setShowSuggestions(true);
    setFocusedSuggestion(-1);
  }

  function handleSubmit() {
    setShowSuggestions(false);
  }

  const formClass = `flex items-center gap-1.5 rounded-full border transition-all duration-200 px-3 py-1.5 ${
    isSearchFocused
      ? "border-emerald-400 ring-2 ring-emerald-100 shadow-sm bg-white"
      : "border-slate-200 hover:border-slate-300 bg-gray-50"
  }`;

  const inputClass =
    "flex-1 min-w-0 bg-transparent py-1.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* ── Desktop layout ── */}
        <div className="hidden sm:flex h-16 items-center gap-4">

          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
          >
            <Image src={logoText} alt="Sellee" className="h-7 w-auto" priority />
          </Link>

          {/* Search */}
          <div ref={wrapperRef} className="relative flex-1 max-w-xl mx-auto">
            <form action="/search" onSubmit={handleSubmit} className={formClass}>
              <Search
                className={`shrink-0 h-4 w-4 transition-colors ${
                  isSearchFocused ? "text-emerald-500" : "text-slate-400"
                }`}
              />
              <input
                ref={desktopInputRef}
                name="q"
                value={q}
                autoComplete="off"
                onChange={handleChange}
                onFocus={() => {
                  setIsSearchFocused(true);
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search products, categories…"
                aria-label="Search"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
                className={inputClass}
              />
              {q ? (
                <button
                  type="button"
                  onClick={clearInput}
                  className="shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <button
                type="submit"
                className="shrink-0 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-95"
              >
                Search
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                role="listbox"
                aria-label="Search suggestions"
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-100/80"
              >
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Suggestions
                  </p>
                </div>
                <ul className="pb-2">
                  {suggestions.map((s, i) => (
                    <li key={s} role="option" aria-selected={i === focusedSuggestion}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(s)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                          i === focusedSuggestion
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="flex-1 min-w-0 truncate">{s}</span>
                        <span className="shrink-0 text-xs text-slate-400">↵</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-slate-100 px-3 py-2">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setShowSuggestions(false);
                      router.push(`/search?q=${encodeURIComponent(q)}`);
                    }}
                    className="flex w-full items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Search for &ldquo;{q}&rdquo;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="shrink-0 flex items-center gap-2">
            <UserMenu isLoggedIn={isLoggedIn} isVendor={isVendor} />
          </div>
        </div>

        {/* ── Mobile top row ── */}
        <div className="flex sm:hidden h-14 items-center justify-between gap-3">
          <Link
            href="/"
            className="shrink-0 flex items-center rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
          >
            <Image src={logoText} alt="Sellee" className="h-6 w-auto" priority />
          </Link>
          <div className="shrink-0">
            <UserMenu isLoggedIn={isLoggedIn} isVendor={isVendor} />
          </div>
        </div>
      </div>

      {/* ── Mobile search bar ── */}
      <div className="sm:hidden border-t border-slate-100 px-4 py-2.5 bg-white">
        <div ref={wrapperRef} className="relative">
          <form action="/search" onSubmit={handleSubmit} className={formClass}>
            <Search className="shrink-0 h-4 w-4 text-slate-400" />
            <input
              name="q"
              value={q}
              autoComplete="off"
              onChange={handleChange}
              onFocus={() => {
                setIsSearchFocused(true);
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search products, categories…"
              aria-label="Search"
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              className={inputClass}
            />
            {q ? (
              <button
                type="button"
                onClick={() => { setQ(""); setSuggestions([]); }}
                className="shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {category ? <input type="hidden" name="category" value={category} /> : null}
            <button
              type="submit"
              className="shrink-0 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-95"
            >
              Search
            </button>
          </form>

          {/* Suggestions dropdown for mobile */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              role="listbox"
              aria-label="Search suggestions"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-100/80"
            >
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Suggestions
                </p>
              </div>
              <ul className="pb-2">
                {suggestions.map((s, i) => (
                  <li key={s} role="option" aria-selected={i === focusedSuggestion}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(s)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                        i === focusedSuggestion
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="flex-1 min-w-0 truncate">{s}</span>
                      <span className="shrink-0 text-xs text-slate-400">↵</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 px-3 py-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setShowSuggestions(false);
                    router.push(`/search?q=${encodeURIComponent(q)}`);
                  }}
                  className="flex w-full items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                  Search for &ldquo;{q}&rdquo;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}