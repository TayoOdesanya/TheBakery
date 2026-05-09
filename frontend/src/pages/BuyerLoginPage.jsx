import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChefHat } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function BuyerLoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()

  const [step, setStep] = useState('contact') // 'contact' | 'otp'
  const [contact, setContact] = useState('')
  const [userId, setUserId] = useState(null)
  const [maskedContact, setMaskedContact] = useState('')

  const [contactLoading, setContactLoading] = useState(false)
  const [contactError, setContactError] = useState('')

  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  const isEmail = (val) => val.includes('@')

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    setContactError('')
    setContactLoading(true)
    try {
      const payload = isEmail(contact) ? { email: contact.toLowerCase() } : { phone: contact }
      const res = await axios.post('/api/auth/buyer-login', payload)
      setUserId(res.data.userId)
      setMaskedContact(res.data.contact)
      setStep('otp')
    } catch (err) {
      setContactError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setContactLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setOtpError('')
    setOtpLoading(true)
    try {
      const res = await axios.post('/api/auth/verify-login-otp', { userId, code: otp })
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Invalid code. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResend = async () => {
    setResendMessage('')
    setResendLoading(true)
    try {
      const payload = isEmail(contact) ? { email: contact.toLowerCase() } : { phone: contact }
      const res = await axios.post('/api/auth/buyer-login', payload)
      setUserId(res.data.userId)
      setResendMessage('A new code has been sent.')
    } catch {
      setResendMessage('Could not resend. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ChefHat className="mx-auto h-12 w-12 text-amber-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">The Bakery</h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'contact' ? 'Sign in to your account' : `Enter the code sent to ${maskedContact}`}
          </p>
        </div>

        {step === 'contact' && (
          <form onSubmit={handleContactSubmit} className="space-y-6">
            {contactError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {contactError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address or phone number
              </label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="your@email.com or +44 7700 000000"
                disabled={contactLoading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={contactLoading || !contact.trim()}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-medium rounded-md transition-colors flex items-center justify-center"
            >
              {contactLoading
                ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                : 'Send Code'
              }
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {otpError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-3 border border-gray-300 rounded-md text-center tracking-widest text-xl font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="000000"
                disabled={otpLoading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={otpLoading || otp.length !== 6}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-medium rounded-md transition-colors flex items-center justify-center"
            >
              {otpLoading
                ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                : 'Sign In'
              }
            </button>
            <div className="text-center text-sm space-y-2">
              {resendMessage && <p className="text-gray-600">{resendMessage}</p>}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-amber-600 hover:text-amber-800 disabled:text-gray-400"
              >
                {resendLoading ? 'Sending…' : "Didn't receive a code? Resend"}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => { setStep('contact'); setOtp(''); setOtpError('') }}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  Use a different email or phone
                </button>
              </div>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-gray-400">
          <a href="/admin/login" className="hover:text-gray-600">Staff login</a>
        </p>
      </div>
    </div>
  )
}
