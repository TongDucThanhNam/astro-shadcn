"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface CursorProps {
  enabled?: boolean;
}

const Cursor: React.FC<CursorProps> = ({ enabled = true }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const followerX = useMotionValue(-100);
  const followerY = useMotionValue(-100);

  // Spring physics for smooth movement
  const springConfig = { damping: 25, stiffness: 700 };
  const cursorSpringX = useSpring(cursorX, springConfig);
  const cursorSpringY = useSpring(cursorY, springConfig);
  const followerSpringX = useSpring(followerX, { damping: 20, stiffness: 300 });
  const followerSpringY = useSpring(followerY, { damping: 20, stiffness: 300 });

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      followerX.set(e.clientX);
      followerY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isHoverable =
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("cursor-pointer") ||
        target.classList.contains("magnetic");

      setIsHovering(!!isHoverable);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseover", handleMouseOver);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, [enabled, isVisible, cursorX, cursorY, followerX, followerY]);

  if (!enabled) return null;

  return (
    <>
      {/* Main cursor dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
        style={{
          x: cursorSpringX,
          y: cursorSpringY,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{ scale: isHovering ? 1.5 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <div className="w-3 h-3 bg-[#DFE104] rounded-full" />
      </motion.div>

      {/* Follower circle */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998] mix-blend-difference"
        style={{
          x: followerSpringX,
          y: followerSpringY,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          borderColor: isHovering ? "#DFE104" : "#DFE104",
          opacity: isHovering ? 0.5 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-10 h-10 border-2 border-[#DFE104] rounded-full" />
      </motion.div>
    </>
  );
};

export default Cursor;
