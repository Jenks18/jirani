"use client";
import { useEffect, useState } from "react";

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch((e) => e.name !== "AbortError" && setError(true));
    return () => ctrl.abort();
  }, [url]);
  return { data, error, loading: !data && !error };
}
