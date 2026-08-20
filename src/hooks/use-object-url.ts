"use client";

import * as React from "react";

/**
 * Turns a local `File` into an object URL for preview, revoking it when the
 * file changes or the component unmounts.
 *
 * `useSyncExternalStore` is used rather than `useState` + `useEffect` because
 * the URL is external, imperative browser state: creating it during render
 * would leak on every re-render, and a state-setting effect causes a second
 * render pass on every file pick.
 */
export function useFileObjectUrl(file: File | null | undefined): string | null {
  const urlRef = React.useRef<{ file: File; url: string } | null>(null);

  const subscribe = React.useCallback(() => () => undefined, []);

  const getSnapshot = React.useCallback(() => {
    if (!file) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current.url);
        urlRef.current = null;
      }
      return null;
    }
    if (urlRef.current?.file !== file) {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current.url);
      urlRef.current = { file, url: URL.createObjectURL(file) };
    }
    return urlRef.current.url;
  }, [file]);

  // The server has no object URLs; previews are client-only.
  const url = React.useSyncExternalStore(subscribe, getSnapshot, () => null);

  React.useEffect(
    () => () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current.url);
        urlRef.current = null;
      }
    },
    [],
  );

  return url;
}
