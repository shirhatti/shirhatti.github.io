import type { Post } from '../data/types'

export interface RSSConfig {
  title: string
  description: string
  link: string
  language?: string
  author?: string
}

export function generateRSSFeed(posts: Post[], config: RSSConfig): string {
  const { title, description, link, language = 'en-us', author = 'Blog Author' } = config
  const pubDate = new Date().toUTCString()

  const items = posts
    .map((post) => {
      const postUrl = `${link}/post/${post.slug}`
      const postDate = new Date(post.date).toUTCString()

      // Escape XML special characters
      const escapeXml = (str: string) =>
        str.replace(/[<>&'"]/g, (c) => {
          switch (c) {
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '&': return '&amp;'
            case "'": return '&apos;'
            case '"': return '&quot;'
            default: return c
          }
        })

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${postDate}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('\n      ')}
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${title}</title>
    <description>${description}</description>
    <link>${link}</link>
    <language>${language}</language>
    <pubDate>${pubDate}</pubDate>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <managingEditor>${author}</managingEditor>
    <webMaster>${author}</webMaster>
${items}
  </channel>
</rss>`
}

export function generateJSONFeed(posts: Post[], config: RSSConfig): string {
  const { title, description, link, author = 'Blog Author' } = config

  const items = posts.map((post) => ({
    id: `${link}/post/${post.slug}`,
    url: `${link}/post/${post.slug}`,
    title: post.title,
    content_text: post.content,
    summary: post.excerpt,
    date_published: new Date(post.date).toISOString(),
    tags: post.tags,
  }))

  return JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title,
      description,
      home_page_url: link,
      feed_url: `${link}/feed.json`,
      author: {
        name: author,
      },
      items,
    },
    null,
    2
  )
}
