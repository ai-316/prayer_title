import { useEffect, useRef, useState } from 'react'
import {
  ArrowRightLeft,
  Check,
  FolderPlus,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import type { Category, Prayer } from '../lib/store'

const MAX_LEN = 60

/* ─────────── 공통 바텀시트 틀 ─────────── */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="sheet-up w-full max-w-[430px] rounded-t-[28px] bg-white px-6 pb-8 pt-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ─────────── 기도제목 입력 / 수정 ─────────── */
export function PrayerEditor({
  initial,
  categoryName,
  onSave,
  onClose,
}: {
  initial?: string
  categoryName: string
  onSave: (text: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState(initial ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 120)
    return () => clearTimeout(t)
  }, [])

  const save = () => {
    const t = text.trim()
    if (!t) return
    onSave(t.slice(0, MAX_LEN))
  }

  return (
    <Sheet title={initial ? '기도제목 수정' : `${categoryName}에 추가`} onClose={onClose}>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
        placeholder="기도제목을 적어주세요"
        rows={2}
        className="w-full resize-none rounded-2xl border-2 border-teal-100 bg-teal-50/40 p-4 text-[15px] leading-relaxed text-slate-700 outline-none transition focus:border-teal-300"
      />
      <div className="mt-1.5 flex justify-between px-1 text-[11.5px]">
        <span className="text-slate-400">짧게 적으면 기억하기 좋아요</span>
        <span className={text.length >= MAX_LEN ? 'font-bold text-rose-500' : 'text-slate-400'}>
          {text.length} / {MAX_LEN}
        </span>
      </div>
      <button onClick={save} disabled={!text.trim()} className="btn-teal mt-4 w-full">
        <Check className="h-4.5 w-4.5" strokeWidth={2.6} />
        {initial ? '수정하기' : '추가하기'}
      </button>
    </Sheet>
  )
}

/* ─────────── 기도제목 눌렀을 때 ─────────── */
export function PrayerActions({
  prayer,
  categories,
  onEdit,
  onMove,
  onToggleStar,
  onToggleAnswered,
  onDelete,
  onClose,
}: {
  prayer: Prayer
  categories: Category[]
  onEdit: () => void
  onMove: (categoryId: string) => void
  onToggleStar: () => void
  onToggleAnswered: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const [moving, setMoving] = useState(false)

  if (moving) {
    return (
      <Sheet title="어느 카테고리로 옮길까요?" onClose={onClose}>
        <div className="max-h-[48vh] space-y-2 overflow-y-auto">
          {categories.map((c) => {
            const here = c.id === prayer.categoryId
            return (
              <button
                key={c.id}
                disabled={here}
                onClick={() => onMove(c.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition ${
                  here
                    ? 'bg-slate-50 text-slate-300'
                    : 'bg-teal-50/70 text-slate-700 hover:bg-teal-100'
                }`}
              >
                <span className="text-[14.5px] font-semibold">{c.name}</span>
                {here && <span className="text-[11.5px]">지금 여기</span>}
              </button>
            )
          })}
        </div>
      </Sheet>
    )
  }

  const Row = ({
    icon,
    label,
    onClick,
    danger,
  }: {
    icon: React.ReactNode
    label: string
    onClick: () => void
    danger?: boolean
  }) => (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition ${
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-teal-50'
      }`}
    >
      {icon}
      <span className="text-[14.5px] font-semibold">{label}</span>
    </button>
  )

  return (
    <Sheet title="기도제목" onClose={onClose}>
      <div className="mb-3 rounded-2xl bg-teal-50/60 p-4">
        <p className="text-[15px] font-semibold leading-relaxed text-slate-700">{prayer.text}</p>
      </div>
      <div className="space-y-0.5">
        <Row
          icon={<Star className={`h-[18px] w-[18px] ${prayer.starred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} strokeWidth={2.2} />}
          label={prayer.starred ? '중요 표시 끄기' : '중요 표시하기'}
          onClick={onToggleStar}
        />
        <Row
          icon={<Check className={`h-[18px] w-[18px] ${prayer.answered ? 'text-emerald-600' : 'text-slate-400'}`} strokeWidth={2.6} />}
          label={prayer.answered ? '응답 표시 취소' : '응답되었어요'}
          onClick={onToggleAnswered}
        />
        <Row
          icon={<Pencil className="h-[18px] w-[18px] text-slate-400" strokeWidth={2.2} />}
          label="내용 수정"
          onClick={onEdit}
        />
        <Row
          icon={<ArrowRightLeft className="h-[18px] w-[18px] text-slate-400" strokeWidth={2.2} />}
          label="다른 카테고리로 이동"
          onClick={() => setMoving(true)}
        />
        <Row
          icon={<Trash2 className="h-[18px] w-[18px]" strokeWidth={2.2} />}
          label="삭제하기"
          onClick={onDelete}
          danger
        />
      </div>
    </Sheet>
  )
}

/* ─────────── 카테고리 추가 / 수정 ─────────── */
export function CategoryEditor({
  initial,
  onSave,
  onDelete,
  onClose,
  prayerCount,
}: {
  initial?: string
  onSave: (name: string) => void
  onDelete?: () => void
  onClose: () => void
  prayerCount?: number
}) {
  const [name, setName] = useState(initial ?? '')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    <Sheet title={initial ? '카테고리 수정' : '새 카테고리'} onClose={onClose}>
      <input
        ref={ref}
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 20))}
        placeholder="카테고리 이름"
        className="w-full rounded-2xl border-2 border-teal-100 bg-teal-50/40 px-4 py-3.5 text-[15px] font-semibold text-slate-700 outline-none transition focus:border-teal-300"
      />
      <button
        onClick={() => name.trim() && onSave(name.trim())}
        disabled={!name.trim()}
        className="btn-teal mt-4 w-full"
      >
        <FolderPlus className="h-4.5 w-4.5" strokeWidth={2.4} />
        {initial ? '수정하기' : '카테고리 만들기'}
      </button>

      {onDelete && (
        <button
          onClick={onDelete}
          className="mt-2.5 w-full rounded-2xl py-3 text-[13.5px] font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          이 카테고리 삭제
          {prayerCount && prayerCount > 0 ? ` (기도제목 ${prayerCount}개도 함께)` : ''}
        </button>
      )}
    </Sheet>
  )
}

export { Sheet }
