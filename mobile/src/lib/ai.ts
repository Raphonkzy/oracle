import { type AiStatus } from "@oracle/core";
import { useEffect, useState } from "react";
import { api } from "./api";
import { usePrefs } from "./prefs";

/** Whether the server has the assistant switched on. Stays false while loading or if the check fails. */
export function useAiServerEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    api
      .get<AiStatus>("/ai/status")
      .then((r) => alive && setEnabled(r.enabled))
      .catch(() => alive && setEnabled(false));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}

/** The assistant is shown only when the server has it and the person has not hidden it in Preferences. */
export function useAiEnabled(): boolean {
  const server = useAiServerEnabled();
  const { assistant } = usePrefs();
  return server && assistant;
}
