import jwt from "jsonwebtoken";

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const apiKey = event.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const { userId, email } = JSON.parse(event.body || "{}");
  if (!userId || !email) return { statusCode: 400, body: "userId and email required" };

  const token = jwt.sign({ sub: userId, email }, process.env.JWT_SECRET, { expiresIn: "30m" });
  return { statusCode: 200, body: JSON.stringify({ token }) };
}
