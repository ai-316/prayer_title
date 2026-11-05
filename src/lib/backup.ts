/**
 * 기도제목 — 백업 / 복원 (CSV)
 *
 * 엑셀이나 워드에서 바로 열어 편집할 수 있도록 CSV 형식을 씁니다.
 * 편집한 파일을 그대로 다시 불러오면 앱에 반영됩니다.
 *
 * CSV 열 구성:
 *   카테고리 | 기도제목 | 중요 | 응답 | 작성일 | 응답일
 */

import type { AppData, Category, Prayer } from './store'
import { makeId, todayKey } from './store'

/* ───────── CSV 만들기 ───────── */

/** 엑셀에서 깨지지 않도록 값 하나를 안전하게 감쌉니다 */
function cell(v: string): string {
  const s = String(v ?? '')
  // 쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표는 두 번
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export const CSV_HEADER = ['카테고리', '기도제목', '중요', '응답', '작성일', '응답일']

export function toCsv(data: AppData): string {
  const rows: string[] = []
  rows.push(CSV_HEADER.join(','))

  // 카테고리 순서대로 정렬해서 내보냅니다
  for (const cat of data.categories) {
    const items = data.prayers.filter((p) => p.categoryId === cat.id)
    for (const p of items) {
      rows.push(
        [
          cell(cat.name),
          cell(p.text),
          p.starred ? 'O' : '',
          p.answered ? 'O' : '',
          cell(p.createdAt),
          cell(p.answeredAt ?? ''),
        ].join(','),
      )
    }
  }

  // 기도제목이 하나도 없는 빈 카테고리도 남겨둡니다 (구조 유지)
  for (const cat of data.categories) {
    const has = data.prayers.some((p) => p.categoryId === cat.id)
    if (!has) {
      rows.push([cell(cat.name), '', '', '', '', ''].join(','))
    }
  }

  // 엑셀에서 한글이 깨지지 않도록 맨 앞에 BOM을 붙입니다
  return '\uFEFF' + rows.join('\r\n')
}

/* ───────── CSV 읽기 ───────── */

/** CSV 한 줄을 칸 단위로 나눕니다 (따옴표 안의 쉼표는 무시) */
function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuote = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuote = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

/** 줄바꿈을 처리하면서 CSV 전체를 행 단위로 나눕니다 */
function splitRows(text: string): string[] {
  const rows: string[] = []
  let cur = ''
  let inQuote = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuote = !inQuote
      cur += ch
    } else if (!inQuote && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (cur.trim()) rows.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) rows.push(cur)
  return rows
}

const isTrue = (v: string) => {
  const s = (v ?? '').trim().toUpperCase()
  return s === 'O' || s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1' || s === '★' || s === 'V'
}

export interface ImportResult {
  data: AppData
  categoryCount: number
  prayerCount: number
}

/** CSV 글자를 읽어서 앱 데이터로 되돌립니다 */
export function fromCsv(raw: string): ImportResult | null {
  try {
    // BOM 제거
    const text = raw.replace(/^\uFEFF/, '')
    const rows = splitRows(text)
    if (rows.length === 0) return null

    // 첫 줄이 제목줄이면 건너뜁니다
    const first = parseLine(rows[0]).map((c) => c.trim())
    const hasHeader =
      first[0]?.includes('카테고리') || first[0]?.toLowerCase().includes('category')
    const body = hasHeader ? rows.slice(1) : rows

    // 제목줄이 없다면 최소한 쉼표로 나뉜 표 모양인지 확인합니다
    if (!hasHeader) {
      const looksLikeTable = rows.some((r) => parseLine(r).length >= 2)
      if (!looksLikeTable) return null
    }

    const categories: Category[] = []
    const prayers: Prayer[] = []
    const catIdByName = new Map<string, string>()

    const ensureCategory = (name: string): string => {
      const key = name.trim()
      if (!key) return ''
      const found = catIdByName.get(key)
      if (found) return found
      const id = makeId('c')
      catIdByName.set(key, id)
      categories.push({ id, name: key })
      return id
    }

    for (const row of body) {
      const cols = parseLine(row)
      const catName = (cols[0] ?? '').trim()
      const text = (cols[1] ?? '').trim()
      if (!catName && !text) continue

      const catId = ensureCategory(catName || '기타')
      if (!text) continue // 빈 카테고리 줄

      prayers.push({
        id: makeId('p'),
        text,
        categoryId: catId,
        starred: isTrue(cols[2] ?? ''),
        answered: isTrue(cols[3] ?? ''),
        createdAt: (cols[4] ?? '').trim() || todayKey(),
        answeredAt: (cols[5] ?? '').trim() || undefined,
      })
    }

    if (categories.length === 0) return null

    return {
      data: { version: 1, categories, prayers },
      categoryCount: categories.length,
      prayerCount: prayers.length,
    }
  } catch {
    return null
  }
}

/* ───────── 파일로 저장 / 공유 ───────── */

function isNative(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return !!cap?.isNativePlatform?.()
}

export interface SaveResult {
  ok: boolean
  /** 사용자에게 보여줄 안내 */
  message: string
}

/**
 * CSV를 파일로 저장하고 공유창을 띄웁니다.
 * - 안드로이드 앱: 문서 폴더에 저장 후 '공유' 창 (카톡·드라이브 등으로 보내기)
 * - 브라우저: 바로 다운로드
 */
export async function saveCsv(filename: string, csv: string): Promise<SaveResult> {
  if (!isNative()) {
    // 브라우저에서는 그냥 다운로드
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1500)
      return { ok: true, message: '백업 파일을 내려받았어요' }
    } catch {
      return { ok: false, message: '저장하지 못했어요' }
    }
  }

  // 안드로이드 앱
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')

    // 1) 폰에 파일로 저장 (문서 폴더)
    await Filesystem.writeFile({
      path: filename,
      data: csv,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })

    // 2) 저장한 파일의 실제 경로를 얻어 공유창 띄우기
    const uriResult = await Filesystem.getUri({
      path: filename,
      directory: Directory.Documents,
    })

    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title: '기도제목 백업',
        text: '기도제목 백업 파일입니다',
        url: uriResult.uri,
        dialogTitle: '백업 파일 보내기',
      })
      return { ok: true, message: '문서 폴더에 저장했어요' }
    } catch {
      // 사용자가 공유를 취소해도 파일은 이미 저장된 상태
      return { ok: true, message: '내 파일 > Documents 에 저장했어요' }
    }
  } catch {
    return { ok: false, message: '저장 권한을 확인해 주세요' }
  }
}
