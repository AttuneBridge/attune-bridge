"use client";

import { useState } from "react";

type CopyToClipboardButtonProps = {
  value: string;
  label: string;
  copiedLabel?: string;
  className?: string;
};

type CopyStatus = "idle" | "copied" | "error";

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const successful = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!successful) {
    throw new Error("Copy failed");
  }
}

function CopyIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M5 15V7a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function CopyToClipboardButton({
  value,
  label,
  copiedLabel = "Copied!",
  className,
}: CopyToClipboardButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");

  const handleCopy = async () => {
    try {
      await copyText(value);
      setStatus("copied");
      window.setTimeout(() => {
        setStatus("idle");
      }, 1500);
    } catch {
      setStatus("error");
      window.setTimeout(() => {
        setStatus("idle");
      }, 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
      }
      aria-live="polite"
    >
      <CopyIcon />
      {status === "copied" ? copiedLabel : status === "error" ? "Try again" : label}
    </button>
  );
}
