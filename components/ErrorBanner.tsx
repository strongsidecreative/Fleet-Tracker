"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Sibling to SuccessBanner — reads ?error= instead of ?success= and
// renders in the app's "something's wrong" colour (rust) instead of the
// success one (track). Kept as its own component rather than a prop on
// SuccessBanner so existing ?success= call sites are untouched.
function Banner() {
  const params = useSearchParams();
  const message = params.get("error");
  if (!message) return null;

  return (
    <div role="alert" className="mb-4 rounded-xl border border-rust/30 bg-rust/10 px-4 py-3 text-sm font-medium text-rust">
      {message}
    </div>
  );
}

export default function ErrorBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
}
