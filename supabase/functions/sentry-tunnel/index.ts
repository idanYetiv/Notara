import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENTRY_PROJECT_ID = "4510933974188032";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, sentry-trace, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const headerLine = body.split("\n")[0];
    const header = JSON.parse(headerLine);

    // Extract DSN from envelope header
    const dsn = header.dsn ?? (header.sdk?.dsn || "");
    if (!dsn) {
      return new Response("Missing DSN in envelope header", { status: 400, headers: corsHeaders });
    }

    const dsnUrl = new URL(dsn);
    const projectId = dsnUrl.pathname.replace(/\//g, "");

    // Validate project ID to prevent abuse
    if (projectId !== SENTRY_PROJECT_ID) {
      return new Response("Invalid project ID", { status: 403, headers: corsHeaders });
    }

    const sentryHost = dsnUrl.hostname;
    const sentryUrl = `https://${sentryHost}/api/${projectId}/envelope/`;

    const response = await fetch(sentryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(`Tunnel error: ${(err as Error).message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
