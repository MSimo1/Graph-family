import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const SESSION_SECRET = process.env.SHARE_SESSION_SECRET ?? "dev-only-change-me";

export function createShareToken() {
  return randomBytes(24).toString("base64url");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + derived;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function shareCookieName(token: string) {
  return "gf_share_" + createHash("sha256").update(token).digest("hex").slice(0, 20);
}

export function signShareAccess(token: string) {
  return createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}

export function verifyShareAccess(token: string, signature?: string) {
  if (!signature) return false;
  const expected = signShareAccess(token);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
