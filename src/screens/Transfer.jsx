import { useState, useEffect } from 'react'
import { api } from '../api'
import { fmt, maskCPF, cleanMask, validateCPF } from '../utils'
import { Btn, Card, Input, Select, Modal, C, useToast, Avatar } from '../components/UI'

// ── Transferência interna (por email ou CPF) ──────────────
function InternalTransfer({ onClose, onSuccess }) {
  const [step, setStep] = useState(1) // 1=buscar destinatário, 2=valor+desc, 3=confirmação
  const [search, setSearch]   = useState('')
  const [recipient, setRecipient] = useState(null)
  const [amount, setAmount]   = useState('')
  const [desc, setDesc]       = useState('')
  const [loading, setLoading] = useState(false)
  const { show, Toasts } = useToast()

  const findRecipient = async () => {
    if (!search.trim()) return show('Digite email ou CPF', 'warning')
    setLoading(true)
    try {
      const r = await api.post('/transfers/internal', { to: cleanMask(search), amount: 0, dry_run: true })
      setRecipient(r.recipient)
      setStep(2)
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    const a = parseFloat(amount.replace(',', '.'))
    if (!a || a < 0.01) return show('Valor inválido', 'warning')
    setStep(3)
  }

  const confirm = async () => {
    const a = parseFloat(amount.replace(',', '.'))
    setLoading(true)
    try {
      await api.post('/transfers/internal', {
        to: cleanMask(search),
        amount: a,
        description: desc || undefined,
      })
      show('Transferência realizada!', 'success')
      setTimeout(() => { onClose(); onSuccess?.() }, 1200)
    } catch (e) {
      show(e.message, 'error')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Transferência Interna" onClose={onClose}>
      <Toasts />

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>
            Transfira para outro usuário CphsPay pelo email ou CPF
          </p>
          <Input label="Email ou CPF" placeholder="usuario@email.com ou 000.000.000-00"
            value={search} onChange={e => setSearch(e.target.value)} />
          <Btn onClick={findRecipient} loading={loading} fullWidth>Buscar destinatário</Btn>
        </div>
      )}

      {step === 2 && recipient && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12,
            background: '#1a1d2e', borderRadius: 12 }}>
            <Avatar name={recipient.name} />
            <div>
              <p style={{ margin: 0, color: C.text, fontWeight: 700 }}>{recipient.name}</p>
              <p style={{ margin: '2px 0 0', color: C.muted, fontSize: 13 }}>{recipient.email}</p>
            </div>
          </div>
          <Input label="Valor (R$)" placeholder="0,00" prefix="R$"
            value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" />
          <Input label="Descrição (opcional)" placeholder="Descrição da transferência"
            value={desc} onChange={e => setDesc(e.target.value)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={() => setStep(1)} variant="secondary" style={{ flex: 1 }}>← Voltar</Btn>
            <Btn onClick={submit} style={{ flex: 2 }}>Continuar</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1a1d2e', borderRadius: 12, padding: 16 }}>
            <p style={{ margin: '0 0 12px', color: C.faint, fontSize: 12 }}>CONFIRMAÇÃO</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: C.muted }}>Para</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{recipient.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: C.muted }}>Valor</span>
              <span style={{ color: C.green, fontWeight: 700, fontSize: 18 }}>
                {fmt(parseFloat(amount.replace(',', '.')))}
              </span>
            </div>
            {desc && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>Descrição</span>
                <span style={{ color: C.text }}>{desc}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={() => setStep(2)} variant="secondary" style={{ flex: 1 }}>← Voltar</Btn>
            <Btn onClick={confirm} loading={loading} variant="success" style={{ flex: 2 }}>
              ✓ Confirmar
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Transferência externa (PIX / TED) ─────────────────────
function ExternalTransfer({ onClose, onSuccess }) {
  const [method, setMethod] = useState('pix') // pix | ted
  const [form, setForm] = useState({
    pixKey: '', pixKeyType: 'CPF',
    bankCode: '', agency: '', account: '', accountDigit: '', accountType: 'CHECKING',
    name: '',
    amount: '', desc: '',
  })
  const [loading, setLoading] = useState(false)
  const { show, Toasts } = useToast()

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async () => {
    const a = parseFloat(form.amount.replace(',', '.'))
    if (!a || a < 0.01) return show('Valor inválido', 'warning')
    setLoading(true)
    try {
      const payload = { amount: a, description: form.desc || undefined }
      if (method === 'pix') {
        payload.pixAddressKey = cleanMask(form.pixKey)
        payload.pixAddressKeyType = form.pixKeyType
      } else {
        payload.bankAccount = {
          bank: { ispb: form.bankCode },
          accountName: form.name,
          agency: form.agency,
          account: form.account,
          accountDigit: form.accountDigit,
          bankAccountType: form.accountType,
        }
      }
      await api.post('/transfers/external', payload)
      show('Transferência enviada!', 'success')
      setTimeout(() => { onClose(); onSuccess?.() }, 1200)
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Transferência Externa" onClose={onClose}>
      <Toasts />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Method toggle */}
        <div style={{ display: 'flex', background: '#0a0b14', borderRadius: 10, padding: 4 }}>
          {['pix','ted'].map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
              background: method === m ? C.purple : 'transparent',
              color: method === m ? '#fff' : C.muted,
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              {m === 'pix' ? 'PIX' : 'TED'}
            </button>
          ))}
        </div>

        {method === 'pix' && <>
          <Select label="Tipo de chave" value={form.pixKeyType} onChange={set('pixKeyType')}>
            <option value="CPF">CPF</option>
            <option value="EMAIL">Email</option>
            <option value="PHONE">Telefone</option>
            <option value="EVP">Chave aleatória</option>
            <option value="CNPJ">CNPJ</option>
          </Select>
          <Input label="Chave PIX" value={form.pixKey} onChange={set('pixKey')}
            placeholder={form.pixKeyType === 'EMAIL' ? 'email@exemplo.com' : 'Chave PIX'} />
        </>}

        {method === 'ted' && <>
          <Input label="Nome do beneficiário" value={form.name} onChange={set('name')} placeholder="Nome completo" />
          <Input label="Código do banco (ISPB)" value={form.bankCode} onChange={set('bankCode')} placeholder="Ex: 60746948" inputMode="numeric" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Agência" value={form.agency} onChange={set('agency')} placeholder="0001" inputMode="numeric" />
            <Input label="Conta" value={form.account} onChange={set('account')} placeholder="12345" inputMode="numeric" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <Input label="Dígito" value={form.accountDigit} onChange={set('accountDigit')} placeholder="6" maxLength={1} />
            <Select label="Tipo de conta" value={form.accountType} onChange={set('accountType')}>
              <option value="CHECKING">Corrente</option>
              <option value="SAVINGS">Poupança</option>
            </Select>
          </div>
        </>}

        <Input label="Valor (R$)" prefix="R$" placeholder="0,00"
          value={form.amount} onChange={set('amount')} inputMode="decimal" />
        <Input label="Descrição (opcional)" placeholder="Motivo da transferência"
          value={form.desc} onChange={set('desc')} />

        <Btn onClick={submit} loading={loading} fullWidth>Enviar {method === 'pix' ? 'PIX' : 'TED'}</Btn>
      </div>
    </Modal>
  )
}

