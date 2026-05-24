"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

type Props = {
  productId: string | number;
};

export function WishlistButton({ productId }: Props) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch(`/api/wishlist?productId=${productId}`);
        if (!mounted) return;
        if (res.status === 401) {
          setActive(false);
          return;
        }
        const data = await res.json();
        setActive(Boolean(data.exists));
      } catch (err) {
        // ignore
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [productId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (active) {
        const res = await fetch(`/api/wishlist?productId=${productId}`, {
          method: "DELETE",
        });
        if (res.status === 401) {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        setActive(false);
      } else {
        const res = await fetch(`/api/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.status === 401) {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        setActive(true);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={active}
      className={`inline-flex items-center justify-center cursor-pointer gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${active ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-slate-200 text-slate-700"}`}
    >
      <Heart className={`h-4 w-4 ${active ? "text-rose-600" : "text-slate-500"}`} />
      <span>{active ? "Saved" : "Save"}</span>
    </button>
  );
}

export default WishlistButton;
