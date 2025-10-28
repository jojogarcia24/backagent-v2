// netlify/functions/auth.js
import jwt from "jsonwebtoken";

export function getBearerToken(headers = {}) {
  const raw =
    headers.authorization ??
    headers.Authorization ??
    headers.AUTHORIZATION ??
    "";
  const parts = String(raw).trim().split(/\s+/);
  if (parts.length >= 2 && /^Bearer$/i.test(parts[0])) return parts.slice(1).join(" ").trim();
  return ""; // empty if missing/malformed
}

export function requireAuth(event) {
  const token = getBearerToken(event.headers || {});
  if (!token) throw new Error("Missing or malformed bearer token");
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT secret not configured");
  // Allow small clock skew
  return jwt.verify(token, secret, { algorithms: ["HS256"], clockTolerance: 60 });
}
