import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Clock, Users } from 'lucide-react'
import axios from 'axios'

const OrderSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      verifyPayment()
    } else {
      setLoading(false)
    }
  }, [sessionId])

  const verifyPayment = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/stripe/verify-session/${sessionId}`
      )
      
      if (response.data.paid) {
        setOrder(response.data.order)
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-6">No order information found</p>
        <button 
          onClick={() => navigate('/menu')}
          className="btn-primary"
        >
          Back to Menu
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 p-6">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Thank you for your order. Your payment has been processed successfully.
        </p>

        {/* Order Details */}
        {order && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              {/* Order Info */}
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="text-lg font-semibold text-gray-900">#{order.id}</p>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Users className="h-4 w-4 mr-2" />
                    Table Number
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{order.tableNumber}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="text-lg font-semibold text-gray-900">{order.customerName}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Order Items</p>
                <div className="space-y-2">
                  {order.orderItems?.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-gray-900">
                        {item.quantity}x {item.menuItem?.name}
                      </span>
                      <span className="font-medium">
                        £{parseFloat(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">£{parseFloat(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Update */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center mb-3">
            <Clock className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">What's Next?</h3>
          </div>
          <p className="text-gray-700">
            Your order is being prepared by our kitchen. We'll bring it to your table shortly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/menu')}
            className="btn-primary"
          >
            Order More Items
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderSuccess