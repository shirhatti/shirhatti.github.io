/**
 * Performance measurement utilities for terminal benchmarking.
 * Measures: init time, input latency, render speed, memory usage.
 */

interface PerfResult {
  label: string
  value: number
  unit: string
}

const results: PerfResult[] = []

export const perf = {
  mark(label: string) {
    performance.mark(label)
  },

  measure(label: string, startMark: string, endMark?: string): number {
    try {
      const entry = performance.measure(label, startMark, endMark)
      return entry.duration
    } catch {
      return -1
    }
  },

  record(label: string, value: number, unit = 'ms') {
    results.push({ label, value, unit })
  },

  getResults(): PerfResult[] {
    return [...results]
  },

  clear() {
    results.length = 0
  },

  getMemoryUsage(): { heapUsed: number; heapTotal: number } | null {
    const mem = (
      performance as unknown as {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
      }
    ).memory
    if (!mem) return null
    return {
      heapUsed: mem.usedJSHeapSize,
      heapTotal: mem.totalJSHeapSize,
    }
  },

  /**
   * Measure time to write a large chunk of text to the terminal.
   * Returns the duration in milliseconds.
   */
  async measureRender(
    terminal: { write: (data: string) => void },
    data: string,
  ): Promise<number> {
    const start = performance.now()
    terminal.write(data)
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const duration = performance.now() - start
        resolve(duration)
      })
    })
  },

  formatReport(): string[] {
    const lines: string[] = []
    for (const r of results) {
      const val =
        r.unit === 'MB'
          ? r.value.toFixed(2)
          : r.unit === 'KB'
            ? r.value.toFixed(1)
            : r.value.toFixed(2)
      lines.push(`  ${r.label.padEnd(30)} ${val} ${r.unit}`)
    }
    return lines
  },
}
