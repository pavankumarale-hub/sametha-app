// Shared state so notification taps can pass a sametha to the Today screen
let pendingSametha: string | null = null;

export function setPendingSametha(text: string) {
  pendingSametha = text;
}

export function consumePendingSametha(): string | null {
  const t = pendingSametha;
  pendingSametha = null;
  return t;
}
