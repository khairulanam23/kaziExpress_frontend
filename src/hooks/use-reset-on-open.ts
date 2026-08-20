"use client";

import * as React from "react";

/**
 * Runs `reset` once each time `open` flips from false to true.
 *
 * Uses React's sanctioned "adjust state when a prop changes" pattern (a
 * render-phase comparison against the previous value) rather than an effect.
 * An effect would re-render the dialog a second time on every open, and
 * `react-hooks/set-state-in-effect` correctly flags that as a cascade.
 */
export function useResetOnOpen(open: boolean, reset: () => void) {
  const [wasOpen, setWasOpen] = React.useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) reset();
  }
}
