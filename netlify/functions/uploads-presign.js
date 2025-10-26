import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
const s3 = new S3Client({ region: process.env.S3_REGION, credentials: {
  accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
}});

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const token = event.headers.authorization?.split(" ")[1];
  try { jwt.verify(token, process.env.JWT_SECRET); } catch { return { statusCode: 403, body: "Invalid token" }; }

  const { key, contentType } = JSON.parse(event.body || "{}");
  if (!key || !contentType) return { statusCode: 400, body: "key and contentType required" };

  // For simplicity we return the bucket/key. You can switch to a true pre-signed URL later.
  const putCmd = new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType });
  return { statusCode: 200, body: JSON.stringify({ bucket: process.env.S3_BUCKET, key, mode: "server-put" }) };
}
