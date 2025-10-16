/**
 * Infers the search mode from the includedTypes array.
 * @param includedTypes - Array of place types requested by the client.
 * @returns The inferred mode: 'groceries', 'specialty_markets', or 'generic'.
 */
export function inferMode(
  includedTypes: string[]
): "groceries" | "specialty_markets" | "generic" {
  const set = new Set(includedTypes);
  const isGroceries =
    set.size === 2 && set.has("grocery_store") && set.has("supermarket");
  if (isGroceries) return "groceries";
  if (
    set.has("asian_grocery_store") ||
    set.has("butcher_shop") ||
    set.has("food_store") ||
    set.has("market")
  ) {
    return "specialty_markets";
  }
  return "generic";
}

/**
 * Checks if includedTypes contains any of the provided types.
 * @param includedTypes - Array of place types requested by the client.
 * @param types - Array of types to check for.
 * @returns True if any type is present, false otherwise.
 */
export function hasAnyType(includedTypes: string[], types: string[]): boolean {
  return types.some((t) => includedTypes.includes(t));
}

