"use client"

import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface CustomDropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "center" | "end"
  className?: string
}

export function CustomDropdown({ trigger, children, align = "end", className }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      
      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 mt-2 bg-popover border border-border rounded-md shadow-md",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface CustomDropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function CustomDropdownItem({ children, className, ...props }: CustomDropdownItemProps) {
  return (
    <button
      className={cn(
        "w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function CustomDropdownSeparator({ className }: { className?: string }) {
  return <div className={cn("h-px bg-muted my-1 -mx-1", className)} />
}
