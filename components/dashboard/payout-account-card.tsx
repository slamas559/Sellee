"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicPayoutAccount } from "@/lib/payout-accounts";

type Bank = { name: string; code: string };

type PayoutAccountCardProps = {
  initialAccount: PublicPayoutAccount | null;
};

const STATUS_LABEL: Record<PublicPayoutAccount["name_match_status"], string> = {
  pending: "Awaiting review",
  matched: "Name matched",
  mismatch: "Name mismatch",
};

const STATUS_STYLE: Record<PublicPayoutAccount["name_match_status"], string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  matched: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  mismatch: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function PayoutAccountCard({ initialAccount }: PayoutAccountCardProps) {
  const [account, setAccount] = useState<PublicPayoutAccount | null>(initialAccount);
  const [editing, setEditing] = useState(initialAccount === null);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankFilter, setBankFilter] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Only fetch the bank list once the form is actually open.
  useEffect(() => {
    if (!editing || banks.length > 0) return;

    let cancelled = false;
    setBanksLoading(true);

    fetch("/api/vendor/payout-account/banks", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { banks?: Bank[]; error?: string };
        if (cancelled) return;
        if (!response.ok || !payload.banks) {
          setError(payload.error ?? "Could not load banks.");
          return;
        }
        setBanks(payload.banks);
      })
      .catch(() => {
        if (!cancelled) setError("Network error while loading banks.");
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editing, banks.length]);

  const visibleBanks = useMemo(() => {
    const query = bankFilter.trim().toLowerCase();
    if (!query) return banks;
    return banks.filter((bank) => bank.name.toLowerCase().includes(query) || bank.code === bankCode);
  }, [banks, bankFilter, bankCode]);

  const accountNumberValid = /^\d{10}$/.test(accountNumber);
  const canResolve = Boolean(bankCode) && accountNumberValid && !isResolving && !isSaving;

  function resetForm() {
    setBankCode("");
    setAccountNumber("");
    setBankFilter("");
    setResolvedName(null);
    setError(null);
  }

  function handleBankChange(value: string) {
    setBankCode(value);
    setResolvedName(null);
    setError(null);
    setNotice(null);
  }

  function handleAccountNumberChange(value: string) {
    setAccountNumber(value.replace(/\D/g, "").slice(0, 10));
    setResolvedName(null);
    setError(null);
    setNotice(null);
  }

  async function handleResolve() {
    setIsResolving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/vendor/payout-account/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
      });
      const payload = (await response.json()) as { account_name?: string; error?: string };

      if (!response.ok || !payload.account_name) {
        setError(payload.error ?? "Could not verify this account.");
        return;
      }

      setResolvedName(payload.account_name);
    } catch {
      setError("Network error while checking the account.");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/vendor/payout-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
      });
      const payload = (await response.json()) as { account?: PublicPayoutAccount; error?: string };

      if (!response.ok || !payload.account) {
        setError(payload.error ?? "Could not save your payout account.");
        return;
      }

      setAccount(payload.account);
      setEditing(false);
      resetForm();
      setNotice("Payout account saved.");
    } catch {
      setError("Network error while saving your payout account.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">Payout account</h2>
          <p className="mt-1 text-sm text-slate-600">
            The bank account you receive payments into. The account name must match the name on the ID you
            submit for verification.
          </p>
        </div>
        {account && !editing ? (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[account.name_match_status]}`}
          >
            {STATUS_LABEL[account.name_match_status]}
          </span>
        ) : null}
      </div>

      {notice ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      {account && !editing ? (
        <div className="mt-4 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{account.bank_name}</dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account number</dt>
              <dd className="mt-1 text-sm font-semibold tracking-wider text-slate-900">
                {account.account_number_masked}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account name</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                {account.resolved_account_name}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setNotice(null);
            }}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Change account
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {account ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Changing your payout account means the new account will need to be checked again.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="bank-filter" className="block text-sm font-medium text-slate-700">
                Bank
              </label>
              <input
                id="bank-filter"
                type="text"
                value={bankFilter}
                onChange={(event) => setBankFilter(event.target.value)}
                placeholder="Search banks..."
                disabled={banksLoading}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
              />
              <select
                aria-label="Select bank"
                value={bankCode}
                onChange={(event) => handleBankChange(event.target.value)}
                disabled={banksLoading}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
              >
                <option value="">{banksLoading ? "Loading banks..." : "Select your bank"}</option>
                {visibleBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="account-number" className="block text-sm font-medium text-slate-700">
                Account number
              </label>
              <input
                id="account-number"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={accountNumber}
                onChange={(event) => handleAccountNumberChange(event.target.value)}
                placeholder="10-digit account number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm tracking-wider outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {resolvedName ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Account name</p>
              <p className="mt-1 break-words text-base font-bold text-slate-900">{resolvedName}</p>
              <p className="mt-1 text-sm text-slate-600">
                Make sure this is your name or your business name before saving.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {resolvedName ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save payout account"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResolve}
                disabled={!canResolve}
                className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResolving ? "Checking..." : "Check account name"}
              </button>
            )}
            {account ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  resetForm();
                }}
                disabled={isSaving}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
