// ╔══════════════════════════════════════════════════════════════╗
// ║   CphsPay — App Bancário  ·  Arquivo único App.jsx          ║
// ║   CphsSoftwares  ·  Integração Asaas BaaS                   ║
// ╚══════════════════════════════════════════════════════════════╝

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'

// ════════════════════════════════════════════════════════════════
// TEMA — CORES
// ════════════════════════════════════════════════════════════════
const C = {
  bg:      '#0a0b14',
  surface: '#12141f',
  card:    '#1a1d2e',
  border:  '#1e2133',
  purple:  '#7C5CFC',
  purpleD: '#5A3FD4',
  green:   '#00D4AA',
  red:     '#FC5C7D',
  blue:    '#4B9EFF',
  yellow:  '#F5A623',
  text:    '#e8eaf2',
  muted:   '#9ca3af',
  faint:   '#6b7080',
}

const gBtn = `linear-gradient(135deg, ${C.purple}, ${C.purpleD})`

// ════════════════════════════════════════════════════════════════
// API CLIENT
// ════════════════════════════════════════════════════════════════
const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('cphspay_token')
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers }
  const r = await fetch(`${API_URL}${path}`, { ...opts, headers })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || data.message || `Erro ${r.status}`)
  return data
}

const api = {
  get:    (p)    => apiFetch(p),
  post:   (p, b) => apiFetch(p, { method: 'POST',   body: JSON.stringify(b) }),
  patch:  (p, b) => apiFetch(p, { method: 'PATCH',  body: JSON.stringify(b) }),
  put:    (p, b) => apiFetch(p, { method: 'PUT',    body: JSON.stringify(b) }),
  delete: (p)    => apiFetch(p, { method: 'DELETE' }),
}

async function apiUpload(path, formData) {
  const token = localStorage.getItem('cphspay_token')
  const r = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Erro ${r.status}`)
  return data
}

// ════════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════════
const clean = v => String(v || '').replace(/\D/g, '')

function fmt(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+,)/g, '$1.')}`
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ago(d) {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `${Math.floor(s / 60)}min`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function maskCPF(v) {
  return clean(v).slice(0,11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
    d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a)
}

function maskPhone(v) {
  const d = clean(v).slice(0,11)
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function maskCEP(v) {
  return clean(v).slice(0,8).replace(/(\d{5})(\d{1,3})/, '$1-$2')
}

function validateCPF(cpf) {
  cpf = clean(cpf)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i)
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0
  if (r !== parseInt(cpf[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i)
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0
  return r === parseInt(cpf[10])
}

const TX_ICON = {
  deposit: '⬇️', boleto_deposit: '🧾', card_charge: '💳',
  withdrawal: '⬆️', transfer_out: '➡️', transfer_in: '⬅️',
  bill_payment: '📄', admin_credit: '🎁', admin_debit: '⚠️',
}

const TX_LABEL = {
  deposit: 'Depósito PIX', boleto_deposit: 'Depósito Boleto',
  card_charge: 'Cobrança Cartão', withdrawal: 'Saque PIX',
  transfer_out: 'Transferência Enviada', transfer_in: 'Transferência Recebida',
  bill_payment: 'Pagamento de Conta', admin_credit: 'Crédito Admin', admin_debit: 'Débito Admin',
}

const isCredit = t => ['deposit','boleto_deposit','card_charge','transfer_in','admin_credit'].includes(t)

const KYC_STATUS = {
  pending:   { label: 'Pendente',    color: C.yellow },
  in_review: { label: 'Em análise',  color: C.blue   },
  approved:  { label: 'Aprovado',    color: C.green  },
  rejected:  { label: 'Reprovado',   color: C.red    },
}

const PIX_KEY_LABELS = { CPF: 'CPF', EMAIL: 'E-mail', PHONE: 'Telefone', EVP: 'Chave aleatória', CNPJ: 'CNPJ' }

// ════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════
function useToast() {
  const [toasts, setToasts] = useState([])
  const show = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])
  const Toasts = () => (
    <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, width: 'min(92vw, 360px)', pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? C.red : t.type === 'success' ? C.green : t.type === 'warning' ? C.yellow : C.purple,
          color: '#fff', padding: '12px 18px', borderRadius: 12,
          fontSize: 14, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          animation: 'fadeInDown .25s ease',
        }}>{t.msg}</div>
      ))}
    </div>
  )
  return { show, Toasts }
}

// ════════════════════════════════════════════════════════════════
// COMPONENTES BASE
// ════════════════════════════════════════════════════════════════

function Spinner({ size = 24, color = C.purple }) {
  return (
    <div style={{ width: size, height: size, border: `2.5px solid ${color}33`, borderTop: `2.5px solid ${color}`, borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', inputMode, prefix, maxLength, disabled, error, hint, readOnly, style = {} }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', background: C.card, border: `1.5px solid ${error ? C.red : focused ? C.purple : C.border}`, borderRadius: 12, overflow: 'hidden', transition: 'border .15s' }}>
        {prefix && <span style={{ color: C.muted, fontSize: 15, padding: '0 0 0 14px', flexShrink: 0 }}>{prefix}</span>}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          inputMode={inputMode} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 15, padding: '13px 14px', minWidth: 0, opacity: disabled ? .5 : 1 }}
        />
      </div>
      {error && <span style={{ color: C.red, fontSize: 12 }}>{error}</span>}
      {hint  && <span style={{ color: C.faint, fontSize: 12 }}>{hint}</span>}
    </div>
  )
}

function Select({ label, value, onChange, children, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>}
      <select value={value} onChange={onChange} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 15, padding: '13px 14px', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%236b7080' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L2 5h12z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: 16 }}>
        {children}
      </select>
    </div>
  )
}

function Btn({ children, onClick, loading, disabled, variant = 'primary', fullWidth, size = 'md', style = {}, type = 'button' }) {
  const bg   = variant === 'primary' ? gBtn : variant === 'success' ? `linear-gradient(135deg,#00D4AA,#00A882)` : variant === 'danger' ? `linear-gradient(135deg,${C.red},#d03060)` : 'transparent'
  const bd   = variant === 'secondary' ? `1.5px solid ${C.border}` : 'none'
  const col  = variant === 'secondary' ? C.text : '#fff'
  const pad  = size === 'sm' ? '7px 14px' : size === 'lg' ? '16px 24px' : '13px 20px'
  const fs   = size === 'sm' ? 13 : size === 'lg' ? 17 : 15
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} style={{
      width: fullWidth ? '100%' : undefined, background: bg, border: bd, borderRadius: 12,
      color: col, fontWeight: 700, fontSize: fs, padding: pad, cursor: disabled || loading ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: disabled ? .5 : 1, transition: 'opacity .15s, transform .1s',
      ...style,
    }}>
      {loading ? <Spinner size={18} color={col} /> : children}
    </button>
  )
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16,
      cursor: onClick ? 'pointer' : undefined, transition: onClick ? 'background .15s' : undefined,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children, maxH }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: C.surface, borderRadius: '20px 20px 0 0', padding: '0 0 max(20px, env(safe-area-inset-bottom)) 0', maxHeight: maxH || '90vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s cubic-bezier(.32,1.1,.65,1)' }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 4, margin: '12px auto 0' }} />
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 0' }}>
          <h3 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: C.card, border: 'none', borderRadius: 10, color: C.muted, fontSize: 18, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

