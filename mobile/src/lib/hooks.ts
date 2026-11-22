import { formatRupiah } from "@oracle/core";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { t } from "@/i18n";
import { api, ApiRequestError, withQuery } from "./api";
import { authClient } from "./auth-client";

export type Loadable<T> = { data: T | null; error: string | null; loading: boolean; refresh: () => Promise<void> };

/** The server's message, worded in the app language when the app knows the error. */
function describe(e: ApiRequestError): string {
  if (e.code === "insufficient_balance" && e.details) {
    return t("Not enough balance in {account}. Its balance is {balance} and this would leave it at {after}. Money from other accounts is never used.", {
      account: String(e.details.account),
      balance: formatRupiah(Number(e.details.balance)),
      after: formatRupiah(Number(e.details.after)),
    });
  }
  if (e.code === "network") return t("Cannot reach the server. Check your connection.");
  return e.message;
}

function handle(e: unknown): string {
  if (e instanceof ApiRequestError) {
    // The session expired or was revoked: drop it so the app returns to the sign-in screen.
    if (e.status === 401) void authClient.signOut();
    return describe(e);
  }
  return t("Something went wrong.");
}

/** GET a path and reload it every time the screen comes into focus. Pass null to skip. */
export function useApi<T>(path: string | null, query?: Record<string, string | number | undefined | null>): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const key = path ? withQuery(path, query) : null;
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    if (!key) return;
    const mine = ++seq.current;
    try {
      const [p, q] = key.split("?");
      const params = q ? Object.fromEntries(new URLSearchParams(q)) : undefined;
      const result = await api.get<T>(p, params);
      if (mine === seq.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mine === seq.current) setError(handle(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return { data, error, loading, refresh };
}

/** A cursor-paged list: `{ items, nextCursor }`. `more()` loads the next page. */
export function usePaged<T>(path: string, query: Record<string, string | number | undefined | null>) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const seq = useRef(0);
  const qKey = JSON.stringify(query);

  const load = useCallback(
    async (after: string | null) => {
      const mine = ++seq.current;
      try {
        const page = await api.get<{ items: T[]; nextCursor: string | null }>(path, { ...JSON.parse(qKey), cursor: after });
        if (mine !== seq.current) return;
        setItems((prev) => (after ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setError(null);
      } catch (e) {
        if (mine === seq.current) setError(handle(e));
      } finally {
        if (mine === seq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [path, qKey],
  );

  useFocusEffect(
    useCallback(() => {
      void load(null);
    }, [load]),
  );
  const more = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    void load(cursor);
  }, [cursor, loadingMore, load]);
  return { items, error, loading, loadingMore, hasMore: cursor !== null, more, reload: () => load(null) };
}

export const errorMessage = (e: unknown) => (e instanceof ApiRequestError ? describe(e) : t("Something went wrong."));
