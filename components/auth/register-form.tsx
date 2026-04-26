"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type RegisterStartResponse = {
  error?: string;
  challenge?: {
    id: string;
    expires_at: string;
    target_phone: string;
    command: string;
    verify_code: string;
    wa_link: string | null;
  };
};

type CountryOption = {
  code: string;
  dial: string;
  label: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "NG", dial: "+234", label: "Nigeria" },
  { code: "GH", dial: "+233", label: "Ghana" },
  { code: "KE", dial: "+254", label: "Kenya" },
  { code: "ZA", dial: "+27", label: "South Africa" },
  { code: "US", dial: "+1", label: "United States" },
  { code: "GB", dial: "+44", label: "United Kingdom" },
  { code: "CA", dial: "+1", label: "Canada" },
  { code: "IN", dial: "+91", label: "India" },
];

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_local: "",
    password: "",
    confirmPassword: "",
  });
  const [countryCode, setCountryCode] = useState("+234");
  const [challenge, setChallenge] = useState<RegisterStartResponse["challenge"] | null>(null);
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const normalizedLocalPhone = useMemo(
    () => form.phone_local.replace(/[^0-9]/g, ""),
    [form.phone_local],
  );
  const fullPhone = useMemo(() => `${countryCode}${normalizedLocalPhone}`, [countryCode, normalizedLocalPhone]);

  async function completeSignIn() {
    const result = await signIn("credentials", {
      email: form.email.trim().toLowerCase(),
      password: form.password,
      redirect: false,
    });

    if (!result || result.error) {
      setNotice("Verification complete. Please sign in with your email and password.");
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function checkStatus() {
    if (!challenge?.id) return;
    setIsCheckingStatus(true);
    setError(null);
    try {
      const response = await fetch(`/api/register/status?challenge_id=${challenge.id}`, {
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
        setNotice("WhatsApp verification complete. Signing you in...");
        await completeSignIn();
        return;
      }
      if (status === "expired") {
        setError("Verification code expired. Start registration again.");
        return;
      }

      setNotice("Not verified yet. Send the VERIFY command in WhatsApp, then check again.");
    } catch {
      setError("Network error while checking status.");
    } finally {
      setIsCheckingStatus(false);
    }
  }

  async function startRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (normalizedLocalPhone.length < 6) {
      setError("Enter your phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: fullPhone,
          password: form.password,
          role: "customer",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as RegisterStartResponse;
      if (!response.ok || !payload.challenge?.id) {
        setError(payload.error ?? "Could not start verification.");
        return;
      }

      setChallenge(payload.challenge);
      setStep("verify");
      setNotice("Registration started. Verify your number on WhatsApp to activate your account.");
    } catch {
      setError("Network error while starting verification.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendOtp() {
    if (!challenge?.id) return;
    setIsSendingOtp(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/register/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challenge.id }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not send OTP.");
        return;
      }
      setNotice(payload.message ?? "OTP sent on WhatsApp.");
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
    setNotice(null);
    try {
      const response = await fetch("/api/register/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.id,
          otp: otp.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string; completed?: boolean };
      if (!response.ok || !payload.completed) {
        setError(payload.error ?? "OTP verification failed.");
        return;
      }

      setNotice("Phone verified successfully. Signing you in...");
      await completeSignIn();
    } catch {
      setError("Network error while verifying OTP.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  if (step === "verify" && challenge) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Number to verify: <span className="font-semibold">+{challenge.target_phone}</span>
          <br />
          Expires: <span className="font-semibold">{new Date(challenge.expires_at).toLocaleString()}</span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">Option 1: Verify on WhatsApp</p>
          <p className="mt-1 text-xs text-slate-600">
            Open chat and send this command from the same number.
          </p>
          <code className="mt-2 block rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-800">
            {challenge.command}
          </code>
          <div className="mt-2 flex flex-wrap gap-2">
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
              onClick={() => void checkStatus()}
              disabled={isCheckingStatus}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              {isCheckingStatus ? "Checking..." : "I Have Verified"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">Option 2: Verify by OTP</p>
          <p className="mt-1 text-xs text-slate-600">
            Send OTP to your WhatsApp number, then enter it below.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sendOtp()}
              disabled={isSendingOtp}
              className="rounded-full border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 disabled:opacity-60"
            >
              {isSendingOtp ? "Sending OTP..." : "Send OTP"}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Enter OTP"
              maxLength={6}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
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

        <button
          type="button"
          onClick={() => {
            setStep("register");
            setChallenge(null);
            setOtp("");
            setNotice(null);
            setError(null);
          }}
          className="text-xs font-semibold text-slate-600 hover:underline"
        >
          Back to registration form
        </button>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={startRegistration} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="full_name">
          Full name
        </label>
        <input
          id="full_name"
          type="text"
          required
          minLength={2}
          value={form.full_name}
          onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          placeholder="Abdul Salam"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">WhatsApp number</label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className="w-[42%] rounded-md border border-slate-200 bg-white px-2 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={`${option.code}-${option.dial}`} value={option.dial}>
                {option.label} ({option.dial})
              </option>
            ))}
          </select>
          <input
            type="tel"
            required
            value={form.phone_local}
            onChange={(event) => setForm((prev) => ({ ...prev, phone_local: event.target.value }))}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
            placeholder="8012345678"
          />
        </div>
        <p className="text-xs text-slate-500">Full number: {fullPhone}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          value={form.confirmPassword}
          onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-sky-300 transition focus:ring-2"
          placeholder="Repeat your password"
        />
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {notice ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
      >
        {isSubmitting ? "Starting verification..." : "Create account"}
      </button>
    </form>
  );
}

