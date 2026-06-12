import { useParams } from 'react-router-dom'

export default function OrderDetail() {
  const { id } = useParams()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold font-ui tracking-wide">Order Detail</h1>
      <p className="text-sm text-text-secondary font-body">Order ID: {id}</p>
      <p className="text-sm text-text-secondary font-body">Module coming soon.</p>
    </div>
  )
}
