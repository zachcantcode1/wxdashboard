import * as React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// SHSF UI: Get Started Button (adapted for our codebase)
// - Supports optional `to` prop to render as a Link
// - Forwards other Button props
export const GetStartedButton = React.forwardRef(
  (
    {
      className,
      size = 'lg',
      children = 'Get Started',
      iconSize = 16,
      iconStrokeWidth = 2,
      to,
      ...restProps
    },
    ref
  ) => {
    const content = (
      <>
        <span className="mr-8 transition-opacity duration-300 group-hover:opacity-0">
          {children}
        </span>
        <span
          className="absolute right-1 top-1 bottom-1 rounded-sm z-10 flex items-center justify-center w-1/4 transition-all duration-300 bg-primary-foreground/15 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95"
          aria-hidden="true"
        >
          <ChevronRight size={iconSize} strokeWidth={iconStrokeWidth} />
        </span>
      </>
    )

    if (to) {
      return (
        <Button
          ref={ref}
          asChild
          size={size}
          variant="default"
          className={cn('group relative overflow-hidden', className)}
          {...restProps}
        >
          <Link to={to}>
            {content}
          </Link>
        </Button>
      )
    }

    return (
      <Button
        ref={ref}
        size={size}
        variant="default"
        className={cn('group relative overflow-hidden', className)}
        {...restProps}
      >
        {content}
      </Button>
    )
  }
)

GetStartedButton.displayName = 'GetStartedButton'

export default GetStartedButton
