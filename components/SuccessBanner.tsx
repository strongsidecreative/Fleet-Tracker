"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Banner() {
  const params = useSearchParams();
  const message = params.get("success");
  if (!message) return null;

  return (
    <div className="mb-4 rounded-xl border border-track/30 bg-track/10 px-4 py-3 text-sm font-medium text-track">
      {message}
    </div>
  );
}

export default function SuccessBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
}
