import React, { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface ShareLink {
  icon: React.ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void | Promise<void>
  label?: string
}

interface ShareButtonProps {
  className?: string
  links: ShareLink[]
  children: React.ReactNode
}

const ShareButton = ({
  className,
  links,
  children,
}: ShareButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const openMenu = () => {
    clearCloseTimer()
    setIsOpen(true)
  }

  const scheduleCloseMenu = () => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 130)
  }

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      clearCloseTimer()
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const handleLinkClick = async (link: ShareLink) => {
    try {
      if (link.onClick) {
        await link.onClick()
      } else if (link.href) {
        window.open(link.href, "_blank", "noopener,noreferrer")
      }
    } finally {
      setIsOpen(false)
    }
  }

  return (
    <motion.div
      ref={rootRef}
      style={{ ["--share-count" as string]: String(links.length) }}
      className="relative inline-flex w-full sm:w-auto overflow-hidden [--share-slot:42px] md:[--share-slot:48px] [--share-closed:100%] sm:[--share-closed:148px] [--share-open:100%] sm:[--share-open:calc(var(--share-slot)*var(--share-count))] border-2 border-[#3F3F46] bg-[#09090B]/98 shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur-sm"
      onMouseEnter={() => {
        if (canHover()) openMenu()
      }}
      onMouseLeave={() => {
        if (canHover()) scheduleCloseMenu()
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          clearCloseTimer()
          setIsOpen(false)
        }
      }}
    >
      <motion.button
        type="button"
        onClick={() => {
          if (isOpen) {
            clearCloseTimer()
            setIsOpen(false)
            return
          }
          openMenu()
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
        animate={{
          width: isOpen ? 0 : "var(--share-closed)",
          opacity: isOpen ? 0 : 1,
        }}
        transition={{
          width: { type: "spring", stiffness: 520, damping: 40, mass: 0.8 },
          opacity: { duration: 0.08, ease: "linear" },
        }}
        className={cn(
          "h-[42px] w-full sm:w-auto md:h-[48px] overflow-hidden whitespace-nowrap",
          "bg-transparent text-[#FAFAFA]",
          "hover:bg-[#18181B]",
          "inline-flex items-center justify-center gap-2 uppercase tracking-tighter font-bold",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-inset",
          className
        )}
      >
        <span className="inline-flex h-full min-w-max items-center gap-2 px-4 md:px-5">{children}</span>
      </motion.button>

      <motion.div
        role="menu"
        aria-label="Chia sẻ"
        aria-hidden={!isOpen}
        animate={{
          width: isOpen ? "var(--share-open)" : "0px",
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 540, damping: 42, mass: 0.82 }}
        className="flex w-full overflow-hidden sm:w-auto"
      >
        {links.map((link, index) => {
          const Icon = link.icon
          return (
            <motion.button
              key={link.label || `share-${index}`}
              type="button"
              onClick={() => void handleLinkClick(link)}
              title={link.label}
              aria-label={link.label}
              role="menuitem"
              disabled={!isOpen}
              tabIndex={isOpen ? 0 : -1}
              animate={{
                x: isOpen ? 0 : -8,
                opacity: isOpen ? 1 : 0,
                scale: isOpen ? 1 : 0.96,
              }}
              transition={{ delay: isOpen ? index * 0.03 : 0, duration: 0.14, ease: "easeOut" }}
              className={cn(
                "h-[42px] w-full flex-1 md:h-[48px] sm:w-[42px] sm:flex-none md:w-[48px]",
                "shrink-0 flex items-center justify-center",
                "bg-transparent text-[#FAFAFA]",
                "border-l-2 border-[#27272A]",
                "transition-colors duration-150",
                "hover:bg-[#DFE104] hover:text-black hover:border-[#DFE104]",
                "disabled:pointer-events-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-inset"
              )}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5" />
            </motion.button>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

export default ShareButton
