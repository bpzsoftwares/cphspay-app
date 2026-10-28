import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { fmt, fmtDateTime, isCredit, TX_LABELS, STATUS_LABELS } from '../utils'
import { Card, Btn, Badge, Avatar, Spinner, C, Modal, useToast, CopyBtn } from '../components/UI'

// ── QR Code display com cópia ─────────────────────────────
function QRDisplay({ qr_code, qr_code_text, amount, onClose, onCheck }) {
  const [checking, setChecking] = useState(false)
  const [paid, setPaid] = useState(false)
  const { show, Toasts } = useToast()

  const check = async () => {
    setChecking(true)
    try {
      const r = await onCheck()
      if (r?.status === 'completed') {
        setPaid(true)
        show('💸 Depósito recebido!', 'success')
        setTimeout(onClose, 2000)
      } else {
        show('Aguardando pagamento...', 'info')
      }
    } catch {
      show('Erro ao verificar', 'error')
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <Toasts />
      <div style={{ textAlign: 'center' }}>
        {paid ? (
          <div style={{ fontSize: 64, margin: '20px 0' }}>✅</div>
        ) : (
          <>
            {qr_code ? (
              <img src={`data:image/png;base64,${qr_code}`}
                alt="QR Code PIX"
                style={{ width: 200, height: 200, borderRadius: 12,
                  border: `2px solid ${C.border}`, display: 'block', margin: '0 auto 16px' }}
              />
            ) : (
              <div style={{ width: 200, height: 200, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spinner />
              </div>
            )}
            <p style={{ color: C.muted, fontSize: 13, margin: '0 0 12px' }}>
              Valor: <strong style={{ color: C.green }}>{fmt(amount)}</strong>
            </p>
            {qr_code_text && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                <CopyBtn text={qr_code_text}>Copiar código PIX</CopyBtn>
              </div>
            )}
            <Btn onClick={check} loading={checking} variant="secondary" fullWidth>
              Já paguei, verificar
            </Btn>
          </>
        )}
      </div>
    </>
  )
}

// ── Modal de depósito PIX ─────────────────────────────────
function DepositModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [desc, setDesc]     = useState('')
  const [step, setStep]     = useState('form') // form | qr
  const [qrData, setQrData] = useState(null)
  const [txId, setTxId]     = useState(null)
  const [loading, setLoading] = useState(false)
  const { show, Toasts } = useToast()

  const generate = async () => {
    if (!amount || Number(amount) <= 0) return show('Informe o valor', 'warning')
    setLoading(true)
    try {
      const r = await api.post('/pix/deposit', { amount: Number(amount), description: desc })
      setQrData(r)
      setTxId(r.id)
      setStep('qr')
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    const r = await api.get(`/pix/deposit/${txId}`)
    if (r.status === 'completed') { onSuccess?.(); return r }
    return r
  }

  return (
    <Modal title="Depositar via PIX" onClose={onClose}>
      <Toasts />
      {step === 'form' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>VALOR</label>
            <div style={{ position: 'relative', marginTop: 6 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }}>R$</span>
              <input type="number" min="0.01" step="0.01" placeholder="0,00" value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ width: '100%', background: '#1a1d2e', border: `1.5px solid ${C.border}`,
                  borderRadius: 10, padding: '14px 14px 14px 40px', color: C.text,
                  fontSize: 22, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <input placeholder="Descrição (opcional)" value={desc} onChange={e => setDesc(e.target.value)}
            style={{ background: '#1a1d2e', border: `1.5px solid ${C.border}`, borderRadius: 10,
              padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none' }}
          />
          <Btn onClick={generate} loading={loading} fullWidth>Gerar QR Code</Btn>
        </div>
      ) : (
        <QRDisplay {...qrData} onClose={() => { onClose(); onSuccess?.() }} onCheck={checkStatus} />
      )}
    </Modal>
  )
}

// ── Modal de saque PIX ────────────────────────────────────
function SaqueModal({ balance, onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [pixType, setPixType] = useState('CPF')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const { show, Toasts } = useToast()

  const send = async () => {
    if (!amount || Number(amount) <= 0) return show('Informe o valor', 'warning')
    if (Number(amount) > balance) return show('Saldo insuficiente', 'warning')
    if (!pixKey) return show('Informe a chave PIX', 'warning')
    setLoading(true)
    try {
      await api.post('/pix/withdraw', {
        amount: Number(amount), pix_key: pixKey, pix_key_type: pixType, description: desc,
      })
      show('Saque enviado!', 'success')
      setTimeout(() => { onClose(); onSuccess?.() }, 1500)
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Sacar via PIX" onClose={onClose}>
      <Toasts />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>VALOR</label>
          <div style={{ position: 'relative', marginTop: 6 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.faint }}>R$</span>
            <input type="number" min="0.01" step="0.01" placeholder="0,00" value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', background: '#1a1d2e', border: `1.5px solid ${C.border}`,
                borderRadius: 10, padding: '14px 14px 14px 40px', color: C.text,
                fontSize: 22, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <p style={{ color: C.faint, fontSize: 12, margin: '4px 0 0' }}>
            Disponível: {fmt(balance)}
          </p>
        </div>
        <select value={pixType} onChange={e => setPixType(e.target.value)}
          style={{ background: '#1a1d2e', border: `1.5px solid ${C.border}`, borderRadius: 10,
            padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none', appearance: 'none' }}>
          <option value="CPF">CPF</option>
          <option value="EMAIL">Email</option>
          <option value="PHONE">Telefone</option>
          <option value="EVP">Chave aleatória</option>
          <option value="CNPJ">CNPJ</option>
        </select>
        <input placeholder="Chave PIX do destinatário" value={pixKey} onChange={e => setPixKey(e.target.value)}
          style={{ background: '#1a1d2e', border: `1.5px solid ${C.border}`, borderRadius: 10,
            padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none' }}
        />
        <input placeholder="Descrição (opcional)" value={desc} onChange={e => setDesc(e.target.value)}
          style={{ background: '#1a1d2e', border: `1.5px solid ${C.border}`, borderRadius: 10,
            padding: '12px 14px', color: C.text, fontSize: 14, outline: 'none' }}
        />
        <Btn onClick={send} loading={loading} fullWidth>Enviar saque</Btn>
      </div>
    </Modal>
  )
}

// ── TX Item ───────────────────────────────────────────────
function TxItem({ tx }) {
  const credit = isCredit(tx.type)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: credit ? C.green + '22' : C.red + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {credit ? '↓' : '↑'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: C.text, fontSize: 14, fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.description || TX_LABELS[tx.type] || tx.type}
        </p>
        <p style={{ margin: '2px 0 0', color: C.faint, fontSize: 11 }}>
          {fmtDateTime(tx.created_at)} · {STATUS_LABELS[tx.status] || tx.status}
        </p>
      </div>
      <span style={{
        color: credit ? C.green : C.red, fontWeight: 700, fontSize: 15, flexShrink: 0,
      }}>
        {credit ? '+' : '-'}{fmt(tx.amount)}
      </span>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────
export default function Dashboard({ user, onLogout, onNavigate }) {
  const [balance, setBalance] = useState(null)
  const [txs, setTxs]         = useState([])
  const [showBal, setShowBal] = useState(true)
  const [modal, setModal]     = useState(null)
  const [loadingBal, setLoadingBal] = useState(true)
  const { show, Toasts } = useToast()

  const loadBalance = useCallback(async () => {
    try {
      const r = await api.get('/user/balance')
      setBalance(r.balance)
    } catch {} finally {
      setLoadingBal(false)
    }
  }, [])

  const loadTxs = useCallback(async () => {
    try {
      const r = await api.get('/user/statement?limit=10')
      setTxs(r.data || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadBalance()
    loadTxs()
  }, [loadBalance, loadTxs])

  const reload = () => { loadBalance(); loadTxs() }

  const quickActions = [
    { icon: '↓', label: 'Depositar',    color: C.green,  action: () => setModal('deposit') },
    { icon: '↑', label: 'Sacar',        color: C.red,    action: () => setModal('saque') },
    { icon: '↔', label: 'Transferir',   color: C.blue,   action: () => onNavigate('transfer') },
    { icon: '📄', label: 'Pagar Conta', color: C.yellow, action: () => onNavigate('bill') },
    { icon: '⚡', label: 'PIX',         color: C.purple, action: () => onNavigate('pix') },
    { icon: '📊', label: 'Extrato',     color: C.muted,  action: () => onNavigate('extrato') },
  ]

  return (
    <div style={{ paddingBottom: 80 }}>
      <Toasts />

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
        padding: '48px 20px 60px', borderRadius: '0 0 32px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.7)', fontSize: 13 }}>Olá,</p>
            <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800 }}>
              {user?.name?.split(' ')[0]} 👋
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onNavigate('notifications')} style={{
              background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10,
              width: 40, height: 40, cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🔔</button>
            <Avatar name={user?.name} size={40} />
          </div>
        </div>

        {/* Saldo */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,.7)', fontSize: 13 }}>Saldo disponível</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>
              {loadingBal ? '•••' : showBal ? fmt(balance) : 'R$ ••••••'}
            </h1>
            <button onClick={() => setShowBal(p => !p)} style={{
              background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8,
              padding: '4px 8px', cursor: 'pointer', color: '#fff', fontSize: 13,
            }}>
              {showBal ? '👁' : '🙈'}
            </button>
          </div>
          {user?.kyc_status !== 'APPROVED' && (
            <button onClick={() => onNavigate('kyc')} style={{
              marginTop: 8, background: 'rgba(255,255,255,.15)', border: 'none',
              borderRadius: 8, padding: '4px 12px', color: '#fff', fontSize: 12,
              cursor: 'pointer',
            }}>
              ⚠️ Verifique sua identidade
            </button>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ margin: '-30px 16px 0', position: 'relative', zIndex: 1 }}>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {quickActions.map(a => (
              <button key={a.label} onClick={a.action} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 4px',
                borderRadius: 10, transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1a1d2e'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: a.color + '22', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: a.color,
                }}>
                  {a.icon}
                </div>
                <span style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Últimas transações */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 700 }}>Últimas transações</h3>
          <button onClick={() => onNavigate('extrato')} style={{
            background: 'none', border: 'none', color: C.purple, fontSize: 13, cursor: 'pointer', fontWeight: 600,
          }}>Ver todas →</button>
        </div>
        <Card>
          {txs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: C.faint, fontSize: 14 }}>
              Nenhuma transação ainda
            </div>
          ) : (
            txs.map(tx => <TxItem key={tx.id} tx={tx} />)
          )}
        </Card>
      </div>

      {/* Modais */}
      {modal === 'deposit' && (
        <DepositModal onClose={() => setModal(null)} onSuccess={reload} />
      )}
      {modal === 'saque' && (
        <SaqueModal balance={balance || 0} onClose={() => setModal(null)} onSuccess={reload} />
      )}
    </div>
  )
}