export default function Transfer() {
  const [modal, setModal] = useState(null)
  const { show, Toasts } = useToast()

  const onSuccess = () => show('Transferência concluída!', 'success')

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <Toasts />
      <h2 style={{ color: C.text, margin: '0 0 4px' }}>Transferências</h2>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 24px' }}>Envie dinheiro com segurança</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Internal */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: C.purple + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>👤</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px', color: C.text, fontWeight: 700 }}>Entre usuários CphsPay</p>
              <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Grátis e instantâneo. Use email ou CPF.</p>
            </div>
            <Btn onClick={() => setModal('internal')} size="sm">Enviar</Btn>
          </div>
        </Card>

        {/* PIX */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: C.green + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>⚡</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px', color: C.text, fontWeight: 700 }}>PIX para qualquer banco</p>
              <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>24h por dia, 7 dias por semana.</p>
            </div>
            <Btn onClick={() => setModal('external')} size="sm">Enviar</Btn>
          </div>
        </Card>

        {/* TED */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: C.blue + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>🏦</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px', color: C.text, fontWeight: 700 }}>TED Bancário</p>
              <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Transferência para qualquer banco.</p>
            </div>
            <Btn onClick={() => { setModal('external') }} size="sm">Enviar</Btn>
          </div>
        </Card>
      </div>

      {modal === 'internal' && <InternalTransfer onClose={() => setModal(null)} onSuccess={onSuccess} />}
      {modal === 'external' && <ExternalTransfer onClose={() => setModal(null)} onSuccess={onSuccess} />}
    </div>
  )
}
