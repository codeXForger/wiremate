import type { KeyboardEvent, ReactNode } from 'react'
import { Hint } from '@/components/Hint'
import { cn } from '@/lib/utils'

export interface AdminColumn<R> {
  header: string
  cell: (row: R) => ReactNode
  /** Right-aligned digits. */
  numeric?: boolean
}

interface AdminTableProps<R> {
  label: string
  columns: AdminColumn<R>[]
  rows: R[]
  rowKey: (row: R) => string
  /** Makes rows open something when clicked or on Enter. */
  onOpen?: (row: R) => void
  /** Shown instead of an empty table. */
  empty: string
}

const CELL = 'px-3 py-1.5 align-top'

export function AdminTable<R>({ label, columns, rows, rowKey, onOpen, empty }: AdminTableProps<R>) {
  if (rows.length === 0) return <Hint>{empty}</Hint>
  return (
    <table aria-label={label} className="w-full border-collapse text-xs">
      <HeaderRow columns={columns} />
      <tbody>
        {rows.map((row) => (
          <Row key={rowKey(row)} row={row} columns={columns} onOpen={onOpen} />
        ))}
      </tbody>
    </table>
  )
}

function HeaderRow<R>({ columns }: { columns: AdminColumn<R>[] }) {
  return (
    <thead className="sticky top-0 z-10 bg-panel text-left text-muted-foreground">
      <tr>
        {columns.map((column) => (
          <th key={column.header} scope="col" className={cn(CELL, 'font-medium', column.numeric && 'text-right')}>
            {column.header}
          </th>
        ))}
      </tr>
    </thead>
  )
}

interface RowProps<R> {
  row: R
  columns: AdminColumn<R>[]
  onOpen?: (row: R) => void
}

/** A row that opens something is focusable and opens on click or Enter. */
function openProps(open: (() => void) | undefined) {
  if (!open) return { className: 'border-t border-border/60' }
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') open()
  }
  return {
    tabIndex: 0,
    onClick: open,
    onKeyDown,
    className: 'border-t border-border/60 cursor-pointer hover:bg-surface'
  }
}

function Row<R>({ row, columns, onOpen }: RowProps<R>) {
  return (
    <tr {...openProps(onOpen && (() => onOpen(row)))}>
      {columns.map((column) => (
        <td key={column.header} className={cn(CELL, column.numeric && 'text-right font-mono tabular-nums')}>
          {column.cell(row)}
        </td>
      ))}
    </tr>
  )
}
