import type { Post } from '../data/types'

export interface BlogStats {
  totalPosts: number
  totalWords: number
  averageWordsPerPost: number
  tags: Map<string, number>
  oldestPost: Post | null
  newestPost: Post | null
}

export function calculateStats(posts: Post[]): BlogStats {
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      totalWords: 0,
      averageWordsPerPost: 0,
      tags: new Map(),
      oldestPost: null,
      newestPost: null,
    }
  }

  let totalWords = 0
  const tagCounts = new Map<string, number>()

  for (const post of posts) {
    // Count words in content
    const words = post.content.split(/\s+/).filter((w) => w.length > 0).length
    totalWords += words

    // Count tags
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  // Sort posts by date to find oldest and newest
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return {
    totalPosts: posts.length,
    totalWords,
    averageWordsPerPost: Math.round(totalWords / posts.length),
    tags: tagCounts,
    oldestPost: sortedPosts[0],
    newestPost: sortedPosts[sortedPosts.length - 1],
  }
}

export function getTopTags(tags: Map<string, number>, limit = 5): [string, number][] {
  return Array.from(tags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}
