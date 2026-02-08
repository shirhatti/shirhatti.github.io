/**
 * Calculate the Levenshtein distance between two strings.
 * This measures the minimum number of single-character edits (insertions, deletions, substitutions)
 * needed to transform one string into another.
 */
export function levenshteinDistance(a: string, b: string): number {
  // Create a matrix to store the distances
  const matrix: number[][] = []

  // Initialize first column (transforming from empty string to b)
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first row (transforming from empty string to a)
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        // Characters match, no operation needed
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        // Take minimum of:
        // - substitution (diagonal)
        // - insertion (left)
        // - deletion (top)
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Find the closest matching string from a list of candidates.
 * Returns the best match if distance is within threshold, otherwise null.
 */
export function findClosestMatch(
  input: string,
  candidates: string[],
  threshold: number = 2
): string | null {
  let bestMatch: string | null = null
  let bestDistance = Infinity

  for (const candidate of candidates) {
    const distance = levenshteinDistance(input.toLowerCase(), candidate.toLowerCase())

    // Only consider matches within the threshold and better than previous best
    if (distance <= threshold && distance < bestDistance) {
      bestDistance = distance
      bestMatch = candidate
    }
  }

  // Don't suggest if it's an exact match (distance 0)
  return bestDistance > 0 ? bestMatch : null
}
