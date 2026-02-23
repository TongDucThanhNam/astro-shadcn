"use client";

import { Play } from "lucide-react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import type React from "react";
import { useEffect, useState, useCallback, useRef } from "react";

interface CursorProps {
	enabled?: boolean;
}

const HOVER_SELECTORS = [
	"a",
	"button",
	'[role="button"]',
	"[data-cursor-pointer]",
	".cursor-pointer",
	".magnetic",
	"input",
	"textarea",
	"select",
	'[tabindex]:not([tabindex="-1"])',
];

const Cursor: React.FC<CursorProps> = ({ enabled = true }) => {
	const [cursorMode, setCursorMode] = useState<"default" | "hover" | "play">(
		"default",
	);
	const [isVisible, setIsVisible] = useState(false);
	const isVisibleRef = useRef(false);

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
			setCursorMode("default");
			return;
		}
		const isHoverable = HOVER_SELECTORS.some((selector) =>
			Boolean(target.closest(selector)),
		);
		const isPlayTarget = Boolean(target.closest("[data-cursor-play]"));
		if (isPlayTarget && isHoverable) {
			setCursorMode("play");
			return;
		}
		setCursorMode(isHoverable ? "hover" : "default");
	}, []);

	useEffect(() => {
		if (!enabled) return;

		// Skip on touch devices
		if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
			return;
		}

		const handlePointerMove = (e: PointerEvent) => {
			cursorX.set(e.clientX);
			cursorY.set(e.clientY);
			followerX.set(e.clientX);
			followerY.set(e.clientY);
			checkHover(e.target instanceof HTMLElement ? e.target : null);

			if (!isVisibleRef.current) {
				isVisibleRef.current = true;
				setIsVisible(true);
			}
		};

		const handlePointerLeave = () => {
			setCursorMode("default");
			setIsVisible(false);
			isVisibleRef.current = false;
		};

		document.addEventListener("pointermove", handlePointerMove, {
			passive: true,
		});
		document.addEventListener("pointerleave", handlePointerLeave);

		return () => {
			document.removeEventListener("pointermove", handlePointerMove);
			document.removeEventListener("pointerleave", handlePointerLeave);
		};
	}, [enabled, cursorX, cursorY, followerX, followerY, checkHover]);

	// Don't render on server or if disabled
	if (typeof window === "undefined" || !enabled) return null;

	// Don't show on touch devices
	if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return null;

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
				animate={{ scale: cursorMode === "default" ? 1 : cursorMode === "hover" ? 0.65 : 0 }}
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
						opacity: isVisible ? 1 : 0,
				}}
				animate={{
					scale:
						cursorMode === "play" ? 1.7 : cursorMode === "hover" ? 1.25 : 1,
					opacity: cursorMode === "default" ? 0.75 : 0.95,
				}}
				transition={{ duration: 0.2, ease: "easeOut" }}
				>
					<div
						className={`-translate-x-1/2 -translate-y-1/2 relative flex h-8 w-8 items-center justify-center rounded-full border border-[#DFE104] ${
							cursorMode === "play" ? "bg-[#DFE104]" : "bg-transparent"
						}`}
					>
						{cursorMode === "play" ? (
							<Play className="h-3.5 w-3.5 fill-current text-[#09090B]" />
						) : null}
					</div>
				</motion.div>
			</>
		);
	};

export default Cursor;
