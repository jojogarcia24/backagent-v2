import { Client } from "pg";

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const { documentId } = JSON.parse(event.body || "{}");
  if (!documentId) return { statusCode: 400, body: "documentId required" };

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS validation_runs(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID,
      started_at TIMESTAMP DEFAULT now(),
      completed_at TIMESTAMP,
      status TEXT DEFAULT 'completed',
      ai_model TEXT,
      findings JSONB
    );
  `);

  const findings = { ok: true, notes: "Validator stub ran" };
  await client.query(
    `INSERT INTO validation_runs(document_id, status, ai_model, findings, completed_at)
     VALUES ($1,'completed','stub', $2, now())`,
    [documentId, findings]
  );
  await client.query(`UPDATE documents SET status='validated' WHERE id=$1`, [documentId]);

  await client.end();
  return { statusCode: 200, body: JSON.stringify({ findings }) };
}
