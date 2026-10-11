"use client";
import { useEffect, useState } from "react";

const KEY = "jirani-notice-ack";

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
      className="fixed inset-x-3 top-3 z-[1000] mx-auto max-w-xl rounded-lg border border-line bg-card p-3 text-xs text-ink-2 shadow-lift sm:inset-x-auto sm:bottom-4 sm:left-4 sm:top-auto sm:p-4 sm:text-sm"
    >
      <p className="leading-relaxed">
        <span className="sm:hidden">
          No ads or tracking cookies. A sign-in cookie is used if you sign in, and our map provider may store technical data.{" "}
        </span>
        <span className="hidden sm:inline">
          We use no advertising or tracking cookies. Your browser may store a small note that you saw this message, a sign-in
          cookie if you sign in to your account, and the live map uses a third-party mapping provider, which may store
          technical data to render the map.{" "}
        </span>
        <a href="https://jirani.the625movement.com/cookies" className="font-medium text-forest-700 underline underline-offset-2">
          Cookie policy
        </a>
      </p>
      <div className="mt-2 flex justify-end sm:mt-3">
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
