const API_KEY = import.meta.env.VITE_POSTHOG_API_KEY ?? "";
const API_HOST = "https://us.i.posthog.com";

let context: string | null = null;
let distinctId: string | null = null;

/** Initialize PostHog for a given entry point context. */
export function initPostHog(ctx: "content" | "background"): void {
  if (context || !API_KEY) return;
  context = ctx;
  distinctId = crypto.randomUUID();
}

/** Attach or clear user identity. */
export function identifyUser(user: { id: string; email: string } | null): void {
  if (!context) return;
  if (user) {
    // Link anonymous ID to real user
    const previousId = distinctId;
    distinctId = user.id;
    send("$identify", { $set: { email: user.email }, $anon_distinct_id: previousId });
  } else {
    distinctId = crypto.randomUUID();
  }
}

/** Track an explicit event. */
export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  if (!context) return;
  send(event, properties);
}

function send(event: string, properties?: Record<string, unknown>): void {
  const payload = {
    api_key: API_KEY,
    event,
    properties: {
      distinct_id: distinctId,
      context,
      ...properties,
    },
    timestamp: new Date().toISOString(),
  };

  fetch(`${API_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently ignore analytics failures
  });
}
