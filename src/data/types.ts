export interface Post {
  slug: string
  title: string
  date: string
  tags: string[]
  excerpt: string
  content: string
  images: Record<string, string>  // filename → Vite-resolved URL
}
