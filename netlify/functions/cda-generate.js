import { withCors } from "./_cors.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import PDFDocument from "pdfkit";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

function renderPDF(payload = {}) {
  const doc = new PDFDocument({ size: "LETTER", margin: 48 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  return new Promise((resolve) => {
    doc.fontSize(18).text("Commission Disbursement Authorization (CDA)", { align: "center" });
    doc.moveDown();
    doc.fontSize(12);
    Object.entries(payload).forEach(([k, v]) => doc.text(`${k}: ${v}`));
    doc.end();
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export const handler = withCors(async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const { transactionId = "00000000-0000-0000-0000-000000000000", payload = {} } = JSON.parse(event.body || "{}");
    const pdf = await renderPDF(payload);
    const key = `cda/${transactionId}-${randomUUID()}.pdf`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: pdf,
      ContentType: "application/pdf"
    }));

    return { statusCode: 200, body: JSON.stringify({ ok: true, fileUrl: `s3://${process.env.S3_BUCKET}/${key}` }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
});