function Avatar({ name = '', size = 40, style = {} }) {
  const letters = name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{ width: size, height: size, borderRadius: size * .4, flexShrink: 0, background: `hsl(${hue},55%,38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * .38, ...style }}>
      {letters || '?'}
    </div>
  )
}

function CopyBtn({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <button onClick={copy} style={{ background: copied ? C.green + '22' : C.card, border: `1px solid ${copied ? C.green : C.border}`, borderRadius: 8, color: copied ? C.green : C.muted, fontSize: 12, fontWeight: 700, padding: '6px 12px', cursor: 'pointer' }}>
      {copied ? '✓ Copiado' : label}
    </button>
  )
}

function Badge({ label, color }) {
  return (
    <span style={{ background: color + '22', color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: '.3px' }}>{label}</span>
  )
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ color: C.faint, fontSize: 12 }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TELA DE AUTH (login + cadastro)
// ════════════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode, setMode]     = useState('login') // login | register | forgot
  const [step, setStep]     = useState(1)       // register: 1=dados, 2=endereço
  const [loading, setLoading] = useState(false)
  const { show, Toasts }    = useToast()

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPass: '', cpf: '', phone: '',
    birth_date: '', cep: '', street: '', address_number: '', neighborhood: '', city: '', state: '',
    is_minor: false, guardian_name: '', guardian_cpf: '', guardian_email: '',
  })
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode]     = useState('')
  const [resetPass, setResetPass]     = useState('')
  const [forgotStep, setForgotStep]   = useState(1) // 1=email, 2=código+nova senha

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setV = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const fetchCEP = async (cep) => {
    const c = clean(cep)
    if (c.length !== 8) return
    try {
      const r = await api.get(`/user/cep/${c}`)
      setForm(p => ({ ...p, street: r.street || p.street, neighborhood: r.neighborhood || p.neighborhood, city: r.city || p.city, state: r.state || p.state }))
    } catch {}
  }

  const doLogin = async () => {
    if (!form.email || !form.password) return show('Preencha email e senha', 'warning')
    setLoading(true)
    try {
      const r = await api.post('/auth/login', { email: form.email, password: form.password })
      localStorage.setItem('cphspay_token', r.token)
      onLogin(r.user)
    } catch (e) { show(e.message, 'error') }
    finally { setLoading(false) }
  }

  const doRegister = async () => {
    if (step === 1) {
      if (!form.name)  return show('Nome obrigatório', 'warning')
      if (!form.email) return show('Email obrigatório', 'warning')
      if (!form.cpf || !validateCPF(form.cpf)) return show('CPF inválido', 'warning')
      if (!form.password || form.password.length < 6) return show('Senha mínimo 6 caracteres', 'warning')
      if (form.password !== form.confirmPass) return show('Senhas não coincidem', 'warning')
      if (form.is_minor && !form.guardian_name) return show('Nome do responsável obrigatório para menores', 'warning')
      return setStep(2)
    }
    setLoading(true)
    try {
      const payload = {
        name: form.name, email: form.email, password: form.password,
        cpf: clean(form.cpf), phone: clean(form.phone), birth_date: form.birth_date,
        cep: clean(form.cep), street: form.street, address_number: form.address_number,
        neighborhood: form.neighborhood, city: form.city, state: form.state,
        is_minor: form.is_minor,
        ...(form.is_minor ? { guardian_name: form.guardian_name, guardian_cpf: clean(form.guardian_cpf), guardian_email: form.guardian_email } : {}),
      }
      const r = await api.post('/auth/register', payload)
      localStorage.setItem('cphspay_token', r.token)
      onLogin(r.user)
    } catch (e) { show(e.message, 'error') }
    finally { setLoading(false) }
  }

  const doForgot = async () => {
    if (forgotStep === 1) {
      if (!forgotEmail) return show('Informe o email', 'warning')
      setLoading(true)
      try { await api.post('/auth/forgot-password', { email: forgotEmail }); setForgotStep(2); show('Código enviado pro email', 'success') }
      catch (e) { show(e.message, 'error') }
      finally { setLoading(false) }
    } else {
      if (!resetCode || !resetPass) return show('Preencha o código e a nova senha', 'warning')
      setLoading(true)
      try { await api.post('/auth/reset-password', { email: forgotEmail, code: resetCode, password: resetPass }); show('Senha redefinida!', 'success'); setMode('login'); setForgotStep(1) }
      catch (e) { show(e.message, 'error') }
      finally { setLoading(false) }
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <Toasts />
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 72, height: 72, background: gBtn, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 14px', boxShadow: `0 8px 32px ${C.purple}44` }}>💳</div>
        <h1 style={{ margin: 0, color: C.text, fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>CphsPay</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>by CphsSoftwares</p>
      </div>

      <div style={{ width: '100%', maxWidth: 400, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* LOGIN */}
        {mode === 'login' && <>
          <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 800 }}>Entrar</h2>
          <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com" />
          <Input label="Senha" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
          <Btn onClick={doLogin} loading={loading} fullWidth>Entrar</Btn>
          <p style={{ margin: 0, textAlign: 'center', color: C.muted, fontSize: 13 }}>
            <span style={{ color: C.purple, cursor: 'pointer', fontWeight: 700 }} onClick={() => setMode('forgot')}>Esqueci a senha</span>
            {' · '}
            <span style={{ color: C.purple, cursor: 'pointer', fontWeight: 700 }} onClick={() => { setMode('register'); setStep(1) }}>Criar conta</span>
          </p>
        </>}

        {/* CADASTRO */}
        {mode === 'register' && <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step === 2 && <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: C.purple, fontSize: 20, cursor: 'pointer' }}>←</button>}
            <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 800 }}>Criar conta</h2>
            <span style={{ marginLeft: 'auto', color: C.faint, fontSize: 13 }}>{step}/2</span>
          </div>

          {step === 1 && <>
            <Input label="Nome completo" value={form.name} onChange={set('name')} placeholder="Seu nome" />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com" />
            <Input label="CPF" value={form.cpf} onChange={e => setV('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
            <Input label="Telefone" value={form.phone} onChange={e => setV('phone', maskPhone(e.target.value))} placeholder="(11) 99999-9999" inputMode="tel" />
            <Input label="Data de nascimento" type="date" value={form.birth_date} onChange={set('birth_date')} />
            <Input label="Senha" type="password" value={form.password} onChange={set('password')} placeholder="mínimo 6 caracteres" />
            <Input label="Confirmar senha" type="password" value={form.confirmPass} onChange={set('confirmPass')} placeholder="repita a senha" />

            {/* Menor de idade */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: C.card, borderRadius: 12 }}>
              <input type="checkbox" id="is_minor" checked={form.is_minor} onChange={e => setV('is_minor', e.target.checked)} style={{ width: 18, height: 18, accentColor: C.purple }} />
              <label htmlFor="is_minor" style={{ color: C.text, fontSize: 14, cursor: 'pointer' }}>Conta para menor de idade</label>
            </div>

            {form.is_minor && <>
              <Divider label="DADOS DO RESPONSÁVEL" />
              <Input label="Nome do responsável" value={form.guardian_name} onChange={set('guardian_name')} placeholder="Nome completo" />
              <Input label="CPF do responsável" value={form.guardian_cpf} onChange={e => setV('guardian_cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
              <Input label="Email do responsável" type="email" value={form.guardian_email} onChange={set('guardian_email')} placeholder="responsavel@email.com" />
            </>}
          </>}

          {step === 2 && <>
            <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Endereço (opcional, mas necessário para algumas funções)</p>
            <Input label="CEP" value={form.cep} onChange={e => { setV('cep', maskCEP(e.target.value)); if (clean(e.target.value).length === 8) fetchCEP(e.target.value) }} placeholder="00000-000" inputMode="numeric" />
            <Input label="Logradouro" value={form.street} onChange={set('street')} placeholder="Rua, Av..." />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <Input label="Bairro" value={form.neighborhood} onChange={set('neighborhood')} placeholder="Bairro" />
              <Input label="Número" value={form.address_number} onChange={set('address_number')} placeholder="Nº" inputMode="numeric" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <Input label="Cidade" value={form.city} onChange={set('city')} placeholder="Cidade" />
              <Input label="UF" value={form.state} onChange={set('state')} placeholder="SP" maxLength={2} style={{ textTransform: 'uppercase' }} />
            </div>
          </>}

          <Btn onClick={doRegister} loading={loading} fullWidth>{step === 1 ? 'Continuar →' : 'Criar conta'}</Btn>
          <p style={{ margin: 0, textAlign: 'center', color: C.muted, fontSize: 13 }}>
            Já tem conta? <span style={{ color: C.purple, cursor: 'pointer', fontWeight: 700 }} onClick={() => setMode('login')}>Entrar</span>
          </p>
        </>}

        {/* ESQUECI SENHA */}
        {mode === 'forgot' && <>
          <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 800 }}>Recuperar senha</h2>
          {forgotStep === 1 && <>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>Informe seu email e enviaremos um código.</p>
            <Input label="Email" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="seu@email.com" />
          </>}
          {forgotStep === 2 && <>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>Verifique seu email e insira o código de 6 dígitos.</p>
            <Input label="Código de verificação" value={resetCode} onChange={e => setResetCode(e.target.value)} placeholder="000000" inputMode="numeric" maxLength={6} />
            <Input label="Nova senha" type="password" value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="mínimo 6 caracteres" />
          </>}
          <Btn onClick={doForgot} loading={loading} fullWidth>{forgotStep === 1 ? 'Enviar código' : 'Redefinir senha'}</Btn>
          <p style={{ margin: 0, textAlign: 'center' }}>
            <span style={{ color: C.purple, cursor: 'pointer', fontSize: 13, fontWeight: 700 }} onClick={() => { setMode('login'); setForgotStep(1) }}>← Voltar ao login</span>
          </p>
        </>}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TELA: DASHBOARD (saldo + ações rápidas)
// ════════════════════════════════════════════════════════════════
function Dashboard({ user, onNav, onRefreshUser }) {
  const [balance, setBalance] = useState(user.balance || 0)
  const [showBalance, setShowBalance] = useState(true)
  const [modal, setModal]     = useState(null) // deposit | withdraw | transfer
  const [loadingBal, setLoadingBal] = useState(false)
  const { show, Toasts } = useToast()

  // Depositando (QR PIX)
  const [deposit, setDeposit]   = useState(null)
  const [amount, setAmount]     = useState('')
  const [desc, setDesc]         = useState('')
  const [loadingOp, setLoadingOp] = useState(false)
  const [pollTimer, setPollTimer] = useState(null)

  // Saque / Transferência
  const [pixKey, setPixKey]     = useState('')
  const [pixType, setPixType]   = useState('CPF')

  const refreshBalance = async () => {
    setLoadingBal(true)
    try { const r = await api.get('/user/balance'); setBalance(r.balance) }
    catch {}
    finally { setLoadingBal(false) }
  }

  useEffect(() => { refreshBalance() }, [])

  const closeModal = () => {
    setModal(null); setAmount(''); setDesc(''); setDeposit(null); setPixKey('')
    if (pollTimer) { clearInterval(pollTimer); setPollTimer(null) }
  }

  const gerarQR = async () => {
    const a = parseFloat(amount.replace(',', '.'))
    if (!a || a < 0.01) return show('Valor mínimo R$ 0,01', 'warning')
    setLoadingOp(true)
    try {
      const r = await api.post('/pix/deposit', { amount: a, description: desc || 'Depósito CphsPay' })
      setDeposit(r)
      // Poll a cada 4s para verificar pagamento
      const t = setInterval(async () => {
        try {
          const s = await api.get(`/pix/deposit/${r.id}`)
          if (s.status === 'completed') {
            clearInterval(t); setPollTimer(null)
            setBalance(s.balance); onRefreshUser()
            show('Depósito confirmado! 💰', 'success'); closeModal()
          }
        } catch {}
      }, 4000)
      setPollTimer(t)
    } catch (e) { show(e.message, 'error') }
    finally { setLoadingOp(false) }
  }

  const enviarPix = async () => {
    const a = parseFloat(amount.replace(',', '.'))
    if (!a || a < 0.01) return show('Valor inválido', 'warning')
    if (!pixKey) return show('Informe a chave PIX', 'warning')
    setLoadingOp(true)
    try {
      await api.post('/pix/withdraw', { amount: a, pix_key: pixKey.trim(), pix_key_type: pixType, description: desc || undefined })
      const r = await api.get('/user/balance')
      setBalance(r.balance); onRefreshUser()
      show('PIX enviado! ✅', 'success'); closeModal()
    } catch (e) { show(e.message, 'error') }
    finally { setLoadingOp(false) }
  }

  const transferirInterno = async () => {
    const a = parseFloat(amount.replace(',', '.'))
    if (!a || a < 0.01) return show('Valor inválido', 'warning')
    if (!pixKey) return show('Informe o email ou CPF', 'warning')
    setLoadingOp(true)
    try {
      await api.post('/transfers/internal', { to: pixKey.trim(), amount: a, description: desc || undefined })
      const r = await api.get('/user/balance')
      setBalance(r.balance); onRefreshUser()
      show('Transferência realizada! ✅', 'success'); closeModal()
    } catch (e) { show(e.message, 'error') }
    finally { setLoadingOp(false) }
  }

  const kycInfo = KYC_STATUS[user.kyc_status] || KYC_STATUS.pending

  return (
    <div style={{ padding: '0 0 96px' }}>
      <Toasts />

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${C.purpleD} 0%, ${C.purple} 60%, #9B7FFF 100%)`, padding: '48px 20px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.75)', fontSize: 13 }}>Olá,</p>
            <h2 style={{ margin: '2px 0 0', color: '#fff', fontSize: 20, fontWeight: 800 }}>{user.name?.split(' ')[0]} 👋</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge label={kycInfo.label} color={user.kyc_status === 'approved' ? '#00D4AA' : '#F5A623'} />
          </div>
        </div>
        {/* Saldo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 600 }}>SALDO DISPONÍVEL</p>
            <button onClick={() => setShowBalance(p => !p)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, padding: '2px 8px', cursor: 'pointer' }}>
              {showBalance ? '🙈' : '👁️'}
            </button>
            {loadingBal && <Spinner size={14} color="rgba(255,255,255,.6)" />}
          </div>
          <p style={{ margin: '6px 0 0', color: '#fff', fontSize: 32, fontWeight: 900, letterSpacing: -1, filter: showBalance ? 'none' : 'blur(8px)', transition: 'filter .2s' }}>
            {fmt(balance)}
          </p>
        </div>
      </div>

      {/* Aviso KYC */}
      {user.kyc_status !== 'approved' && (
        <div onClick={() => onNav('kyc')} style={{ margin: '16px 16px 0', background: C.yellow + '18', border: `1px solid ${C.yellow}44`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, color: C.yellow, fontSize: 13, fontWeight: 700 }}>Verifique sua identidade</p>
            <p style={{ margin: '2px 0 0', color: C.muted, fontSize: 12 }}>Envie seus documentos para desbloquear saques e transferências</p>
          </div>
          <span style={{ color: C.yellow, marginLeft: 'auto', fontSize: 16 }}>→</span>
        </div>
      )}

      {/* Ações rápidas */}
      <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { icon: '⬇️', label: 'Receber', action: () => setModal('deposit') },
          { icon: '⬆️', label: 'Enviar', action: () => setModal('withdraw') },
          { icon: '👤', label: 'Transferir', action: () => setModal('transfer') },
          { icon: '🔑', label: 'Chaves', action: () => onNav('pix') },
        ].map(({ icon, label, action }) => (
          <button key={label} onClick={action} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Últimas transações */}
      <TxPreview onSeeAll={() => onNav('extrato')} />

      {/* MODAL: RECEBER (QR PIX) */}
      {modal === 'deposit' && (
        <Modal title="Receber via PIX" onClose={closeModal}>
          {!deposit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Valor (R$)" prefix="R$" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" />
              <Input label="Descrição (opcional)" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Aluguel, vendas..." />
              <Btn onClick={gerarQR} loading={loadingOp} fullWidth>Gerar QR Code</Btn>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <p style={{ margin: 0, color: C.muted, fontSize: 13, textAlign: 'center' }}>
                Escaneie o QR Code ou copie o código PIX
              </p>
              {deposit.qr_code && (
                <img src={`data:image/png;base64,${deposit.qr_code}`} alt="QR Code PIX" style={{ width: 220, height: 220, borderRadius: 16, border: `1px solid ${C.border}` }} />
              )}
              <div style={{ width: '100%', background: C.card, borderRadius: 12, padding: 12, wordBreak: 'break-all', fontSize: 11, color: C.muted, maxHeight: 80, overflow: 'hidden' }}>
                {deposit.copy_paste}
              </div>
              <CopyBtn text={deposit.copy_paste} label="📋 Copiar código PIX" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spinner size={16} color={C.green} />
                <p style={{ margin: 0, color: C.green, fontSize: 13 }}>Aguardando pagamento...</p>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* MODAL: ENVIAR PIX */}
      {modal === 'withdraw' && (
        <Modal title="Enviar PIX" onClose={closeModal}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {user.kyc_status !== 'approved' && (
              <div style={{ background: C.yellow + '18', border: `1px solid ${C.yellow}44`, borderRadius: 12, padding: 12 }}>
                <p style={{ margin: 0, color: C.yellow, fontSize: 13, fontWeight: 700 }}>⚠️ KYC necessário</p>
                <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>Para saques e envios você precisa verificar sua identidade.</p>
              </div>
            )}
            <Select label="Tipo de chave" value={pixType} onChange={e => setPixType(e.target.value)}>
              {Object.entries(PIX_KEY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Input label="Chave PIX" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder={pixType === 'CPF' ? '000.000.000-00' : pixType === 'EMAIL' ? 'email@exemplo.com' : pixType === 'PHONE' ? '(11) 99999-9999' : 'Chave PIX'} />
            <Input label="Valor (R$)" prefix="R$" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" />
            <Input label="Descrição (opcional)" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Motivo da transferência" />
            <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Saldo disponível: <strong style={{ color: C.text }}>{fmt(balance)}</strong></p>
            <Btn onClick={enviarPix} loading={loadingOp} fullWidth disabled={user.kyc_status !== 'approved'}>Enviar PIX</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL: TRANSFERÊNCIA INTERNA */}
      {modal === 'transfer' && (
        <Modal title="Transferir (CphsPay)" onClose={closeModal}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Grátis e instantâneo entre usuários CphsPay</p>
            <Input label="Email ou CPF do destinatário" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="usuario@email.com ou CPF" />
            <Input label="Valor (R$)" prefix="R$" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" />
            <Input label="Descrição (opcional)" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Motivo" />
            <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Saldo disponível: <strong style={{ color: C.text }}>{fmt(balance)}</strong></p>
            <Btn onClick={transferirInterno} loading={loadingOp} fullWidth>Transferir</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Prévia de transações no Dashboard
function TxPreview({ onSeeAll }) {
  const [txs, setTxs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/user/statement?limit=5').then(r => setTxs(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '24px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 800 }}>Últimas movimentações</h3>
        <span onClick={onSeeAll} style={{ color: C.purple, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ver todas →</span>
      </div>
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>}
      {!loading && txs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: C.faint, fontSize: 14 }}>Nenhuma movimentação ainda</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {txs.map(tx => (
          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: isCredit(tx.type) ? C.green + '22' : C.red + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {TX_ICON[tx.type] || '💸'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: C.text, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TX_LABEL[tx.type] || tx.type}</p>
              <p style={{ margin: '2px 0 0', color: C.faint, fontSize: 12 }}>{ago(tx.created_at)}</p>
            </div>
            <span style={{ color: isCredit(tx.type) ? C.green : C.red, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
              {isCredit(tx.type) ? '+' : '-'}{fmt(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TELA: PIX — chaves + consulta
// ════════════════════════════════════════════════════════════════
function PixScreen({ user }) {
  const [keys, setKeys]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null) // add | lookup
  const [newType, setNewType] = useState('EVP')
  const [newKey, setNewKey]  = useState('')
  const [lookupKey, setLookupKey] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [loadingOp, setLoadingOp] = useState(false)
  const { show, Toasts } = useToast()

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/pix/keys'); setKeys(r) }
    catch (e) { show(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const addKey = async () => {
    setLoadingOp(true)
    try {
      await api.post('/pix/keys', { type: newType, key_value: newKey || undefined })
      show('Chave adicionada!', 'success'); setModal(null); setNewKey(''); load()
    } catch (e) { show(e.message, 'error') }
    finally { setLoadingOp(false) }
  }

  const removeKey = async (id) => {
    if (!confirm('Remover esta chave PIX?')) return
    try { await api.delete(`/pix/keys/${id}`); show('Chave removida', 'success'); load() }
    catch (e) { show(e.message, 'error') }
  }

  const doLookup = async () => {
    if (!lookupKey.trim()) return show('Informe a chave', 'warning')
    setLoadingOp(true); setLookupResult(null)
    try { const r = await api.get(`/pix/lookup/${encodeURIComponent(lookupKey.trim())}`); setLookupResult(r) }
    catch (e) { show(e.message, 'error') }
    finally { setLoadingOp(false) }
  }

  const TYPE_COLOR = { CPF: C.blue, EMAIL: C.purple, PHONE: C.green, EVP: C.yellow, CNPJ: C.red }

  return (
    <div style={{ padding: '24px 16px 96px' }}>
      <Toasts />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: C.text, fontSize: 22, fontWeight: 900 }}>Chaves PIX</h2>
          <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>Gerencie suas chaves</p>
        </div>
        <Btn onClick={() => setModal('lookup')} variant="secondary" size="sm">🔍 Consultar</Btn>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}

      {!loading && keys.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🔑</p>
          <p style={{ margin: 0, color: C.text, fontWeight: 700 }}>Nenhuma chave cadastrada</p>
          <p style={{ margin: '6px 0 16px', color: C.muted, fontSize: 13 }}>Adicione uma chave para receber PIX</p>
          <Btn onClick={() => setModal('add')}>Adicionar chave</Btn>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {keys.map(k => (
          <Card key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: (TYPE_COLOR[k.type] || C.purple) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {k.type === 'CPF' ? '🪪' : k.type === 'EMAIL' ? '📧' : k.type === 'PHONE' ? '📱' : k.type === 'EVP' ? '🎲' : '🏢'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge label={PIX_KEY_LABELS[k.type] || k.type} color={TYPE_COLOR[k.type] || C.purple} />
              </div>
              <p style={{ margin: '4px 0 0', color: C.text, fontSize: 13, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.key_value}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <CopyBtn text={k.key_value} />
              <button onClick={() => removeKey(k.id)} style={{ background: C.red + '18', border: `1px solid ${C.red}44`, borderRadius: 8, color: C.red, fontSize: 14, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </Card>
        ))}
      </div>

      {keys.length < 5 && (
        <Btn onClick={() => setModal('add')} fullWidth style={{ marginTop: 16 }}>+ Adicionar chave PIX</Btn>
      )}

      {/* MODAL: Adicionar chave */}
      {modal === 'add' && (
        <Modal title="Adicionar chave PIX" onClose={() => { setModal(null); setNewKey('') }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Select label="Tipo de chave" value={newType} onChange={e => { setNewType(e.target.value); setNewKey('') }}>
              {Object.entries(PIX_KEY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            {newType === 'EVP' && (
              <div style={{ background: C.card, borderRadius: 12, padding: 14 }}>
                <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Uma chave aleatória será gerada automaticamente. ✨</p>
              </div>
            )}
            {newType === 'CPF' && (
              <div style={{ background: C.card, borderRadius: 12, padding: 14 }}>
                <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Será usado o CPF cadastrado na sua conta: <strong style={{ color: C.text }}>{user.cpf || 'não informado'}</strong></p>
              </div>
            )}
            {newType === 'PHONE' && (
              <div style={{ background: C.card, borderRadius: 12, padding: 14 }}>
                <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Será usado o telefone da sua conta: <strong style={{ color: C.text }}>{user.phone || 'não informado'}</strong></p>
              </div>
            )}
            {(newType === 'EMAIL' || newType === 'CNPJ') && (
              <Input label={PIX_KEY_LABELS[newType]} value={newKey} onChange={e => setNewKey(e.target.value)} placeholder={newType === 'EMAIL' ? 'seu@email.com' : '00.000.000/0001-00'} />
            )}
            <Btn onClick={addKey} loading={loadingOp} fullWidth>Adicionar chave</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL: Consultar chave */}
      {modal === 'lookup' && (
        <Modal title="Consultar chave PIX" onClose={() => { setModal(null); setLookupKey(''); setLookupResult(null) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Chave PIX" value={lookupKey} onChange={e => setLookupKey(e.target.value)} placeholder="CPF, email, telefone ou chave" />
            <Btn onClick={doLookup} loading={loadingOp} fullWidth>Consultar</Btn>
            {lookupResult && (
              <Card style={{ border: `1px solid ${C.green}44` }}>
                <p style={{ margin: '0 0 12px', color: C.green, fontSize: 12, fontWeight: 700 }}>✓ CHAVE ENCONTRADA</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lookupResult.ownerName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted, fontSize: 14 }}>Titular</span>
                      <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{lookupResult.ownerName}</span>
                    </div>
                  )}
                  {lookupResult.bankName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted, fontSize: 14 }}>Banco</span>
                      <span style={{ color: C.text, fontSize: 14 }}>{lookupResult.bankName}</span>
                    </div>
                  )}
                  {lookupResult.cpfCnpj && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted, fontSize: 14 }}>CPF/CNPJ</span>
                      <span style={{ color: C.text, fontSize: 14 }}>{lookupResult.cpfCnpj?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TELA: EXTRATO
// ════════════════════════════════════════════════════════════════
function ExtratoScreen() {
  const [txs, setTxs]     = useState([])
  const [page, setPage]   = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all') // all | credit | debit
  const [detail, setDetail]   = useState(null)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const typeParam = filter === 'credit'
        ? '&type=deposit,boleto_deposit,transfer_in,admin_credit,card_charge'
        : filter === 'debit'
        ? '&type=withdrawal,transfer_out,bill_payment,admin_debit'
        : ''
      const r = await api.get(`/user/statement?page=${p}&limit=20${typeParam}`)
      setTxs(r.data || []); setTotal(r.total || 0); setPage(p)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [filter])

  const STATUS_COLOR = { completed: C.green, pending: C.yellow, failed: C.red }

  return (
    <div style={{ padding: '24px 16px 96px' }}>
      <h2 style={{ margin: '0 0 4px', color: C.text, fontSize: 22, fontWeight: 900 }}>Extrato</h2>
      <p style={{ margin: '0 0 16px', color: C.muted, fontSize: 13 }}>Histórico de movimentações</p>

      {/* Filtros */}
      <div style={{ display: 'flex', background: C.card, borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 }}>
        {[['all','Todos'],['credit','Entradas'],['debit','Saídas']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', background: filter === v ? C.purple : 'transparent', color: filter === v ? '#fff' : C.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}>{l}</button>
        ))}
      </div>

      {loading && page === 1 && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}

      {!loading && txs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📋</p>
          <p style={{ color: C.muted, margin: 0 }}>Nenhuma movimentação encontrada</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {txs.map(tx => (
          <div key={tx.id} onClick={() => setDetail(tx)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: isCredit(tx.type) ? C.green + '22' : C.red + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {TX_ICON[tx.type] || '💸'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: C.text, fontSize: 14, fontWeight: 600 }}>{TX_LABEL[tx.type] || tx.type}</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                <span style={{ color: C.faint, fontSize: 12 }}>{fmtDate(tx.created_at)}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[tx.status] || C.faint, flexShrink: 0 }} />
              </div>
              {tx.description && <p style={{ margin: '2px 0 0', color: C.faint, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</p>}
            </div>
            <span style={{ color: isCredit(tx.type) ? C.green : C.red, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
              {isCredit(tx.type) ? '+' : '-'}{fmt(tx.amount)}
            </span>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <Btn onClick={() => load(page - 1)} disabled={page === 1} variant="secondary" size="sm">← Anterior</Btn>
          <span style={{ color: C.muted, fontSize: 13, alignSelf: 'center' }}>{page} / {Math.ceil(total / 20)}</span>
          <Btn onClick={() => load(page + 1)} disabled={page >= Math.ceil(total / 20)} variant="secondary" size="sm">Próxima →</Btn>
        </div>
      )}

      {/* Modal detalhe transação */}
      {detail && (
        <Modal title="Detalhes" onClose={() => setDetail(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{TX_ICON[detail.type] || '💸'}</div>
              <p style={{ margin: 0, color: isCredit(detail.type) ? C.green : C.red, fontSize: 28, fontWeight: 900 }}>
                {isCredit(detail.type) ? '+' : '-'}{fmt(detail.amount)}
              </p>
              <Badge label={detail.status === 'completed' ? 'Concluído' : detail.status === 'pending' ? 'Pendente' : 'Falhou'} color={STATUS_COLOR[detail.status] || C.faint} />
            </div>
            <Divider />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Tipo', TX_LABEL[detail.type] || detail.type],
                ['Data', fmtDate(detail.created_at)],
                detail.description && ['Descrição', detail.description],
                detail.pix_key && ['Chave PIX', detail.pix_key],
                detail.counterpart && ['Contraparte', detail.counterpart],
                detail.asaas_id && ['ID Asaas', detail.asaas_id],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: C.muted, fontSize: 14 }}>{k}</span>
                  <span style={{ color: C.text, fontSize: 14, fontWeight: 600, textAlign: 'right', wordBreak: 'break-all', maxWidth: '60%' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TELA: KYC (verificação de identidade)
// ════════════════════════════════════════════════════════════════
function KYCScreen({ user, onRefreshUser }) {
  const [docs, setDocs]   = useState([])
  const [kycStatus, setKycStatus] = useState(user.kyc_status)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const fileRefs = useRef({})
  const { show, Toasts } = useToast()

  const DOC_TYPES = [
    { type: 'IDENTITY_FRONT',    icon: '🪪', label: 'RG / CNH — Frente',  desc: 'Foto nítida do documento frente' },
    { type: 'IDENTITY_BACK',     icon: '🪪', label: 'RG / CNH — Verso',   desc: 'Foto nítida do documento verso' },
    { type: 'SELFIE',            icon: '🤳', label: 'Selfie com documento', desc: 'Selfie segurando o documento' },
    { type: 'PROOF_OF_ADDRESS',  icon: '🏠', label: 'Comprovante de endereço', desc: 'Conta de luz, água ou bancário' },
  ]

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/kyc/documents'); setDocs(r.docs || []); setKycStatus(r.kyc_status) }
    catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const uploadDoc = async (type, file) => {
    if (!file) return
    setUploading(type)
    try {
      const fd = new FormData()
      fd.append('document', file)
      fd.append('doc_type', type)
      await apiUpload('/kyc/upload', fd)
      show('Documento enviado! Aguarde a análise.', 'success')
      load(); onRefreshUser()
    } catch (e) { show(e.message, 'error') }
    finally { setUploading(null) }
  }

  const getDocStatus = (type) => docs.find(d => d.doc_type === type)
  const kycInfo = KYC_STATUS[kycStatus] || KYC_STATUS.pending

  return (
    <div style={{ padding: '24px 16px 96px' }}>
      <Toasts />
      <h2 style={{ margin: '0 0 4px', color: C.text, fontSize: 22, fontWeight: 900 }}>Verificação KYC</h2>
      <p style={{ margin: '0 0 20px', color: C.muted, fontSize: 13 }}>Envie seus documentos para desbloquear todas as funções</p>

      {/* Status banner */}
      <Card style={{ background: kycInfo.color + '18', border: `1px solid ${kycInfo.color}44`, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32 }}>
            {kycStatus === 'approved' ? '✅' : kycStatus === 'rejected' ? '❌' : kycStatus === 'in_review' ? '🔍' : '⏳'}
          </div>
          <div>
            <p style={{ margin: 0, color: kycInfo.color, fontWeight: 800, fontSize: 16 }}>{kycInfo.label}</p>
            <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>
              {kycStatus === 'approved'  && 'Identidade verificada. Você tem acesso completo! 🎉'}
              {kycStatus === 'rejected'  && 'Documentos reprovados. Envie novamente com melhor qualidade.'}
              {kycStatus === 'in_review' && 'Documentos em análise. Pode levar até 48 horas.'}
              {kycStatus === 'pending'   && 'Envie seus documentos para liberar saques e transferências.'}
            </p>
          </div>
        </div>
      </Card>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DOC_TYPES.map(({ type, icon, label, desc }) => {
            const existing = getDocStatus(type)
            const statusColor = existing ? (STATUS_COLOR_KYC[existing.status] || C.faint) : C.faint
            const isDone = existing?.status === 'approved'
            return (
              <Card key={type} style={{ border: isDone ? `1px solid ${C.green}44` : existing ? `1px solid ${C.border}` : `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: isDone ? C.green + '22' : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {isDone ? '✅' : icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: C.text, fontWeight: 700, fontSize: 14 }}>{label}</p>
                    <p style={{ margin: '2px 0 4px', color: C.muted, fontSize: 12 }}>{desc}</p>
                    {existing && <Badge label={existing.status === 'approved' ? 'Aprovado' : existing.status === 'pending' ? 'Em análise' : 'Reprovado'} color={statusColor} />}
                  </div>
                  {!isDone && (
                    <>
                      <input
                        ref={el => fileRefs.current[type] = el}
                        type="file" accept="image/jpeg,image/png,application/pdf"
                        style={{ display: 'none' }}
                        onChange={e => uploadDoc(type, e.target.files?.[0])}
                      />
                      <Btn
                        size="sm"
                        loading={uploading === type}
                        variant={existing ? 'secondary' : 'primary'}
                        onClick={() => fileRefs.current[type]?.click()}
                      >
                        {existing ? 'Reenviar' : 'Enviar'}
                      </Btn>
                    </>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 20, padding: 16, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
        <p style={{ margin: '0 0 8px', color: C.muted, fontSize: 12, fontWeight: 700 }}>ℹ️ DICAS PARA APROVAÇÃO</p>
        <ul style={{ margin: 0, paddingLeft: 16, color: C.faint, fontSize: 12, lineHeight: 2 }}>
          <li>Documentos devem estar legíveis e sem cortes</li>
          <li>Selfie deve mostrar seu rosto e o documento claramente</li>
          <li>Comprovante deve ter menos de 3 meses</li>
          <li>Formatos aceitos: JPG, PNG ou PDF (máx. 10MB)</li>
        </ul>
      </div>
    </div>
  )
}

const STATUS_COLOR_KYC = { pending: C.yellow, approved: C.green, rejected: C.red }

// ════════════════════════════════════════════════════════════════
// TELA: CONFIGURAÇÕES
// ════════════════════════════════════════════════════════════════
function SettingsScreen({ user, onLogout, onRefreshUser }) {
  const [modal, setModal] = useState(null) // profile | password | email_verify | address
  const { show, Toasts } = useToast()
  const [loading, setLoading] = useState(false)

  const [profile, setProfile] = useState({ name: user.name || '', phone: user.phone || '' })
  const [address, setAddress] = useState({ cep: user.cep || '', street: user.street || '', address_number: user.address_number || '', neighborhood: user.neighborhood || '', city: user.city || '', state: user.state || '' })
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' })
  const [verifyCode, setVerifyCode] = useState('')

  const setP = k => e => setProfile(p => ({ ...p, [k]: e.target.value }))
  const setA = k => e => setAddress(p => ({ ...p, [k]: e.target.value }))
  const setF = k => e => setPassForm(p => ({ ...p, [k]: e.target.value }))

  const fetchCEP = async (v) => {
    const c = clean(v)
    if (c.length !== 8) return
    try {
      const r = await api.get(`/user/cep/${c}`)
      setAddress(p => ({ ...p, street: r.street || p.street, neighborhood: r.neighborhood || p.neighborhood, city: r.city || p.city, state: r.state || p.state }))
    } catch {}
  }

  const saveProfile = async () => {
    setLoading(true)
    try {
      await api.patch('/user/profile', { name: profile.name, phone: clean(profile.phone) })
      show('Perfil atualizado!', 'success'); setModal(null); onRefreshUser()
    } catch (e) { show(e.message, 'error') }
    finally { setLoading(false) }
  }

  const saveAddress = async () => {
    setLoading(true)
    try {
      await api.patch('/user/profile', { cep: clean(address.cep), street: address.street, address_number: address.address_number, neighborhood: address.neighborhood, city: address.city, state: address.state })
      show('Endereço atualizado!', 'success'); setModal(null); onRefreshUser()
    } catch (e) { show(e.message, 'error') }
    finally { setLoading(false) }
  }

  const changePass = async () => {
    if (passForm.next !== passForm.confirm) return show('Senhas não coincidem', 'warning')
    if (passForm.next.length < 6) return show('Senha mínimo 6 caracteres', 'warning')
    setLoading(true)
    try {
      await api.post('/auth/change-password', { current_password: passForm.current, new_password: passForm.next })
      show('Senha alterada!', 'success'); setModal(null); setPassForm({ current: '', next: '', confirm: '' })
    } catch (e) { show(e.message, 'error') }
    finally { setLoading(false) }
  }

  const sendVerify = async () => {
    try { await api.post('/auth/resend-verification', {}); show('Código enviado!', 'success') }
    catch (e) { show(e.message, 'error') }
  }

  const doVerify = async () => {
    setLoading(true)
    try {
      await api.post('/auth/verify-email', { code: verifyCode })
      show('Email verificado!', 'success'); setModal(null); onRefreshUser()
    } catch (e) { show(e.message, 'error') }
    finally { setLoading(false) }
  }

  const kycInfo = KYC_STATUS[user.kyc_status] || KYC_STATUS.pending

  return (
    <div style={{ padding: '24px 16px 96px' }}>
      <Toasts />
      <h2 style={{ margin: '0 0 4px', color: C.text, fontSize: 22, fontWeight: 900 }}>Configurações</h2>

      {/* Perfil resumido */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <Avatar name={user.name} size={52} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: C.text, fontWeight: 800, fontSize: 16 }}>{user.name}</p>
          <p style={{ margin: '2px 0 4px', color: C.muted, fontSize: 13 }}>{user.email}</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <Badge label={kycInfo.label} color={kycInfo.color} />
            {user.email_verified ? <Badge label="Email verificado" color={C.green} /> : <Badge label="Email não verificado" color={C.yellow} />}
          </div>
        </div>
      </Card>

      {/* Seções */}
      {[
        { icon: '👤', label: 'Dados pessoais', desc: 'Nome e telefone', action: () => setModal('profile') },
        { icon: '🏠', label: 'Endereço', desc: `${user.city || 'Não informado'}${user.state ? `, ${user.state}` : ''}`, action: () => setModal('address') },
        { icon: '🔒', label: 'Alterar senha', desc: 'Mude sua senha de acesso', action: () => setModal('password') },
        !user.email_verified && { icon: '📧', label: 'Verificar email', desc: 'Confirme seu endereço de email', action: () => { setModal('verify'); sendVerify() } },
      ].filter(Boolean).map(({ icon, label, desc, action }) => (
        <div key={label} onClick={action} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, color: C.text, fontWeight: 600, fontSize: 15 }}>{label}</p>
            <p style={{ margin: '2px 0 0', color: C.faint, fontSize: 13 }}>{desc}</p>
          </div>
          <span style={{ color: C.faint, fontSize: 18 }}>›</span>
        </div>
      ))}

      {/* Info da conta */}
      <Card style={{ marginTop: 20 }}>
        <p style={{ margin: '0 0 10px', color: C.faint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>Informações da conta</p>
        {[
          ['CPF', user.cpf || '—'],
          ['Telefone', user.phone || '—'],
          ['Membro desde', user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'],
          user.is_minor && ['Conta de menor', 'Sim'],
          user.guardian_name && ['Responsável', user.guardian_name],
        ].filter(Boolean).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ color: C.muted, fontSize: 14 }}>{k}</span>
            <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </Card>

      {/* Logout */}
      <Btn onClick={onLogout} variant="danger" fullWidth style={{ marginTop: 24 }}>Sair da conta</Btn>

      {/* MODAL: Dados pessoais */}
      {modal === 'profile' && (
        <Modal title="Dados pessoais" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Nome completo" value={profile.name} onChange={setP('name')} placeholder="Seu nome" />
            <Input label="Telefone" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: maskPhone(e.target.value) }))} placeholder="(11) 99999-9999" inputMode="tel" />
            <Btn onClick={saveProfile} loading={loading} fullWidth>Salvar</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL: Endereço */}
      {modal === 'address' && (
        <Modal title="Endereço" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="CEP" value={address.cep} onChange={e => { setA('cep')({ target: { value: maskCEP(e.target.value) } }); fetchCEP(e.target.value) }} placeholder="00000-000" inputMode="numeric" />
            <Input label="Logradouro" value={address.street} onChange={setA('street')} placeholder="Rua, Av..." />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <Input label="Bairro" value={address.neighborhood} onChange={setA('neighborhood')} placeholder="Bairro" />
              <Input label="Número" value={address.address_number} onChange={setA('address_number')} placeholder="Nº" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <Input label="Cidade" value={address.city} onChange={setA('city')} placeholder="Cidade" />
              <Input label="UF" value={address.state} onChange={setA('state')} placeholder="SP" maxLength={2} />
            </div>
            <Btn onClick={saveAddress} loading={loading} fullWidth>Salvar endereço</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL: Senha */}
      {modal === 'password' && (
        <Modal title="Alterar senha" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Senha atual" type="password" value={passForm.current} onChange={setF('current')} placeholder="••••••••" />
            <Input label="Nova senha" type="password" value={passForm.next} onChange={setF('next')} placeholder="mínimo 6 caracteres" />
            <Input label="Confirmar nova senha" type="password" value={passForm.confirm} onChange={setF('confirm')} placeholder="repita a nova senha" />
            <Btn onClick={changePass} loading={loading} fullWidth>Alterar senha</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL: Verificar email */}
      {modal === 'verify' && (
        <Modal title="Verificar email" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>Enviamos um código para <strong style={{ color: C.text }}>{user.email}</strong></p>
            <Input label="Código de 6 dígitos" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="000000" inputMode="numeric" maxLength={6} />
            <Btn onClick={doVerify} loading={loading} fullWidth>Verificar</Btn>
            <p style={{ margin: 0, textAlign: 'center' }}>
              <span style={{ color: C.purple, cursor: 'pointer', fontSize: 13, fontWeight: 700 }} onClick={sendVerify}>Reenviar código</span>
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION
// ════════════════════════════════════════════════════════════════
function BottomNav({ active, onNav, unread = 0 }) {
  const tabs = [
    { id: 'home',    icon: '🏠', label: 'Início'  },
    { id: 'pix',     icon: '⚡', label: 'PIX'     },
    { id: 'extrato', icon: '📋', label: 'Extrato' },
    { id: 'kyc',     icon: '🪪', label: 'KYC'     },
    { id: 'settings',icon: '⚙️', label: 'Conta'   },
  ]
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, padding: '8px 0 max(12px, env(safe-area-inset-bottom))', zIndex: 100 }}>
      {tabs.map(({ id, icon, label }) => (
        <button key={id} onClick={() => onNav(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', position: 'relative' }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: active === id ? 800 : 500, color: active === id ? C.purple : C.faint }}>{label}</span>
          {active === id && <div style={{ position: 'absolute', bottom: -8, width: 24, height: 3, background: C.purple, borderRadius: 3 }} />}
        </button>
      ))}
    </nav>
  )
}

// ════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser]     = useState(null)
  const [screen, setScreen] = useState('home')
  const [loading, setLoading] = useState(true)

  // Verificar token salvo
  useEffect(() => {
    const token = localStorage.getItem('cphspay_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me').then(u => { setUser(u); setLoading(false) }).catch(() => { localStorage.removeItem('cphspay_token'); setLoading(false) })
  }, [])

  const handleLogin = (u) => { setUser(u); setScreen('home') }

  const handleLogout = () => {
    localStorage.removeItem('cphspay_token')
    setUser(null); setScreen('home')
  }

  const refreshUser = async () => {
    try { const u = await api.get('/auth/me'); setUser(u) } catch {}
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 52 }}>💳</div>
        <Spinner size={32} />
        <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>Carregando CphsPay...</p>
      </div>
    )
  }

  if (!user) return <AuthScreen onLogin={handleLogin} />

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: C.bg + 'ee', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>💳</span>
          <span style={{ color: C.text, fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>CphsPay</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user.kyc_status === 'approved' && <span style={{ fontSize: 10, background: C.green + '22', color: C.green, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>✓ Verificado</span>}
          <Avatar name={user.name} size={32} onClick={() => setScreen('settings')} style={{ cursor: 'pointer' }} />
        </div>
      </header>

      {/* Conteúdo */}
      <main>
        {screen === 'home'     && <Dashboard user={user} onNav={setScreen} onRefreshUser={refreshUser} />}
        {screen === 'pix'      && <PixScreen user={user} />}
        {screen === 'extrato'  && <ExtratoScreen />}
        {screen === 'kyc'      && <KYCScreen user={user} onRefreshUser={refreshUser} />}
        {screen === 'settings' && <SettingsScreen user={user} onLogout={handleLogout} onRefreshUser={refreshUser} />}
      </main>

      <BottomNav active={screen} onNav={setScreen} />

      {/* Estilos globais */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: ${C.bg}; overscroll-behavior: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:none; } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:none; } }
        input, select, button, textarea { font-family: inherit; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: .4; }
      `}</style>
    </div>
  )
}
