import { createHashRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import { overlayRoutes } from './overlays'

const router = createHashRouter([
  { path: '/', element: <App /> },
  ...overlayRoutes.map((path) => ({ path, element: <App /> })),
])

export function Router() {
  return <RouterProvider router={router} />
}
