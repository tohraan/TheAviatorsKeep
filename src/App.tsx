import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/shared/Layout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Finance from './pages/Finance'
import Content from './pages/Content'
import Agency from './pages/Agency'
import Settings from './pages/Settings'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Dashboard />,
      },
      {
        path: '/leads',
        element: <Leads />,
      },
      {
        path: '/leads/:id',
        element: <LeadDetail />,
      },
      {
        path: '/orders',
        element: <Orders />,
      },
      {
        path: '/orders/:id',
        element: <OrderDetail />,
      },
      {
        path: '/finance',
        element: <Finance />,
      },
      {
        path: '/content',
        element: <Content />,
      },
      {
        path: '/content/agency',
        element: <Agency />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
