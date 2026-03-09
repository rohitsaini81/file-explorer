const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export function isMockFallbackEnabled() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const rawValue = process.env.ENABLE_MOCK_FALLBACK;
  if (!rawValue) {
    return false;
  }

  return TRUE_VALUES.has(rawValue.trim().toLowerCase());
}
