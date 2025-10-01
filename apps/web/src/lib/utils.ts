type ClassInput = string | number | null | undefined | false | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassInput[]): string {
  return inputs
    .flatMap((input) => {
      if (!input && input !== 0) return [];

      if (typeof input === 'string' || typeof input === 'number') {
        return String(input).trim() ? [String(input)] : [];
      }

      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([, value]) => Boolean(value))
          .map(([className]) => className);
      }

      return [];
    })
    .filter(Boolean)
    .join(' ');
}
