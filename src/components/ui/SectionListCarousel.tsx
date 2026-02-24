"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const IMAGE_ORIGIN = "https://phimimg.com/";
const SCROLL_EPSILON = 2;

const resolveImageUrl = (source?: string | null) => {
	if (!source) return null;

	if (source.startsWith("http")) {
		return source;
	}

	if (source.startsWith("//")) {
		return `https:${source}`;
	}

	const sanitized = source.replace(/^\/+/, "");
	return `${IMAGE_ORIGIN}${sanitized}`;
};

interface CarouselItem {
	slug: string;
	name: string;
	origin_name: string;
	thumb_url?: string;
	poster_url?: string;
	year?: number;
}

interface SectionListCarouselProps {
	items: CarouselItem[];
	layout: "landscape" | "portrait";
}

const SectionListCarousel: React.FC<SectionListCarouselProps> = ({
	items,
	layout,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const startSentinelRef = useRef<HTMLDivElement>(null);
	const endSentinelRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef<number | null>(null);
	const [canScrollPrev, setCanScrollPrev] = useState(false);
	const [canScrollNext, setCanScrollNext] = useState(false);

	const baseWidth = layout === "landscape" ? 320 : 212;
	const baseHeight =
		layout === "landscape"
			? Math.round((baseWidth * 9) / 16)
			: Math.round((baseWidth * 4) / 3);

	const updateScrollState = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		const maxScrollLeft = Math.max(
			0,
			container.scrollWidth - container.clientWidth,
		);
		const scrollLeft = Math.max(0, container.scrollLeft);
		setCanScrollPrev(scrollLeft > SCROLL_EPSILON);
		setCanScrollNext(scrollLeft < maxScrollLeft - SCROLL_EPSILON);
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		updateScrollState();
		const onScroll = () => {
			if (rafRef.current) {
				window.cancelAnimationFrame(rafRef.current);
			}
			rafRef.current = window.requestAnimationFrame(updateScrollState);
		};

		container.addEventListener("scroll", onScroll, { passive: true });

		const resizeObserver = new ResizeObserver(() => {
			updateScrollState();
		});
		resizeObserver.observe(container);

		const images = Array.from(container.querySelectorAll("img"));
		images.forEach((img) => {
			if (!img.complete) {
				img.addEventListener("load", updateScrollState, { once: true });
			}
		});

		return () => {
			container.removeEventListener("scroll", onScroll);
			resizeObserver.disconnect();
			if (rafRef.current) {
				window.cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, [items.length, layout, updateScrollState]);

	useEffect(() => {
		const container = containerRef.current;
		const start = startSentinelRef.current;
		const end = endSentinelRef.current;
		if (
			!container ||
			!start ||
			!end ||
			typeof IntersectionObserver === "undefined"
		) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.target === start) {
						setCanScrollPrev(!entry.isIntersecting);
					}
					if (entry.target === end) {
						setCanScrollNext(!entry.isIntersecting);
					}
				}
			},
			{
				root: container,
				threshold: 0.99,
			},
		);

		observer.observe(start);
		observer.observe(end);

		return () => {
			observer.disconnect();
		};
	}, [items.length, layout]);

	const scrollByStep = (direction: 1 | -1) => {
		const container = containerRef.current;
		if (!container) return;

		const card = container.querySelector<HTMLElement>("[data-carousel-card]");
		const gapValue = window.getComputedStyle(container).gap;
		const gap = Number.parseFloat(gapValue || "0");
		const cardStep = card ? card.offsetWidth + gap : 0;
		const viewportStep = Math.floor(container.clientWidth * 0.78);
		const step = Math.max(cardStep, viewportStep);

		container.scrollBy({
			left: step * direction,
			behavior: "smooth",
		});
	};

	return (
		<div className="relative">
			{canScrollPrev && (
				<>
					<div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-[#09090B] to-transparent md:block" />
					<button
						type="button"
						aria-label="Cuộn trái"
						className="absolute left-0 top-1/2 z-20 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] backdrop-blur-sm transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] hover:scale-110 md:flex"
						onClick={() => scrollByStep(-1)}
					>
						<ChevronLeft className="h-5 w-5" />
					</button>
				</>
			)}

			{canScrollNext && (
				<>
					<div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-16 bg-gradient-to-l from-[#09090B] to-transparent md:block" />
					<button
						type="button"
						aria-label="Cuộn phải"
						className="absolute right-0 top-1/2 z-20 hidden h-12 w-12 translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] backdrop-blur-sm transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] hover:scale-110 md:flex"
						onClick={() => scrollByStep(1)}
					>
						<ChevronRight className="h-5 w-5" />
					</button>
				</>
			)}

			<div
				ref={containerRef}
				className={`no-scrollbar flex gap-4 overflow-x-auto pb-3 scroll-smooth ${
					layout === "landscape" ? "snap-x snap-mandatory" : ""
				}`}
				style={{ WebkitOverflowScrolling: "touch" }}
			>
				<div
					ref={startSentinelRef}
					className="h-px w-px shrink-0"
					aria-hidden="true"
				/>
				{items.map((item, index) => {
					const imageUrl =
						layout === "landscape"
							? item.thumb_url || item.poster_url
							: item.poster_url || item.thumb_url;

					return (
						<motion.article
							key={item.slug}
							data-carousel-card
							data-cursor-play
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{
								duration: 0.4,
								delay: index * 0.05,
								ease: [0.25, 0.46, 0.45, 0.94],
							}}
							className={`group relative shrink-0 overflow-hidden border-2 border-[#3F3F46] bg-[#09090B] transition-all duration-300 hover:border-[#DFE104] ${
								layout === "landscape" ? "w-[320px] snap-start" : "w-[212px]"
							}`}
						>
							<a href={`/phim/${item.slug}`} className="block h-full">
								<div
									className={
										layout === "landscape" ? "aspect-[16/9]" : "aspect-[3/4]"
									}
								>
									{imageUrl ? (
										<motion.img
											src={resolveImageUrl(imageUrl) || undefined}
											alt={item.name}
											loading="lazy"
											decoding="async"
											width={baseWidth}
											height={baseHeight}
											className="h-full w-full object-cover"
											whileHover={{ scale: 1.05 }}
											transition={{ duration: 0.3 }}
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center bg-[#27272A]">
											<div className="text-center">
												<Film className="mx-auto mb-2 h-10 w-10 text-[#71717A]" />
												<p className="text-xs font-bold uppercase tracking-tighter text-[#71717A]">
													No Image
												</p>
											</div>
										</div>
									)}
									{layout === "landscape" ? (
										<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent p-4 pt-12">
											<div className="mb-2 inline-flex border-2 border-[#3F3F46] bg-[#27272A] px-2 py-1 text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] transition-colors duration-300 group-hover:border-[#DFE104] group-hover:bg-[#DFE104]/10 group-hover:text-[#DFE104]">
												{item.year || "N/A"}
											</div>
											<h3 className="line-clamp-2 text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] transition-colors duration-300 group-hover:text-[#DFE104]">
												{item.name}
											</h3>
											<p className="line-clamp-1 mt-1 text-xs font-bold uppercase tracking-tight text-[#A1A1AA] transition-colors duration-300 group-hover:text-[#FAFAFA]">
												{item.origin_name}
											</p>
										</div>
									) : (
										<div className="absolute top-2 right-2">
											<span className="inline-flex border-2 border-[#3F3F46] bg-[#27272A] px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-[#FAFAFA] transition-colors duration-300 group-hover:border-[#DFE104] group-hover:bg-[#DFE104]/10 group-hover:text-[#DFE104]">
												{item.year || "N/A"}
											</span>
										</div>
									)}
								</div>
								{layout === "portrait" && (
									<div className="border-t-2 border-[#3F3F46] bg-[#09090B] px-3 py-3 transition-colors duration-300 ]">
										<h3 className="line-clamp-2 text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] transition-colors duration-300 group-hover:text-[#DFE104]">
											{item.name}
										</h3>
										<p className="line-clamp-1 mt-1 text-[10px] font-bold uppercase tracking-tight text-[#A1A1AA] transition-colors duration-300 group-hover:text-[#FAFAFA]">
											{item.origin_name}
										</p>
									</div>
								)}
							</a>
						</motion.article>
					);
				})}
				<div
					ref={endSentinelRef}
					className="h-px w-px shrink-0"
					aria-hidden="true"
				/>
			</div>
		</div>
	);
};

export default SectionListCarousel;
