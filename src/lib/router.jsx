'use client';

/**
 * Thin compatibility layer that exposes the subset of the react-router-dom API
 * used across the app (useNavigate, Link, useLocation, useParams,
 * useSearchParams, Navigate) on top of the Next.js App Router.
 *
 * React Router supports passing `state` along with a navigation. Next.js has no
 * equivalent, so navigation state is stashed in sessionStorage keyed by the
 * destination pathname and handed back by useLocation() on that page. Like
 * React Router's history state, it survives a page refresh.
 */

import React, { forwardRef, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';

const STATE_KEY = '__goshuttle_nav_state__';

function toHref(to) {
  if (to == null) return '';
  if (typeof to === 'string') return to;
  const { pathname = '', search = '', hash = '' } = to;
  const s = search && !search.startsWith('?') ? `?${search}` : search;
  const h = hash && !hash.startsWith('#') ? `#${hash}` : hash;
  return `${pathname}${s}${h}`;
}

function pathOf(href) {
  if (typeof window === 'undefined') return href.split(/[?#]/)[0];
  try {
    return new URL(href, window.location.href).pathname;
  } catch {
    return href.split(/[?#]/)[0];
  }
}

function saveState(href, state) {
  if (typeof window === 'undefined') return;
  try {
    if (state === undefined) {
      window.sessionStorage.removeItem(STATE_KEY);
    } else {
      window.sessionStorage.setItem(STATE_KEY, JSON.stringify({ path: pathOf(href), state }));
    }
  } catch {
    // Non-serialisable state or storage disabled – ignore.
  }
}

function readState(pathname) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.path === pathname ? parsed.state ?? null : null;
  } catch {
    return null;
  }
}

export function useNavigate() {
  const router = useRouter();
  return React.useCallback(
    (to, options = {}) => {
      if (typeof to === 'number') {
        if (to < 0) router.back();
        else if (to > 0) router.forward();
        return;
      }
      const href = toHref(to);
      saveState(href, options?.state);
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [router]
  );
}

export function useLocation() {
  const pathname = usePathname() || '/';
  const searchParams = useNextSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const state = useMemo(() => readState(pathname), [pathname, search]);
  return useMemo(
    () => ({ pathname, search, hash, state, key: `${pathname}${search}` }),
    [pathname, search, hash, state]
  );
}

export function useParams() {
  return useNextParams() || {};
}

export function useSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const nextParams = useNextSearchParams();
  const params = useMemo(() => new URLSearchParams(nextParams?.toString() || ''), [nextParams]);

  const setSearchParams = React.useCallback(
    (next, options = {}) => {
      const value = typeof next === 'function' ? next(params) : next;
      const qs = new URLSearchParams(value).toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [params, pathname, router]
  );

  return [params, setSearchParams];
}

export const Link = forwardRef(function Link({ to, href, state, replace, onClick, ...rest }, ref) {
  const target = toHref(to ?? href);
  return (
    <NextLink
      ref={ref}
      href={target}
      replace={replace}
      onClick={(e) => {
        saveState(target, state);
        onClick?.(e);
      }}
      {...rest}
    />
  );
});

export const NavLink = Link;

export function Navigate({ to, replace, state }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, to, replace, state]);
  return null;
}
