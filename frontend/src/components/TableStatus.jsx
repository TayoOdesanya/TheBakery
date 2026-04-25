import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { io } from 'socket.io-client'
import axios from 'axios'

const TableStatus = ({ compact = false }) => {
  const [ordersByTable, setOrdersByTable] = useState({})
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState(null)
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    setMounted(true)
    fetchOrders()
    initializeSocket()

    return () => {
      setMounted(false)
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  const initializeSocket = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const newSocket = io(API_URL)

    newSocket.on('connect', () => {
      newSocket.emit('join-kitchen')
    })

    newSocket.on('new-order', () => {
      if (mounted) fetchOrders()
    })

    newSocket.on('order-status-updated', () => {
      if (mounted) fetchOrders()
    })

    setSocket(newSocket)
  }

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/orders')
      if (mounted) {
        setOrdersByTable(response.data.ordersByTable)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      if (mounted) {
        setLoading(false)
      }
    }
  }

  const getTableStatus = (tableOrders) => {
    const activeOrders = tableOrders.filter(order => 
      ['paid', 'preparing', 'ready'].includes(order.status)
    )
    
    if (activeOrders.length === 0) return null
    
    const hasReady = activeOrders.some(order => order.status === 'ready')
    const hasPreparing = activeOrders.some(order => order.status === 'preparing')
    const hasNew = activeOrders.some(order => order.status === 'paid')
    
    if (hasReady) return { status: 'ready', color: 'success', label: 'READY', icon: CheckCircle }
    if (hasPreparing) return { status: 'preparing', color: 'warning', label: 'COOKING', icon: Clock }
    if (hasNew) return { status: 'new', color: 'blue', label: 'NEW', icon: AlertCircle }
    
    return null
  }

  const activeTables = Object.entries(ordersByTable)
    .filter(([_, tableOrders]) => 
      tableOrders.some(order => ['paid', 'preparing', 'ready'].includes(order.status))
    )
    .sort(([a], [b]) => parseInt(a) - parseInt(b))

  if (loading) return <div className="animate-pulse bg-gray-200 h-20 rounded"></div>

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Active Tables</span>
          <span className="text-xs text-gray-500">{activeTables.length} tables</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTables.slice(0, 8).map(([tableNumber, tableOrders]) => {
            const tableStatus = getTableStatus(tableOrders)
            if (!tableStatus) return null
            
            return (
              <div
                key={tableNumber}
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  tableStatus.color === 'success' ? 'bg-success-100 text-success-800' :
                  tableStatus.color === 'warning' ? 'bg-warning-100 text-warning-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                T{tableNumber}
              </div>
            )
          })}
          {activeTables.length > 8 && (
            <span className="text-xs text-gray-500">+{activeTables.length - 8}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center">
          <Users className="h-6 w-6 mr-2" />
          Table Status Overview
        </h3>
        <div className="text-sm text-gray-600">
          {activeTables.length} active table{activeTables.length !== 1 ? 's' : ''}
        </div>
      </div>

      {activeTables.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {activeTables.map(([tableNumber, tableOrders]) => {
            const activeOrders = tableOrders.filter(order => 
              ['paid', 'preparing', 'ready'].includes(order.status)
            )
            const tableStatus = getTableStatus(tableOrders)
            
            if (!tableStatus) return null

            const Icon = tableStatus.icon
            
            return (
              <div
                key={tableNumber}
                className={`relative p-4 rounded-lg border-2 text-center transition-all hover:shadow-lg cursor-pointer ${
                  tableStatus.color === 'success' 
                    ? 'border-success-500 bg-success-50 hover:bg-success-100' 
                    : tableStatus.color === 'warning' 
                    ? 'border-warning-500 bg-warning-50 hover:bg-warning-100'
                    : 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                {/* Status indicator */}
                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                  tableStatus.color === 'success' ? 'bg-success-500' :
                  tableStatus.color === 'warning' ? 'bg-warning-500' :
                  'bg-blue-500'
                } animate-pulse`}></div>

                <Icon className={`h-6 w-6 mx-auto mb-2 ${
                  tableStatus.color === 'success' ? 'text-success-600' :
                  tableStatus.color === 'warning' ? 'text-warning-600' :
                  'text-blue-600'
                }`} />
                
                <div className="font-bold text-lg text-gray-900">
                  TABLE {tableNumber}
                </div>
                
                <div className={`text-xs font-semibold mt-1 ${
                  tableStatus.color === 'success' ? 'text-success-700' :
                  tableStatus.color === 'warning' ? 'text-warning-700' :
                  'text-blue-700'
                }`}>
                  {tableStatus.label}
                </div>
                
                <div className="text-xs text-gray-600 mt-1">
                  {activeOrders.length} order{activeOrders.length !== 1 ? 's' : ''}
                </div>

                {/* Time since oldest order */}
                <div className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const oldestOrder = activeOrders.sort((a, b) => 
                      new Date(a.createdAt) - new Date(b.createdAt)
                    )[0]
                    const minutes = Math.floor((new Date() - new Date(oldestOrder.createdAt)) / (1000 * 60))
                    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Status Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-6 justify-center text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-600">New Orders</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-warning-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Preparing</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-success-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Ready to Serve</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TableStatus