"use client";

/**
 * PushNotificationPrompt — one-time opt-in widget for push notifications.
 * Displayed in parent and scholar dashboards.
 * Registers the subscription via POST /api/push/subscribe.
 *
 * Props: { scholarId?, isNgParent?, onDismiss? }
 */

import React, { useState, useEffect } from "react";

const DISMISSED_KEY = "lp_push_prompt_dismissed";

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) array[i] = raw.charCodeAt(i);
  return array;
}

export default function PushNotificationPrompt({ scholarId, isNgParent = false, onDismiss }) {
  const [state, setState] = useState("idle"); // idle | requesting | subscribed | denied | unsupported | dismissed
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isPushSupported()) { setState("unsupported"); return; }
    if (localStorage.getItem(DISMISSED_KEY)) { setState("dismissed"); return; }
    if (Notification.permission === "granted") { setState("subscribed"); return; }
    if (Notification.permission === "denied")  { setState("denied"); return; }
  }, []);

  const handleEnable = async () => {
    setState("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!VAPID_PUBLIC_KEY) {
        console.warn("[PushPrompt] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
        setState("subscribed");
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), scholarId }),
      });

      setState("subscribed");
    } catch (err) {
      console.error("[PushPrompt]", err);
      setState("denied");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setState("dismissed");
    onDismiss?.();
  };

  // Don't render until client-side hydration
  if (!mounted) return null;

  // Nothing to show
  if (["unsupported", "dismissed", "denied", "subscribed"].includes(state)) return null;

  // NG parents have teacher dashboards → mention teacher updates
  // Non-NG parents don't have the teacher feature yet → keep copy simpler
  const subCopy = isNgParent
    ? "Get reminders when your child\u2019s streak is at risk, a new plan is ready, or their teacher sends an update."
    : "Get reminders when your child\u2019s streak is at risk or a new personalised plan is ready.";

  return (
    <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-4 mb-4">
      <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🔔</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-indigo-900 dark:text-white">Stay on top of learning</p>
        <p className="text-xs text-indigo-700 dark:text-slate-400 mt-0.5">
          {subCopy}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleEnable}
            disabled={state === "requesting"}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            {state === "requesting" ? "Enabling…" : "Enable notifications"}
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
