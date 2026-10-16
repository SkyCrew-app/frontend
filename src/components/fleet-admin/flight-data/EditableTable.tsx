"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberField } from "@/components/navplan/NumberField"

export interface Column<Row> {
  key: string
  /** Column header; also the accessible name of each cell's input, with the row number. */
  label: string
  unit?: string
  kind?: "number" | "text"
  digits?: number
  /** Shown value from the stored one (unit conversions); stored from the typed one. */
  read: (row: Row) => number | string | null | undefined
  write: (row: Row, value: number | string | null) => Row
  /** A custom cell (select, checkbox list) instead of an input. */
  render?: (row: Row, index: number, update: (row: Row) => void) => ReactNode
  className?: string
}

interface EditableTableProps<Row> {
  id: string
  caption: string
  columns: Column<Row>[]
  rows: Row[]
  onChange: (rows: Row[]) => void
  newRow: () => Row
  addLabel: string
  /** Rows can be moved up and down (envelope points, tanks order). */
  reorderable?: boolean
  emptyText?: string
  invalidRows?: number[]
}

/** Small spreadsheet for the tables of a flight manual: one input per cell, add, move, remove. */
export function EditableTable<Row>({
  id,
  caption,
  columns,
  rows,
  onChange,
  newRow,
  addLabel,
  reorderable = false,
  emptyText,
  invalidRows = [],
}: EditableTableProps<Row>) {
  const { t } = useTranslation("navplan")
  const update = (index: number, row: Row) => onChange(rows.map((current, i) => (i === index ? row : current)))
  const move = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-8 px-2 py-2 text-left font-medium">
                #
              </th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`px-2 py-2 text-left font-medium ${column.className ?? ""}`}>
                  {column.label}
                  {column.unit ? ` (${column.unit})` : ""}
                </th>
              ))}
              <th scope="col" className="px-2 py-2 text-right font-medium">
                <span className="sr-only">{t("editor.rowActions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {emptyText ?? t("editor.emptyTable")}
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={index} className={invalidRows.includes(index) ? "border-t bg-destructive/5" : "border-t"}>
                <td className="px-2 py-1.5 text-xs tabular-nums text-muted-foreground">{index + 1}</td>
                {columns.map((column) => {
                  const cellId = `${id}-${index}-${column.key}`
                  const label = t("editor.cellLabel", { column: column.label, row: index + 1 })
                  return (
                    <td key={column.key} className={`px-1 py-1 ${column.className ?? ""}`}>
                      {column.render ? (
                        column.render(row, index, (next) => update(index, next))
                      ) : column.kind === "text" ? (
                        <Input
                          id={cellId}
                          aria-label={label}
                          className="h-8 min-w-[7rem]"
                          value={String(column.read(row) ?? "")}
                          onChange={(event) => update(index, column.write(row, event.target.value))}
                        />
                      ) : (
                        <NumberField
                          id={cellId}
                          aria-label={column.unit ? `${label} (${column.unit})` : label}
                          className="h-8 min-w-[5.5rem]"
                          digits={column.digits ?? 2}
                          value={column.read(row) as number | null}
                          onValueChange={(value) => update(index, column.write(row, value))}
                        />
                      )}
                    </td>
                  )
                })}
                <td className="whitespace-nowrap px-1 py-1 text-right">
                  {reorderable && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === 0}
                        aria-label={t("editor.moveUp", { row: index + 1 })}
                        title={t("editor.moveUpShort")}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === rows.length - 1}
                        aria-label={t("editor.moveDown", { row: index + 1 })}
                        title={t("editor.moveDownShort")}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label={t("editor.removeRow", { row: index + 1 })}
                    title={t("editor.removeRowShort")}
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, newRow()])}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  )
}
