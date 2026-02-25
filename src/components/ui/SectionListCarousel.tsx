'use client';

import { resolveImageUrl } from '@/lib/image';
import { CaretLeft as ChevronLeft } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as ChevronRight } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { FilmSlate as Film } from '@phosphor-icons/react/dist/ssr/FilmSlate';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
const SCROLL_EPSILON = 2;

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
  layout: 'landscape' | 'portrait';
}

const SectionListCarousel: React.FC<SectionListCarouselProps> = ({ items, layout }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const baseWidth = layout === 'landscape' ? 320 : 212;
  const baseHeight =
    layout === 'landscape' ? Math.round((baseWidth * 9) / 16) : Math.round((baseWidth * 4) / 3);

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
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

    container.addEventListener('scroll', onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });
    resizeObserver.observe(container);

    const images = Array.from(container.querySelectorAll('img'));
    for (const img of images) {
      if (!img.complete) {
        img.addEventListener('load', updateScrollState, { once: true });
      }
    }

    return () => {
      container.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [updateScrollState]);

  const scrollByStep = (direction: 1 | -1) => {
    const container = containerRef.current;
    if (!container) return;

    const card = container.querySelector<HTMLElement>('[data-carousel-card]');
    const gapValue = window.getComputedStyle(container).gap;
    const gap = Number.parseFloat(gapValue || '0');
    const cardStep = card ? card.offsetWidth + gap : 0;
    const viewportStep = Math.floor(container.clientWidth * 0.78);
    const step = Math.max(cardStep, viewportStep);

    container.scrollBy({
      left: step * direction,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      {canScrollPrev && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-[#09090B] to-transparent sm:w-6 md:w-6" />
          <button
            type="button"
            aria-label="Cuộn trái"
            className="absolute left-4 top-1/2 z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] backdrop-blur-sm transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] hover:scale-105 sm:left-6 sm:h-7 sm:w-7 md:left-6"
            onClick={() => scrollByStep(-1)}
          >
            <ChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </button>
        </>
      )}

      {canScrollNext && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-[#09090B] to-transparent sm:w-6 md:w-6" />
          <button
            type="button"
            aria-label="Cuộn phải"
            className="absolute right-4 top-1/2 z-20 flex h-6 w-6 translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] backdrop-blur-sm transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] hover:scale-105 sm:right-6 sm:h-7 sm:w-7 md:right-6"
            onClick={() => scrollByStep(1)}
          >
            <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className={`no-scrollbar flex gap-4 overflow-x-auto pb-3 scroll-smooth ${
          layout === 'landscape' ? 'snap-x snap-mandatory' : ''
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item, index) => {
          const imageUrl =
            layout === 'landscape'
              ? item.thumb_url || item.poster_url
              : item.poster_url || item.thumb_url;
          const transitionName = `${layout === 'landscape' ? 'poster' : 'image'}-${item.slug}`;
          const imageSrc = resolveImageUrl(imageUrl);
          const transitionPrewarmSource = imageSrc;

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
                layout === 'landscape' ? 'w-[320px] snap-start' : 'w-[212px]'
              }`}
            >
              <a
                href={`/phim/${item.slug}`}
                className="block h-full"
                data-astro-prefetch="hover"
                data-transition-prewarm={transitionPrewarmSource || undefined}
              >
                <div className={layout === 'landscape' ? 'aspect-[16/9]' : 'aspect-[3/4]'}>
                  {imageSrc ? (
                    <motion.img
                      src={imageSrc}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      width={baseWidth}
                      height={baseHeight}
                      style={{ viewTransitionName: transitionName }}
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
                  {layout === 'landscape' ? (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent p-4 pt-12">
                      <div className="mb-2 inline-flex border-2 border-[#3F3F46] bg-[#27272A] px-2 py-1 text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] transition-colors duration-300 group-hover:border-[#DFE104] group-hover:bg-[#DFE104]/10 group-hover:text-[#DFE104]">
                        {item.year || 'N/A'}
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
                        {item.year || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
                {layout === 'portrait' && (
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
      </div>
    </div>
  );
};

export default SectionListCarousel;
