"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  currentStatus: string;
};

export function OrderStatusActions({ orderId, currentStatus }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateStatus = (status: "confirmed" | "rejected" | "delivered") => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? "Could not update order status.");
        return;
      }

      router.refresh();
    });
  };

  const isPending_whatsapp = currentStatus === "pending_whatsapp";
  const isConfirmed = currentStatus === "confirmed";

  if (!isPending_whatsapp && !isConfirmed) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {isPending_whatsapp ? (
          <>
            <button
              type="button"
              onClick={() => updateStatus("confirmed")}
              disabled={isPending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Updating..." : "Confirm Order"}
            </button>
            <button
              type="button"
              onClick={() => updateStatus("rejected")}
              disabled={isPending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Updating..." : "Reject Order"}
            </button>
          </>
        ) : null}

        {isConfirmed ? (
          <button
            type="button"
            onClick={() => updateStatus("delivered")}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Updating..." : "Mark as Delivered"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}