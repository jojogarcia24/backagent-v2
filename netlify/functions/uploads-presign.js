import { withCors } from "./_cors.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import jwt from "jsonwebtoken";

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

function requireAuth(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const [, token] = auth.split(" ");
  if (!token) throw new Error("Missing token");
  return jwt.verify(token, process.env.JWT_SECRET);
}

export const handler = withCors(async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    requireAuth(event);
    const { fileName, contentType, prefix = "uploads" } = JSON.parse(event.body || "{}");
    if (!fileName) return { statusCode: 400, body: "fileName required" };

    const key = `${prefix}/${Date.now()}-${fileName}`;
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream"
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
    return { statusCode: 200, body: JSON.stringify({ url, key }) };
  } catch (e) {
    return { statusCode: 403, body: JSON.stringify({ ok: false, error: e.message }) };
  }
});
