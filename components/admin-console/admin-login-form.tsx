"use client";

import { useState } from "react";
import { signIn, signOut, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (!result || result.error) {
        setError("Check your email and password and try again.");
        setIsLoading(false);
        return;
      }

      // Credentials succeeded, but this login only ever grants access if
      // the account's role is 'admin' - anyone else who happens to sign in
      // correctly with their vendor/customer password gets signed straight
      // back out rather than let onto the console.
      const session = await getSession();
      if (session?.user?.role !== "admin") {
        await signOut({ redirect: false });
        setError("This account doesn't have admin access.");
        setIsLoading(false);
        return;
      }

      router.push("/admin-console");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[12.5px] font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="atlas-input"
          autoComplete="username"
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
          autoComplete="current-password"
        />
      </div>

      {error ? (
        <p
          className="atlas-badge"
          data-tone="danger"
          style={{ display: "block", padding: "8px 10px" }}
        >
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isLoading} className="atlas-btn w-full" data-variant="primary">
        {isLoading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
