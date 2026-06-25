export function ratio(numerator: number, denominator: number) {
  return denominator <= 0 ? 0 : round((numerator / denominator) * 100);
}

export function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function fmt(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function money(value: number) {
  if (value >= 100_000_000) return `${round(value / 100_000_000)}억`;
  if (value >= 10_000) return `${round(value / 10_000)}만`;
  return `${fmt(value)}원`;
}
