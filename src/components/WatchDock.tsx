'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type EpisodeDetail = {
  ep: string;
  label?: string;
  linkEmbed?: string;
  linkM3u8?: string;
  serverName?: string;
};

type WatchDockProps = {
  defaultEpisode: EpisodeDetail | null;
  firstPlayableLabel: string;
};

const dockSpring = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 30,
  mass: 0.85,
};

const contentSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 34,
  mass: 0.7,
};

const WatchDock: React.FC<WatchDockProps> = ({ defaultEpisode, firstPlayableLabel }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isNearPlayer, setIsNearPlayer] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [currentLabel, setCurrentLabel] = useState(firstPlayableLabel);

  const isExpanded = useMemo(() => !isNearPlayer || isHovering, [isNearPlayer, isHovering]);

  // Track dock visibility + proximity in one scroll pipeline
  useEffect(() => {
    const heroRoot = document.getElementById('movie-hero');
    const playerSection = document.getElementById('video-player');
    if (!heroRoot || !playerSection) return;
    let raf = 0;

    const updateDockState = () => {
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const heroBottom = heroRoot.getBoundingClientRect().bottom;
        const shouldShow = heroBottom < window.innerHeight * 0.4;
        setIsVisible(shouldShow);

        if (!shouldShow) {
          setIsNearPlayer(false);
          return;
        }

        const playerRect = playerSection.getBoundingClientRect();
        const nearPlayer = playerRect.top < window.innerHeight * 0.8 && playerRect.bottom > 0;
        setIsNearPlayer(nearPlayer);
      });
    };

    updateDockState();
    window.addEventListener('scroll', updateDockState, { passive: true });
    window.addEventListener('resize', updateDockState, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', updateDockState);
      window.removeEventListener('resize', updateDockState);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setIsHovering(false);
      return;
    }
  }, [isVisible]);

  // Sync label from prop
  useEffect(() => {
    setCurrentLabel(firstPlayableLabel);
  }, [firstPlayableLabel]);

  // Listen for episode selection
  useEffect(() => {
    const handleEpisodeSelected = (event: Event) => {
      const detail = (event as CustomEvent<EpisodeDetail>).detail;
      const label = detail?.label?.trim();
      if (label) setCurrentLabel(label);
    };

    window.addEventListener('episodeSelected', handleEpisodeSelected);
    return () => window.removeEventListener('episodeSelected', handleEpisodeSelected);
  }, []);

  const handlePlay = useCallback(() => {
    if (!defaultEpisode) return;
    window.dispatchEvent(new CustomEvent('episodeSelected', { detail: defaultEpisode }));
    const playerSection = document.getElementById('video-player');
    playerSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [defaultEpisode]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  if (!isVisible || !defaultEpisode) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={dockSpring}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'fixed bottom-4 right-4 z-40 lg:bottom-6 lg:right-8',
        isExpanded ? 'w-[min(92vw,23.5rem)]' : 'w-14',
      )}
    >
      <motion.div
        layout
        transition={dockSpring}
        className={cn(
          'flex min-h-14 items-center gap-2 border-2 border-[#3F3F46] bg-[#09090B]/95 p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-sm',
          isExpanded ? 'pl-1.5 pr-2.5' : 'justify-center',
        )}
      >
        <motion.button
          type="button"
          onClick={handlePlay}
          aria-label="Phát phim"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={dockSpring}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[#DFE104] bg-[#DFE104] text-[#09090B] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
        >
          <svg
            className="h-5 w-5 translate-x-[0.5px]"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </motion.button>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              key="dock-content"
              layout
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={contentSpring}
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">
                  Cinema Mode
                </p>
                <p className="truncate text-sm font-bold uppercase tracking-wide text-[#FAFAFA]">
                  {currentLabel}
                </p>
              </div>
              <motion.a
                href="#episode-selection"
                whileHover={{ y: -1 }}
                transition={dockSpring}
                className="inline-flex h-11 shrink-0 items-center border-2 border-[#3F3F46] px-3 text-xs font-bold uppercase tracking-wide text-[#FAFAFA] transition hover:border-[#DFE104] hover:text-[#DFE104] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
              >
                Tập
              </motion.a>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default WatchDock;
