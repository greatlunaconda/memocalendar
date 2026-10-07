// useMemoStore.ts → ただの関数群に変更（Composable は不要）
const STORAGE_KEY = 'calendar-memos'

export type Memo = { text: string; canvasJson: string }

const readAll = (): Record<string, Memo> => {
  if (typeof window === 'undefined') return {} // import.meta.client の代わり
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const saveMemo = (date: string, data: Memo) => {
  if (typeof window === 'undefined') return
  const memos = readAll()
  memos[date] = data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos))
}

export const loadMemo = (date: string): Memo | null => readAll()[date] ?? null

export const getMemoKeys = (): string[] => Object.keys(readAll())
