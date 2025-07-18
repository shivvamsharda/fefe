
// Shared CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specific origins
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Mux-Signature', // Added Mux-Signature for webhook verification
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST for webhook, OPTIONS for preflight
};
