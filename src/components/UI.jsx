import { useState, useEffect, useRef } from 'react'

// ── Cores ─────────────────────────────────────────────────────
export const C = {
  purple: '#7C5CFC',
  purpleLight: '#9B7EFE',
  purpleDark: '#5A3FD4',
  bg: '#0a0b14',
  card: '#12141f',
  cardHover: '#1a1d2e',
  border: '#1e2133',
  text: '#e8eaf2',
  muted: '#9ca3af',
  faint: '#6b7080',
  green: '#00D4AA',
  red: '#FC5C7D',
  yellow: '#F59E0B',
  blue: '#60A5FA',
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner({ size = 24, color = C.purple }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.8s linear infinite', display: 'block' }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity=".2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </svg>
  )
}

// ── Toast ──────────────────────────────────────────────────
export function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = { success: C.green, error: C.red, warning: C.yellow, info: C.purple }
  const icons  = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
      background: '#1a1d2e', border: `1px solid ${colors[type]}`,
      borderRadius: 12, padding: '12px 20px', maxWidth: 340,
      boxShadow: '0 8px 32px rgba(0,0,0,.5)',
      animation: 'slideUp .2s ease',
    }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <span style={{ color: colors[type], fontWeight: 700, fontSize: 16 }}>{icons[type]}</span>
      <span style={{ color: C.text, fontSize: 14, lineHeight: 1.4 }}>{message}</span>
    </div>
  )
}

// ── Hook useToast ──────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([])
  const show = (message, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
  }
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id))
  const Toasts = () => (
    <>
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </>
  )
  return { show, Toasts }
}

// ── Input ──────────────────────────────────────────────────
export function Input({ label, error, prefix, suffix, inputRef, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: 14, color: C.faint, fontSize: 14, pointerEvents: 'none' }}>{prefix}</span>}
        <input ref={inputRef} {...props} style={{
          width: '100%', background: '#1a1d2e', border: `1.5px solid ${error ? C.red : C.border}`,
          borderRadius: 10, padding: prefix ? '12px 14px 12px 36px' : '12px 14px',
          color: C.text, fontSize: 15, outline: 'none', boxSizing: 'border-box',
          transition: 'border-color .2s',
          ...(props.style || {}),
        }} onFocus={e => { e.target.style.borderColor = C.purple }}
           onBlur={e => { e.target.style.borderColor = error ? C.red : C.border }}
        />
        {suffix && <span style={{ position: 'absolute', right: 14, color: C.faint, fontSize: 14 }}>{suffix}</span>}
      </div>
      {error && <span style={{ color: C.red, fontSize: 12 }}>{error}</span>}
    </div>
  )
}

// ── Select ─────────────────────────────────────────────────
export function Select({ label, error, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>}
      <select {...props} style={{
        width: '100%', background: '#1a1d2e', border: `1.5px solid ${error ? C.red : C.border}`,
        borderRadius: 10, padding: '12px 14px', color: C.text, fontSize: 15, outline: 'none',
        appearance: 'none', cursor: 'pointer', boxSizing: 'border-box',
        ...(props.style || {}),
      }}>
        {children}
      </select>
      {error && <span style={{ color: C.red, fontSize: 12 }}>{error}</span>}
    </div>
  )
}

// ── Btn ────────────────────────────────────────────────────
export function Btn({ children, loading, variant = 'primary', size = 'md', fullWidth, style: s, ...props }) {
  const sizeMap = { sm: { padding: '8px 16px', fontSize: 13 }, md: { padding: '13px 24px', fontSize: 15 }, lg: { padding: '16px 28px', fontSize: 16 } }
  const variantMap = {
    primary:  { background: `linear-gradient(135deg,${C.purple},${C.purpleDark})`, color: '#fff', border: 'none' },
    secondary:{ background: 'transparent', color: C.purple, border: `1.5px solid ${C.purple}` },
    danger:   { background: C.red, color: '#fff', border: 'none' },
    ghost:    { background: 'rgba(124,92,252,.1)', color: C.purple, border: 'none' },
    success:  { background: C.green, color: '#111', border: 'none' },
  }
  return (
    <button disabled={loading || props.disabled} {...props} style={{
      borderRadius: 10, fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      width: fullWidth ? '100%' : undefined,
      opacity: (loading || props.disabled) ? .6 : 1,
      transition: 'opacity .15s, transform .1s',
      ...sizeMap[size], ...variantMap[variant], ...(s || {}),
    }}
    onMouseDown={e => { e.currentTarget.style.transform = 'scale(.97)' }}
    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {loading ? <Spinner size={18} color={variant === 'primary' ? '#fff' : C.purple} /> : children}
    </button>
  )
}

// ── Card ───────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 20, ...(style || {}),
    }}>
      {children}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ title, onClose, children, maxWidth = 420 }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-end',
      justifyContent: 'center', padding: 0,
    }} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={{
        background: C.card, borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth, maxHeight: '90vh',
        overflow: 'auto', padding: 24,
        animation: 'slideModalUp .25s ease',
      }}>
        <style>{`@keyframes slideModalUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.faint, fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── BottomSheet ────────────────────────────────────────────
export { Modal as BottomSheet }

// ── Badge ──────────────────────────────────────────────────
export function Badge({ children, color = C.purple }) {
  return (
    <span style={{
      background: color + '22', color, borderRadius: 6,
      padding: '2px 8px', fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.5px',
    }}>
      {children}
    </span>
  )
}

// ── Avatar ─────────────────────────────────────────────────
export function Avatar({ name, size = 42 }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35,
    }}>
      {initials}
    </div>
  )
}

// ── Divider ────────────────────────────────────────────────
export function Divider() {
  return <div style={{ height: 1, background: C.border, margin: '8px 0' }} />
}

// ── EmptyState ─────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      {title && <p style={{ color: C.text, fontWeight: 700, margin: '0 0 8px' }}>{title}</p>}
      {message && <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>{message}</p>}
    </div>
  )
}

// ── CopyBtn ────────────────────────────────────────────────
export function CopyBtn({ text, children }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <button onClick={copy} style={{
      background: copied ? C.green + '22' : '#1a1d2e',
      color: copied ? C.green : C.purple,
      border: `1px solid ${copied ? C.green : C.border}`,
      borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
      fontSize: 13, fontWeight: 600, transition: 'all .2s',
    }}>
      {copied ? '✓ Copiado' : (children || 'Copiar')}
    </button>
  )
}
