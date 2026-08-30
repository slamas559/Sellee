"use client";

import { useEffect } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";

type ProvidersProps = {
  children: React.ReactNode;
};

function DeletedSessionGuard() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "UserDeleted" || session?.error === "UserSuspended") {
      void signOut({ callbackUrl: "/login" });
    }
  }, [session?.error]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider refetchInterval={60}>
      <DeletedSessionGuard />
      {children}
    </SessionProvider>
  );
}
