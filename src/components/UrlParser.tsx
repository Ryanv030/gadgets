import { useState, useCallback } from 'react'

interface ParsedParam {
  key: string
  value: string
  decodedValue: string
}

interface ParsedUrl {
  protocol: string
  host: string
  pathname: string
  params: ParsedParam[]
  hash: string
  raw: string
}

function parseUrl(input: string): ParsedUrl | null {
  try {
    const url = new URL(input.trim())
    const params: ParsedParam[] = []
    url.searchParams.forEach((value, key) => {
      params.push({
        key,
        value,
        decodedValue: decodeURIComponent(value),
      })
    })
    return {
      protocol: url.protocol.replace(':', ''),
      host: url.host,
      pathname: url.pathname,
      params,
      hash: url.hash,
      raw: input.trim(),
    }
  } catch {
    return null
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])

  return (
    <button
      onClick={copy}
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

export default function UrlParser() {
  const [input, setInput] = useState('')
  const parsed = input ? parseUrl(input) : null
  const isInvalid = input.length > 0 && !parsed

  return (
    <div className="space-y-6">
      {/* Input */}
      <div>
        <label htmlFor="url-input" className="block text-sm font-medium text-zinc-400 mb-2">
          Paste a URL
        </label>
        <textarea
          id="url-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://example.com/path?key=value&other=data"
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          spellCheck={false}
        />
        {isInvalid && (
          <p className="mt-2 text-sm text-red-400">Not a valid URL</p>
        )}
      </div>

      {/* Parsed output */}
      {parsed && (
        <div className="space-y-4">
          {/* Base URL parts */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300">Base</h3>
            </div>
            <div className="divide-y divide-zinc-800/50">
              <Row label="protocol" value={parsed.protocol} />
              <Row label="host" value={parsed.host} />
              <Row label="path" value={parsed.pathname} />
              {parsed.hash && <Row label="hash" value={parsed.hash} />}
            </div>
          </div>

          {/* Query params */}
          {parsed.params.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">
                  Query Parameters ({parsed.params.length})
                </h3>
                <CopyButton text={formatParamsForCopy(parsed.params)} />
              </div>
              <div className="divide-y divide-zinc-800/50">
                {parsed.params.map((param, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3">
                    <span className="text-sm font-mono text-amber-400 shrink-0 min-w-[140px]">
                      {param.key}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-zinc-100 break-all">
                          {param.decodedValue}
                        </span>
                        <CopyButton text={param.decodedValue} />
                      </div>
                      {param.value !== param.decodedValue && (
                        <div className="mt-1 text-xs text-zinc-500 font-mono break-all">
                          raw: {param.value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formatted output */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">Formatted</h3>
              <CopyButton text={formatReadable(parsed)} />
            </div>
            <pre className="px-4 py-3 text-sm font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all">
              {formatReadable(parsed)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <span className="text-sm text-zinc-500 min-w-[80px]">{label}</span>
      <span className="text-sm font-mono text-zinc-100 break-all">{value}</span>
      <CopyButton text={value} />
    </div>
  )
}

function formatReadable(parsed: ParsedUrl): string {
  let out = `${parsed.protocol}://${parsed.host}${parsed.pathname}`
  if (parsed.params.length > 0) {
    out += '\n'
    parsed.params.forEach((param, i) => {
      const prefix = i === 0 ? '?' : '&'
      out += `  ${prefix} ${param.key} = ${param.decodedValue}\n`
    })
  }
  if (parsed.hash) {
    out += `  # ${parsed.hash}`
  }
  return out.trimEnd()
}

function formatParamsForCopy(params: ParsedParam[]): string {
  return params.map((p) => `${p.key}=${p.decodedValue}`).join('\n')
}
