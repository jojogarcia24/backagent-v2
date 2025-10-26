import { Client } from "pg";
import PDFDocument from "pdfkit";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
});

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { transactionId, payload } = JSON.parse(event.body || "{}");
  if (!transactionId) return { statusCode: 400, body: "transactionId required" };

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS cda_pdfs(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID,
      file_url TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((res) => doc.on("end", res));

  doc.fontSize(18).text("Commission Disbursement Authorization (CDA)", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Transaction ID: ${transactionId}`);
  doc.moveDown();

  const fields = payload || {};
  Object.entries(fields).forEach(([k, v]) => { doc.text(`${k}: ${v}`); });

  doc.moveDown().text(`Generated: ${new Date().toISOString()}`);
  doc.end();
  await done;

  const pdfBuffer = Buffer.concat(chunks);
  const key = `cda/${transactionId}-${Date.now()}.pdf`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: pdfBuffer,
    ContentType: "application/pdf"
  }));

  const fileUrl = `s3://${process.env.S3_BUCKET}/${key}`;

  await client.query(`INSERT INTO cda_pdfs(transaction_id, file_url) VALUES ($1,$2)`, [transactionId, fileUrl]);
  await client.end();

  return { statusCode: 200, body: JSON.stringify({ ok: true, fileUrl }) };
}
