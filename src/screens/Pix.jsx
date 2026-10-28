import { useState, useEffect } from 'react'
import { api } from '../api'
import { Btn, Card, Input, Select, Modal, C, useToast, CopyBtn } from '../components/UI'
import { maskCPF, maskPhone, cleanMask } from '../utils'

function KeyBadge({ type }) {
  const colors = { CPF: C.blue, EMAIL: C.green, PHONE: C.purple, EVP: C.yellow, CNPJ: C.red }
  return (
    <span style={{
      background: (colors[type] || C.faint) + '22', color: colors[type] || C.faint,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
    }}>{type}</span>
  )
}

// ── Lookup de chave PIX ───────────────────────────────────
function LookupModal({ onClose }) {
  const [key, setKey]     = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const { show, Toasts } = useToast()

  const lookup = async () => {
    if (!key.trim()) return show('Informe a chave PIX', 'warning')
    setLoading(true)
    try {
      const r = await api.get(`/pix/lookup/${encodeURIComponent(key.trim())}`)
      setResult(r)
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Consultar Chave PIX" onClose={onClose}>
      <Toasts />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Chave PIX" placeholder="CPF, email, telefone ou chave aleatória"
          value={key} onChange={e => setKey(e.target.value)} />
        <Btn onClick={lookup} loading={loading} fullWidth>Consultar</Btn>
        {result && (
          <div style={{
            background: '#1a1d2e', borderRadius: 12, padding: 16,
            border: `1px solid ${C.border}`,
          }}>
            <p style={{ margin: '0 0 8px', color: C.faint, fontSize: 12 }}>RESULTADO</p>
            <p style={{ margin: '0 0 4px', color: C.text, fontWeight: 700 }}>{result.owner?.name}</p>
            <p style={{ margin: '0 0 4px', color: C.muted, fontSize: 13 }}>{result.type}: {result.key}</p>
            {result.bank && <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Banco: {result.bank}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Adicionar chave PIX ───────────────────────────────────
function AddKeyModal({ onClose, onAdded }) {
  const [type, setType] = useState('CPF')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const { show, Toasts } = useToast()

  const handleChange = (e) => {
    let v = e.target.value
    if (type === 'CPF') v = maskCPF(v)
    if (type === 'PHONE') v = maskPhone(v)
    setValue(v)
  }

  const add = async () => {
    setLoading(true)
    try {
      await api.post('/pix/keys', { type, key_value: type === 'EVP' ? 'generate' : cleanMask(value) })
      show('Chave adicionada!', 'success')
      setTimeout(() => { onClose(); onAdded() }, 1000)
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const placeholders = { CPF: '000.000.000-00', EMAIL: 'seu@email.com', PHONE: '(11) 99999-9999', EVP: 'Gerada automaticamente', CNPJ: '00.000.000/0000-00' }

  return (
    <Modal title="Adicionar Chave PIX" onClose={onClose}>
      <Toasts />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Tipo de chave" value={type} onChange={e => { setType(e.target.value); setValue('') }}>
          <option value="CPF">CPF</option>
          <option value="EMAIL">Email</option>
          <option value="PHONE">Telefone</option>
          <option value="EVP">Chave aleatória (EVP)</option>
          <option value="CNPJ">CNPJ</option>
        </Select>
        {type !== 'EVP' && (
          <Input label="Valor da chave" placeholder={placeholders[type]}
            value={value} onChange={handleChange}
            inputMode={['CPF','CNPJ','PHONE'].includes(type) ? 'numeric' : 'text'}
          />
        )}
        {type === 'EVP' && (
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            Uma chave aleatória será gerada automaticamente.
          </p>
        )}
        <Btn onClick={add} loading={loading} fullWidth>Adicionar chave</Btn>
      </div>
    </Modal>
  )
}

export default function Pix() {
  const [keys, setKeys]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const { show, Toasts }    = useToast()

  const loadKeys = () => {
    setLoading(true)
    api.get('/pix/keys')
      .then(r => setKeys(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(loadKeys, [])

  const deleteKey = async (id) => {
    if (!confirm('Remover esta chave PIX?')) return
    try {
      await api.delete(`/pix/keys/${id}`)
      show('Chave removida', 'success')
      loadKeys()
    } catch (e) {
      show(e.message, 'error')
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <Toasts />
      <h2 style={{ color: C.text, margin: '0 0 4px' }}>Chaves PIX</h2>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px' }}>Gerencie suas chaves PIX</p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Btn onClick={() => setModal('add')} style={{ flex: 1 }}>+ Adicionar chave</Btn>
        <Btn onClick={() => setModal('lookup')} variant="secondary" style={{ flex: 1 }}>🔍 Consultar</Btn>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ color: C.muted }}>Carregando...</div>
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 14 }}>
            Nenhuma chave PIX cadastrada
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {keys.map(k => (
            <Card key={k.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <KeyBadge type={k.type} />
                  </div>
                  <p style={{ margin: 0, color: C.text, fontSize: 14, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {k.key_value}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <CopyBtn text={k.key_value} />
                  <button onClick={() => deleteKey(k.id)} style={{
                    background: C.red + '22', border: 'none', borderRadius: 8,
                    padding: '6px 10px', color: C.red, cursor: 'pointer', fontSize: 15,
                  }}>🗑</button>
                </div>
              </div>
            </Card>
          ))}
          <p style={{ color: C.faint, fontSize: 12, textAlign: 'center', margin: '4px 0' }}>
            {keys.length}/5 chaves cadastradas
          </p>
        </div>
      )}

      {modal === 'add' && <AddKeyModal onClose={() => setModal(null)} onAdded={loadKeys} />}
      {modal === 'lookup' && <LookupModal onClose={() => setModal(null)} />}
    </div>
  )
}
