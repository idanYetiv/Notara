import {
  BrowserClient,
  defaultStackParser,
  makeFetchTransport,
  Scope,
  dedupeIntegration,
  inboundFiltersIntegration,
  linkedErrorsIntegration,
} from "@sentry/browser";
import type { BaseTransportOptions, Envelope, Transport, TransportMakeRequestResponse } from "@sentry/core";
import { serializeEnvelope } from "@sentry/core";

const DSN = import.meta.env.VITE_SENTRY_DSN ?? "";
const TUNNEL_URL =
  "https://uchvujcaxgrgulmnysgz.supabase.co/functions/v1/sentry-tunnel";

let scope: Scope | null = null;

/** Custom transport that posts envelopes to our tunnel via plain fetch. */
function makeTunnelTransport(options: BaseTransportOptions): Transport {
  // Fall back to the standard fetch transport for non-tunnel (content script)
  if (!options.url.includes("sentry-tunnel")) {
    return makeFetchTransport(options);
  }

  async function send(envelope: Envelope): Promise<TransportMakeRequestResponse> {
    const serialized = serializeEnvelope(envelope);
    const body = typeof serialized === "string" ? serialized : serialized.buffer;
    try {
      const res = await fetch(TUNNEL_URL, {
        method: "POST",
        body: body as BodyInit,
      });
      return { statusCode: res.status };
    } catch {
      return { statusCode: 0 };
    }
  }

  return {
    send,
    flush: () => Promise.resolve(true),
  };
}

/** Initialize Sentry for a given entry point context. */
export function initSentry(context: "content" | "background"): void {
  if (scope || !DSN) return;

  const client = new BrowserClient({
    dsn: DSN,
    tunnel: TUNNEL_URL,
    environment: import.meta.env.MODE,
    transport: makeTunnelTransport,
    stackParser: defaultStackParser,
    integrations: [
      dedupeIntegration(),
      inboundFiltersIntegration(),
      linkedErrorsIntegration(),
    ],
    beforeSend(event) {
      // Scrub auth tokens from breadcrumbs
      if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
          if (crumb.data) {
            for (const key of Object.keys(crumb.data)) {
              if (/token|auth|key|secret|password/i.test(key)) {
                crumb.data[key] = "[REDACTED]";
              }
            }
          }
        }
      }
      return event;
    },
  });

  scope = new Scope();
  scope.setClient(client);
  client.init();

  scope.setTag("context", context);
}

/** Attach user info to Sentry events. */
export function setSentryUser(user: { id: string; email: string } | null): void {
  if (!scope) return;
  scope.setUser(user ? { id: user.id, email: user.email } : null);
}

/** Manually capture an error (for caught exceptions). */
export function captureError(error: unknown): void {
  if (!scope) return;
  scope.captureException(error);
}
