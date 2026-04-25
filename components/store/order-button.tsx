"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import { buildOrderMessage, buildWaMeLink } from "@/lib/whatsapp";

type OrderButtonProps = {
  storeId: string;
  productId: string;
  productName: string;
  productPrice: number;
  storeName: string;
  whatsappNumber: string;
};

type CreateOrderResponse = {
  error?: string;
  order?: {
    id: string;
    status: string;
    total_amount: number;
  };
};

type MeResponse = {
  user?: {
    id: string;
    email: string;
    role: "vendor" | "customer";
    phone: string | null;
    display_name: string;
  };
  error?: string;
};

function shortOrderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export function OrderButton({
  storeId,
  productId,
  productName,
  productPrice,
  storeName,
  whatsappNumber,
}: OrderButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const [quantity, setQuantity] = useState(1);
  const [profile, setProfile] = useState<MeResponse["user"] | null>(null);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => productPrice * quantity, [productPrice, quantity]);

  function decreaseQuantity() {
    setQuantity((prev) => Math.max(1, prev - 1));
  }

  function increaseQuantity() {
    setQuantity((prev) => prev + 1);
  }

  useEffect(() => {
    async function loadMe() {
      if (status !== "authenticated") return;
      setIsPrefilling(true);
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const payload = (await response.json()) as MeResponse;
        if (!response.ok || !payload.user) return;
        setProfile(payload.user);
      } finally {
        setIsPrefilling(false);
      }
    }

    void loadMe();
  }, [status]);

  async function handleOrder() {
    if (status !== "authenticated") {
      const callbackUrl = encodeURIComponent(pathname || "/");
      router.push(`/login?callbackUrl=${callbackUrl}`);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_id: storeId,
          product_id: productId,
          quantity,
        }),
      });

      const payload = (await response.json()) as CreateOrderResponse;

      if (!response.ok || !payload.order) {
        setError(payload.error ?? "Could not prepare WhatsApp order.");
        setIsSubmitting(false);
        return;
      }

      const message = buildOrderMessage({
        productName,
        quantity,
        total,
        storeName,
        orderReference: shortOrderRef(payload.order.id),
        customerName: profile?.display_name ?? "",
      });

      const waLink = buildWaMeLink(whatsappNumber, message);
      window.open(waLink, "_blank", "noopener,noreferrer");
    } catch {
      setError("Network error while preparing your order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <p className="text-sm font-medium text-emerald-700">Order on WhatsApp</p>
        <p className="mt-1 text-sm text-slate-600">
          Choose quantity and continue with your account details prefilled.
        </p>
      </div>

      {status === "unauthenticated" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Login required to place order.</p>
          <p className="mt-1 text-xs text-amber-800">
            We will use your account details to create and track this order.
          </p>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(pathname || "/")}`}
            className="mt-2 inline-flex rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Login to continue
          </Link>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Account</p>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-slate-800">
              {isPrefilling ? "Loading profile..." : (profile?.display_name ?? "Customer")}
            </p>
            <p className="break-all text-xs text-slate-600 sm:text-sm">{profile?.email ?? "No email found"}</p>
            <p className="break-all text-xs text-slate-600 sm:text-sm">
              WhatsApp: {profile?.phone?.trim() ? profile.phone : "Not set"}
            </p>
          </div>
          {!isPrefilling && !profile?.phone?.trim() ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Add your phone number in account profile before ordering.
              <Link href="/dashboard/account" className="ml-1 font-semibold underline">
                Open account
              </Link>
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-2 text-sm">
        <span className="font-medium text-slate-700">Quantity</span>
        <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-300 bg-white shadow-sm">
          <button
            type="button"
            onClick={decreaseQuantity}
            className="inline-flex h-10 w-10 items-center justify-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="inline-flex h-10 min-w-[3rem] items-center justify-center border-x border-slate-200 px-3 text-sm font-semibold text-slate-900">
            {quantity}
          </span>
          <button
            type="button"
            onClick={increaseQuantity}
            className="inline-flex h-10 w-10 items-center justify-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-700">
        Total: <span className="font-semibold">{formatNaira(total)}</span>
      </p>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleOrder()}
        disabled={isSubmitting || status === "loading" || (status === "authenticated" && !profile?.phone?.trim())}
        className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting
          ? "Preparing order..."
          : status === "unauthenticated"
            ? "Login to order"
            : "Order via WhatsApp"}
      </button>
    </div>
  );
}
