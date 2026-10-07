import sanitizeHtml from "sanitize-html";

const forbiddenTagPattern = /<\s*\/?\s*(?:script|object|embed)\b/i;
const eventHandlerPattern = /\son[a-z]+\s*=/i;
const dangerousProtocolPattern = /\s(?:href|src)\s*=\s*["']?\s*javascript\s*:/i;
const iframeSourcePattern = /<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

function assertIframeHosts(html: string, allowedIframeHosts: readonly string[]): void {
  for (const match of html.matchAll(iframeSourcePattern)) {
    let hostname: string;
    try {
      hostname = new URL(match[1]).hostname;
    } catch {
      throw new Error("Unsafe HTML: iframe source must be an absolute HTTPS URL");
    }

    if (!match[1].startsWith("https://") || !allowedIframeHosts.includes(hostname)) {
      throw new Error(`Unsafe HTML: iframe host is not allowed (${hostname})`);
    }
  }
}

export function assertSafeHtml(
  html: string,
  allowedIframeHosts: readonly string[],
): string {
  if (forbiddenTagPattern.test(html)) {
    throw new Error("Unsafe HTML: forbidden element");
  }
  if (eventHandlerPattern.test(html)) {
    throw new Error("Unsafe HTML: event handler attribute");
  }
  if (dangerousProtocolPattern.test(html)) {
    throw new Error("Unsafe HTML: dangerous URL protocol");
  }

  assertIframeHosts(html, allowedIframeHosts);

  const sanitized = sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "details",
      "summary",
      "mark",
      "kbd",
      "samp",
      "figure",
      "figcaption",
      "iframe",
    ],
    allowedAttributes: {
      "*": ["class", "id", "title", "role", "aria-*", "data-*"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading", "decoding"],
      iframe: ["src", "title", "loading", "allow", "allowfullscreen"],
      code: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedIframeHostnames: [...allowedIframeHosts],
  });

  if (sanitized !== html) {
    throw new Error("Unsafe HTML: markup is outside the public allowlist");
  }

  return html;
}
