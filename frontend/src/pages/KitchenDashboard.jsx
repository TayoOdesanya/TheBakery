import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, CheckCircle, Users, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { io } from 'socket.io-client'
import axios from 'axios'
import LoadingSpinner from '../components/LoadingSpinner'

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([])
  const [ordersByTable, setOrdersByTable] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [socket, setSocket] = useState(null)
  const [viewMode, setViewMode] = useState('table')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const mountedRef = useRef(true)
  const refreshIntervalRef = useRef(null)

  const fetchOrders = useCallback(async () => {
    try {
      if (mountedRef.current) setLoading(true)
      const response = await axios.get('http://localhost:3001/api/orders/kitchen')
      if (mountedRef.current) {
        setOrders(response.data.orders)
        setOrdersByTable(response.data.ordersByTable)
        setLastUpdate(new Date())
        setError(null)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      if (mountedRef.current) setError('Failed to load orders')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const initializeSocket = useCallback(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const newSocket = io(API_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      console.log('Connected to kitchen updates')
      setConnectionStatus('connected')
      newSocket.emit('join-kitchen')
    })

    newSocket.on('reconnect', () => {
      console.log('Reconnected to kitchen updates')
      setConnectionStatus('connected')
      fetchOrders()
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from kitchen updates')
      setConnectionStatus('disconnected')
    })

    newSocket.on('connect_error', () => {
      console.log('Connection error')
      setConnectionStatus('error')
    })

    newSocket.on('new-order', (data) => {
      console.log('New order received:', data)
      if (mountedRef.current) {
        fetchOrders()
        showOrderNotification('New order received!', 'success')
      }
    })

    newSocket.on('order-status-updated', (data) => {
      console.log('Order status updated:', data)
      if (mountedRef.current) {
        updateOrderInState(data.orderId, data.status)
      }
    })

    setSocket(newSocket)
  }, [fetchOrders])

  const updateOrderInState = useCallback((orderId, newStatus) => {
    setOrders(prevOrders => {
      const updatedOrders = prevOrders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      )
      
      const newOrdersByTable = {}
      updatedOrders.forEach(order => {
        if (!newOrdersByTable[order.tableNumber]) {
          newOrdersByTable[order.tableNumber] = []
        }
        newOrdersByTable[order.tableNumber].push(order)
      })
      setOrdersByTable(newOrdersByTable)
      
      return updatedOrders
    })
  }, [])

  const showOrderNotification = (message, type = 'info') => {
    console.log(`Notification (${type}): ${message}`)
    
    if (Notification.permission === 'granted') {
      new Notification('Kitchen Dashboard', {
        body: message,
        icon: '/kitchen-icon.png'
      })
    }
  }

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchOrders()
      }, 30000)
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefresh, fetchOrders])

  useEffect(() => {
    mountedRef.current = true
    
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    fetchOrders()
    initializeSocket()

    return () => {
      mountedRef.current = false
      if (socket) {
        socket.disconnect()
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [fetchOrders, initializeSocket])

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      updateOrderInState(orderId, newStatus)
      
      await axios.patch(`http://localhost:3001/api/orders/${orderId}/status`, { status: newStatus })
      
      showOrderNotification(`Order #${orderId} marked as ${newStatus}`, 'success')
      
      if (socket) {
        socket.emit('order-status-changed', { orderId, status: newStatus })
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      fetchOrders()
      setError('Failed to update order status')
      setTimeout(() => setError(null), 3000)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-warning-100 text-warning-800'
      case 'ready': return 'bg-success-100 text-success-800'
      case 'delivered': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <Clock className="h-4 w-4" />
      case 'preparing': return <AlertCircle className="h-4 w-4" />
      case 'ready': return <CheckCircle className="h-4 w-4" />
      case 'delivered': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getTimeElapsed = (createdAt) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMinutes = Math.floor((now - created) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    return `${diffHours}h ${diffMinutes % 60}m ago`
  }

  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'bg-success-100 text-success-800',
          icon: <Wifi className="h-4 w-4" />,
          text: 'Connected'
        }
      case 'disconnected':
        return {
          color: 'bg-warning-100 text-warning-800',
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Disconnected'
        }
      case 'error':
        return {
          color: 'bg-error-100 text-error-800',
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Connection Error'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: 'Connecting...'
        }
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-error-600 text-lg font-semibold mb-2">{error}</div>
          <button onClick={fetchOrders} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const activeOrders = orders.filter(order => 
    ['paid', 'preparing', 'ready'].includes(order.status)
  )

  const connectionDisplay = getConnectionDisplay()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {error && (
        <div className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-error-700 hover:text-error-900">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kitchen Dashboard</h1>
          <p className="text-gray-600">
            Real-time order management • Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${connectionDisplay.color}`}>
            {connectionDisplay.icon}
            <span className="text-sm font-medium">{connectionDisplay.text}</span>
          </div>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="form-checkbox"
            />
            <span className="text-sm text-gray-700">Auto refresh</span>
          </label>
          
          <button 
            onClick={fetchOrders}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.status === 'paid').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-warning-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Preparing</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.status === 'preparing').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-success-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ready</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(o => o.status === 'ready').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Tables</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(ordersByTable).filter(tableNum => 
                  ordersByTable[tableNum].some(order => 
                    ['paid', 'preparing', 'ready'].includes(order.status)
                  )
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {activeOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Active Tables Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {Object.entries(ordersByTable)
              .filter(([_, tableOrders]) => 
                tableOrders.some(order => ['paid', 'preparing', 'ready'].includes(order.status))
              )
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([tableNumber, tableOrders]) => {
                const activeTableOrders = tableOrders.filter(order => 
                  ['paid', 'preparing', 'ready'].includes(order.status)
                )
                const hasNewOrders = activeTableOrders.some(order => order.status === 'paid')
                const hasReadyOrders = activeTableOrders.some(order => order.status === 'ready')
                
                return (
                  <div 
                    key={tableNumber}
                    className={`p-3 rounded-lg border-2 text-center cursor-pointer transition-all duration-200 hover:scale-105 ${
                      hasReadyOrders 
                        ? 'border-success-500 bg-success-50 hover:bg-success-100 shadow-success-200 shadow-lg' 
                        : hasNewOrders 
                        ? 'border-warning-500 bg-warning-50 hover:bg-warning-100 shadow-warning-200 shadow-lg'
                        : 'border-primary-500 bg-primary-50 hover:bg-primary-100'
                    }`}
                    onClick={() => {
                      const element = document.getElementById(`table-${tableNumber}`)
                      element?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    <div className="font-bold text-lg">TABLE</div>
                    <div className="text-2xl font-bold">{tableNumber}</div>
                    <div className="text-xs mt-1">
                      {activeTableOrders.length} order{activeTableOrders.length !== 1 ? 's' : ''}
                    </div>
                    {hasReadyOrders && (
                      <div className="text-xs text-success-700 font-semibold mt-1 animate-pulse">READY</div>
                    )}
                    {hasNewOrders && !hasReadyOrders && (
                      <div className="text-xs text-warning-700 font-semibold mt-1">NEW</div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'table' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Table View
          </button>
          <button
            onClick={() => setViewMode('chronological')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'chronological' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Time View
          </button>
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No active orders at the moment</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={`grid gap-6 lg:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-75' : ''}`}>
          {Object.entries(ordersByTable)
            .filter(([_, tableOrders]) => 
              tableOrders.some(order => ['paid', 'preparing', 'ready'].includes(order.status))
            )
            .map(([tableNumber, tableOrders]) => (
              <div key={tableNumber} id={`table-${tableNumber}`} className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-primary-600">
                <div className="bg-primary-600 text-white px-6 py-4">
                  <h3 className="text-xl font-bold flex items-center">
                    <Users className="h-6 w-6 mr-2" />
                    TABLE {tableNumber}
                    <span className="ml-auto bg-white text-primary-600 px-3 py-1 rounded-full text-sm font-semibold">
                      {tableOrders.filter(order => ['paid', 'preparing', 'ready'].includes(order.status)).length} orders
                    </span>
                  </h3>
                </div>
                
                <div className="p-4 space-y-4">
                  {tableOrders
                    .filter(order => ['paid', 'preparing', 'ready'].includes(order.status))
                    .map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-lg">Order #{order.id}</span>
                            <span className={`badge ${getStatusColor(order.status)} flex items-center space-x-1`}>
                              {getStatusIcon(order.status)}
                              <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600 font-medium">
                              {getTimeElapsed(order.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {order.orderItems.map((item) => (
                            <div key={item.id} className="text-sm">
                              <span>{item.quantity}x {item.menuItem.name}</span>
                            </div>
                          ))}
                        </div>

                        {order.specialInstructions && (
                          <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                            <div className="flex items-start">
                              <svg 
                                className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path 
                                  fillRule="evenodd" 
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                                  clipRule="evenodd" 
                                />
                              </svg>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-yellow-800 uppercase mb-1">
                                  Special Instructions:
                                </p>
                                <p className="text-sm text-yellow-900 font-medium whitespace-pre-wrap">
                                  {order.specialInstructions}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="border-t pt-3">
                          <div className="flex space-x-2">
                            {order.status === 'paid' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                                className="flex-1 btn-warning text-xs py-1"
                              >
                                Start Preparing
                              </button>
                            )}
                            
                            {order.status === 'preparing' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'ready')}
                                className="flex-1 btn-success text-xs py-1"
                              >
                                Mark Ready
                              </button>
                            )}
                            
                            {order.status === 'ready' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                className="flex-1 btn-secondary text-xs py-1"
                              >
                                Mark Delivered
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className={`space-y-4 ${loading ? 'opacity-75' : ''}`}>
          {activeOrders
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-lg">
                      TABLE {order.tableNumber}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Order #{order.id}</h3>
                      <div className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`badge ${getStatusColor(order.status)} flex items-center space-x-1`}>
                      {getStatusIcon(order.status)}
                      <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    </span>
                    <div className="text-sm text-gray-600 font-medium">
                      {getTimeElapsed(order.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Items:</h4>
                  <div className="space-y-1">
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="text-sm">
                        <span className="font-medium">{item.quantity}x {item.menuItem.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {order.specialInstructions && (
                  <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                    <div className="flex items-start">
                      <svg 
                        className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-yellow-800 uppercase mb-1">
                          Special Instructions:
                        </p>
                        <p className="text-sm text-yellow-900 font-medium whitespace-pre-wrap">
                          {order.specialInstructions}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  {order.status === 'paid' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="btn-warning flex-1"
                    >
                      Start Preparing
                    </button>
                  )}
                  
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="btn-success flex-1"
                    >
                      Mark Ready for Table {order.tableNumber}
                    </button>
                  )}
                  
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="btn-secondary flex-1"
                    >
                      Delivered to Table {order.tableNumber}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default KitchenDashboard