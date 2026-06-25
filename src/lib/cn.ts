type ClassValue = string | false | null | undefined;

/** Concatenate truthy class strings, filtering out falsy values. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
