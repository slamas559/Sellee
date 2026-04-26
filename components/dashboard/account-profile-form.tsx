"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MeResponse = {
  user?: {
    full_name: string | null;
    email: string;
    phone: string | null;
    role: "vendor" | "customer";
  };
  error?: string;
};

type PhoneChallenge = {
  id: string;
  expires_at: string;
  target_phone: string;
  command: string;
  verify_code: string;
  wa_link: string | null;
};

const COUNTRY_OPTIONS = [
  { code: "NG", dial: "+234", label: "Nigeria" },
  { code: "GH", dial: "+233", label: "Ghana" },
  { code: "KE", dial: "+254", label: "Kenya" },
  { code: "ZA", dial: "+27", label: "South Africa" },
  { code: "US", dial: "+1", label: "United States" },
  { code: "GB", dial: "+44", label: "United Kingdom" },
];

export function AccountProfileForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"vendor" | "customer">("customer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [countryCode, setCountryCode] = useState("+234");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [challenge, setChallenge] = useState<PhoneChallenge | null>(null);
  const [otp, setOtp] = useState("");
  const [isStartingPhoneVerification, setIsStartingPhoneVerification] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const composedPhone = useMemo(() => `${countryCode}${phoneLocal.replace(/[^0-9]/g, "")}`, [countryCode, phoneLocal]);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const payload = (await response.json()) as MeResponse;
        if (!response.ok || !payload.user) {
          if (mounted) setError(payload.error ?? "Could not load profile.");
          return;
        }
        if (mounted) {
          setFullName(payload.user.full_name ?? "");
          setEmail(payload.user.email);
          setPhone(payload.user.phone ?? "");
          setRole(payload.user.role);
        }
      } catch {
        if (mounted) setError("Network error while loading profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  async function reloadProfile() {
    const response = await fetch("/api/me", { cache: "no-store" });
    const payload = (await response.json()) as MeResponse;
    if (response.ok && payload.user) {
      setPhone(payload.user.phone ?? "");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
        }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not update profile.");
        return;
      }
      setMessage(payload.message ?? "Profile updated.");
    } catch {
      setError("Network error while updating profile.");
    } finally {
      setSaving(false);
    }
  }

  async function startPhoneVerification() {
    setIsStartingPhoneVerification(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/me/phone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: composedPhone }),
      });
      const payload = (await response.json()) as {
        error?: string;
        challenge?: PhoneChallenge;
      };
      if (!response.ok || !payload.challenge) {
        setError(payload.error ?? "Could not start phone verification.");
        return;
      }
      setChallenge(payload.challenge);
      setMessage("Verification started. Complete WhatsApp verify to update your number.");
    } catch {
      setError("Network error while starting phone verification.");
    } finally {
      setIsStartingPhoneVerification(false);
    }
  }

  async function sendOtp() {
    if (!challenge?.id) return;
    setIsSendingOtp(true);
    setError(null);
    try {
      const response = await fetch("/api/me/phone/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challenge.id }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not send OTP.");
        return;
      }
      setMessage(payload.message ?? "OTP sent on WhatsApp.");
    } catch {
      setError("Network error while sending OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function verifyOtp() {
    if (!challenge?.id || !otp.trim()) return;
    setIsVerifyingOtp(true);
    setError(null);
    try {
      const response = await fetch("/api/me/phone/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.id,
          otp: otp.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string; completed?: boolean; message?: string };
      if (!response.ok || !payload.completed) {
        setError(payload.error ?? "OTP verification failed.");
        return;
      }

      setMessage(payload.message ?? "Phone number verified and updated.");
      setChallenge(null);
      setOtp("");
      await reloadProfile();
    } catch {
      setError("Network error while verifying OTP.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function checkPhoneStatus() {
    if (!challenge?.id) return;
    setIsCheckingStatus(true);
    setError(null);
    try {
      const response = await fetch(`/api/me/phone/status?challenge_id=${challenge.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        error?: string;
        status?: { status: "pending" | "completed" | "expired" | "cancelled" };
      };
      if (!response.ok) {
        setError(payload.error ?? "Could not check verification status.");
        return;
      }
      const status = payload.status?.status;
      if (status === "completed") {
        setChallenge(null);
        setOtp("");
        setMessage("Phone updated successfully.");
        await reloadProfile();
        return;
      }
      if (status === "expired") {
        setError("Verification code expired. Start again.");
        return;
      }
      setMessage("Not verified yet. Send VERIFY command in WhatsApp then check again.");
    } catch {
      setError("Network error while checking verification status.");
    } finally {
      setIsCheckingStatus(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Account Settings</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
            role === "vendor" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {role}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Update your profile name and verify WhatsApp number changes securely.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading profile...</p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Full name</span>
              <input
                required
                minLength={2}
                maxLength={80}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="Abdul Salam"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input
                value={email}
                disabled
                className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Current WhatsApp</span>
              <input
                value={phone || "Not set"}
                disabled
                className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Change WhatsApp Number</p>
            <p className="mt-1 text-xs text-slate-600">
              Choose country code and verify via VERIFY command or OTP before update is applied.
            </p>

            <div className="mt-3 flex gap-2">
              <select
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="w-[42%] rounded-md border border-slate-200 bg-white px-2 py-2 text-sm outline-none ring-emerald-300 focus:ring-2"
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={`${option.code}-${option.dial}`} value={option.dial}>
                    {option.label} ({option.dial})
                  </option>
                ))}
              </select>
              <input
                value={phoneLocal}
                onChange={(event) => setPhoneLocal(event.target.value)}
                placeholder="8012345678"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-300 focus:ring-2"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">New number: {composedPhone}</p>

            <button
              type="button"
              onClick={() => void startPhoneVerification()}
              disabled={isStartingPhoneVerification}
              className="mt-3 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {isStartingPhoneVerification ? "Starting..." : "Start Phone Verification"}
            </button>

            {challenge ? (
              <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-600">
                  Command: <span className="font-mono font-semibold text-slate-900">{challenge.command}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={challenge.wa_link ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${
                      challenge.wa_link ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-500"
                    }`}
                  >
                    Verify on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(challenge.command)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Copy Command
                  </button>
                  <button
                    type="button"
                    onClick={() => void checkPhoneStatus()}
                    disabled={isCheckingStatus}
                    className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                  >
                    {isCheckingStatus ? "Checking..." : "Check Status"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void sendOtp()}
                    disabled={isSendingOtp}
                    className="rounded-full border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 disabled:opacity-60"
                  >
                    {isSendingOtp ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Enter OTP"
                    maxLength={6}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-300 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => void verifyOtp()}
                    disabled={isVerifyingOtp || otp.trim().length < 4}
                    className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      {!loading ? (
        <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-sm">
          {role === "vendor" ? (
            <Link href="/dashboard" className="font-semibold text-emerald-700 hover:underline">
              Open vendor dashboard
            </Link>
          ) : (
            <Link href="/become-vendor" className="font-semibold text-emerald-700 hover:underline">
              Become a vendor
            </Link>
          )}
          <Link href="/marketplace" className="text-slate-700 hover:text-emerald-700 hover:underline">
            Browse marketplace
          </Link>
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}

