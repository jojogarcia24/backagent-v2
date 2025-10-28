// netlify/functions/transactions-intake.js
import { withCors } from "./_cors.js";
import jwt from "jsonwebtoken";

/** Get a Bearer token from headers, tolerant to casing and extra spaces */
function getBearerToken(headers = {}) {
  // Netlify lowercases header keys
  const h = headers || {};
  const raw =
    h.authorization ??
    h.Authorization ??
    h.AUTHORIZATION ??
    null;

  if (!raw) return null;
  const parts = String(raw).trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const [scheme, value] = parts;
  if (scheme.toLowerCase() !== "bearer" || !value) return null;
  return value;
}

export const handler = withCors(async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // ---- AUTH: accept both Authorization & authorization
  const token = getBearerToken(event.headers);
  if (!token) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return { statusCode: 401, body: "Unauthorized" };
  }

  // ---- Parse body
  const { state, category, yearBuilt } = JSON.parse(event.body || "{}");

  // ---- Demo rules (seed-backed / simplified):
  // TX + Residential Sale + yearBuilt < 1978 => LBP disclosure
  // Always include Wire Fraud Warning in demo
  const requiredItems = [];

  if (
    String(state).toUpperCase() === "TX" &&
    String(category).toLowerCase() === "residential sale" &&
    Number(yearBuilt) < 1978
  ) {
    requiredItems.push({
      code: "LBP",
      label: "Lead-Based Paint Disclosure",
      why: "Built before 1978",
    });
  }

  requiredItems.push({
    code: "WIRE_FRAUD",
    label: "Wire Fraud Warning",
    why: "Best practice",
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      user: { sub: claims.sub, email: claims.email },
      requiredItems,
    }),
  };
});
