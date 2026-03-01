declare module 'virtual:vfs-manifest' {
  import type { VfsManifestEntry } from '../vite-plugin-vfs-manifest'
  const entries: VfsManifestEntry[]
  export default entries
}
