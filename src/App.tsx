import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronRight,
  Download,
  FolderPlus,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react'
import Backdrop from './components/Backdrop'
import { CategoryEditor, PrayerActions, PrayerEditor, Sheet } from './components/Sheets'
import {
  daysSince,
  loadData,
  makeId,
  saveData,
  todayKey,
  vibrate,
  type AppData,
  type Prayer,
} from './lib/store'
import { fromCsv, saveCsv, toCsv } from './lib/backup'

type Tab = 'all' | 'star' | 'answered'

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // 열려있는 시트
  const [addTo, setAddTo] = useState<string | null>(null)
  const [editing, setEditing] = useState<Prayer | null>(null)
  const [acting, setActing] = useState<Prayer | null>(null)
  const [newCat, setNewCat] = useState(false)
  const [editCat, setEditCat] = useState<string | null>(null)
  const [backup, setBackup] = useState(false)

  useEffect(() => saveData(data), [data])

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2000)
  }

  /* ── 카테고리 ── */
  const toggleOpen = (id: string) => {
    setOpen((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const addCategory = (name: string) => {
    setData((d) => ({ ...d, categories: [...d.categories, { id: makeId('c'), name }] }))
    setNewCat(false)
    flash('카테고리를 만들었어요')
    vibrate()
  }

  const renameCategory = (id: string, name: string) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    }))
    setEditCat(null)
    flash('카테고리를 수정했어요')
  }

  const deleteCategory = (id: string) => {
    setData((d) => ({
      categories: d.categories.filter((c) => c.id !== id),
      prayers: d.prayers.filter((p) => p.categoryId !== id),
      version: 1,
    }))
    setEditCat(null)
    flash('카테고리를 삭제했어요')
  }

  /* ── 기도제목 ── */
  const addPrayer = (categoryId: string, text: string) => {
    const p: Prayer = {
      id: makeId('p'),
      text,
      categoryId,
      starred: false,
      answered: false,
      createdAt: todayKey(),
    }
    setData((d) => ({ ...d, prayers: [p, ...d.prayers] }))
    setOpen((s) => new Set(s).add(categoryId))
    setAddTo(null)
    flash('기도제목을 담았어요')
    vibrate()
  }

  const updatePrayer = (id: string, patch: Partial<Prayer>) => {
    setData((d) => ({
      ...d,
      prayers: d.prayers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }

  const deletePrayer = (id: string) => {
    setData((d) => ({ ...d, prayers: d.prayers.filter((p) => p.id !== id) }))
    setActing(null)
    flash('삭제했어요')
  }

  /* ── 백업 (CSV) ── */
  const [saving, setSaving] = useState(false)

  const doExport = async () => {
    if (saving) return
    setSaving(true)
    const result = await saveCsv(`기도제목_${todayKey()}.csv`, toCsv(data))
    setSaving(false)
    if (result.ok) setBackup(false)
    flash(result.message)
  }

  const doImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const restored = fromCsv(String(reader.result ?? ''))
      if (restored) {
        setData(restored.data)
        setBackup(false)
        flash(`카테고리 ${restored.categoryCount}개 · 기도제목 ${restored.prayerCount}개 복원`)
      } else {
        flash('파일을 읽을 수 없어요. CSV 파일인지 확인해 주세요')
      }
    }
    reader.onerror = () => flash('파일을 열지 못했어요')
    reader.readAsText(file, 'UTF-8')
  }

  /* ── 화면에 보여줄 것 계산 ── */
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of data.prayers) {
      if (p.answered) continue
      map[p.categoryId] = (map[p.categoryId] ?? 0) + 1
    }
    return map
  }, [data.prayers])

  const totalActive = data.prayers.filter((p) => !p.answered).length
  const totalStar = data.prayers.filter((p) => p.starred && !p.answered).length
  const totalAnswered = data.prayers.filter((p) => p.answered).length

  const q = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!q) return []
    return data.prayers.filter((p) => p.text.toLowerCase().includes(q))
  }, [q, data.prayers])

  const catName = (id: string) => data.categories.find((c) => c.id === id)?.name ?? ''

  /* ── 기도제목 한 줄 ── */
  const PrayerRow = ({ p, showCat = false }: { p: Prayer; showCat?: boolean }) => (
    <button
      onClick={() => setActing(p)}
      className="group flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-teal-50/70"
    >
      <span
        className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
          p.answered ? 'bg-emerald-400' : p.starred ? 'bg-amber-400' : 'bg-teal-300'
        }`}
      />
      <span className="flex-1">
        <span
          className={`block text-[14.5px] leading-snug ${
            p.answered ? 'text-slate-400 line-through' : 'text-slate-700'
          }`}
        >
          {p.text}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
          {showCat && (
            <span className="rounded-full bg-teal-100/80 px-2 py-0.5 font-semibold text-teal-700">
              {catName(p.categoryId)}
            </span>
          )}
          <span>{p.answered ? `${p.answeredAt ?? ''} 응답` : `${daysSince(p.createdAt)}일째`}</span>
        </span>
      </span>
      {p.starred && !p.answered && (
        <Star className="mt-1 h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
      )}
    </button>
  )

  return (
    <div className="font-body relative min-h-dvh text-slate-700">
      <Backdrop />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-8 pt-9">
        {/* 헤더 */}
        <header className="animate-rise flex items-start justify-between">
          <div>
            <h1 className="font-display text-[27px] font-bold leading-none text-teal-900">
              기도제목
            </h1>
            <p className="mt-2 text-[12px] text-teal-700/70">
              지금 품고 있는 기도 {totalActive}개
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSearching((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-teal-700 backdrop-blur-sm transition hover:bg-white"
            >
              {searching ? <X className="h-4 w-4" strokeWidth={2.4} /> : <Search className="h-4 w-4" strokeWidth={2.4} />}
            </button>
            <button
              onClick={() => setBackup(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-teal-700 backdrop-blur-sm transition hover:bg-white"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>
        </header>

        {/* 검색창 */}
        {searching && (
          <div className="animate-rise mt-4">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="기도제목 검색"
              className="w-full rounded-2xl border-2 border-teal-100 bg-white/80 px-4 py-3 text-[14.5px] outline-none backdrop-blur-sm transition focus:border-teal-300"
            />
            {q && (
              <div className="mt-3 rounded-2xl bg-white/80 p-2 backdrop-blur-sm">
                {searchResults.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-slate-400">찾는 기도제목이 없어요</p>
                ) : (
                  searchResults.map((p) => <PrayerRow key={p.id} p={p} showCat />)
                )}
              </div>
            )}
          </div>
        )}

        {/* 탭 */}
        {!searching && (
          <div className="animate-rise mt-5 flex gap-1.5" style={{ animationDelay: '60ms' }}>
            {([
              ['all', '전체', totalActive],
              ['star', '중요', totalStar],
              ['answered', '응답', totalAnswered],
            ] as [Tab, string, number][]).map(([key, label, n]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition ${
                  tab === key
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                    : 'bg-white/65 text-teal-700 hover:bg-white'
                }`}
              >
                {label} {n > 0 && <span className="opacity-70">{n}</span>}
              </button>
            ))}
          </div>
        )}

        {/* 본문 */}
        {!searching && (
          <main className="animate-rise mt-4 flex-1" style={{ animationDelay: '120ms' }}>
            {/* 전체 — 카테고리 펼침목록 */}
            {tab === 'all' && (
              <div className="space-y-2.5">
                {data.categories.map((cat) => {
                  const isOpen = open.has(cat.id)
                  const items = data.prayers.filter(
                    (p) => p.categoryId === cat.id && !p.answered,
                  )
                  return (
                    <div
                      key={cat.id}
                      className="overflow-hidden rounded-2xl bg-white/75 shadow-sm backdrop-blur-sm"
                    >
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleOpen(cat.id)}
                          className="flex flex-1 items-center gap-2.5 px-4 py-3.5 text-left"
                        >
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 text-teal-600 transition-transform duration-300 ${
                              isOpen ? 'rotate-90' : ''
                            }`}
                            strokeWidth={2.6}
                          />
                          <span className="flex-1 text-[15px] font-bold text-slate-700">
                            {cat.name}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
                              counts[cat.id]
                                ? 'bg-teal-100 text-teal-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {counts[cat.id] ?? 0}
                          </span>
                        </button>
                        <button
                          onClick={() => setEditCat(cat.id)}
                          className="px-3 py-3.5 text-slate-300 transition hover:text-teal-600"
                        >
                          <MoreVertical className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="border-t border-teal-50 px-2 pb-2">
                          {items.length === 0 ? (
                            <p className="py-5 text-center text-[12.5px] text-slate-400">
                              아직 담은 기도제목이 없어요
                            </p>
                          ) : (
                            items.map((p) => <PrayerRow key={p.id} p={p} />)
                          )}
                          <button
                            onClick={() => setAddTo(cat.id)}
                            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-teal-200 py-2.5 text-[13px] font-bold text-teal-600 transition hover:bg-teal-50"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.6} />
                            기도제목 추가
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                <button
                  onClick={() => setNewCat(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-200 py-3.5 text-[13.5px] font-bold text-teal-600 transition hover:bg-white/60"
                >
                  <FolderPlus className="h-4 w-4" strokeWidth={2.4} />
                  카테고리 추가
                </button>
              </div>
            )}

            {/* 중요 */}
            {tab === 'star' && (
              <div className="rounded-2xl bg-white/75 p-2 backdrop-blur-sm">
                {totalStar === 0 ? (
                  <div className="py-16 text-center">
                    <Star className="mx-auto mb-3 h-8 w-8 text-amber-200" strokeWidth={1.8} />
                    <p className="text-[13px] text-slate-400">
                      기도제목을 눌러 중요 표시를 해보세요
                    </p>
                  </div>
                ) : (
                  data.prayers
                    .filter((p) => p.starred && !p.answered)
                    .map((p) => <PrayerRow key={p.id} p={p} showCat />)
                )}
              </div>
            )}

            {/* 응답된 기도 */}
            {tab === 'answered' && (
              <div className="rounded-2xl bg-white/75 p-2 backdrop-blur-sm">
                {totalAnswered === 0 ? (
                  <div className="py-16 text-center">
                    <Sparkles className="mx-auto mb-3 h-8 w-8 text-emerald-200" strokeWidth={1.8} />
                    <p className="text-[13px] text-slate-400">
                      응답된 기도가 여기에 쌓입니다
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="px-3 pb-2 pt-3 text-[12px] font-semibold text-emerald-700">
                      ✨ 응답받은 기도 {totalAnswered}개
                    </p>
                    {data.prayers
                      .filter((p) => p.answered)
                      .map((p) => <PrayerRow key={p.id} p={p} showCat />)}
                  </>
                )}
              </div>
            )}
          </main>
        )}
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="toast-in pointer-events-none fixed inset-x-0 bottom-10 z-[60] flex justify-center px-6">
          <div className="rounded-full bg-slate-800/90 px-5 py-2.5 text-[13px] font-semibold text-white shadow-xl">
            {toast}
          </div>
        </div>
      )}

      {/* 기도제목 추가 */}
      {addTo && (
        <PrayerEditor
          categoryName={catName(addTo)}
          onSave={(text) => addPrayer(addTo, text)}
          onClose={() => setAddTo(null)}
        />
      )}

      {/* 기도제목 수정 */}
      {editing && (
        <PrayerEditor
          initial={editing.text}
          categoryName={catName(editing.categoryId)}
          onSave={(text) => {
            updatePrayer(editing.id, { text })
            setEditing(null)
            flash('수정했어요')
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* 기도제목 메뉴 */}
      {acting && (
        <PrayerActions
          prayer={acting}
          categories={data.categories}
          onEdit={() => {
            setEditing(acting)
            setActing(null)
          }}
          onMove={(categoryId) => {
            updatePrayer(acting.id, { categoryId })
            setOpen((s) => new Set(s).add(categoryId))
            setActing(null)
            flash(`${catName(categoryId)}(으)로 옮겼어요`)
          }}
          onToggleStar={() => {
            updatePrayer(acting.id, { starred: !acting.starred })
            setActing(null)
          }}
          onToggleAnswered={() => {
            const now = !acting.answered
            updatePrayer(acting.id, {
              answered: now,
              answeredAt: now ? todayKey() : undefined,
            })
            setActing(null)
            if (now) flash('응답을 기록했어요 ✨')
          }}
          onDelete={() => deletePrayer(acting.id)}
          onClose={() => setActing(null)}
        />
      )}

      {/* 카테고리 추가 */}
      {newCat && <CategoryEditor onSave={addCategory} onClose={() => setNewCat(false)} />}

      {/* 카테고리 수정 */}
      {editCat && (
        <CategoryEditor
          initial={catName(editCat)}
          prayerCount={data.prayers.filter((p) => p.categoryId === editCat).length}
          onSave={(name) => renameCategory(editCat, name)}
          onDelete={() => deleteCategory(editCat)}
          onClose={() => setEditCat(null)}
        />
      )}

      {/* 백업 */}
      {backup && (
        <Sheet title="백업과 복원" onClose={() => setBackup(false)}>
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-[12.5px] leading-relaxed text-amber-800">
            앱을 지우면 기도제목도 사라집니다. 가끔 백업해서 카톡 나에게 보내기로 보관해 두세요.
          </p>

          <button onClick={doExport} disabled={saving} className="btn-teal w-full">
            <Download className="h-4.5 w-4.5" strokeWidth={2.4} />
            {saving ? '저장하는 중…' : '엑셀 파일(CSV)로 내보내기'}
          </button>

          <label className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[14px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50">
            <Upload className="h-4.5 w-4.5 text-teal-600" strokeWidth={2.4} />
            CSV 파일 불러오기
            <input
              type="file"
              accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) doImport(f)
                e.target.value = ''
              }}
            />
          </label>

          <div className="mt-4 rounded-xl bg-teal-50/70 p-3.5">
            <p className="mb-1.5 text-[12px] font-bold text-teal-800">엑셀에서 편집하는 방법</p>
            <ul className="space-y-1 text-[11.5px] leading-relaxed text-teal-700/90">
              <li>· 저장되는 곳: <strong>내 파일 &gt; Documents</strong></li>
              <li>· 엑셀로 열면 6칸으로 보입니다</li>
              <li>· 카테고리 / 기도제목 / 중요 / 응답 / 작성일 / 응답일</li>
              <li>· 중요·응답 칸에 <strong>O</strong> 를 넣으면 표시됩니다</li>
              <li>· 줄을 추가하면 새 기도제목이 됩니다</li>
              <li>· 수정한 파일을 다시 불러오면 그대로 반영돼요</li>
            </ul>
          </div>

          <p className="mt-3 text-center text-[11.5px] text-slate-400">
            지금 카테고리 {data.categories.length}개 · 기도제목 {data.prayers.length}개
          </p>
        </Sheet>
      )}
    </div>
  )
}
