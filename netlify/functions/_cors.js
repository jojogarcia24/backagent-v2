// netlify/functions/_cors.js
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",           // set to your Softr origin in prod
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin"
};

export function withCors(handler) {
  return async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders, body: "" };
    }
    const res = await handler(event, context);
    return { ...res, headers: { ...(res.headers || {}), ...corsHeaders } };
  };
}
