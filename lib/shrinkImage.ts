/**
 * Phone photos are 2 to 5 MB, but a Server Action request is capped
 * (1 MB by default, raised to 4 MB in next.config.js, and Vercel's hard
 * limit is 4.5 MB). Every photo upload in the app went over that and
 * failed. This downsizes the picked image in the browser (longest side
 * 1600px, JPEG ~80%), usually to 200 to 500 KB, and swaps it into the
 * same <input type="file"> so the form submits the small copy.
 *
 * Browser-only. If anything about it fails (old browser, unreadable
 * format), the original file is left in place untouched.
 */
export async function shrinkImageInput(input: HTMLInputElement, maxDimension = 1600, quality = 0.8): Promise<void> {
  const file = input.files?.[0];
  if (!file || !file.type.startsWith("image/") || file.size < 400 * 1024) return;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    const small = new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
    const transfer = new DataTransfer();
    transfer.items.add(small);
    input.files = transfer.files;
  } catch {
    // Keep the original file.
  }
}
