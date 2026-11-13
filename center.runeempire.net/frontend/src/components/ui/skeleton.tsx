import { cn } from "cn"

/**
 * A loading placeholder in the shape of what is coming: the shared shimmer
 * (the `skeleton` utility in index.css). Hidden from screen readers; the
 * surrounding card says "betöltés…" once, not every bar.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
