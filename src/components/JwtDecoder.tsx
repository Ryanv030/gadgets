import { useState, useCallback, useMemo } from 'react'

function decodeJwt(token: string): {
  header: Record<string, unknown> | null
  payload: Record<string, unknown> | null
  signature: string
  error: string | null
} {
  const parts = token.trim().split('.')
  if (parts.length !== 3) {
    return { header: null, payload: null, signature: '', error: 'JWT must have 3 parts (header.payload.signature)' }
  }

  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return { header, payload, signature: parts[2], error: null }
  } catch {
    return { header: null, payload: null, signature: '', error: 'Failed to decode — not a valid JWT' }
  }
}

function getExpiry(payload: Record<string, unknown>): { label: string; expired: boolean } | null {
  const exp = payload.exp
  if (typeof exp !== 'number') return null
  const expiresAt = new Date(exp * 1000)
  const now = new Date()
  const expired = expiresAt < now
  const diff = Math.abs(expiresAt.getTime() - now.getTime())
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  let relative: string
  if (days > 0) relative = `${days}d ${hours % 24}h`
  else if (hours > 0) relative = `${hours}h ${minutes % 60}m`
  else relative = `${minutes}m`

  return {
    label: `${expiresAt.toLocaleString()} (${expired ? '' : 'in '}${relative}${expired ? ' ago' : ''})`,
    expired,
  }
}

function getIssuedAt(payload: Record<string, unknown>): string | null {
  const iat = payload.iat
  if (typeof iat !== 'number') return null
  return new Date(iat * 1000).toLocaleString()
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])
  return (
    <button onClick={copy} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
        {actions}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

export default function JwtDecoder() {
  const [input, setInput] = useState('')

  const result = useMemo(() => {
    if (!input.trim()) return null
    return decodeJwt(input)
  }, [input])

  const expiry = result?.payload ? getExpiry(result.payload) : null
  const issuedAt = result?.payload ? getIssuedAt(result.payload) : null

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="jwt-input" className="block text-sm font-medium text-zinc-400 mb-2">
          Paste a JWT
        </label>
        <textarea
          id="jwt-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          spellCheck={false}
        />
        {result?.error && <p className="mt-2 text-sm text-red-400">{result.error}</p>}
      </div>

      {result && !result.error && (
        <div className="space-y-4">
          {/* Status bar */}
          {expiry && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${
              expiry.expired
                ? 'border-red-900/50 bg-red-950/30 text-red-400'
                : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400'
            }`}>
              <span className="text-lg">{expiry.expired ? '✕' : '✓'}</span>
              <div className="text-sm">
                <span className="font-medium">{expiry.expired ? 'Expired' : 'Valid'}</span>
                <span className="text-zinc-400 ml-2">{expiry.label}</span>
              </div>
            </div>
          )}

          {issuedAt && (
            <div className="text-sm text-zinc-400 px-1">
              Issued at: <span className="text-zinc-300">{issuedAt}</span>
            </div>
          )}

          <Section title="Header" actions={<CopyButton text={JSON.stringify(result.header, null, 2)} />}>
            <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap">
              {JSON.stringify(result.header, null, 2)}
            </pre>
          </Section>

          <Section title="Payload" actions={<CopyButton text={JSON.stringify(result.payload, null, 2)} />}>
            <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </Section>

          <Section title="Signature">
            <p className="text-sm font-mono text-zinc-500 break-all">{result.signature}</p>
          </Section>
        </div>
      )}
    </div>
  )
}
