import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Package, Clock, AlertTriangle, CheckCircle, RefreshCw, ChevronDown, ChevronUp, Printer, Bell, X } from 'lucide-react'
import axios from 'axios'

const POLL_INTERVAL = 5000

function timeElapsed(createdAt) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  return `${h}h ${mins % 60}m ago`
}

function shippingLabel(tier) {
  if (tier === 'next_day') return 'Express (1–2 days)'
  return 'Standard Tracked (3–5 days)'
}

function addWorkingDays(date, days) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const d = result.getDay()
    if (d !== 0 && d !== 6) added++
  }
  return result
}

function getScheduledPostDate(order) {
  const tier = order.shippingTier || order.shippingType
  const daysToAdd = tier === 'next_day' ? 1 : 2
  return addWorkingDays(new Date(order.createdAt), daysToAdd)
}

function getDeliveryPriority(order) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const postDate = getScheduledPostDate(order)
  if (postDate < today) return 'overdue'
  if (postDate.getTime() === today.getTime()) return 'due_today'
  return 'upcoming'
}

function PrintLabelView({ order, onClose }) {
  const { deliveryAddress, customerName, orderNumber } = order
  if (!deliveryAddress) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-900">Shipping Label</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#252525] text-white rounded-lg hover:bg-[#ff9f32] transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button onClick={onClose} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
        <div id="print-label" className="border-2 border-gray-900 rounded-lg p-5 font-mono text-sm leading-relaxed">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-widest">To</p>
          <p className="font-bold text-base">{customerName}</p>
          <p>{deliveryAddress.line1}</p>
          {deliveryAddress.line2 && <p>{deliveryAddress.line2}</p>}
          <p>{deliveryAddress.city}</p>
          <p className="font-bold">{deliveryAddress.postcode?.toUpperCase()}</p>
          <p className="text-xs text-gray-400 mt-4 border-t pt-3">Order #{orderNumber}</p>
        </div>
      </div>
    </div>
  )
}

function DispatchModal({ order, onConfirm, onClose }) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!trackingNumber.trim()) { setError('Tracking number is required'); return }
    setSubmitting(true)
    try {
      await onConfirm(order.id, trackingNumber.trim())
    } catch (err) {
      setError(err.message || 'Failed to dispatch order')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-gray-900 mb-1">Mark as Posted</h2>
        <p className="text-sm text-gray-500 mb-4">Order #{order.orderNumber} · {order.customerName}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number *</label>
            <input
              ref={inputRef}
              type="text"
              value={trackingNumber}
              onChange={(e) => { setTrackingNumber(e.target.value); setError('') }}
              placeholder="e.g. JD000000000000000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 text-sm bg-[#252525] text-white rounded-lg hover:bg-[#ff9f32] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Posting…' : 'Confirm Posted'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NotesField({ orderId, initial, onSaved }) {
  const [value, setValue] = useState(initial || '')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef(null)

  const save = useCallback(async (notes) => {
    setSaving(true)
    try {
      await axios.patch(`/api/orders/${orderId}/notes`, { kitchenNotes: notes || null })
      onSaved?.(notes)
    } catch {
      // silent — note still shows locally
    } finally {
      setSaving(false)
    }
  }, [orderId, onSaved])

  const handleChange = (e) => {
    setValue(e.target.value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(e.target.value), 800)
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Add notes or tracking info…"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#ff9f32] focus:border-transparent bg-gray-50"
      />
      {saving && <span className="absolute bottom-2 right-2 text-xs text-gray-400">Saving…</span>}
    </div>
  )
}

