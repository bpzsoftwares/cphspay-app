import { useState, useEffect } from 'react'
import { api } from '../api'
import { fmt, fmtDateTime, isCredit, TX_LABELS, STATUS_LABELS } from '../utils'
import { Card, Spinner, EmptyState, C } from '../components/UI'

const STATUS_COLOR = {
  completed: C.green, pending: C.yellow, failed: C.red,
  cancelled: C.faint, expired: C.faint,
}

export default function Extrato() {
  const [txs, setTxs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]   = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('all')

  const typeMap = {
    all:      '',
    entrada:  'deposit,boleto_deposit,transfer_in,admin_credit',
    saida:    'withdrawal,transfer_out,bill_payment',
    pix:      'deposit,withdrawal',
    boleto:   'boleto_deposit',
    transfer: 'transfer_in,transfer_out',
  }

  useEffect(() => {
    setLoading(true)
    const type = typeMap[filter] || ''
    api.get(`/user/statement?page=${page}&limit=20${type ? `&type=${type}` : ''}`)
      .then(r => { setTxs(r.data || []); setTotal(r.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filter])

  const filters = ['all','entrada','saida','pix','boleto','transfer']
  const filterLabels = { all: 'Todos', entrada: 'Entradas', saida: 'Saídas', pix: 'PIX', boleto: 'Boleto', transfer: 'Transferências' }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <h2 style={{ color: C.text, margin: '0 0 16px' }}>Extrato</h2>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        {filters.map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none',
            background: filter === f ? C.purple : '#1a1d2e',
            color: filter === f ? '#fff' : C.muted,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner />
        </div>
      ) : txs.length === 0 ? (
        <EmptyState icon="📊" title="Sem transações" message="Nada encontrado para esse filtro" />
      ) : (
        <Card>
          {txs.map((tx, i) => {
            const credit = isCredit(tx.type)
            return (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 0',
                borderBottom: i < txs.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: credit ? C.green + '22' : C.red + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {credit ? '↓' : '↑'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, color: C.text, fontSize: 14, fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {tx.description || TX_LABELS[tx.type] || tx.type}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                    <span style={{ color: C.faint, fontSize: 11 }}>{fmtDateTime(tx.created_at)}</span>
                    <span style={{
                      color: STATUS_COLOR[tx.status] || C.faint,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {STATUS_LABELS[tx.status] || tx.status}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, color: credit ? C.green : C.red, fontWeight: 700, fontSize: 15 }}>
                    {credit ? '+' : '-'}{fmt(tx.amount)}
                  </p>
                  {tx.fee > 0 && (
                    <p style={{ margin: '2px 0 0', color: C.faint, fontSize: 11 }}>
                      Taxa: {fmt(tx.fee)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* Paginação */}
      {Math.ceil(total / 20) > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: page <= 1 ? '#1a1d2e' : C.purple, color: '#fff', cursor: 'pointer',
          }}>‹ Anterior</button>
          <span style={{ color: C.muted, fontSize: 13, lineHeight: '36px' }}>
            {page}/{Math.ceil(total / 20)}
          </span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: page >= Math.ceil(total / 20) ? '#1a1d2e' : C.purple, color: '#fff', cursor: 'pointer',
          }}>Próxima ›</button>
        </div>
      )}
    </div>
  )
}
