import type { ComponentType } from 'react'
import type { OverlayEntry, OverlayProps } from './index'
import { posts } from '../data/posts'

export const pager: OverlayEntry = {
  route: '/post/:slug',
  command: 'less',
  loader: () =>
    import('../components/Pager/Pager').then((m) => ({
      default: m.Pager as unknown as ComponentType<OverlayProps>,
    })),
  resolve: (params) => {
    const post = posts.find((p) => p.slug === params.slug)
    return post ? { props: { post }, displayArg: post.slug } : null
  },
}
