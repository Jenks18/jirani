"use client";
import { useEffect, useState } from "react";

const KEY = "jirani-notice-ack";

/** Informational storage notice. We set no advertising or analytics cookies, so there is nothing to opt into. */
export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* storage unavailable; just hide for this view */
    }
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie and storage notice"
      className="fixed inset-x-3 bottom-3 z-[1000] mx-auto max-w-xl rounded-2xl border border-line bg-card p-4 text-sm text-ink-2 shadow-lift sm:inset-x-auto sm:left-4 sm:bottom-4"
    >
      <p className="leading-relaxed">
        We use no advertising or tracking cookies. Your browser may store a small note that you saw this message, and the live
        map uses a third-party mapping provider, which may store technical data to render the map.{" "}
        <a href="https://jirani.the625movement.com/cookies" className="font-medium text-forest-700 underline underline-offset-2">
          Cookie policy
        </a>
      </p>
      <div className="mt-3 flex justify-end">
        <button
          onClick={dismiss}
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-900"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
