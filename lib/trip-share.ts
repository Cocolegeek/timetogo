export function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function buildShareUrl(shareCode: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return `${origin}/join?code=${shareCode}`;
}
