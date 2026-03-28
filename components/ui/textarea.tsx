import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm',
          'text-foreground placeholder:text-muted-foreground',
          'ring-offset-background transition-all duration-200 resize-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
