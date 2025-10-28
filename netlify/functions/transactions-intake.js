// netlify/functions/transactions-intake.js
import { withCors } from "./_cors.js";
import { requireAuth } from "./auth.js";

export const handler = withCors(async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let claims;
  try {
    claims = requireAuth(event);
  } catch (e) {
    // keep response terse but consistent
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Unauthorized" }) };
  }

  let input = {};
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
  }

  // … your existing logic to compute requiredItems …
  const requiredItems = [
    { code: "WIRE_FRAUD", label: "Wire Fraud Warning", why: "Best practice" },
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      user: { sub: claims.sub, email: claims.email },
      requiredItems,
    }),
  };
});
