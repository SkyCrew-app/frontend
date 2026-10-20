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
      {/* The link sits beside the title; the description takes the whole width under them. */}
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 space-y-0">
        <CardTitle className="min-w-0 text-lg">{title}</CardTitle>
        <Button variant="ghost" size="sm" asChild className="-mr-3">
          <Link href={href}>
            {linkLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        {description && <CardDescription className="col-span-2">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  )
}
