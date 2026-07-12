'use client'

import { useEffect } from 'react'
import type { Editor } from '@tiptap/react'

// Must be >= the resize plugin's own internal `handleWidth` (5px) so the
// synthetic "arm" mousemove we send always lands inside its hit-test.
const TOUCH_HIT_SLOP = 14

function findCell(target: EventTarget | null): HTMLElement | null {
  let node = target as HTMLElement | null
  while (node && node.nodeName !== 'TD' && node.nodeName !== 'TH') {
    if (node.classList?.contains('ProseMirror')) return null
    node = node.parentElement
  }
  return node
}

function dispatchMouse(target: EventTarget, type: string, clientX: number, clientY: number, buttons: number) {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX, clientY, button: 0, buttons })
  )
}

/**
 * Tiptap's table column-resize handle only responds to mouse events: it needs a
 * hover `mousemove` near a column border to "arm" the handle before `mousedown`
 * will start dragging it. Touch input never fires that hover move, so the
 * divider is undraggable on mobile. This bridges a touch near a column border
 * into the same synthetic mouse sequence the plugin already listens for.
 */
export function useTableColumnTouchResize(editor: Editor | null) {
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom as HTMLElement

    let resizing = false
    let touchId: number | null = null

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      const cell = findCell(document.elementFromPoint(touch.clientX, touch.clientY))
      if (!cell) return

      const rect = cell.getBoundingClientRect()
      const nearLeft = touch.clientX - rect.left <= TOUCH_HIT_SLOP
      const nearRight = rect.right - touch.clientX <= TOUCH_HIT_SLOP
      if (!nearLeft && !nearRight) return

      const snappedX = nearRight ? rect.right : rect.left
      dispatchMouse(cell, 'mousemove', snappedX, touch.clientY, 0)
      dispatchMouse(cell, 'mousedown', touch.clientX, touch.clientY, 1)

      resizing = true
      touchId = touch.identifier
      e.preventDefault()
    }

    function touchById(list: TouchList) {
      for (let i = 0; i < list.length; i++) if (list[i].identifier === touchId) return list[i]
      return null
    }

    function onTouchMove(e: TouchEvent) {
      if (!resizing) return
      const touch = touchById(e.touches)
      if (!touch) return
      dispatchMouse(window, 'mousemove', touch.clientX, touch.clientY, 1)
      e.preventDefault()
    }

    function onTouchEnd(e: TouchEvent) {
      if (!resizing) return
      const touch = touchById(e.changedTouches) ?? e.changedTouches[0]
      dispatchMouse(window, 'mouseup', touch.clientX, touch.clientY, 0)
      resizing = false
      touchId = null
    }

    dom.addEventListener('touchstart', onTouchStart, { passive: false })
    dom.addEventListener('touchmove', onTouchMove, { passive: false })
    dom.addEventListener('touchend', onTouchEnd, { passive: false })
    dom.addEventListener('touchcancel', onTouchEnd, { passive: false })

    return () => {
      dom.removeEventListener('touchstart', onTouchStart)
      dom.removeEventListener('touchmove', onTouchMove)
      dom.removeEventListener('touchend', onTouchEnd)
      dom.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [editor])
}
