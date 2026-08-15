// Keep display ordering explicit at the presentation boundary. API ordering is
// useful, but views should not silently depend on it staying unchanged.
export function newestFirst<T>(items: readonly T[], dateOf: (item: T) => string) {
  return [...items].sort((left, right) => dateOf(right).localeCompare(dateOf(left)));
}

export function highestFirst<T>(items: readonly T[], valueOf: (item: T) => number) {
  return [...items].sort((left, right) => valueOf(right) - valueOf(left));
}
