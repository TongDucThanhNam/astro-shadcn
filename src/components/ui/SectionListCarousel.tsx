"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const IMAGE_ORIGIN = "https://phimimg.com/";

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

    const firstCard = container.firstElementChild as HTMLElement | null;
    const firstCardStart = firstCard ? firstCard.offsetLeft : 0;
    const threshold = 2;
    const normalizedStart = Math.max(0, firstCardStart);
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollPrev(container.scrollLeft > normalizedStart + threshold);
    setCanScrollNext(container.scrollLeft < maxScrollLeft - threshold);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateScrollState();
    const onScroll = () => updateScrollState();

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
    };
  }, [items.length, layout, updateScrollState]);

  const scrollByStep = (direction: 1 | -1) => {
    const container = containerRef.current;
    if (!container) return;

    const card = container.firstElementChild as HTMLElement | null;
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
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-12 bg-gradient-to-r from-[#09090B] to-transparent md:block" />
          <button
            type="button"
            aria-label="Cuộn trái"
            className="absolute left-0 top-1/2 z-20 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-[#3F3F46] bg-[#09090B]/88 text-[#FAFAFA] backdrop-blur-sm transition-all duration-200 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] md:flex"
            onClick={() => scrollByStep(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}

      {canScrollNext && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 bg-gradient-to-l from-[#09090B] to-transparent md:block" />
          <button
            type="button"
            aria-label="Cuộn phải"
            className="absolute right-0 top-1/2 z-20 hidden h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center border border-[#3F3F46] bg-[#09090B]/88 text-[#FAFAFA] backdrop-blur-sm transition-all duration-200 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] md:flex"
            onClick={() => scrollByStep(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className={`no-scrollbar flex gap-3 overflow-x-auto pb-2 pr-1 scroll-smooth sm:gap-4 ${
          layout === "landscape" ? "snap-x snap-mandatory" : ""
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item, index) => {
          const imageUrl =
            layout === "landscape"
              ? item.thumb_url || item.poster_url
              : item.poster_url || item.thumb_url;

          return (
            <motion.article
              key={item.slug}
              data-cursor-play
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className={`group relative mt-1 shrink-0 overflow-hidden border-2 border-[#3F3F46] bg-[#09090B] transition-all duration-300 hover:border-[#DFE104] ${
                layout === "landscape" ? "w-[320px] snap-start" : "w-[212px]"
              }`}
            >
              <a href={`/phim/${item.slug}`} className="block h-full">
                <div
                  className={
                    layout === "landscape" ? "aspect-[16/9]" : "aspect-[3/4]"
                  }
                  style={{ position: "relative" }}
                >
                  {imageUrl ? (
                    <motion.img
                      src={resolveImageUrl(imageUrl) || undefined}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      width={baseWidth}
                      height={baseHeight}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#27272A] text-xs text-[#A1A1AA]">
                      No Image
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to top, rgba(9, 9, 11, 0.9) 0%, rgba(9, 9, 11, 0.14) 58%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 8,
                      top: 8,
                      border: "1px solid #3F3F46",
                      background: "rgba(9, 9, 11, 0.82)",
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#A1A1AA",
                      textTransform: "uppercase",
                      pointerEvents: "none",
                    }}
                  >
                    {item.year || "N/A"}
                  </div>
                </div>
                {layout === "landscape" ? null : (
                  <div className="space-y-1 border-t border-[#27272A] px-3 py-3">
                    <h3 className="line-clamp-2 text-sm font-bold text-[#FAFAFA] transition group-hover:text-[#DFE104]">
                      {item.name}
                    </h3>
                    <p className="line-clamp-1 text-xs uppercase tracking-[0.1em] text-[#A1A1AA]">
                      {item.origin_name}
                    </p>
                  </div>
                )}
              </a>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
};

export default SectionListCarousel;
