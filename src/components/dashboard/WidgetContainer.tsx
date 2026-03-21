"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GripVertical } from "lucide-react"
import { motion } from "framer-motion"

interface WidgetContainerProps {
  id: string
  title: string
  isDragging?: boolean
  dragHandleProps?: any
  children: React.ReactNode
}

export default function WidgetContainer({ id, title, isDragging, dragHandleProps, children }: WidgetContainerProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <Card
        className={`overflow-hidden h-full transition-shadow ${
          isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 group">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div
            {...dragHandleProps}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  )
}
