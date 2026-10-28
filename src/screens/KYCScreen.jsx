import { useState, useRef } from 'react'
import { api } from '../api'
import { Btn, Card, C, useToast } from '../components/UI'

const DOCS = [
  { type: 'IDENTITY',           label: 'RG ou CNH',          icon: '🪪', desc: 'Frente do documento de identidade' },
  { type: 'IDENTITY_BACK',      label: 'Verso do documento',  icon: '🔄', desc: 'Verso do RG ou CNH' },
  { type: 'SELFIE',             label: 'Selfie',              icon: '🤳', desc: 'Foto do rosto segurando o documento' },
  { type: 'PROOF_OF_RESIDENCE', label: 'Comprovante de res.', icon: '🏠', desc: 'Conta de luz, água ou extrato bancário' },
]

function DocItem({ doc, uploaded, onUpload }) {
  const ref = useRef()
  const [loading, setLoading] = useState(false)
  const { show, Toasts } = useToast()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('document', file)
    fd.append('type', doc.type)
    setLoading(true)
    try {
      await api.post('/kyc/upload', fd)
      onUpload(doc.type)
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ border: `1px solid ${uploaded ? C.green + '44' : C.border}` }}>
      <Toasts />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: uploaded ? C.green + '22' : '#1a1d2e',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {uploaded ? '✅' : doc.icon}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 3px', color: C.text, fontWeight: 700 }}>{doc.label}</p>
          <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>{doc.desc}</p>
        </div>
        <input type="file" ref={ref} accept="image/jpeg,image/png,application/pdf"
          style={{ display: 'none' }} onChange={handleFile} />
        <Btn onClick={() => ref.current?.click()} loading={loading}
          variant={uploaded ? 'success' : 'secondary'} size="sm">
          {uploaded ? 'Enviado' : 'Enviar'}
        </Btn>
      </div>
    </Card>
  )
}

export default function KYCScreen({ user }) {
  const [uploaded, setUploaded] = useState({})
  const onUpload = (type) => setUploaded(p => ({ ...p, [type]: true }))

  const kycStatus = user?.kyc_status || 'pending'
  const statusColors = { pending: C.yellow, under_review: C.blue, approved: C.green, rejected: C.red }
  const statusLabels = { pending: 'Aguardando envio', under_review: 'Em análise', approved: 'Aprovado', rejected: 'Rejeitado' }
  const statusIcons  = { pending: '⏳', under_review: '🔍', approved: '✅', rejected: '❌' }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <h2 style={{ color: C.text, margin: '0 0 4px' }}>Verificação de identidade</h2>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px' }}>
        Envie seus documentos para habilitar saques e transferências
      </p>

      {/* Status atual */}
      <div style={{
        background: (statusColors[kycStatus] || C.faint) + '18',
        border: `1px solid ${statusColors[kycStatus] || C.faint}44`,
        borderRadius: 14, padding: 16, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <span style={{ fontSize: 28 }}>{statusIcons[kycStatus]}</span>
        <div>
          <p style={{ margin: '0 0 3px', color: statusColors[kycStatus] || C.faint, fontWeight: 700 }}>
            Status: {statusLabels[kycStatus] || kycStatus}
          </p>
          {kycStatus === 'pending' && (
            <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>
              Envie os documentos abaixo para verificar sua conta
            </p>
          )}
          {kycStatus === 'under_review' && (
            <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>
              Seus documentos estão sendo analisados. Em até 48h úteis.
            </p>
          )}
          {kycStatus === 'approved' && (
            <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>
              Sua conta está verificada. Você pode fazer saques e transferências.
            </p>
          )}
          {kycStatus === 'rejected' && (
            <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>
              Documentos rejeitados. Por favor, envie novamente com qualidade melhor.
            </p>
          )}
        </div>
      </div>

      {/* Documentos */}
      {(kycStatus === 'pending' || kycStatus === 'rejected') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: C.text, fontWeight: 700, margin: '0 0 4px' }}>Documentos necessários</p>
          {DOCS.map(doc => (
            <DocItem key={doc.type} doc={doc}
              uploaded={!!uploaded[doc.type]}
              onUpload={onUpload}
            />
          ))}
          <div style={{
            background: '#1a1d2e', borderRadius: 12, padding: 14, marginTop: 4,
          }}>
            <p style={{ margin: '0 0 8px', color: C.faint, fontSize: 12, fontWeight: 600 }}>
              📋 REQUISITOS DOS DOCUMENTOS
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', color: C.muted, fontSize: 12, lineHeight: 2 }}>
              <li>Arquivos JPG, PNG ou PDF</li>
              <li>Tamanho máximo: 10MB por arquivo</li>
              <li>Imagens nítidas, sem cortes</li>
              <li>Documentos válidos e dentro do prazo</li>
            </ul>
          </div>
        </div>
      )}

      {kycStatus === 'approved' && (
        <Card style={{ border: `1px solid ${C.green}44`, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <p style={{ color: C.green, fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>
            Conta verificada!
          </p>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            Você tem acesso a todos os recursos da CphsPay.
          </p>
        </Card>
      )}
    </div>
  )
}
