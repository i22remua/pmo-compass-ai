'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Older browsers still have link/section guards and the native unload warning.
// Navigation API adds cancellable browser back/forward without rewriting history.
type HistoryNavigation = EventTarget & {
  traverseTo: (key: string) => { committed: Promise<unknown>; finished: Promise<unknown> };
};
type HistoryNavigateEvent = Event & {
  navigationType: string;
  destination: { key: string; url: string; sameDocument: boolean };
};

export function useUnsavedNotes(dirty: boolean) {
  const router = useRouter();
  const dirtyRef = useRef(dirty);
  const [pending, setPending] = useState<{ proceed: () => void } | null>(null);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  const request = useCallback((proceed: () => void) => {
    if (dirtyRef.current) setPending({ proceed });
    else proceed();
  }, []);
  const cancel = () => setPending(null);
  const proceed = () => {
    // The caller has saved or explicitly discarded. Avoid a second unload prompt
    // while React finishes rendering the clean draft.
    dirtyRef.current = false;
    setPending(null);
    pending?.proceed();
  };
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      if (
        !dirtyRef.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      const logout = target?.closest<HTMLButtonElement>('[data-leave-workspace]');
      if (logout) {
        event.preventDefault();
        event.stopImmediatePropagation();
        request(() => logout.click());
        return;
      }
      const link = target?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self'))
        return;
      const url = new URL(link.href);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.href === location.href ||
        url.hash === '#main-content'
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      request(() => {
        if (url.origin === location.origin) router.push(`${url.pathname}${url.search}${url.hash}`);
        else window.location.assign(url.href);
      });
    };
    const navigation = (window as Window & { navigation?: HistoryNavigation }).navigation;
    const traverse = (raw: Event) => {
      const event = raw as HistoryNavigateEvent;
      if (
        !dirtyRef.current ||
        !event.cancelable ||
        event.navigationType !== 'traverse' ||
        !event.destination.sameDocument ||
        event.destination.url === location.href
      )
        return;
      event.preventDefault();
      request(() => {
        const result = navigation!.traverseTo(event.destination.key);
        void result.committed.catch(() => {});
        void result.finished.catch(() => {});
      });
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    navigation?.addEventListener('navigate', traverse);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
      navigation?.removeEventListener('navigate', traverse);
    };
  }, [dirty, request, router]);
  return { request, pending: !!pending, cancel, proceed };
}
