'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Canvas as FabricCanvas } from 'fabric'
import { loadMemo, saveMemo } from '@/app/lib/memoStore'

// Tailwind の preflight でボタンの枠が消えるため、共通クラスを定義
const btn = 'mr-1 rounded border border-gray-400 bg-white px-2.5 py-1 hover:bg-gray-100'
const primaryBtn = 'mr-2 rounded bg-blue-600 px-3.5 py-1.5 text-white hover:bg-blue-700'
const subBtn = 'mr-2 rounded border border-gray-400 bg-white px-3.5 py-1.5 hover:bg-gray-100'

// キャンバスの操作可否をモードに合わせて切り替える
function applyMode(canvas: FabricCanvas, editing: boolean, drawing: boolean) {
  canvas.discardActiveObject()
  canvas.isDrawingMode = editing && drawing
  canvas.selection = editing
  canvas.forEachObject((obj) => {
    obj.selectable = editing
    obj.evented = editing
  })
  canvas.requestRenderAll()
}

// 保存済みデータをキャンバスに反映
async function loadSaved(canvas: FabricCanvas, date: string) {
  const data = loadMemo(date)
  if (data?.canvasJson) {
    try {
      await canvas.loadFromJSON(data.canvasJson) // Fabric v6 は Promise
    } catch (e) {
      console.error('Canvasデータの読み込みに失敗しました:', e)
      canvas.clear()
    }
  } else {
    canvas.clear()
  }
  canvas.requestRenderAll()
  return { text: data?.text ?? '', hasObjects: canvas.getObjects().length > 0 }
}

export default function MemoEditor({ date }: { date: string }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<FabricCanvas | null>(null)
  const fabricRef = useRef<typeof import('fabric') | null>(null)

  const [memoText, setMemoText] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [hasSavedContent, setHasSavedContent] = useState(false)
  const [hasCanvasObjects, setHasCanvasObjects] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(true)
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(3)

  // onMounted + 動的 import。StrictMode の二重実行に備え、cleanup で必ず破棄する
  useEffect(() => {
    let cancelled = false
    let canvas: FabricCanvas | null = null
    const container = containerRef.current
    const el = document.createElement('canvas') // Fabric が DOM を書き換えるため手動で生成
    el.width = 600
    el.height = 400

    ;(async () => {
      const fabric = await import('fabric')
      if (cancelled || !container) return
      fabricRef.current = fabric
      container.appendChild(el)

      canvas = new fabric.Canvas(el, { isDrawingMode: true })
      const brush = new fabric.PencilBrush(canvas)
      brush.color = '#000000'
      brush.width = 3
      canvas.freeDrawingBrush = brush
      canvasRef.current = canvas

      const { text, hasObjects } = await loadSaved(canvas, date)
      if (cancelled) return
      const has = text.trim().length > 0 || hasObjects
      setMemoText(text)
      setHasCanvasObjects(hasObjects)
      setHasSavedContent(has)
      setIsEditing(!has) // 内容あり → 閲覧モード / なし → 編集モード
      applyMode(canvas, !has, true)
      setIsLoaded(true)
    })()

    return () => {
      cancelled = true
      canvasRef.current = null
      canvas?.dispose()
      if (container) container.innerHTML = ''
    }
  }, [date])

  // watch → useEffect
  useEffect(() => {
    const brush = canvasRef.current?.freeDrawingBrush
    if (brush) brush.width = lineWidth
  }, [lineWidth])
  useEffect(() => {
    const brush = canvasRef.current?.freeDrawingBrush
    if (brush) brush.color = color
  }, [color])

  const startEdit = () => {
    if (!canvasRef.current) return
    setIsEditing(true)
    setIsDrawingMode(false)
    applyMode(canvasRef.current, true, false)
  }

  const cancelEdit = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { text, hasObjects } = await loadSaved(canvas, date)
    setMemoText(text)
    setHasCanvasObjects(hasObjects)
    setIsEditing(false)
    applyMode(canvas, false, false)
  }

  const toggleDrawingMode = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const next = !isDrawingMode
    setIsDrawingMode(next)
    canvas.isDrawingMode = next
  }

  const addText = () => {
    const canvas = canvasRef.current
    const fabric = fabricRef.current
    if (!canvas || !fabric) return
    const textObj = new fabric.IText('ダブルクリックで編集', {
      left: 100, top: 100, fontFamily: 'sans-serif', fill: color, fontSize: 24,
    })
    canvas.add(textObj)
    setIsDrawingMode(false)
    canvas.isDrawingMode = false
    canvas.setActiveObject(textObj)
  }

  const deleteSelected = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const active = canvas.getActiveObjects()
    if (active.length > 0) {
      canvas.remove(...active)
      canvas.discardActiveObject()
      canvas.requestRenderAll()
    }
  }

  const clearCanvas = () => {
    canvasRef.current?.clear()
    canvasRef.current?.requestRenderAll()
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    saveMemo(date, { text: memoText, canvasJson: JSON.stringify(canvas.toJSON()) })
    alert('保存しました')
    router.push('/') // navigateTo → router.push
  }

  return (
    <div className="mx-auto max-w-3xl p-5">
      <h1 className="mb-4 text-2xl font-bold">{date} のメモ</h1>

      {/* v-show → hidden クラス（canvas は常にマウントしておく） */}
      <div className={isLoaded ? 'block' : 'hidden'}>
        {isEditing ? (
          <textarea
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="メモを入力..."
            className="mb-4 min-h-[100px] w-full rounded border border-gray-300 p-2"
          />
        ) : (
          memoText && (
            <div className="mb-4 min-h-12 whitespace-pre-wrap break-words rounded border border-gray-300 bg-gray-50 p-2.5">
              {memoText}
            </div>
          )
        )}

        <div className={isEditing || hasCanvasObjects ? 'block' : 'hidden'}>
          {/* Fabric が生成する canvas 群をこの枠で囲んで border を付ける */}
          <div ref={containerRef} className="w-fit border border-gray-300" />
          {isEditing && (
            <div className="mt-2 flex flex-wrap items-center gap-y-2">
              <button className={btn} onClick={toggleDrawingMode}>
                {isDrawingMode ? '選択モードへ' : '手書きモードへ'}
              </button>
              <button className={btn} onClick={addText}>📝 テキストを追加</button>
              <button className={btn} onClick={clearCanvas}>クリア</button>
              <button className={btn} onClick={deleteSelected}>選択消去</button>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mr-1 h-8 w-10 cursor-pointer"
              />
              <input
                type="range"
                min={1}
                max={20}
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center">
          {isEditing ? (
            <>
              <button className={primaryBtn} onClick={save}>保存</button>
              {hasSavedContent && (
                <button className={subBtn} onClick={cancelEdit}>キャンセル</button>
              )}
            </>
          ) : (
            <button className={primaryBtn} onClick={startEdit}>編集</button>
          )}
          <Link href="/" className="text-blue-600 underline">戻る</Link>
        </div>
      </div>
    </div>
  )
}
