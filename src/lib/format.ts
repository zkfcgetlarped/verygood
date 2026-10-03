export function money(n: number) {
  const abs = Math.abs(n);
  const f = (v: number, s: string) => `$${(n < 0 ? "-" : "")}${(abs / v).toFixed(abs / v >= 100 ? 0 : 2).replace(/\.00$/, "")}${s}`;
  if (abs >= 1e9) return f(1e9, "B");
  if (abs >= 1e6) return f(1e6, "M");
  if (abs >= 1e3) return f(1e3, "K");
  return `$${n}`;
}

// Accepts "10k", "2.5m", "1b", "500"
export function parseMoney(s: string) {
  const m = s.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)([kmb]?)$/);
  if (!m) return NaN;
  const mult = { "": 1, k: 1e3, m: 1e6, b: 1e9 }[m[2] as "" | "k" | "m" | "b"];
  return Math.floor(parseFloat(m[1]!) * mult);
}
