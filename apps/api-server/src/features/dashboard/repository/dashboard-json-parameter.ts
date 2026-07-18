export function serializeJsonDatabaseParameter(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}
