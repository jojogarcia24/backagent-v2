import jwt from "jsonwebtoken";

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const token = event.headers.authorization?.split(" ")[1];
  try { jwt.verify(token, process.env.JWT_SECRET); } catch { return { statusCode: 403, body: "Invalid token" }; }

  const { state, category, yearBuilt } = JSON.parse(event.body || "{}");
  const requiredItems = [];
  if (state === "TX" && category === "Residential Sale") {
    if (yearBuilt && yearBuilt < 1978) requiredItems.push({ name: "Lead-Based Paint Disclosure", code: "LBP" });
    requiredItems.push({ name: "Wire Fraud Warning", code: "WFW" });
  }
  return { statusCode: 200, body: JSON.stringify({ requiredItems }) };
}
