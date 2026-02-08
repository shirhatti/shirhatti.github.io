# Overlays

Overlays are full-screen React components that cover the terminal. A command opens an overlay, and pressing `q`/`Escape` closes it and returns to the prompt. The pager (`less`) is the first overlay.

Adding a new overlay requires **no changes** to `Terminal.tsx`, `router.tsx`, or the overlay infrastructure. Routing and deeplinking are derived automatically from the overlay entry.

## Steps

### 1. Component

Create `src/components/<Name>/<Name>.tsx`. It receives `onClose` and whatever props you pass from the command.

```tsx
import { useEffect } from 'react'
import './<Name>.css'

interface <Name>Props {
  onClose: () => void
  id: string
}

export function <Name>({ onClose, id }: <Name>Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  return <div className="my-overlay">...</div>
}
```

### 2. CSS

Create `src/components/<Name>/<Name>.css`. The overlay must cover its container:

```css
.my-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
}
```

### 3. Overlay entry

Create `src/overlays/<name>.ts`. This is the single config that ties the route, command, component, and data resolution together.

```ts
import type { ComponentType } from 'react'
import type { OverlayEntry, OverlayProps } from './index'

export const myOverlay: OverlayEntry = {
  route: '/thing/:id',          // becomes a hash route and deeplink
  command: 'thing',             // echoed in terminal on deeplink open
  loader: () =>
    import('../components/<Name>/<Name>').then((m) => ({
      default: m.<Name> as unknown as ComponentType<OverlayProps>,
    })),
  resolve: (params) => {
    // params come from the route — validate and return props, or null
    return { props: { id: params.id }, displayArg: params.id }
  },
}
```

### 4. Register

Add one import and one line to `src/overlays/index.ts`:

```ts
import { myOverlay } from './myOverlay'

const overlays: Record<string, OverlayEntry> = {
  pager,
  myOverlay, // <-- add here
}
```

### 5. Command

Add a command to `src/commands/registry.ts` that navigates and opens the overlay:

```ts
navigate(overlayPath('myOverlay', { id: 'foo' }))
if (openOverlay) return openOverlay('myOverlay', { id: 'foo' })
```

## What you get for free

- **Routing**: `/#/thing/foo` is registered automatically from `route`
- **Deeplinking**: visiting that URL opens the overlay directly
- **Terminal echo**: the deeplink handler prints `thing foo` (from `command` + `displayArg`)
- **Lazy loading**: the component is code-split into its own chunk
- **Close handling**: `onClose` hides the overlay, navigates to `/`, restores the terminal cursor, and resolves the command promise so the prompt reappears

## Reference

See `src/overlays/pager.ts` for the existing implementation.
