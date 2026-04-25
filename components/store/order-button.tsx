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
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => productPrice * quantity, [productPrice, quantity]);

  useEffect(() => {
    async function loadMe() {
      if (status !== "authenticated") return;
      setIsPrefilling(true);
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const payload = (await response.json()) as MeResponse;
        if (!response.ok || !payload.user) return;
        setCustomerName((prev) => prev || payload.user?.display_name || "");
        setCustomerWhatsapp((prev) => prev || payload.user?.phone || "");
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
          customer_name: customerName || undefined,
          customer_whatsapp: customerWhatsapp || undefined,
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
        customerName,
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
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-sky-700">Order on WhatsApp</p>
        <p className="mt-1 text-sm text-slate-600">
          Choose quantity and continue to WhatsApp with a pre-filled message.
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
        <>
          <label className="block space-y-2 text-sm">
            <span className="font-medium text-slate-700">Your name</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring-2"
              placeholder={isPrefilling ? "Loading profile..." : "Ada Obi"}
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-medium text-slate-700">Your WhatsApp</span>
            <input
              value={customerWhatsapp}
              onChange={(event) => setCustomerWhatsapp(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring-2"
              placeholder={isPrefilling ? "Loading profile..." : "2348012345678"}
            />
          </label>
        </>
      )}

      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-700">Quantity</span>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
          className="w-32 rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring-2"
        />
      </label>

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
        disabled={isSubmitting || status === "loading"}
        className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
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
