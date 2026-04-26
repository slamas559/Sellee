"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
};

export function OrderStatusActions({ orderId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateStatus = (status: "confirmed" | "rejected") => {
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

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
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
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
