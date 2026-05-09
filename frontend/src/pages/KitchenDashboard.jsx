import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, CheckCircle, AlertCircle, RefreshCw, Truck, Package } from 'lucide-react'
import axios from 'axios'

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const mountedRef = useRef(true)
  const refreshIntervalRef = useRef(null)

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get('/api/orders/kitchen')
      if (mountedRef.current) {
        setOrders(response.data.orders)
        setLastUpdate(new Date())
        setError(null)
      }
    } catch {
      if (mountedRef.current) setError('Failed to load orders')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchOrders()
    return () => { mountedRef.current = false }
  }, [fetchOrders])

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchOrders, 30000)
    } else {
      clearInterval(refreshIntervalRef.current)
    }
    return () => clearInterval(refreshIntervalRef.current)
  }, [autoRefresh, fetchOrders])

  const updateOrderStatus = async (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o))
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus })
    } catch {
      setError('Failed to update order status')
      fetchOrders()
      setTimeout(() => setError(null), 3000)
    }
  }

  const getTimeElapsed = (createdAt) => {
    const diffMinutes = Math.floor((new Date() - new Date(createdAt)) / 60000)
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const h = Math.floor(diffMinutes / 60)
    return `${h}h ${diffMinutes % 60}m ago`
  }

  const statusBadge = (status) => {
    const styles = {
      paid: 'bg-blue-100 text-blue-800',
      preparing: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-gray-100 text-gray-600',
    }
    return styles[status] || 'bg-gray-100 text-gray-600'
  }

  const activeOrders = orders.filter((o) => ['paid', 'preparing', 'ready'].includes(o.status))

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kitchen Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdate.toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-6 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'New Orders', status: 'paid', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Preparing', status: 'preparing', color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Ready', status: 'ready', color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, status, color, bg }) => (
          <div key={status} className={`${bg} rounded-lg p-5`}>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>
              {orders.filter((o) => o.status === status).length}
            </p>
          </div>
        ))}
      </div>

      {/* Orders */}
      {activeOrders.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
          <p className="text-gray-500">No active orders right now</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeOrders
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((order) => {
              const isDelivery = order.fulfillmentType === 'delivery'
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow border-l-4 overflow-hidden ${
                    order.status === 'ready' ? 'border-green-500' :
                    order.status === 'preparing' ? 'border-yellow-500' :
                    'border-blue-500'
                  }`}
                >
                  {/* Order header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isDelivery
                        ? <Truck className="h-4 w-4 text-blue-600" />
                        : <Package className="h-4 w-4 text-green-600" />
                      }
                      <span className="font-bold text-gray-900">
                        {isDelivery ? 'Delivery' : 'Collection'}
                      </span>
                      <span className="text-sm text-gray-500">#{order.orderNumber || order.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Customer + time */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">{order.customerName}</span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-3 w-3" />
                        {getTimeElapsed(order.createdAt)}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-1">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="text-sm text-gray-700">
                          <span className="font-semibold">{item.quantity}×</span> {item.menuItem.name}
                        </div>
                      ))}
                    </div>

                    {/* Special instructions */}
                    {order.specialInstructions && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                        <p className="text-xs font-bold text-yellow-800 uppercase mb-0.5 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Note
                        </p>
                        <p className="text-xs text-yellow-900">{order.specialInstructions}</p>
                      </div>
                    )}

                    {/* Delivery address if applicable */}
                    {isDelivery && order.deliveryAddress && (
                      <div className="text-xs text-gray-500 border-t pt-2">
                        {order.deliveryAddress.line1}, {order.deliveryAddress.city}, {order.deliveryAddress.postcode}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-1">
                      {order.status === 'paid' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Mark Ready
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {isDelivery ? 'Mark Dispatched' : 'Mark Collected'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default KitchenDashboard
