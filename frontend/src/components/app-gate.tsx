"use client";

import * as React from "react";
import { fetchMe } from "@/lib/api";
import {
  clearSession,
  getServerSession,
  getSession,
  subscribeSession,
} from "@/lib/session";
import { AuthScreen } from "./auth-screen";
import { Workspace } from "./workspace";

/**
 * Authentication gate (PL-7). Shows the sign-in / sign-up screen until the user
 * is authenticated, then renders the workspace. On load it validates the stored
 * bearer token and drops it if the server no longer recognises it (the database
 * is reset on every restart).
 */
export function AppGate() {
  const session = React.useSyncExternalStore(
    subscribeSession,
    getSession,
    getServerSession,
  );

  React.useEffect(() => {
    if (!session) return;
    let active = true;
    void fetchMe().then((user) => {
      if (active && !user) clearSession();
    });
    return () => {
      active = false;
    };
  }, [session]);

  if (!session) return <AuthScreen />;

  return <Workspace session={session} />;
}
