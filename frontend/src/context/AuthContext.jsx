import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const clearSession = () => {
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      delete axios.defaults.headers.common['Authorization']
      setToken(null)
      setUser(null)
    }

    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const code = error.response?.data?.code
        const status = error.response?.status
        if (code === 'ACCOUNT_SUSPENDED' || code === 'SESSION_EXPIRED' || status === 401) {
          clearSession()
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptorId)
  }, [])

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('authToken')
      const storedUser = localStorage.getItem('authUser')
      if (storedToken && storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
          await axios.get('/api/auth/verify')
          setToken(storedToken)
          setUser(parsed)
        } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('authToken')
            localStorage.removeItem('authUser')
            delete axios.defaults.headers.common['Authorization']
          } else {
            // Network/server error — keep the session, don't log out
            const parsed = JSON.parse(storedUser)
            setToken(storedToken)
            setUser(parsed)
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const login = (tokenValue, userData) => {
    localStorage.setItem('authToken', tokenValue)
    localStorage.setItem('authUser', JSON.stringify(userData))
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokenValue}`
    setToken(tokenValue)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated: !!token,
      isAdmin: user?.role === 'admin',
      isBuyer: user?.role === 'buyer',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
