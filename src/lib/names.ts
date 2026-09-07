export function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
