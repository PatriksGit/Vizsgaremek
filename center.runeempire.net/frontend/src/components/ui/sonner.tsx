import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, OctagonXIcon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      // The site is dark only.
      theme="dark"
      // Sonner's default region name is English ("Notifications").
      containerAriaLabel="Értesítések"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
      }}
      // Coloured error and success toasts (owner, 2026-11-23: a red, well-rounded error toast), in the site's status colours.
      richColors
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--error-bg": "color-mix(in oklab, var(--danger) 18%, var(--popover))",
          "--error-border": "color-mix(in oklab, var(--danger) 55%, transparent)",
          "--error-text": "color-mix(in oklab, var(--danger) 40%, var(--foreground))",
          "--success-bg": "color-mix(in oklab, var(--ok) 16%, var(--popover))",
          "--success-border": "color-mix(in oklab, var(--ok) 50%, transparent)",
          "--success-text": "color-mix(in oklab, var(--ok) 40%, var(--foreground))",
          "--border-radius": "calc(var(--radius) * 3.5)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "shadow-[0_12px_32px_rgb(0_0_0/0.55)]",
          description: "!text-popover-foreground opacity-85",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
