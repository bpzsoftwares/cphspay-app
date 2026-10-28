const BASE = import.meta.env.VITE_API_URL || '/api'

let _token = null
try { _token = localStorage.getItem('cphs_token') } catch {}

export function getToken() { return _token }
export function setToken(t) {
  _token = t
  try {
    if (t) localStorage.setItem('cphs_token', t)
    else localStorage.removeItem('cphs_token')
  } catch {}
}

export async function apiFetch(path, opts = {}) {
  const headers = {
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
    ...(opts.headers || {}),
  }

  // Não adiciona Content-Type para FormData (multipart)
  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers })

  let data
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    data = await res.json()
  } else {
    data = { message: await res.text() }
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Erro ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  patch:  (path, body)   => apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
  put:    (path, body)   => apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
}
