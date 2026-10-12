import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SectionCardProps {
  title: string
  description?: string
  // Where the whole list lives.
  href: string
  linkLabel: string
  children: ReactNode
}

// A block of the instruction overview: a short list and the link to the full page.
export function SectionCard({ title, description, href, linkLabel, children }: SectionCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href={href}>
            {linkLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  )
}
