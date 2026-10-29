// GET /api/config -> public, non-secret settings only. Optional Cloudflare env vars (https links only):
// DONATE_URL (generic), PAYPAL_URL (e.g. https://paypal.me/yourname), KOFI_URL (e.g. https://ko-fi.com/yourname).
// GCash / Maya / MariBank use QR images Chai uploads to /assets/donate/{gcash,maya,maribank}.png (no env needed).
import { json } from "../_lib.js";
const https = v => (/^https:\/\/[^\s]+$/.test(v || "") ? v : null);
export const onRequestGet = ({ env }) => json({ donate_url: https(env.DONATE_URL), paypal_url: https(env.PAYPAL_URL), kofi_url: https(env.KOFI_URL), vapid_public_key: env.VAPID_PUBLIC_KEY || null, supabase: !!env.SUPABASE_URL });
