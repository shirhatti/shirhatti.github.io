import type { ComponentType } from 'react'
import type { OverlayEntry, OverlayProps } from './index'
import { findBySlug, readBySlug } from '../vfs'

export const demo: OverlayEntry = {
  route: '/demo/:slug',
  command: 'less',
  extensions: ['.html'],
  loader: () =>
    import('../components/Demo/Demo').then((m) => ({
      default: m.Demo as unknown as ComponentType<OverlayProps>,
    })),
  resolve: (params) => {
    if (!findBySlug(params.slug)) return null
    return {
      loadProps: async () => {
        const content = await readBySlug(params.slug)
        if (!content || content.type !== 'asset') return null
        return { post: content }
      },
      displayArg: params.slug,
    }
  },
}
