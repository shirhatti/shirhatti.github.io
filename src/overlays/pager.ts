import type { ComponentType } from 'react'
import type { OverlayEntry, OverlayProps } from './index'
import { findBySlug, readFile, HOME } from '../vfs'

export const pager: OverlayEntry = {
  route: '/post/:slug',
  command: 'less',
  loader: () =>
    import('../components/Pager/Pager').then((m) => ({
      default: m.Pager as unknown as ComponentType<OverlayProps>,
    })),
  resolve: (params) => {
    const entry = findBySlug(params.slug)
    if (!entry) return null
    return {
      loadProps: async () => {
        const post = await readFile(HOME + entry.path)
        return post ? { post } : null
      },
      displayArg: entry.slug,
    }
  },
}
