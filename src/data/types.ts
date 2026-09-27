interface ContentBase {
  slug: string
  title: string
  date: string
  tags: string[]
  excerpt: string
}

export interface MarkdownContent extends ContentBase {
  type: 'markdown'
  content: string // rendered markdown body
  images: Record<string, string> // filename → Vite-resolved URL
}

export interface AssetContent extends ContentBase {
  type: 'asset'
  src: string // Vite-resolved URL
  extension: string // '.png', '.pdf', etc.
}

export type Content = MarkdownContent | AssetContent
