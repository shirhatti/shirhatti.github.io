import { Marked, type TokenizerAndRendererExtension } from 'marked'

/**
 * Render markdown content to HTML with image resolution via the post's images map.
 */
export function renderMarkdown(
  content: string,
  images: Record<string, string>,
): string {
  const imageExtension: TokenizerAndRendererExtension = {
    name: 'image',
    renderer(token) {
      const href = images[token.href] ?? token.href
      const alt = token.text || ''
      const title = token.title ? ` title="${token.title}"` : ''
      return `<figure><img src="${href}" alt="${alt}"${title} loading="lazy" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`
    },
  }

  const marked = new Marked({ extensions: [imageExtension] })
  const normalized = content.replace(/\r\n/g, '\n')
  return marked.parse(normalized) as string
}
