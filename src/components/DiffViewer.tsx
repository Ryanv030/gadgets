import { useState, useMemo } from 'react'

interface DiffLine {
  type: 'same' | 'added' | 'removed'
  text: string
  leftNum: number | null
  rightNum: number | null
}

function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split('\n')
  const rightLines = right.split('\n')

  // Simple LCS-based diff
  const m = leftLines.length
  const n = rightLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = []
  let i = m, j = n
  const stack: DiffLine[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      stack.push({ type: 'same', text: leftLines[i - 1], leftNum: i, rightNum: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', text: rightLines[j - 1], leftNum: null, rightNum: j })
      j--
    } else {
      stack.push({ type: 'removed', text: leftLines[i - 1], leftNum: i, rightNum: null })
      i--
    }
  }

  while (stack.length) result.push(stack.pop()!)
  return result
}

const lineStyles = {
  same: 'text-zinc-400',
  added: 'bg-emerald-950/40 text-emerald-300',
  removed: 'bg-red-950/40 text-red-300',
}

const prefixes = { same: ' ', added: '+', removed: '-' }

export default function DiffViewer() {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')

  const diff = useMemo(() => {
    if (!left && !right) return []
    return computeDiff(left, right)
  }, [left, right])

  const stats = useMemo(() => {
    const added = diff.filter((d) => d.type === 'added').length
    const removed = diff.filter((d) => d.type === 'removed').length
    return { added, removed }
  }, [diff])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="diff-left" className="block text-sm font-medium text-zinc-400 mb-2">
            Original
          </label>
          <textarea
            id="diff-left"
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            placeholder="Paste original text..."
            rows={8}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
            spellCheck={false}
          />
        </div>
        <div>
          <label htmlFor="diff-right" className="block text-sm font-medium text-zinc-400 mb-2">
            Modified
          </label>
          <textarea
            id="diff-right"
            value={right}
            onChange={(e) => setRight(e.target.value)}
            placeholder="Paste modified text..."
            rows={8}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
            spellCheck={false}
          />
        </div>
      </div>

      {diff.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-4">
            <h3 className="text-sm font-medium text-zinc-300">Diff</h3>
            {stats.added > 0 && (
              <span className="text-xs text-emerald-400">+{stats.added}</span>
            )}
            {stats.removed > 0 && (
              <span className="text-xs text-red-400">-{stats.removed}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <tbody>
                {diff.map((line, i) => (
                  <tr key={i} className={lineStyles[line.type]}>
                    <td className="px-2 py-0.5 text-zinc-600 text-right select-none w-10 text-xs">
                      {line.leftNum ?? ''}
                    </td>
                    <td className="px-2 py-0.5 text-zinc-600 text-right select-none w-10 text-xs">
                      {line.rightNum ?? ''}
                    </td>
                    <td className="px-1 py-0.5 select-none w-4 text-center text-xs">
                      {prefixes[line.type]}
                    </td>
                    <td className="px-2 py-0.5 whitespace-pre-wrap break-all">
                      {line.text || '\u00A0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
