export interface SensitiveFinding {
  ruleId: string;
  file: string;
  excerpt: string;
}

interface SensitiveRule {
  id: string;
  pattern: RegExp;
}

const rules: SensitiveRule[] = [
  {
    id: "local-absolute-path",
    pattern: /(?:\b[A-Za-z]:\\[^\r\n]+|\/(?:Users|home)\/[^\s/]+(?:\/[^\s]*)?)/g,
  },
  {
    id: "credential-token",
    pattern: /(?:\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bAKIA[0-9A-Z]{16}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/g,
  },
  {
    id: "email-address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    id: "mainland-phone-number",
    pattern: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
  },
];

function redactedExcerpt(source: string, start: number, length: number): string {
  const contextStart = Math.max(0, start - 12);
  const contextEnd = Math.min(source.length, start + length + 12);
  const before = source.slice(contextStart, start);
  const after = source.slice(start + length, contextEnd);
  return `${contextStart > 0 ? "…" : ""}${before}[REDACTED]${after}${contextEnd < source.length ? "…" : ""}`;
}

export function scanSensitiveText(source: string, file: string): SensitiveFinding[] {
  const findings: SensitiveFinding[] = [];

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of source.matchAll(rule.pattern)) {
      findings.push({
        ruleId: rule.id,
        file,
        excerpt: redactedExcerpt(source, match.index, match[0].length),
      });
    }
  }

  return findings;
}

export function assertNoSensitiveText(source: string, file: string): void {
  const findings = scanSensitiveText(source, file);
  if (findings.length > 0) {
    const rulesFound = [...new Set(findings.map((finding) => finding.ruleId))].join(", ");
    throw new Error(`Sensitive public content blocked in ${file}: ${rulesFound}`);
  }
}
