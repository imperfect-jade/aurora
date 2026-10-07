const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export function sitePath(path = ""): string {
  const normalized = path.replace(/^\//, "");
  return normalized ? `${base}/${normalized}` : `${base}/`;
}
