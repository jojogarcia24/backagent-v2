import { withCors } from "./_cors.js";

export const handler = withCors(async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  // placeholder — later we'll OCR + GPT
  return { statusCode: 200, body: JSON.stringify({ ok: true, findings: [] }) };
});
