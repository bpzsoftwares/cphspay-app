import { useState } from 'react'
import { api } from '../api'
import { fmt } from '../utils'
import { Btn, Card, Input, C, useToast } from '../components/UI'

export default function BillScreen() {
  const [barcode, setBarcode] = useState('')
  const [simulation, setSimulation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [done, setDone] = useState(false)
  const { show, Toasts } = useToast()

  const simulate = async () => {
    const code = barcode.replace(/\D/g, '')
    if (code.length < 44) return show('Código de barras inválido', 'warning')
    setLoading(true)
    setSimulation(null)
    try {
      const r = await api.post('/bill/simulate', { identificationField: code })
      setSimulation(r)
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const pay = async () => {
    if (!simulation) return
    setPaying(true)
    try {
      await api.post('/bill/pay', { identificationField: barcode.replace(/\D/g, '') })
      setDone(true)
      show('Pagamento realizado!', 'success')
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setPaying(false)
    }
  }

  const reset = () => {
    setBarcode('')
    setSimulation(null)
    setDone(false)
  }

  if (done) {
    return (
      <div style={{ padding: '0 16px 24px', textAlign: 'center', paddingTop: 60 }}>
        <Toasts />
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: C.text, margin: '0 0 8px' }}>Pagamento realizado!</h2>
        <p style={{ color: C.muted, margin: '0 0 32px' }}>
          Seu boleto foi pago com sucesso.
        </p>
        <Btn onClick={reset} fullWidth>Pagar outro boleto</Btn>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <Toasts />
      <h2 style={{ color: C.text, margin: '0 0 4px' }}>Pagar Boleto</h2>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 24px' }}>
        Pague contas e boletos bancários
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input
          label="Código de barras / Linha digitável"
          placeholder="Cole ou digite o código do boleto"
          value={barcode}
          onChange={e => { setBarcode(e.target.value); setSimulation(null) }}
          inputMode="numeric"
        />

        {!simulation ? (
          <Btn onClick={simulate} loading={loading} fullWidth>
            🔍 Consultar boleto
          </Btn>
        ) : (
          <>
            {/* Resultado da simulação */}
            <Card style={{ border: `1px solid ${C.green}44` }}>
              <p style={{ margin: '0 0 12px', color: C.faint, fontSize: 12 }}>DETALHES DO BOLETO</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {simulation.company && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, fontSize: 14 }}>Beneficiário</span>
                    <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{simulation.company}</span>
                  </div>
                )}
                {simulation.dueDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, fontSize: 14 }}>Vencimento</span>
                    <span style={{ color: C.text, fontSize: 14 }}>
                      {new Date(simulation.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {simulation.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, fontSize: 14 }}>Desconto</span>
                    <span style={{ color: C.green, fontSize: 14 }}>-{fmt(simulation.discount)}</span>
                  </div>
                )}
                {simulation.interest > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, fontSize: 14 }}>Juros/Mora</span>
                    <span style={{ color: C.red, fontSize: 14 }}>+{fmt(simulation.interest)}</span>
                  </div>
                )}
                {simulation.fine > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted, fontSize: 14 }}>Multa</span>
                    <span style={{ color: C.red, fontSize: 14 }}>+{fmt(simulation.fine)}</span>
                  </div>
                )}

                <div style={{ height: 1, background: C.border, margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Total a pagar</span>
                  <span style={{ color: C.green, fontWeight: 700, fontSize: 22 }}>
                    {fmt(simulation.value || simulation.totalValue || simulation.originalValue)}
                  </span>
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={reset} variant="secondary" style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={pay} loading={paying} variant="success" style={{ flex: 2 }}>
                ✓ Pagar agora
              </Btn>
            </div>
          </>
        )}

        {/* Info */}
        <div style={{ marginTop: 8 }}>
          <p style={{ color: C.faint, fontSize: 12, margin: '0 0 6px' }}>ℹ️ Como funciona:</p>
          <ul style={{ color: C.faint, fontSize: 12, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
            <li>Cole ou digite o código do boleto</li>
            <li>Consulte para ver os detalhes e valor</li>
            <li>Confirme o pagamento</li>
            <li>O valor é debitado do seu saldo</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
