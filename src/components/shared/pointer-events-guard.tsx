"use client";

import * as React from "react";

/**
 * Selectors matching a Radix layer that is legitimately holding the page
 * inert: portalled popper content (dropdown, select, popover, tooltip) and
 * dialog content, including while it plays its close animation.
 */
const LIVE_LAYER_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  "[data-slot='dialog-overlay']",
  "[data-slot='dialog-content']",
  "[role='dialog']",
  "[role='alertdialog']",
  "[role='menu']",
  "[role='listbox']",
].join(",");

/**
 * Releases `document.body` when a Radix layer leaves `pointer-events: none`
 * behind after every overlay has gone.
 *
 * Radix's `DismissableLayer` snapshots `body.style.pointerEvents` when the
 * first modal layer opens and writes that snapshot back when the last one
 * closes. The snapshot lives in module scope, so two copies of the package in
 * one tree keep two of them: a dialog opened from an open dropdown menu
 * snapshots the `"none"` the menu had already applied, and restores it on
 * close — leaving the whole app click-dead with no overlay on screen and only
 * a reload to recover.
 *
 * The `overrides` entry in `package.json` collapses those copies into one,
 * which is the actual fix. This guard is the seatbelt: any future dependency
 * bump that reintroduces a duplicate would otherwise fail silently and in a
 * way that looks like an application bug. It only ever *removes* an inert
 * body, and only once nothing on screen wants one, so it cannot interfere
 * with a genuinely open overlay.
 */
export function PointerEventsGuard() {
  React.useEffect(() => {
    const body = document.body;
    let frame = 0;

    const release = () => {
      frame = 0;
      if (body.style.pointerEvents !== "none") return;
      // A layer is still on screen (or still animating out) — it owns the
      // inert body and is expected to clear it.
      if (document.querySelector(LIVE_LAYER_SELECTOR)) return;
      body.style.removeProperty("pointer-events");
    };

    const schedule = () => {
      if (frame) return;
      // Defer past the commit that queued it, so we never race a layer that is
      // mounting in the same tick.
      frame = window.requestAnimationFrame(() => window.setTimeout(release, 0));
    };

    const observer = new MutationObserver(schedule);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });
    // Layers are portalled into body, so their removal is a childList change.
    observer.observe(document.documentElement, { childList: true, subtree: true });

    schedule();

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
