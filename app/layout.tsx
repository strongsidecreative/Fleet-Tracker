import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Fleet Tracker",
  description: "Track who's using which family vehicle, and keep everyone accountable.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fleet Tracker",
  },
  // iOS's "Add to Home Screen" reads this link tag for its icon — it does
  // NOT read manifest.json's icons array, that's an Android/desktop thing.
  // Without this, the home screen icon falls back to a screenshot of the
  // page instead of the actual logo.
  //
  // The "?v=2" on the apple icon is deliberate: iOS caches the apple-touch-icon
  // per URL in a cache that "Clear History and Website Data" does NOT reliably
  // clear. Once Safari has fetched a given icon URL once, it can keep serving
  // that cached copy indefinitely even after the file on the server changes.
  // Bumping this query string forces Safari to treat it as a brand new
  // resource and fetch fresh. Bump it again (v=3, v=4, ...) any time the
  // icon file itself changes in the future.
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png?v=2",
  },
};

export const viewport: Viewport = {
  themeColor: "#070E1F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
