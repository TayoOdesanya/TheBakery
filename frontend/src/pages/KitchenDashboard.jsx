import { useState, useEffect, useCallback, useRef } from 'react'
import { Truck, Package, Clock, AlertTriangle, CheckCircle, RefreshCw, ChevronDown, ChevronUp, Printer } from 'lucide-react'
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

function shippingLabel(type) {
  if (type === 'express') return 'Express (1–2 days)'
  return 'Standard (3–5 days)'
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
              className="flex-1 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
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
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
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

  const borderColor = order.isOverdue
    ? 'border-l-red-500'
    : order.status === 'ready' ? 'border-l-green-500'
    : order.status === 'preparing' ? 'border-l-yellow-500'
    : 'border-l-blue-500'

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

      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderColor} overflow-hidden`}>
        {/* Header row */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isDelivery
              ? <Truck className="h-4 w-4 text-blue-600 shrink-0" />
              : <Package className="h-4 w-4 text-green-600 shrink-0" />}
            <span className="font-bold text-gray-900 truncate">{order.customerName}</span>
            <span className="text-xs text-gray-400 shrink-0">#{order.orderNumber}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {order.isOverdue && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" /> OVERDUE
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
            {/* Shipping / fulfillment type badges */}
            <div className="flex flex-wrap gap-2 pt-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isDelivery ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {isDelivery ? 'Delivery' : 'Collection'}
              </span>
              {isDelivery && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {shippingLabel(order.shippingType)}
                </span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                order.status === 'paid' ? 'bg-blue-50 text-blue-700'
                : order.status === 'preparing' ? 'bg-yellow-50 text-yellow-700'
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

            {/* Delivery address block */}
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

            {/* Tracking number (once dispatched) */}
            {order.trackingNumber && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-700">Tracking:</span> {order.trackingNumber}
              </div>
            )}

            {/* Kitchen notes — auto-saving */}
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
                  className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Start Preparing
                </button>
              )}
              {order.status === 'preparing' && isDelivery && (
                <button
                  onClick={() => setShowDispatchModal(true)}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Mark as Posted
                </button>
              )}
              {order.status === 'preparing' && !isDelivery && (
                <button
                  onClick={() => onStatusUpdate(order.id, 'ready')}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Mark Ready
                </button>
              )}
              {order.status === 'ready' && !isDelivery && (
                <button
                  onClick={() => onStatusUpdate(order.id, 'delivered')}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
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

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([])
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('active')
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
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
      // audio blocked by browser — visual alert is sufficient
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

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    const aIsDelivery = a.fulfillmentType === 'delivery'
    const bIsDelivery = b.fulfillmentType === 'delivery'
    if (aIsDelivery !== bIsDelivery) return aIsDelivery ? -1 : 1
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const deliveryOrders = sortedOrders.filter((o) => o.fulfillmentType === 'delivery')
  const collectionOrders = sortedOrders.filter((o) => o.fulfillmentType !== 'delivery')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <header className={`sticky top-0 z-30 transition-colors duration-300 ${newOrderAlert ? 'bg-blue-600' : 'bg-gray-900'}`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              {newOrderAlert ? '🔔 New Order!' : 'Kitchen'}
            </h1>
            <p className="text-xs text-gray-400">{orders.length} active</p>
          </div>
          <button
            onClick={() => fetchOrders(false)}
            className="p-2 text-gray-400 hover:text-white rounded-lg"
            aria-label="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex border-t border-white/10">
          {['active', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        {activeTab === 'active' && (
          orders.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle className="h-14 w-14 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">All caught up</p>
              <p className="text-sm text-gray-400">No active orders right now</p>
            </div>
          ) : (
            <div className="space-y-6">
              {deliveryOrders.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5" /> Delivery ({deliveryOrders.length})
                  </h2>
                  <div className="space-y-3">
                    {deliveryOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusUpdate={handleStatusUpdate}
                        onDispatch={handleDispatch}
                        onNotesChange={handleNotesChange}
                      />
                    ))}
                  </div>
                </section>
              )}
              {collectionOrders.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Collection ({collectionOrders.length})
                  </h2>
                  <div className="space-y-3">
                    {collectionOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusUpdate={handleStatusUpdate}
                        onDispatch={handleDispatch}
                        onNotesChange={handleNotesChange}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        )}

        {activeTab === 'history' && (
          historyLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No completed orders yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((order) => (
                <HistoryCard key={order.id} order={order} />
              ))}
            </div>
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
