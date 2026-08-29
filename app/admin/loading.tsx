// Shown instantly by Next.js while any /admin/* page is fetching its data
// (this wraps the page in a Suspense boundary automatically — see
// https://nextjs.org/docs/app/api-reference/file-conventions/loading).
// Before this existed, tapping a nav link left the previous screen frozen
// with no feedback until the destination page's Supabase queries finished
// — this is what makes that tap feel instant instead. Pure loading
// chrome: no data, no logic, safe to add anywhere.
export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-6 w-40 animate-pulse rounded bg-steel/20" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-steel/20 bg-white" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-xl border border-steel/20 bg-white" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl border border-steel/20 bg-white" />
        ))}
      </div>
    </div>
  );
}
