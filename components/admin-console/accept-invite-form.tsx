"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin-console/admins/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, fullName }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not accept this invite.");
        setIsLoading(false);
        return;
      }

      router.push("/admin-console/login?accepted=1");
    } catch {
      setError("Couldn't reach the server. Try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[12.5px] font-medium">Email</label>
        <input value={email} disabled className="atlas-input" style={{ opacity: 0.65 }} />
      </div>

      <div className="space-y-1.5">
        <label className="text-[12.5px] font-medium" htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="atlas-input"
          autoComplete="name"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[12.5px] font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="atlas-input"
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[12.5px] font-medium" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="atlas-input"
          autoComplete="new-password"
        />
      </div>

      {error ? (
        <p className="atlas-badge" data-tone="danger" style={{ display: "block", padding: "8px 10px" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isLoading} className="atlas-btn w-full" data-variant="primary">
        {isLoading ? "Setting up…" : "Activate admin account"}
      </button>
    </form>
  );
}
