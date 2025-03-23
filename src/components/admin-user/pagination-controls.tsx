"use client"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface PaginationControlsProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  indexOfFirstItem: number
  indexOfLastItem: number
}

export function PaginationControls({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  indexOfFirstItem,
  indexOfLastItem,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalItems === 0) return null

  return (
    <div className="flex justify-between items-center">
      <p className="text-sm text-muted-foreground">
        Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, totalItems)} sur {totalItems} utilisateurs
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(currentPage - 1)}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Logique pour afficher les pages autour de la page courante
            let pageNum

            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
              if (i === 4) pageNum = totalPages
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
              if (i === 0) pageNum = 1
            } else {
              pageNum = currentPage - 2 + i
              if (i === 0) pageNum = 1
              if (i === 4) pageNum = totalPages
            }

            return (
              <PaginationItem key={i}>
                <PaginationLink onClick={() => onPageChange(pageNum)} isActive={currentPage === pageNum}>
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(currentPage + 1)}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
