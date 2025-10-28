// netlify/functions/uploads-presign.js
import { withCors } from "./_cors.js";
import { requireAuth } from "./auth.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---- S3 setup ----
const {
  S3_REGION,
  S3_BUCKET,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
} = process.env;

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

export const handler = withCors(async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // ---- Auth (throws on failure) ----
  try {
    requireAuth(event);
  } catch (e) {
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false, error: "Unauthorized" }),
    };
  }

  // ---- Validate env ----
  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "S3 env not configured" }),
    };
  }

  // ---- Read body ----
  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
    };
  }

  const {
    fileName,                // required: original filename (e.g., "doc.pdf")
    contentType,             // optional: MIME type (e.g., "application/pdf")
    prefix = "uploads",      // optional: folder/prefix in bucket
    metadata = {},           // optional: { key: value } -> stored as object metadata
  } = body;

  if (!fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "fileName required" }),
    };
  }

  const ct = contentType || "application/octet-stream";
  const safeName = String(fileName).replace(/[^A-Za-z0-9._-]/g, "_");
  const key = `${prefix}/${Date.now()}-${safeName}`;

  // Normalize metadata keys to lowercase (S3 best practice)
  const meta =
    metadata && typeof metadata === "object"
      ? Object.fromEntries(
          Object.entries(metadata).map(([k, v]) => [
            String(k).toLowerCase(),
            String(v),
          ])
        )
      : undefined;

  try {
    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: ct,
      ...(meta ? { Metadata: meta } : {}),
    });

    // 5 minutes expiry
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        method: "PUT",
        url,
        key,
        // Clients MUST include these headers when uploading to the presigned URL
        headers: { "Content-Type": ct },
      }),
    };
  } catch (e) {
    console.error("presign failed:", e?.name, e?.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Presign failed" }),
    };
  }
});
