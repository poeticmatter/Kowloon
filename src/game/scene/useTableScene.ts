import { useEffect, useState, type RefObject } from 'react'
import { TableScene } from './TableScene'

/** Mounts a TableScene in `containerRef` for as long as the component lives. */
export function useTableScene(containerRef: RefObject<HTMLDivElement | null>, tableSize: number): TableScene | null {
  const [scene, setScene] = useState<TableScene | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const created = new TableScene(container, tableSize)
    setScene(created)
    return () => {
      created.dispose()
      setScene(null)
    }
  }, [containerRef, tableSize])

  return scene
}
