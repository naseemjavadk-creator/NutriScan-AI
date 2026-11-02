import { NextResponse } from "next/server";
import { analyzeFoodImage, type ImageMediaType } from "@/lib/vision";
import { rateLimit } from "@/lib/rateLimit";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

/** Identify the real file type from its first bytes; the browser-supplied type is not trusted. */
function sniff(b: Uint8Array): ImageMediaType | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return "image/webp";
  return null;
}

export async function POST(req: Request) {

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`analyze:${ip}`, 20, 60 * 60 * 1000)) {
    return fail(429, "rate_limited", "Too many scans in the last hour. Please try again later.");
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return fail(400, "no_image", "Upload a JPG, PNG or WEBP photo.");
  if (file.size === 0) return fail(400, "empty_image", "That file is empty.");
  if (file.size > MAX_BYTES) return fail(413, "too_large", "Photos must be 5 MB or smaller.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = sniff(bytes);
  if (!mediaType) return fail(415, "bad_type", "Only JPG, PNG and WEBP images are supported.");

  try {
    const result = await analyzeFoodImage(Buffer.from(bytes).toString("base64"), mediaType);
    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze failed", err);
    return fail(502, "analysis_failed", "We couldn't analyze that photo. Try again, or add the foods manually.");
  }
}
