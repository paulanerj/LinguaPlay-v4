export function generateDeterministicId(...parts: any[]): string {
  return parts.join("-");
}
