// netlify/functions/_cors.js
export const corsHeaders = {
  // In production, set CORS_ORIGIN to your Softr/Web app origin.
  // If CORS_ORIGIN is unset, we fall back to "*".
  "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function withCors(handler) {
  return async (event, context) => {
    // Always allow preflight to pass without auth
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders, body: "" };
    }

    const res = await handler(event, context);

    // Ensure all responses (success + errors) include CORS
    return {
      ...res,
      headers: { ...(res.headers || {}), ...corsHeaders },
    };
  };
}