function OrderCard({ order, onStatusUpdate, onDispatch, onNotesChange }) {
  const [expanded, setExpanded] = useState(true)
  const [showPrintLabel, setShowPrintLabel] = useState(false)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const isDelivery = order.fulfillmentType === 'delivery'
  const isExpress = order.shippingTier === 'next_day'
  const priority = order._priority

  const borderColor = priority === 'overdue'
    ? 'border-l-red-500'
    : order.status === 'ready' ? 'border-l-green-500'
    : order.status === 'preparing' ? 'border-l-[#ff9f32]'
    : priority === 'due_today' ? 'border-l-orange-500'
    : 'border-l-blue-400'

  return (
    <>
      {showPrintLabel && <PrintLabelView order={order} onClose={() => setShowPrintLabel(false)} />}
      {showDispatchModal && (
        <DispatchModal
          order={order}
          onConfirm={onDispatch}
          onClose={() => setShowDispatchModal(false)}
        />
      )}

      <div id={`order-${order.id}`} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderColor} overflow-hidden`}>
        {/* Header row */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isDelivery
              ? <Truck className="h-4 w-4 text-blue-500 shrink-0" />
              : <Package className="h-4 w-4 text-green-600 shrink-0" />}
            <span className="font-bold text-gray-900 truncate">{order.customerName}</span>
            <span className="text-xs text-gray-400 shrink-0">#{order.orderNumber}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {priority === 'overdue' && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" /> OVERDUE
              </span>
            )}
            {priority === 'due_today' && (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" /> DUE TODAY
              </span>
            )}
            {isExpress && priority === 'upcoming' && (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                EXPRESS
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {timeElapsed(order.createdAt)}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 pt-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isDelivery ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {isDelivery ? 'Delivery' : 'Collection'}
              </span>
              {isDelivery && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isExpress ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {shippingLabel(order.shippingTier || order.shippingType)}
                </span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                order.status === 'paid' ? 'bg-blue-50 text-blue-700'
                : order.status === 'preparing' ? 'bg-amber-50 text-amber-700'
                : order.status === 'ready' ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'
              }`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-0.5">
              {order.orderItems.map((item) => (
                <div key={item.id} className="text-sm text-gray-700">
                  <span className="font-semibold">{item.quantity}×</span> {item.menuItem.name}
                </div>
              ))}
            </div>

            {/* Special instructions */}
            {order.specialInstructions && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">Note</p>
                <p className="text-xs text-amber-900">{order.specialInstructions}</p>
              </div>
            )}

            {/* Delivery address */}
            {isDelivery && order.deliveryAddress && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm leading-snug">
                    <p className="font-semibold text-gray-800">{order.deliveryAddress.name}</p>
                    <p className="text-gray-600">{order.deliveryAddress.line1}</p>
                    {order.deliveryAddress.line2 && <p className="text-gray-600">{order.deliveryAddress.line2}</p>}
                    <p className="text-gray-600">{order.deliveryAddress.city}</p>
                    <p className="font-semibold text-gray-800">{order.deliveryAddress.postcode?.toUpperCase()}</p>
                  </div>
                  <button
                    onClick={() => setShowPrintLabel(true)}
                    className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-white text-gray-600"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Label
                  </button>
                </div>
              </div>
            )}

            {/* Tracking number */}
            {order.trackingNumber && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-700">Tracking:</span> {order.trackingNumber}
              </div>
            )}

            {/* Kitchen notes */}
            <NotesField
              orderId={order.id}
              initial={order.kitchenNotes}
              onSaved={(notes) => onNotesChange(order.id, notes)}
            />

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {order.status === 'paid' && (
                <button
                  onClick={() => onStatusUpdate(order.id, 'preparing')}
                  className="flex-1 py-2.5 bg-[#ff9f32] hover:bg-[#252525] text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Start Preparing
                </button>
              )}
              {order.status === 'preparing' && isDelivery && (
                <button
                  onClick={() => setShowDispatchModal(true)}
                  className="flex-1 py-2.5 bg-[#252525] hover:bg-[#ff9f32] text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Mark as Posted
                </button>
              )}
              {order.status === 'preparing' && !isDelivery && (
                <button
                  onClick={() => onStatusUpdate(order.id, 'ready')}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Mark Ready
                </button>
              )}
              {order.status === 'ready' && !isDelivery && (
                <button
                  onClick={() => onStatusUpdate(order.id, 'delivered')}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Mark Collected
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function HistoryCard({ order }) {
  const isDelivery = order.fulfillmentType === 'delivery'
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isDelivery
            ? <Truck className="h-4 w-4 text-gray-400 shrink-0" />
            : <Package className="h-4 w-4 text-gray-400 shrink-0" />}
          <span className="font-medium text-gray-700 truncate">{order.customerName}</span>
          <span className="text-xs text-gray-400 shrink-0">#{order.orderNumber}</span>
        </div>
        <span className="text-xs text-gray-400 shrink-0 ml-2">
          {new Date(order.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="mt-1.5 text-sm text-gray-500">
        {order.orderItems.map((item) => (
          <span key={item.id} className="mr-3">{item.quantity}× {item.menuItem.name}</span>
        ))}
      </div>
      {order.trackingNumber && (
        <p className="text-xs text-gray-400 mt-1.5">Tracking: {order.trackingNumber}</p>
      )}
    </div>
  )
}

const PRIORITY_ORDER = { overdue: 0, due_today: 1, upcoming: 2 }

function PrioritySection({ label, labelColor, orders, onStatusUpdate, onDispatch, onNotesChange }) {
  if (orders.length === 0) return null
  return (
    <div className="mb-4">
      <p className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1 ${labelColor}`}>
        {label} ({orders.length})
      </p>
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatusUpdate={onStatusUpdate}
            onDispatch={onDispatch}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>
    </div>
  )
}

function AlertRow({ order, priority, onDismiss, onAction }) {
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const touchStartRef = useRef(null)
  const isOverdue = priority === 'overdue'

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX
    setSwiping(true)
  }
  const handleTouchMove = (e) => {
    if (touchStartRef.current === null) return
    const dx = e.touches[0].clientX - touchStartRef.current
    if (dx < 0) setSwipeX(Math.max(dx, -120))
  }
  const handleTouchEnd = () => {
    if (swipeX < -60) {
      onDismiss()
    } else {
      setSwipeX(0)
    }
    setSwiping(false)
    touchStartRef.current = null
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-center justify-end px-5 bg-red-500 min-w-full">
        <span className="text-white text-xs font-bold uppercase tracking-wide">Dismiss</span>
      </div>
      <div
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
        }}
        className={`relative flex items-start gap-0 ${isOverdue ? 'bg-red-50' : 'bg-orange-50'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          className="flex-1 flex items-start gap-2 px-4 py-3 text-left min-w-0"
          onClick={onAction}
        >
          {isOverdue
            ? <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            : <Clock className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${isOverdue ? 'text-red-700' : 'text-orange-700'}`}>
              {order.customerName}
            </p>
            <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
              #{order.orderNumber} · {shippingLabel(order.shippingTier || order.shippingType)}
            </p>
            <p className={`text-xs font-bold mt-0.5 uppercase tracking-wide ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
              {isOverdue ? 'Overdue — should have been posted' : 'Post today'}
            </p>
          </div>
        </button>
        <button
          onClick={onDismiss}
          className={`shrink-0 p-3 self-stretch flex items-center ${isOverdue ? 'text-red-300 hover:text-red-600' : 'text-orange-300 hover:text-orange-600'} transition-colors`}
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([])
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('delivery')
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [dismissedAlertIds, setDismissedAlertIds] = useState(new Set())
  const prevOrderIdsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const mountedRef = useRef(true)

  const playAlert = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      ;[0, 0.15, 0.3].forEach((offset) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime + offset)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + 0.25)
      })
    } catch {
      // audio blocked by browser
    }
  }, [])

  const fetchOrders = useCallback(async (isInitial = false) => {
    try {
      const { data } = await axios.get('/api/orders/kitchen')
      if (!mountedRef.current) return
      const incoming = data.orders

      if (prevOrderIdsRef.current !== null) {
        const prevIds = prevOrderIdsRef.current
        const hasNew = incoming.some((o) => !prevIds.includes(o.id))
        if (hasNew) {
          playAlert()
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 4000)
        }
      }

      prevOrderIdsRef.current = incoming.map((o) => o.id)
      setOrders(incoming)
      setError(null)
    } catch {
      if (mountedRef.current) setError('Failed to load orders')
    } finally {
      if (mountedRef.current && isInitial) setLoading(false)
    }
  }, [playAlert])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { data } = await axios.get('/api/orders/kitchen/history')
      if (mountedRef.current) setHistory(data.orders)
    } catch {
      // non-critical
    } finally {
      if (mountedRef.current) setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchOrders(true)
    const interval = setInterval(() => fetchOrders(false), POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchOrders])

  useEffect(() => {
    if (activeTab === 'history') fetchHistory()
  }, [activeTab, fetchHistory])

  const handleStatusUpdate = async (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o))
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus })
      if (newStatus === 'delivered') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      }
    } catch {
      setError('Failed to update order status')
      fetchOrders(false)
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleDispatch = async (orderId, trackingNumber) => {
    await axios.patch(`/api/orders/${orderId}/dispatch`, { trackingNumber })
    setOrders((prev) => prev.filter((o) => o.id !== orderId))
  }

  const handleNotesChange = (orderId, notes) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, kitchenNotes: notes } : o))
  }

  const deliveryOrders = orders
    .filter((o) => o.fulfillmentType === 'delivery')
    .map((o) => ({ ...o, _priority: getDeliveryPriority(o) }))
    .sort((a, b) => {
      if (a._priority !== b._priority) return PRIORITY_ORDER[a._priority] - PRIORITY_ORDER[b._priority]
      return new Date(a.createdAt) - new Date(b.createdAt)
    })

  const collectionOrders = orders
    .filter((o) => o.fulfillmentType !== 'delivery')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const overdueDeliveries = deliveryOrders.filter((o) => o._priority === 'overdue')
  const dueTodayDeliveries = deliveryOrders.filter((o) => o._priority === 'due_today')
  const upcomingDeliveries = deliveryOrders.filter((o) => o._priority === 'upcoming')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7f2]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ff9f32]" />
      </div>
    )
  }

  const dismissAlert = (id) => setDismissedAlertIds((prev) => new Set([...prev, id]))
  const dismissAll = () => setDismissedAlertIds((prev) => new Set([...prev, ...visibleOverdue.map((o) => o.id), ...visibleDueToday.map((o) => o.id)]))

  const visibleOverdue = overdueDeliveries.filter((o) => !dismissedAlertIds.has(o.id))
  const visibleDueToday = dueTodayDeliveries.filter((o) => !dismissedAlertIds.has(o.id))
  const alertCount = visibleOverdue.length + visibleDueToday.length

  const goToOrder = (orderId) => {
    setShowNotifications(false)
    setTimeout(() => {
      const el = document.getElementById(`order-${orderId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-2', 'ring-[#ff9f32]')
        setTimeout(() => el.classList.remove('ring-2', 'ring-[#ff9f32]'), 1800)
      }
    }, 100)
  }

  const NotificationContent = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-700" />
          <span className="font-semibold text-gray-900 text-sm">Delivery Alerts</span>
          {alertCount > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
              {alertCount}
            </span>
          )}
        </div>
        <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto divide-y divide-white/60 flex-1">
        {alertCount === 0 ? (
          <div className="px-4 py-10 text-center">
            <CheckCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No delivery alerts</p>
            <p className="text-xs text-gray-400 mt-0.5">All deliveries are on track</p>
          </div>
        ) : (
          <>
            {visibleOverdue.map((order) => (
              <AlertRow
                key={order.id}
                order={order}
                priority="overdue"
                onDismiss={() => dismissAlert(order.id)}
                onAction={() => goToOrder(order.id)}
              />
            ))}
            {visibleDueToday.map((order) => (
              <AlertRow
                key={order.id}
                order={order}
                priority="due_today"
                onDismiss={() => dismissAlert(order.id)}
                onAction={() => goToOrder(order.id)}
              />
            ))}
          </>
        )}
      </div>

      {alertCount > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={dismissAll}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
          >
            Clear all
          </button>
        </div>
      )}
      <p className="text-center text-xs text-gray-300 pb-3 px-4">
        Dismissed alerts return on refresh
      </p>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f5f7f2]">
      {/* Notification panel */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40 md:bg-black/20"
            onClick={() => setShowNotifications(false)}
          />
          <div className="
            fixed z-50 bg-white shadow-2xl border border-gray-100 flex flex-col
            top-[6rem] left-2 right-2 rounded-xl max-h-[70vh]
            md:top-0 md:left-auto md:right-0 md:h-screen md:w-80 md:rounded-none md:rounded-l-2xl md:max-h-screen md:border-r-0
          ">
            <NotificationContent />
          </div>
        </>
      )}

      {/* Sticky header */}
      <header className={`sticky top-0 z-30 transition-colors duration-300 ${newOrderAlert ? 'bg-[#ff9f32]' : 'bg-[#252525]'}`}>
        <div className="max-w-2xl md:max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="shrink-0">
              <img src="/rad-logo.png" alt="R's Confectionery" className="h-8 w-auto" />
            </a>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {newOrderAlert ? '🔔 New Order!' : 'Kitchen'}
              </p>
              <p className="text-xs text-gray-400">{orders.length} active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              ← Admin
            </Link>
            <button
              onClick={() => fetchOrders(false)}
              className="p-2 text-gray-400 hover:text-white rounded-lg"
              aria-label="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowNotifications((p) => !p)}
              className="relative p-2 text-gray-400 hover:text-white rounded-lg"
              aria-label="Delivery alerts"
            >
              <Bell className="h-5 w-5" />
              {(overdueDeliveries.length + dueTodayDeliveries.length) > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl md:max-w-6xl mx-auto px-4 flex border-t border-white/10">
          {/* Delivery — labelled "Delivery / Collection" on desktop since both columns are always visible */}
          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'delivery' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="md:hidden">
              Delivery{deliveryOrders.length > 0 ? ` (${deliveryOrders.length})` : ''}
            </span>
            <span className="hidden md:inline">
              Delivery / Collection{orders.length > 0 ? ` (${orders.length})` : ''}
            </span>
          </button>

          {/* Collection — mobile only; desktop always shows both columns */}
          <button
            onClick={() => setActiveTab('collection')}
            className={`md:hidden px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'collection' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Collection{collectionOrders.length > 0 ? ` (${collectionOrders.length})` : ''}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'history' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            History
          </button>
        </div>
      </header>

      <main className="max-w-2xl md:max-w-6xl mx-auto px-4 py-4 pb-20">
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* Delivery + Collection: tabbed on mobile, side-by-side on desktop */}
        {activeTab !== 'history' && (
          <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start">
            {/* Delivery column */}
            <div className={activeTab === 'collection' ? 'hidden md:block' : ''}>
              {/* Desktop column header */}
              <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 pb-2 border-b border-gray-200">
                <Truck className="h-3.5 w-3.5" />
                Delivery
                {deliveryOrders.length > 0 && (
                  <span className="ml-auto font-bold text-[#ff9f32]">{deliveryOrders.length}</span>
                )}
              </div>
              {deliveryOrders.length === 0 ? (
                <div className="text-center py-16 md:py-20">
                  <CheckCircle className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No active postal orders</p>
                  <p className="text-sm text-gray-400">Delivery orders will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <PrioritySection
                    label="Overdue"
                    labelColor="text-red-500"
                    orders={overdueDeliveries}
                    onStatusUpdate={handleStatusUpdate}
                    onDispatch={handleDispatch}
                    onNotesChange={handleNotesChange}
                  />
                  <PrioritySection
                    label="Due Today"
                    labelColor="text-orange-500"
                    orders={dueTodayDeliveries}
                    onStatusUpdate={handleStatusUpdate}
                    onDispatch={handleDispatch}
                    onNotesChange={handleNotesChange}
                  />
                  <PrioritySection
                    label="Upcoming"
                    labelColor="text-blue-400"
                    orders={upcomingDeliveries}
                    onStatusUpdate={handleStatusUpdate}
                    onDispatch={handleDispatch}
                    onNotesChange={handleNotesChange}
                  />
                </div>
              )}
            </div>

            {/* Collection column */}
            <div className={activeTab === 'delivery' ? 'hidden md:block' : ''}>
              {/* Desktop column header */}
              <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 pb-2 border-b border-gray-200">
                <Package className="h-3.5 w-3.5" />
                Collection
                {collectionOrders.length > 0 && (
                  <span className="ml-auto font-bold text-[#ff9f32]">{collectionOrders.length}</span>
                )}
              </div>
              {collectionOrders.length === 0 ? (
                <div className="text-center py-16 md:py-20">
                  <CheckCircle className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No collection orders</p>
                  <p className="text-sm text-gray-400">Collection orders will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collectionOrders.map((order) => (
                    <div key={order.id}>
                      {order.collectionDate && (
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Collection: {new Date(order.collectionDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      )}
                      <OrderCard
                        order={order}
                        onStatusUpdate={handleStatusUpdate}
                        onDispatch={handleDispatch}
                        onNotesChange={handleNotesChange}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          historyLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff9f32]" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No completed orders yet</p>
              <button
                onClick={fetchHistory}
                className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
              >
                Reload history
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {history.length} completed order{history.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear history
                </button>
              </div>
              <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {history.map((order) => (
                  <HistoryCard key={order.id} order={order} />
                ))}
              </div>
            </>
          )
        )}
      </main>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-label { display: block !important; border: 2px solid black; padding: 20px; font-family: monospace; font-size: 14px; line-height: 1.6; }
        }
      `}</style>
    </div>
  )
}
