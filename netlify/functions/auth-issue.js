// netlify/functions/auth-issue.js
import jwt from "jsonwebtoken";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // --- AuthN for this endpoint via INTERNAL_API_KEY ---
  const providedKey =
    event.headers["x-api-key"] ||
    event.headers["X-API-Key"] ||
    event.headers["x-API-KEY"] ||
    "";
  const expectedKey = process.env.INTERNAL_API_KEY;
  if (!expectedKey) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "INTERNAL_API_KEY not configured" }) };
  }
  if (providedKey !== expectedKey) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Unauthorized" }) };
  }

  // --- Parse requested subject (optional; you can hardcode or enrich as needed) ---
  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
  }

  const userId = body.userId || "user";
  const email = body.email || "user@example.com";

  // --- JWT config with issuer/audience ---
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "JWT_SECRET not configured" }) };
  }

  const ISSUER = process.env.JWT_ISSUER || "backagent";
  const AUDIENCE = process.env.JWT_AUDIENCE || "netlify-functions";

  try {
    const token = jwt.sign(
      { sub: userId, email },
      secret,
      {
        algorithm: "HS256",
        expiresIn: "30m",
        issuer: ISSUER,
        audience: AUDIENCE,
      }
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, token }),
    };
  } catch (e) {
    console.error("sign failed:", e?.name, e?.message);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Token issue failed" }) };
  }
};
