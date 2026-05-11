import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, Truck, Package, MapPin } from 'lucide-react'
import Footer from '../components/Footer'

const OrderSuccess = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const order = location.state?.order || null

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-6">No order information found</p>
        <button onClick={() => navigate('/menu')} className="btn-primary">Back to Menu</button>
      </div>
    )
  }

  const isDelivery = order.fulfillmentType === 'delivery'
  const orderRef = order.orderNumber || `#${order.id}`

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 p-6">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-500 text-sm mb-2">Reference: <span className="font-semibold text-gray-700">{orderRef}</span></p>
        <p className="text-lg text-gray-600 mb-8">
          Thank you{order.customerName ? `, ${order.customerName}` : ''}. Your order has been received.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Fulfilment info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {isDelivery
                  ? <><Truck className="h-5 w-5 text-blue-600" /><span className="font-semibold text-blue-700">Delivery</span></>
                  : <><Package className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-700">Collection</span></>
                }
              </div>

              {isDelivery && order.deliveryAddressLine1 && (
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <MapPin className="h-4 w-4" />
                    Delivery address
                  </div>
                  <p className="text-gray-900">
                    {order.deliveryName && <span className="block font-medium">{order.deliveryName}</span>}
                    <span className="block">{order.deliveryAddressLine1}</span>
                    {order.deliveryAddressLine2 && <span className="block">{order.deliveryAddressLine2}</span>}
                    <span className="block">{order.deliveryCity}</span>
                    <span className="block">{order.deliveryPostcode}</span>
                  </p>
                </div>
              )}

              {isDelivery && order.estimatedDelivery && (
                <div>
                  <p className="text-sm text-gray-500">Estimated delivery</p>
                  <p className="font-semibold text-gray-900">{formatDate(order.estimatedDelivery)}</p>
                </div>
              )}

              {!isDelivery && (
                <div>
                  <p className="text-sm text-gray-500">Collection name</p>
                  <p className="font-semibold text-gray-900">{order.customerName}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Items ordered</p>
              <div className="space-y-2">
                {order.orderItems?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-900">{item.quantity}× {item.menuItem?.name}</span>
                    <span className="font-medium">£{parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-3 space-y-1">
                {parseFloat(order.shippingCost) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>£{(parseFloat(order.totalAmount) - parseFloat(order.shippingCost)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Shipping</span>
                      <span>£{parseFloat(order.shippingCost).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span className="text-primary-600">£{parseFloat(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What's next */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">What's Next?</h3>
          </div>
          {isDelivery ? (
            <p className="text-gray-700">
              Your order is being prepared and will be dispatched via Royal Mail.
              {order.estimatedDelivery && ` Expected delivery: ${formatDate(order.estimatedDelivery)}.`}
            </p>
          ) : (
            <p className="text-gray-700">
              Your order is being prepared. We'll have it ready for collection — we'll be in touch if we need anything.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate('/menu')} className="btn-primary">Order More</button>
          <button onClick={() => navigate('/')} className="btn-secondary">Back to Home</button>
        </div>
      </div>
    </div>
    <Footer />
    </>
  )
}

export default OrderSuccess
