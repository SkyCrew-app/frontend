import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn("animate-spin rounded-full border-4 border-t-4 border-gray-200 border-t-blue-500 h-12 w-12", className)}
      {...props}
    />
  )
}
