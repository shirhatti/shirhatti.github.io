import { lazy, Suspense } from 'react'
import { TerminalSkeleton } from './TerminalSkeleton'

const Terminal = lazy(() =>
  import('./Terminal').then(module => ({ default: module.Terminal }))
)

export function LazyTerminal() {
  return (
    <Suspense fallback={<TerminalSkeleton />}>
      <Terminal />
    </Suspense>
  )
}
