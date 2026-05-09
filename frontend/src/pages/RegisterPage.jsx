import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChefHat } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('')
  const [isReused, setIsReused] = useState(false)

  const [inviteId, setInviteId] = useState(null)
  const [maskedContact, setMaskedContact] = useState('')

  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    async function init() {
      try {
        await axios.get(`/api/invites/${token}`)
        const res = await axios.post('/api/auth/send-invite-otp', { token })
        setInviteId(res.data.inviteId)
        setMaskedContact(res.data.contact)
        setStatus('ready')
      } catch (err) {
        setIsReused(!!err.response?.data?.reused)
        setErrorMessage(err.response?.data?.error || 'This invite link is not valid.')
        setStatus('error')
      }
    }
    init()
  }, [token])

  const handleVerify = async (e) => {
    e.preventDefault()
    setOtpError('')
    setOtpLoading(true)
    try {
      const res = await axios.post('/api/auth/verify-register-otp', { inviteId, code: otp })
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
      const res = await axios.post('/api/auth/send-invite-otp', { token })
      setInviteId(res.data.inviteId)
      setResendMessage('A new code has been sent.')
    } catch {
      setResendMessage('Could not resend. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Verifying your invite…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900">
            {isReused ? 'Invite Already Used' : 'Invite Invalid'}
          </h2>
          <p className="text-sm text-gray-600">{errorMessage}</p>
          {isReused && (
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <a href="/login" className="text-amber-600 hover:underline">Sign in here</a>
            </p>
          )}
          <p className="text-xs text-gray-400">Please contact the bakery if you need assistance.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ChefHat className="mx-auto h-12 w-12 text-amber-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Welcome to The Bakery</h2>
          <p className="mt-2 text-sm text-gray-600">
            We sent a 6-digit code to <strong>{maskedContact}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
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
              : 'Confirm & Enter'
            }
          </button>
          <div className="text-center text-sm">
            {resendMessage && <p className="text-gray-600 mb-2">{resendMessage}</p>}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-amber-600 hover:text-amber-800 disabled:text-gray-400"
            >
              {resendLoading ? 'Sending…' : "Didn't receive a code? Resend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
