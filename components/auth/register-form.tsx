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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.4Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-0.9 6.7-2.5l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.3 13.7a6 6 0 0 1 0-3.4V7.6H2.9a10 10 0 0 0 0 8.8l3.4-2.7Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.1 5.6l3.4 2.7C7.1 7.8 9.4 6 12 6Z"
        fill="#EA4335"
      />
    </svg>
  );
}

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
      <div className="space-y-4 sm:space-y-4">
        <div className="auth-stagger-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Number to verify: <span className="font-semibold">+{challenge.target_phone}</span>
          <br />
          Expires: <span className="font-semibold">{new Date(challenge.expires_at).toLocaleString()}</span>
        </div>

        <div className="auth-stagger-2 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">Option 1: Verify on WhatsApp</p>
          <p className="mt-1 text-xs text-slate-600">
            Open chat and send this command from the same number.
          </p>
          <code className="mt-2 block rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {challenge.command}
          </code>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={challenge.wa_link ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                challenge.wa_link
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-slate-300 text-slate-500"
              }`}
            >
              Verify on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(challenge.command)}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Copy Command
            </button>
            <button
              type="button"
              onClick={() => void checkStatus()}
              disabled={isCheckingStatus}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {isCheckingStatus ? "Checking..." : "I Have Verified"}
            </button>
          </div>
        </div>

        <div className="auth-stagger-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">Option 2: Verify by OTP</p>
          <p className="mt-1 text-xs text-slate-600">
            Send OTP to your WhatsApp number, then enter it below.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sendOtp()}
              disabled={isSendingOtp}
              className="rounded-full border border-yellow-300 bg-yellow-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-yellow-200 disabled:opacity-60"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => void verifyOtp()}
              disabled={isVerifyingOtp || otp.trim().length < 4}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
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
          className="auth-stagger-4 text-xs font-semibold text-slate-600 hover:underline"
        >
          Back to registration form
        </button>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/account?onboarding=google" })}
          className="auth-stagger-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-100/60 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-100"
        >
          <GoogleIcon />
          Continue with Google instead
        </button>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={startRegistration} className="space-y-4 sm:space-y-4">
      <div className="auth-stagger-1 space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="full_name">
          Full name
        </label>
        <input
          id="full_name"
          type="text"
          required
          minLength={2}
          value={form.full_name}
          onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
          placeholder="Abdul Salam"
        />
      </div>

      <div className="auth-stagger-2 space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
          placeholder="you@example.com"
        />
      </div>

      <div className="auth-stagger-3 space-y-2">
        <label className="text-sm font-medium text-slate-700">WhatsApp number</label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className="w-[45%] rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm text-slate-900 outline-none ring-emerald-300 transition focus:border-emerald-400 focus:ring-2"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
            placeholder="8012345678"
          />
        </div>
        <p className="text-xs text-slate-500">Full number: {fullPhone}</p>
      </div>

      <div className="auth-stagger-4 space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div className="auth-stagger-5 space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          value={form.confirmPassword}
          onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2"
          placeholder="Repeat your password"
        />
      </div>

      {error ? (
        <p className="auth-stagger-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {notice ? (
        <p className="auth-stagger-6 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="auth-stagger-7 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isSubmitting ? "Starting verification..." : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/account?onboarding=google" })}
        className="auth-stagger-8 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-100/60 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-yellow-100"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </form>
  );
}
