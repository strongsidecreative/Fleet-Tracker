// The VAPID public key, read when the server runs rather than baked in at
// build time. In Vercel the key is marked "Sensitive", and sensitive values
// weren't in the build, so process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY was
// compiled in as undefined: Turn on failed with "Push key missing" and the
// server couldn't send pushes either. A computed name isn't replaced at
// build time, so this always reads the live value.
export function vapidPublicKey(): string | null {
  const names = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PUBLIC_KEY"];
  for (const name of names) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim().replace(/^["']|["']$/g, "");
  }
  return null;
}
