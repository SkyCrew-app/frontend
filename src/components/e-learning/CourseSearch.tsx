"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"

interface CourseSearchProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  category: string
  setCategory: (category: string) => void
}

export function CourseSearch({ searchTerm, setSearchTerm, category, setCategory }: CourseSearchProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher un cours..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              setSearchTerm(e.currentTarget.value)
            }
          }}
          className="pl-8 pr-3 w-full text-sm"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Filter className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Filtrer par:</span>
      </div>

      <Select
        value={category}
        onValueChange={(value) => {
          setCategory(value)
        }}
        defaultValue="all"
      >
        <SelectTrigger className="w-full bg-white dark:bg-gray-800 text-sm h-9">
          <SelectValue placeholder="Toutes les catégories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les catégories</SelectItem>
          <SelectItem value="PPL">PPL</SelectItem>
          <SelectItem value="CPL">CPL</SelectItem>
          <SelectItem value="ATPL">ATPL</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
