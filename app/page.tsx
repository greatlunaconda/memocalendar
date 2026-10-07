'use client' // useState / useEffect を使うので Client Component

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getMemoKeys } from '@/app/lib/memoStore'

type Day = { day: number; isCurrentMonth: boolean; date: string; hasMemo: boolean }

const fmt = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function HomePage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // onMounted → useEffect（ハイドレーションのズレ防止も同じ考え方）
  const [memoKeys, setMemoKeys] = useState<string[]>([])
  useEffect(() => {
    setMemoKeys(getMemoKeys())
  }, [])

  // computed → useMemo
  const calendarDays = useMemo<Day[]>(() => {
    const days: Day[] = []
    const startDay = new Date(currentYear, currentMonth - 1, 1).getDay()
    const lastDate = new Date(currentYear, currentMonth, 0).getDate()

    const prev = new Date(currentYear, currentMonth - 1, 0)
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prev.getDate() - i
      days.push({ day: d, isCurrentMonth: false, date: fmt(prev.getFullYear(), prev.getMonth() + 1, d), hasMemo: false })
    }
    for (let i = 1; i <= lastDate; i++) {
      const date = fmt(currentYear, currentMonth, i)
      days.push({ day: i, isCurrentMonth: true, date, hasMemo: memoKeys.includes(date) })
    }
    const next = new Date(currentYear, currentMonth, 1)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, date: fmt(next.getFullYear(), next.getMonth() + 1, i), hasMemo: false })
    }
    return days
  }, [currentYear, currentMonth, memoKeys])

  return (
    <div className="mx-auto max-w-3xl p-5">
      <h1 className="mb-5 text-center text-2xl font-bold">
        {currentYear}年{currentMonth}月
      </h1>
      <div className="grid grid-cols-7 gap-2.5">
        {calendarDays.map((day) =>
          day.isCurrentMonth ? (
            // NuxtLink → next/link（:prefetch="false" は prefetch={false}）
            <Link
              key={day.date}
              href={`/edit/${day.date}`}
              prefetch={false}
              className="relative aspect-square cursor-pointer border border-gray-300 p-2.5 hover:bg-gray-100"
            >
              <div className="font-bold">{day.day}</div>
              {day.hasMemo && (
                <div className="absolute bottom-1 right-1 text-xl text-green-500">●</div>
              )}
            </Link>
          ) : (
            <div
              key={`other-${day.date}`}
              className="aspect-square cursor-default border border-gray-300 p-2.5 opacity-30"
            >
              <div className="font-bold">{day.day}</div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
