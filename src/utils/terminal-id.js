const TERMINAL_ID_STORAGE_KEY = 'attendance-terminal-id'

function generateFallbackTerminalId() {
  return `terminal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getTerminalId() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return generateFallbackTerminalId()
  }

  const cachedTerminalId = window.localStorage.getItem(TERMINAL_ID_STORAGE_KEY)
  if (cachedTerminalId) {
    return cachedTerminalId
  }

  const nextTerminalId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `terminal-${crypto.randomUUID()}`
    : generateFallbackTerminalId()

  window.localStorage.setItem(TERMINAL_ID_STORAGE_KEY, nextTerminalId)
  return nextTerminalId
}
