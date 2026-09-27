import type { ComponentType } from 'react'
import type { OverlayEntry, OverlayProps } from './index'
import { demoPath, findDemo, isDemo, readFile } from '../vfs'

export const demo: OverlayEntry = {
  route: '/demos/:slug',
  command: '',
  handles: isDemo,
  loader: () =>
    import('../components/Demo/Demo').then((m) => ({
      default: m.Demo as unknown as ComponentType<OverlayProps>,
    })),
  resolve: (params) => {
    if (!findDemo(params.slug)) return null
    return {
      loadProps: async () => {
        const content = await readFile(demoPath(params.slug))
        if (!content || content.type !== 'asset') return null
        return { post: content }
      },
      displayArg: `./demos/${params.slug}`,
    }
  },
}
