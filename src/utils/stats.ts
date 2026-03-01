import type { VfsManifestEntry } from '../../vite-plugin-vfs-manifest'

export interface BlogStats {
  totalPosts: number
  totalWords: number
  averageWordsPerPost: number
  tags: Map<string, number>
  oldestDate: string | null
  newestDate: string | null
}

export function calculateStats(entries: VfsManifestEntry[]): BlogStats {
  if (entries.length === 0) {
    return {
      totalPosts: 0,
      totalWords: 0,
      averageWordsPerPost: 0,
      tags: new Map(),
      oldestDate: null,
      newestDate: null,
    }
  }

  let totalWords = 0
  const tagCounts = new Map<string, number>()

  for (const entry of entries) {
    totalWords += entry.meta.wordCount

    for (const tag of entry.meta.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.meta.date).getTime() - new Date(b.meta.date).getTime(),
  )

  return {
    totalPosts: entries.length,
    totalWords,
    averageWordsPerPost: Math.round(totalWords / entries.length),
    tags: tagCounts,
    oldestDate: sorted[0].meta.date,
    newestDate: sorted[sorted.length - 1].meta.date,
  }
}

export function getTopTags(
  tags: Map<string, number>,
  limit = 5,
): [string, number][] {
  return Array.from(tags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}
