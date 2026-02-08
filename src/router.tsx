import { createHashRouter, RouterProvider } from 'react-router-dom'
import App from './App'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/post/:slug',
    element: <App />,
  },
])

export function Router() {
  return <RouterProvider router={router} />
}
