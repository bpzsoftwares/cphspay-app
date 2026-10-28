// ── Formatação ─────────────────────────────────────────────
export const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtDate = (ts) => {
  if (!ts) return '--'
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
  return d.toLocaleDateString('pt-BR')
}

export const fmtDateTime = (ts) => {
  if (!ts) return '--'
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
  return d.toLocaleString('pt-BR')
}

export function ago(ts) {
  if (!ts) return ''
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
  const secs = Math.floor((Date.now() - d) / 1000)
  if (secs < 60)  return 'agora'
  if (secs < 3600) return `${Math.floor(secs/60)}min atrás`
  if (secs < 86400) return `${Math.floor(secs/3600)}h atrás`
  if (secs < 604800) return `${Math.floor(secs/86400)}d atrás`
  return fmtDate(ts)
}

// ── Máscaras de input ─────────────────────────────────────
export function maskCPF(v) {
  return v.replace(/\D/g,'').slice(0,11)
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d{1,2})$/,'$1-$2')
}

export function maskCNPJ(v) {
  return v.replace(/\D/g,'').slice(0,14)
    .replace(/(\d{2})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1/$2')
    .replace(/(\d{4})(\d{1,2})$/,'$1-$2')
}

export function maskPhone(v) {
  const n = v.replace(/\D/g,'').slice(0,11)
  if (n.length <= 10)
    return n.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3')
  return n.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3')
}

export function maskCEP(v) {
  return v.replace(/\D/g,'').slice(0,8)
    .replace(/(\d{5})(\d{1,3})/,'$1-$2')
}

export function maskCard(v) {
  return v.replace(/\D/g,'').slice(0,16)
    .replace(/(\d{4})(?=\d)/g,'$1 ').trim()
}

export function maskExpiry(v) {
  return v.replace(/\D/g,'').slice(0,4)
    .replace(/(\d{2})(\d{1,2})/,'$1/$2')
}

export function cleanMask(v) {
  return (v || '').replace(/\D/g,'')
}

// ── Labels de transações ──────────────────────────────────
export const TX_LABELS = {
  deposit:        'Depósito PIX',
  boleto_deposit: 'Depósito Boleto',
  withdrawal:     'Saque PIX',
  transfer_in:    'Transferência recebida',
  transfer_out:   'Transferência enviada',
  bill_payment:   'Pag. Conta',
  card_charge:    'Cartão de crédito',
  admin_credit:   'Crédito administrativo',
  admin_debit:    'Débito administrativo',
}

export const TX_CREDIT = ['deposit','boleto_deposit','transfer_in','admin_credit']
export const isCredit = (type) => TX_CREDIT.includes(type)

export const STATUS_LABELS = {
  pending:   'Pendente',
  completed: 'Concluído',
  failed:    'Falhou',
  cancelled: 'Cancelado',
  expired:   'Expirado',
}

export const KYC_LABELS = {
  PENDING:  'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  IN_ANALYSIS: 'Em análise',
}

// ── Validações ────────────────────────────────────────────
export function validateCPF(cpf) {
  const n = cpf.replace(/\D/g,'')
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(n[i]) * (10 - i)
  let r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0
  if (r !== parseInt(n[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(n[i]) * (11 - i)
  r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0
  return r === parseInt(n[10])
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone) {
  const n = phone.replace(/\D/g,'')
  return n.length === 10 || n.length === 11
}
