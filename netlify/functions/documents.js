import { withCors } from "./_cors.js";
import { Client } from "pg";
import jwt from "jsonwebtoken";

function requireAuth(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const [, token] = auth.split(" ");
  if (!token) throw new Error("Missing token");
  return jwt.verify(token, process.env.JWT_SECRET);
}

export const handler = withCors(async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const claims = requireAuth(event);
    const { transactionId, requiredItemId = null, fileName, fileUrl, uploadedBy } = JSON.parse(event.body || "{}");
    if (!transactionId || !fileName || !fileUrl) {
      return { statusCode: 400, body: "transactionId, fileName, fileUrl required" };
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query(
      `INSERT INTO documents (transaction_id, required_item_id, file_name, file_url, uploaded_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [transactionId, requiredItemId, fileName, fileUrl, uploadedBy || claims.email]
    );
    await client.end();
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: res.rows[0].id }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
});
