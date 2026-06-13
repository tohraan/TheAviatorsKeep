import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import AuthGuard from './components/shared/AuthGuard'
import Layout from './components/shared/Layout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Finance from './pages/Finance'
import Content from './pages/Content'
import AgencyDashboard from './agency/pages/AgencyDashboard'
import ContentBranch from './agency/pages/ContentBranch'
import ContentSessionDetail from './agency/pages/ContentSessionDetail'
import AdsBranch from './agency/pages/AdsBranch'
import AdsSessionDetail from './agency/pages/AdsSessionDetail'
import SOPManager from './agency/pages/SOPManager'
import Inventory from './pages/Inventory'
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
        element: <Navigate to="/agency" replace />,
      },
      {
        path: '/agency',
        element: <AgencyDashboard />,
      },
      {
        path: '/agency/content',
        element: <ContentBranch />,
      },
      {
        path: '/agency/content/:id',
        element: <ContentSessionDetail />,
      },
      {
        path: '/agency/ads',
        element: <AdsBranch />,
      },
      {
        path: '/agency/ads/:id',
        element: <AdsSessionDetail />,
      },
      {
        path: '/agency/sops',
        element: <SOPManager />,
      },
      {
        path: '/inventory',
        element: <Inventory />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
    ],
  },
])

export default function App() {
  return (
    <AuthGuard>
      <RouterProvider router={router} />
    </AuthGuard>
  )
}
