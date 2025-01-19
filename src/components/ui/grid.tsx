import React from 'react'

interface GridProps {
  children: React.ReactNode
  columns?: number
  gap?: number
  className?: string
}

export function Grid({ children, columns = 1, gap = 4, className = '' }: GridProps) {
  return (
    <div 
      className={`grid grid-cols-1 sm:grid-cols-${columns} gap-${gap} ${className}`}
    >
      {children}
    </div>
  )
}