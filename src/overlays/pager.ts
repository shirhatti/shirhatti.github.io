import type { ComponentType } from 'react'
import type { OverlayEntry, OverlayProps } from './index'
import { findBySlug, readBySlug } from '../vfs'

export const pager: OverlayEntry = {
  route: '/post/:slug',
  command: 'less',
  extensions: ['.md'],
  loader: () =>
    import('../components/Pager/Pager').then((m) => ({
      default: m.Pager as unknown as ComponentType<OverlayProps>,
    })),
  resolve: (params) => {
    if (!findBySlug(params.slug)) return null
    return {
      loadProps: async () => {
        const content = await readBySlug(params.slug)
        if (!content || content.type !== 'markdown') return null
        return { post: content }
      },
      displayArg: params.slug,
    }
  },
}
