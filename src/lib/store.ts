/**
 * 기도제목 — 데이터 저장소
 *
 * 모든 내용은 폰 내부에 저장됩니다.
 * 카테고리를 추가하거나 기도제목을 써도 APK를 다시 만들 필요가 없습니다.
 */

export interface Prayer {
  id: string
  text: string
  categoryId: string
  /** 중요 표시 */
  starred: boolean
  /** 응답됨 */
  answered: boolean
  /** 작성한 날짜 (YYYY-MM-DD) */
  createdAt: string
  /** 응답된 날짜 */
  answeredAt?: string
}

export interface Category {
  id: string
  name: string
  /** 접혀있는지 */
  collapsed?: boolean
}

export interface AppData {
  version: number
  categories: Category[]
  prayers: Prayer[]
}

const KEY = 'prayer-topics:v1'

/** 처음 설치했을 때 들어갈 기본 카테고리 8개 */
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c-trinity', name: 'Trinity' },
  { id: 'c-r', name: 'R' },
  { id: 'c-providence', name: 'Providence' },
  { id: 'c-people', name: 'People' },
  { id: 'c-family', name: 'Family' },
  { id: 'c-spirit', name: 'Spirit' },
  { id: 'c-soul', name: 'Soul' },
  { id: 'c-body', name: 'Body' },
]

export const EMPTY_DATA: AppData = {
  version: 1,
  categories: DEFAULT_CATEGORIES,
  prayers: [],
}

export function todayKey(d = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function makeId(prefix = 'p'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY_DATA
    const parsed = JSON.parse(raw)
    return {
      version: 1,
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0
        ? parsed.categories
        : DEFAULT_CATEGORIES,
      prayers: Array.isArray(parsed.prayers) ? parsed.prayers : [],
    }
  } catch {
    return EMPTY_DATA
  }
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* 저장 공간 부족 등 */
  }
}

export function vibrate(ms = 15) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* noop */
  }
}

/** 며칠째 기도 중인지 */
export function daysSince(dateStr: string): number {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const then = new Date(y, m - 1, d).getTime()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return Math.max(0, Math.round((today - then) / 86400000))
  } catch {
    return 0
  }
}
