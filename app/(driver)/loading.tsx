// Same idea as app/admin/loading.tsx — instant Suspense fallback for every
// driver-facing route (dashboard, trips, bookings, vehicles, account, the
// vehicle scan result page, vehicle checks, incident reports). Nothing
// here touches data or business logic, it's purely what's shown for the
// brief moment between a tap and the real content arriving.
export default function DriverLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 animate-pulse rounded bg-steel/20" />
      <div className="h-28 animate-pulse rounded-2xl border border-steel/20 bg-white" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-steel/20 bg-white" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-steel/20 bg-white" />
        ))}
      </div>
    </div>
  );
}
