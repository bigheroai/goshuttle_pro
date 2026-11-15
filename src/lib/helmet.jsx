'use client';

/**
 * Drop-in replacement for react-helmet's <Helmet>.
 * React 19 automatically hoists <title>, <meta> and <link> elements rendered
 * anywhere in the tree into the document <head>, so we only need to render
 * the children.
 */
export function Helmet({ children }) {
  return <>{children}</>;
}

export default Helmet;
