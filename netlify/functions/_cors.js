// netlify/functions/_cors.js
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export function withCors(handler) {
  return async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
      // Preflight response
      return { statusCode: 204, headers: corsHeaders };
    }
    const res = await handler(event, context);
    // Ensure CORS headers on normal responses
    return { ...res, headers: { ...(res.headers || {}), ...corsHeaders } };
  };
}
