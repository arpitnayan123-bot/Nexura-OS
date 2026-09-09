"use client";

import { toast as sonner, type ExternalToast } from "sonner";
import { useOs, type NoticeTone } from "./store";

/* ============================================================
   HOSPITAL OS — toast bridge
   Every toast is recorded into the notification center, and
   non-critical toasts are visually dimmed while Focus mode is
   on (critical toasts always break through).
   ============================================================ */

function record(tone: NoticeTone, msg: string, opts?: ExternalToast) {
  useOs.getState().pushNotice({
    title: msg,
    body: typeof opts?.description === "string" ? opts.description : undefined,
    tone,
  });
}

function shouldShow(tone: NoticeTone) {
  const { focus } = useOs.getState();
  return !focus || tone === "crit";
}

function emit(tone: NoticeTone, msg: string, opts?: ExternalToast) {
  record(tone, msg, opts);
  sonner(msg, shouldShow(tone) ? opts : { ...opts, classNames: { toast: "nx-toast-quiet" } });
}

export interface NxToast {
  (msg: string, opts?: ExternalToast): void;
  success(msg: string, opts?: ExternalToast): void;
  error(msg: string, opts?: ExternalToast): void;
  warning(msg: string, opts?: ExternalToast): void;
  info(msg: string, opts?: ExternalToast): void;
  message(msg: string, opts?: ExternalToast): void;
  loading: typeof sonner.loading;
  dismiss: typeof sonner.dismiss;
  custom: typeof sonner.custom;
  promise: typeof sonner.promise;
}

export const toast: NxToast = Object.assign(
  (msg: string, opts?: ExternalToast) => emit("info", msg, opts),
  {
    success: (msg: string, opts?: ExternalToast) => emit("good", msg, opts),
    error: (msg: string, opts?: ExternalToast) => emit("crit", msg, opts),
    warning: (msg: string, opts?: ExternalToast) => emit("warn", msg, opts),
    info: (msg: string, opts?: ExternalToast) => emit("info", msg, opts),
    message: (msg: string, opts?: ExternalToast) => emit("info", msg, opts),
    loading: sonner.loading,
    dismiss: sonner.dismiss,
    custom: sonner.custom,
    promise: sonner.promise,
  }
);
