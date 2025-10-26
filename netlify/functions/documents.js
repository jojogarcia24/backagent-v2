import { Client } from "pg";
import jwt from "jsonwebtoken";

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const token = event.headers.authorization?.split(" ")[1];
  try { jwt.verify(token, process.env.JWT_SECRET); } catch { return { statusCode: 403, body: "Invalid token" }; }

  const { transactionId, requiredItemId, fileName, fileUrl, uploadedBy } = JSON.parse(event.body || "{}");
  if (!transactionId || !fileName || !fileUrl) return { statusCode: 400, body: "Missing fields" };

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS documents(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID,
      required_item_id UUID,
      file_name TEXT,
      file_url TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMP DEFAULT now(),
      status TEXT DEFAULT 'pending_validation'
    );
  `);

  const res = await client.query(
    `INSERT INTO documents (transaction_id, required_item_id, file_name, file_url, uploaded_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [transactionId, requiredItemId ?? null, fileName, fileUrl, uploadedBy ?? null]
  );

  await client.end();
  return { statusCode: 200, body: JSON.stringify({ ok: true, documentId: res.rows[0].id }) };
}
