import { useMemo } from 'react'

/** 은은한 옥빛(청록) 배경 — 부드러운 빛과 떠다니는 입자 */
export default function Backdrop() {
  const motes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 7,
        delay: Math.random() * 16,
        duration: 16 + Math.random() * 12,
        sway: 14 + Math.random() * 24,
        opacity: 0.25 + Math.random() * 0.35,
      })),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* 옥빛 그라데이션 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #D5EEEA 0%, #E3F4F1 36%, #EFF9F7 68%, #F5FBFA 100%)',
        }}
      />

      {/* 위쪽 부드러운 빛 */}
      <div
        className="absolute -right-20 -top-24 h-72 w-72 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(205,238,232,0.5) 45%, rgba(205,238,232,0) 72%)',
        }}
      />

      {/* 아래쪽 은은한 번짐 */}
      <div
        className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(167,220,212,0.45) 0%, rgba(167,220,212,0) 70%)',
        }}
      />

      {/* 떠다니는 입자 */}
      {motes.map((m) => (
        <span
          key={m.id}
          className="mote absolute block rounded-full"
          style={{
            left: `${m.left}%`,
            width: m.size,
            height: m.size,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
            opacity: m.opacity,
            ['--sway' as string]: `${m.sway}px`,
            background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #AFDDD6)',
          }}
        />
      ))}
    </div>
  )
}
