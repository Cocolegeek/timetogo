"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ease-(--ease-sheet) data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/60",
        className
      )}
      {...props}
    />
  )
}

/**
 * Drag-down-to-dismiss on the top strip of a bottom sheet (where the grab
 * handle is drawn). Past 110 px, or a quick flick, the sheet slides away and
 * closes through the hidden Close button.
 */
function SheetDragZone({ closeRef }: { closeRef: React.RefObject<HTMLButtonElement | null> }) {
  const state = React.useRef<{ y: number; t: number; dy: number } | null>(null)

  const popupOf = (el: HTMLElement) => el.closest<HTMLElement>("[data-slot=sheet-content]")

  return (
    <div
      aria-hidden="true"
      data-sheet-drag
      className="absolute inset-x-0 top-0 z-10 h-9 cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={(e) => {
        state.current = { y: e.clientY, t: performance.now(), dy: 0 }
        e.currentTarget.setPointerCapture(e.pointerId)
        const popup = popupOf(e.currentTarget)
        if (popup) popup.style.transition = "none"
      }}
      onPointerMove={(e) => {
        if (!state.current) return
        const dy = Math.max(0, e.clientY - state.current.y)
        state.current.dy = dy
        const popup = popupOf(e.currentTarget)
        if (popup) popup.style.transform = `translateY(${dy}px)`
      }}
      onPointerUp={(e) => {
        const s = state.current
        state.current = null
        const popup = popupOf(e.currentTarget)
        if (!s || !popup) return
        const velocity = s.dy / Math.max(1, performance.now() - s.t)
        if (s.dy > 110 || (s.dy > 30 && velocity > 0.6)) {
          popup.style.transition = "transform 220ms cubic-bezier(0.4, 0, 1, 1)"
          popup.style.transform = "translateY(100%)"
          setTimeout(() => closeRef.current?.click(), 180)
        } else {
          popup.style.transition = "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)"
          popup.style.transform = ""
        }
      }}
      onPointerCancel={(e) => {
        state.current = null
        const popup = popupOf(e.currentTarget)
        if (popup) popup.style.transform = ""
      }}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-float outline-none transition-[transform,opacity] duration-[450ms] ease-(--ease-sheet) data-ending-style:duration-300 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:mx-auto data-[side=bottom]:h-auto data-[side=bottom]:max-w-2xl data-[side=bottom]:rounded-t-[1.75rem] data-[side=bottom]:pb-[env(safe-area-inset-bottom)] data-[side=bottom]:data-ending-style:translate-y-full data-[side=bottom]:data-starting-style:translate-y-full data-[side=bottom]:before:absolute data-[side=bottom]:before:top-2 data-[side=bottom]:before:left-1/2 data-[side=bottom]:before:z-10 data-[side=bottom]:before:h-1 data-[side=bottom]:before:w-10 data-[side=bottom]:before:-translate-x-1/2 data-[side=bottom]:before:rounded-full data-[side=bottom]:before:bg-foreground/15 data-[side=left]:data-ending-style:opacity-0 data-[side=left]:data-starting-style:opacity-0 data-[side=right]:data-ending-style:opacity-0 data-[side=right]:data-starting-style:opacity-0 data-[side=top]:data-ending-style:opacity-0 data-[side=top]:data-starting-style:opacity-0 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {side === "bottom" && <SheetDragZone closeRef={closeRef} />}
        {children}
        <SheetPrimitive.Close ref={closeRef} tabIndex={-1} aria-hidden="true" className="sr-only" />
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="secondary"
                className="absolute top-4 right-4 z-20 rounded-full"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Fermer</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-display text-xl font-bold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
