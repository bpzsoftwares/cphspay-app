import { useState, useCallback, useEffect } from 'react'
import { api, setToken, getToken } from '../api'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const refresh = useCallback(async () => {
    if (!getToken()) { setLoading(false); return }
    try {
      const u = await api.get('/auth/me')
      setUser(u)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = async (email, password) => {
    setError(null)
    const data = await api.post('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const register = async (payload) => {
    setError(null)
    const data = await api.post('/auth/register', payload)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  return { user, setUser, loading, error, login, register, logout, refresh }
}
