import { useState } from 'react'
import { Input, Btn, Select, C } from '../components/UI'
import { maskCPF, maskPhone, maskCEP, maskCNPJ, cleanMask, validateCPF, validateEmail, validatePhone } from '../utils'

export default function AuthScreen({ onAuth }) {
  const [tab, setTab]     = useState('login') // login | register
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep]   = useState(1) // Para registro: 1=dados básicos, 2=endereço, 3=menor
  const [isMinor, setIsMinor] = useState(false)

  const [form, setForm] = useState({
    // Login
    email: '', password: '',
    // Registro básico
    name: '', cpf: '', phone: '', birth_date: '',
    // Endereço
    cep: '', street: '', address_number: '', complement: '',
    neighborhood: '', city: '', state: '',
    // Menor
    guardian_name: '', guardian_cpf: '', guardian_email: '',
    guardian_phone: '', guardian_relation: 'Pai/Mãe',
  })

  const set = (k) => (e) => {
    let v = e.target.value
    if (k === 'cpf')           v = maskCPF(v)
    if (k === 'guardian_cpf')  v = maskCPF(v)
    if (k === 'phone')         v = maskPhone(v)
    if (k === 'guardian_phone') v = maskPhone(v)
    if (k === 'cep')           v = maskCEP(v)
    setForm(p => ({ ...p, [k]: v }))
    setError('')
  }

  // ── CEP lookup ──────────────────────────────────────────
  const lookupCEP = async () => {
    const cep = cleanMask(form.cep)
    if (cep.length !== 8) return
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const d = await r.json()
      if (!d.erro) {
        setForm(p => ({
          ...p,
          street: d.logradouro, neighborhood: d.bairro,
          city: d.localidade, state: d.uf,
        }))
      }
    } catch {}
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return setError('Preencha email e senha')
    setLoading(true)
    try {
      await onAuth.login(form.email, form.password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    // Validações por step
    if (step === 1) {
      if (!form.name) return setError('Nome obrigatório')
      if (!validateEmail(form.email)) return setError('Email inválido')
      if (form.password.length < 6) return setError('Senha: mínimo 6 caracteres')
      if (form.cpf && !validateCPF(cleanMask(form.cpf))) return setError('CPF inválido')
      if (form.phone && !validatePhone(form.phone)) return setError('Telefone inválido')
      return setStep(2)
    }
    if (step === 2) {
      return setStep(isMinor ? 3 : 'submit')
    }

    // Submit final
    setLoading(true)
    setError('')
    try {
      const payload = {
        name: form.name, email: form.email, password: form.password,
        cpf: form.cpf ? cleanMask(form.cpf) : undefined,
        phone: form.phone ? cleanMask(form.phone) : undefined,
        birth_date: form.birth_date || undefined,
        cep: cleanMask(form.cep) || undefined,
        street: form.street || undefined,
        address_number: form.address_number || undefined,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        is_minor: isMinor,
        ...(isMinor ? {
          guardian_name: form.guardian_name,
          guardian_cpf: cleanMask(form.guardian_cpf),
          guardian_email: form.guardian_email,
          guardian_phone: cleanMask(form.guardian_phone),
          guardian_relation: form.guardian_relation,
        } : {}),
      }
      await onAuth.register(payload)
    } catch (err) {
      setError(err.message)
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const stepSubmit = step === 'submit' || step === 3

  return (
    <div style={{
      minHeight: '100dvh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 12px',
          background: `linear-gradient(135deg,${C.purple},${C.purpleDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>💳</div>
        <h1 style={{ margin: 0, color: C.text, fontSize: 24, fontWeight: 900 }}>CphsPay</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>Sua carteira digital</p>
      </div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: '#12141f', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {['login','register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setStep(1); setError('') }} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: tab === t ? C.purple : 'transparent',
              color: tab === t ? '#fff' : C.muted,
              fontWeight: 700, fontSize: 14, transition: 'all .2s',
            }}>
              {t === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={tab === 'login' ? handleLogin : handleRegister}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── LOGIN ── */}
          {tab === 'login' && <>
            <Input label="Email" type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} autoComplete="email" />
            <Input label="Senha" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="current-password" />
          </>}

          {/* ── REGISTRO STEP 1: Dados básicos ── */}
          {tab === 'register' && step === 1 && <>
            <Input label="Nome completo" placeholder="João Silva" value={form.name} onChange={set('name')} />
            <Input label="Email" type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} />
            <Input label="Senha" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} />
            <Input label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={set('cpf')} inputMode="numeric" />
            <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={set('phone')} inputMode="tel" />
            <Input label="Data de nascimento" type="date" value={form.birth_date} onChange={set('birth_date')} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: C.muted, fontSize: 14 }}>
              <input type="checkbox" checked={isMinor} onChange={e => setIsMinor(e.target.checked)} />
              Conta para menor de 18 anos
            </label>
          </>}

          {/* ── REGISTRO STEP 2: Endereço ── */}
          {tab === 'register' && step === 2 && <>
            <p style={{ color: C.muted, margin: '0 0 8px', fontSize: 13 }}>Endereço (opcional)</p>
            <Input label="CEP" placeholder="00000-000" value={form.cep} onChange={set('cep')} onBlur={lookupCEP} inputMode="numeric" />
            <Input label="Rua" placeholder="Rua das Flores" value={form.street} onChange={set('street')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Input label="Número" placeholder="123" value={form.address_number} onChange={set('address_number')} />
              <Input label="Complemento" placeholder="Apto 4" value={form.complement} onChange={set('complement')} />
            </div>
            <Input label="Bairro" placeholder="Centro" value={form.neighborhood} onChange={set('neighborhood')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <Input label="Cidade" placeholder="São Paulo" value={form.city} onChange={set('city')} />
              <Input label="UF" placeholder="SP" value={form.state} onChange={set('state')} style={{ width: 56 }} maxLength={2} />
            </div>
          </>}

          {/* ── REGISTRO STEP 3: Responsável (menor) ── */}
          {tab === 'register' && step === 3 && <>
            <p style={{ color: C.yellow, margin: '0 0 8px', fontSize: 13 }}>⚠️ Dados do responsável legal</p>
            <Input label="Nome do responsável" placeholder="Maria Silva" value={form.guardian_name} onChange={set('guardian_name')} />
            <Input label="CPF do responsável" placeholder="000.000.000-00" value={form.guardian_cpf} onChange={set('guardian_cpf')} inputMode="numeric" />
            <Input label="Email do responsável" type="email" placeholder="responsavel@email.com" value={form.guardian_email} onChange={set('guardian_email')} />
            <Input label="Telefone do responsável" placeholder="(11) 99999-9999" value={form.guardian_phone} onChange={set('guardian_phone')} inputMode="tel" />
            <Select label="Grau de parentesco" value={form.guardian_relation} onChange={set('guardian_relation')}>
              <option>Pai/Mãe</option>
              <option>Avô/Avó</option>
              <option>Tutor(a) legal</option>
              <option>Outro</option>
            </Select>
          </>}

          {error && <p style={{ color: C.red, fontSize: 13, margin: 0, textAlign: 'center' }}>{error}</p>}

          <Btn type="submit" loading={loading} fullWidth>
            {tab === 'login' ? 'Entrar' : stepSubmit ? 'Criar conta' : step === 2 ? (isMinor ? 'Próximo →' : 'Criar conta') : 'Próximo →'}
          </Btn>

          {tab === 'register' && step > 1 && (
            <Btn type="button" variant="ghost" fullWidth onClick={() => setStep(step === 3 ? 2 : 1)}>
              ← Voltar
            </Btn>
          )}
        </form>

        {/* Step indicator */}
        {tab === 'register' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
            {[1, 2, ...(isMinor ? [3] : [])].map(s => (
              <div key={s} style={{
                width: s === step ? 20 : 8, height: 8, borderRadius: 4,
                background: s <= step ? C.purple : C.border,
                transition: 'all .3s',
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
