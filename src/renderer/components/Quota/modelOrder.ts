export const MODEL_DISPLAY_ORDER = [
  "gemini-3-pro-image",
  "Gemini 3 Image",
  "claude-opus-4-5-thinking",
  "Claude Opus 4.5 Thinking",
  "gemini-3-flash",
  "Gemini 3 Flash",
  "gemini-3-pro-high",
  "Gemini 3 High",
  "gemini-3-pro-low",
  "Gemini 3 Low",
  "gemini-2.5-flash",
  "Gemini 2.5 Flash",
  "gemini-2.5-flash-thinking",
  "Gemini 2.5 Flash Thinking",
  "gemini-2.5-pro",
  "Gemini 2.5",
  "claude-sonnet-4-5",
  "Claude Sonnet 4.5",
  "claude-sonnet-4-5-thinking",
  "Claude Sonnet 4.5 Thinking",
];

function normalizeModelName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getModelSortIndex(label: string): number {
  const normalizedLabel = normalizeModelName(label);
  for (let i = 0; i < MODEL_DISPLAY_ORDER.length; i++) {
    const orderItem = normalizeModelName(MODEL_DISPLAY_ORDER[i]);
    if (
      normalizedLabel.includes(orderItem) ||
      orderItem.includes(normalizedLabel)
    ) {
      return i;
    }
  }
  return MODEL_DISPLAY_ORDER.length;
}

export function sortModelsByDisplayOrder<T extends { label: string }>(
  models: T[],
): T[] {
  return [...models].sort(
    (a, b) => getModelSortIndex(a.label) - getModelSortIndex(b.label),
  );
}
