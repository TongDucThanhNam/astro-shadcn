'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Play } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CursorProps {
  enabled?: boolean;
}

const HOVER_SELECTORS = [
  'a',
  'button',
  '[role="button"]',
  '[data-cursor-pointer]',
  '.cursor-pointer',
  '.magnetic',
  'input',
  'textarea',
  'select',
  '[tabindex]:not([tabindex="-1"])',
];
const CURSOR_DISABLED_SELECTOR = '[data-cursor-disabled]';
const isCursorDisabledTarget = (target: HTMLElement | null, path: EventTarget[]) => {
  if (target?.closest(CURSOR_DISABLED_SELECTOR)) return true;
  return path.some((node) => {
    if (!(node instanceof Element)) return false;
    return (
      node.matches(CURSOR_DISABLED_SELECTOR) || Boolean(node.closest(CURSOR_DISABLED_SELECTOR))
    );
  });
};
const hideCustomCursor = (
  setCursorMode: React.Dispatch<React.SetStateAction<'default' | 'hover' | 'play'>>,
  isVisibleRef: React.MutableRefObject<boolean>,
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  setCursorMode('default');
  if (isVisibleRef.current) {
    setIsVisible(false);
    isVisibleRef.current = false;
  }
};

const Cursor: React.FC<CursorProps> = ({ enabled = true }) => {
  const [cursorMode, setCursorMode] = useState<'default' | 'hover' | 'play'>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isVisibleRef = useRef(false);
  const isBlockedRef = useRef(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const followerX = useMotionValue(-100);
  const followerY = useMotionValue(-100);

  // Spring physics - cursor dot: fast, follower: smooth delay
  const cursorSpringX = useSpring(cursorX, { damping: 15, stiffness: 1000 });
  const cursorSpringY = useSpring(cursorY, { damping: 15, stiffness: 1000 });
  const followerSpringX = useSpring(followerX, { damping: 15, stiffness: 400 });
  const followerSpringY = useSpring(followerY, { damping: 15, stiffness: 400 });

  const checkHover = useCallback((target: HTMLElement | null) => {
    if (!target) {
      setCursorMode('default');
      return;
    }
    if (target.closest(CURSOR_DISABLED_SELECTOR)) {
      setCursorMode('default');
      return;
    }
    const isHoverable = HOVER_SELECTORS.some((selector) => Boolean(target.closest(selector)));
    const isPlayTarget = Boolean(target.closest('[data-cursor-play]'));
    if (isPlayTarget && isHoverable) {
      setCursorMode('play');
      return;
    }
    setCursorMode(isHoverable ? 'hover' : 'default');
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
    setIsMounted(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isMounted) return;

    const disabledZones = Array.from(
      document.querySelectorAll<HTMLElement>(CURSOR_DISABLED_SELECTOR),
    );
    const handleDisabledPointerEnter = () =>
      hideCustomCursor(setCursorMode, isVisibleRef, setIsVisible);
    const handleDisableZone = () => {
      isBlockedRef.current = true;
      hideCustomCursor(setCursorMode, isVisibleRef, setIsVisible);
    };
    const handleEnableZone = () => {
      isBlockedRef.current = false;
    };

    for (const zone of disabledZones) {
      zone.addEventListener('pointerenter', handleDisabledPointerEnter);
      zone.addEventListener('pointermove', handleDisabledPointerEnter);
    }

    window.addEventListener('cursor:disable-zone', handleDisableZone);
    window.addEventListener('cursor:enable-zone', handleEnableZone);

    const handlePointerMove = (e: PointerEvent) => {
      if (isBlockedRef.current) {
        hideCustomCursor(setCursorMode, isVisibleRef, setIsVisible);
        return;
      }

      const target = e.target instanceof HTMLElement ? e.target : null;
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const isDisabledByPoint = Boolean(elementAtPoint?.closest(CURSOR_DISABLED_SELECTOR));

      if (isDisabledByPoint || isCursorDisabledTarget(target, e.composedPath())) {
        hideCustomCursor(setCursorMode, isVisibleRef, setIsVisible);
        return;
      }

      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      followerX.set(e.clientX);
      followerY.set(e.clientY);
      checkHover(target);

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
      }
    };

    const handlePointerLeave = () => {
      setCursorMode('default');
      setIsVisible(false);
      isVisibleRef.current = false;
    };

    document.addEventListener('pointermove', handlePointerMove, {
      passive: true,
      capture: true,
    });
    document.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);

      for (const zone of disabledZones) {
        zone.removeEventListener('pointerenter', handleDisabledPointerEnter);
        zone.removeEventListener('pointermove', handleDisabledPointerEnter);
      }

      window.removeEventListener('cursor:disable-zone', handleDisableZone);
      window.removeEventListener('cursor:enable-zone', handleEnableZone);
    };
  }, [enabled, isMounted, cursorX, cursorY, followerX, followerY, checkHover]);

  // Don't render until mounted on client (prevents hydration mismatch)
  if (!isMounted) return null;

  return (
    <>
      {/* Main cursor dot */}
      <motion.div
        className="fixed pointer-events-none z-[9999] hidden md:block"
        style={{
          x: cursorSpringX,
          y: cursorSpringY,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{ scale: cursorMode === 'default' ? 1 : cursorMode === 'hover' ? 0.65 : 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-[#09090B] bg-[#DFE104] shadow-[0_0_0_1px_rgba(223,225,4,0.4)] h-2.5 w-2.5" />
      </motion.div>

      {/* Follower circle */}
      <motion.div
        className="fixed pointer-events-none z-[9998] hidden md:block"
        style={{
          x: followerSpringX,
          y: followerSpringY,
        }}
        animate={{
          scale: cursorMode === 'play' ? 1.7 : cursorMode === 'hover' ? 1.25 : 1,
          opacity: isVisible ? (cursorMode === 'default' ? 0.75 : 0.95) : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div
          className={`-translate-x-1/2 -translate-y-1/2 relative flex h-8 w-8 items-center justify-center rounded-full border border-[#DFE104] ${
            cursorMode === 'play' ? 'bg-[#DFE104]' : 'bg-transparent'
          }`}
        >
          {cursorMode === 'play' ? (
            <Play className="h-3.5 w-3.5 fill-current text-[#09090B]" />
          ) : null}
        </div>
      </motion.div>
    </>
  );
};

export default Cursor;
