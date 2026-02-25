'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, List, Play } from 'lucide-react';
import { type FocusEvent, useCallback, useEffect, useMemo, useState } from 'react';

type EpisodeDetail = {
  ep: string;
  label?: string;
  linkEmbed?: string;
  linkM3u8?: string;
  serverName?: string;
};

type WatchDockProps = {
  defaultEpisode: EpisodeDetail | null;
  playlist: EpisodeDetail[];
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

const canPlayEpisode = (episode: EpisodeDetail | null | undefined) =>
  Boolean(episode?.linkEmbed?.trim() || episode?.linkM3u8?.trim());

const getEpisodeLabel = (episode: EpisodeDetail | null | undefined) => {
  const label = episode?.label?.trim();
  if (label) return label;
  if (episode?.ep) return `Tập ${episode.ep}`;
  return 'Chọn tập để phát';
};

const getSmoothScrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

const scrollToSection = (sectionId: string, block: ScrollLogicalPosition = 'start') => {
  const section = document.getElementById(sectionId);
  section?.scrollIntoView({ behavior: getSmoothScrollBehavior(), block });
};

const WatchDock: React.FC<WatchDockProps> = ({ defaultEpisode, playlist }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [canHover, setCanHover] = useState(true);
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeDetail | null>(defaultEpisode);

  const normalizedPlaylist = useMemo(
    () => playlist.filter((episode): episode is EpisodeDetail => canPlayEpisode(episode)),
    [playlist],
  );

  const defaultPlayableEpisode = useMemo(() => {
    if (canPlayEpisode(defaultEpisode)) {
      return defaultEpisode;
    }
    return normalizedPlaylist[0] ?? null;
  }, [defaultEpisode, normalizedPlaylist]);

  useEffect(() => {
    setCurrentEpisode(defaultPlayableEpisode);
  }, [defaultPlayableEpisode]);

  const activeEpisode = canPlayEpisode(currentEpisode) ? currentEpisode : defaultPlayableEpisode;

  const currentEpisodeIndex = useMemo(() => {
    if (!activeEpisode) return -1;

    const bySource = normalizedPlaylist.findIndex((episode) => {
      if (episode.ep !== activeEpisode.ep) return false;
      if (activeEpisode.linkM3u8 && episode.linkM3u8) {
        return activeEpisode.linkM3u8 === episode.linkM3u8;
      }
      if (activeEpisode.linkEmbed && episode.linkEmbed) {
        return activeEpisode.linkEmbed === episode.linkEmbed;
      }
      return false;
    });

    if (bySource >= 0) return bySource;
    return normalizedPlaylist.findIndex((episode) => episode.ep === activeEpisode.ep);
  }, [activeEpisode, normalizedPlaylist]);

  const hasPreviousEpisode = currentEpisodeIndex > 0;
  const hasNextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < normalizedPlaylist.length - 1;
  const episodeProgressLabel = useMemo(() => {
    if (normalizedPlaylist.length <= 1) return '';
    if (currentEpisodeIndex < 0) return ` · ${normalizedPlaylist.length} tập`;
    return ` · ${currentEpisodeIndex + 1}/${normalizedPlaylist.length}`;
  }, [currentEpisodeIndex, normalizedPlaylist.length]);

  const isExpanded = useMemo(
    () => isVisible && (!canHover || isHovering || isFocusWithin),
    [canHover, isFocusWithin, isHovering, isVisible],
  );

  // Track dock visibility + proximity in one scroll pipeline
  useEffect(() => {
    const heroRoot = document.getElementById('movie-hero');
    const playerSection = document.getElementById('video-player');
    if (!heroRoot || !playerSection) return;
    let raf = 0;

    const updateDockState = () => {
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const heroRect = heroRoot.getBoundingClientRect();
        const heroBottom = heroRect.bottom;
        const viewportHeight = window.innerHeight;

        const playerRect = playerSection.getBoundingClientRect();
        const nearPlayer = playerRect.top < viewportHeight * 0.8 && playerRect.bottom > 0;

        // Show dock when hero action buttons have scrolled out of view
        // (heroBottom < 50% viewport ≈ "Xem ngay" button is off-screen)
        // AND user is not already near the video player section
        const heroActionsHidden = heroBottom < viewportHeight * 0.5;
        const shouldShow = heroActionsHidden && !nearPlayer;
        setIsVisible(shouldShow);
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
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const syncHoverCapability = () => setCanHover(mediaQuery.matches);
    syncHoverCapability();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncHoverCapability);
      return () => mediaQuery.removeEventListener('change', syncHoverCapability);
    }

    mediaQuery.addListener(syncHoverCapability);
    return () => mediaQuery.removeListener(syncHoverCapability);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setIsHovering(false);
      setIsFocusWithin(false);
      return;
    }
  }, [isVisible]);

  useEffect(() => {
    const handleEpisodeSelected = (event: Event) => {
      const detail = (event as CustomEvent<EpisodeDetail>).detail;
      if (!detail?.ep || !canPlayEpisode(detail)) {
        return;
      }

      setCurrentEpisode({
        ep: detail.ep,
        label: detail.label,
        linkEmbed: detail.linkEmbed,
        linkM3u8: detail.linkM3u8,
        serverName: detail.serverName,
      });
    };

    window.addEventListener('episodeSelected', handleEpisodeSelected);
    return () => window.removeEventListener('episodeSelected', handleEpisodeSelected);
  }, []);

  const playEpisode = useCallback((episode: EpisodeDetail | null) => {
    if (!episode || !canPlayEpisode(episode)) return;

    window.dispatchEvent(new CustomEvent('episodeSelected', { detail: episode }));
    scrollToSection('video-player');
  }, []);

  const handlePlay = useCallback(() => {
    playEpisode(activeEpisode);
  }, [activeEpisode, playEpisode]);

  const handleNavigateEpisode = useCallback(
    (offset: number) => {
      if (currentEpisodeIndex < 0) return;
      const nextEpisode = normalizedPlaylist[currentEpisodeIndex + offset];
      if (!nextEpisode) return;
      playEpisode(nextEpisode);
    },
    [currentEpisodeIndex, normalizedPlaylist, playEpisode],
  );

  const handleMouseEnter = useCallback(() => {
    if (!canHover) return;
    setIsHovering(true);
  }, [canHover]);

  const handleMouseLeave = useCallback(() => {
    if (!canHover) return;
    setIsHovering(false);
  }, [canHover]);

  const handleFocusCapture = useCallback(() => {
    setIsFocusWithin(true);
  }, []);

  const handleBlurCapture = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsFocusWithin(false);
    }
  }, []);

  if (!isVisible || !defaultPlayableEpisode) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={dockSpring}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      className={cn(
        'fixed bottom-3 right-3 z-40 lg:bottom-6 lg:right-8',
        isExpanded ? 'w-[min(94vw,26rem)]' : 'w-14',
      )}
    >
      <motion.div
        layout
        transition={dockSpring}
        className={cn(
          'flex min-h-14 items-center gap-2 border-2 border-[#3F3F46] bg-[#09090B]/95 p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-sm',
          isExpanded ? 'pl-1.5 pr-2' : 'justify-center',
        )}
      >
        <motion.button
          type="button"
          onClick={handlePlay}
          aria-label={`Phát ${getEpisodeLabel(activeEpisode)}`}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={dockSpring}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[#DFE104] bg-[#DFE104] text-[#09090B] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
        >
          <Play className="h-5 w-5 fill-current" aria-hidden="true" />
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
              className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
            >
              <div className="min-w-0 flex-1 pl-0.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">
                  Cinema Mode
                  {episodeProgressLabel}
                </p>
                <p className="truncate text-sm font-bold uppercase tracking-wide text-[#FAFAFA]">
                  {getEpisodeLabel(activeEpisode)}
                </p>
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
                  {activeEpisode?.serverName?.trim() || 'Nguồn mặc định'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleNavigateEpisode(-1)}
                disabled={!hasPreviousEpisode}
                aria-label="Phát tập trước"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#3F3F46] bg-[#18181B] text-[#FAFAFA] transition hover:border-[#DFE104] hover:text-[#DFE104] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#3F3F46] disabled:hover:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigateEpisode(1)}
                disabled={!hasNextEpisode}
                aria-label="Phát tập tiếp theo"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#3F3F46] bg-[#18181B] text-[#FAFAFA] transition hover:border-[#DFE104] hover:text-[#DFE104] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#3F3F46] disabled:hover:text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <motion.button
                type="button"
                onClick={() => {
                  scrollToSection('episode-selection');
                }}
                whileHover={{ y: -1 }}
                transition={dockSpring}
                className="inline-flex h-10 shrink-0 items-center gap-1 border-2 border-[#3F3F46] px-2.5 text-xs font-bold uppercase tracking-wide text-[#FAFAFA] transition hover:border-[#DFE104] hover:text-[#DFE104] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
              >
                <List className="h-3.5 w-3.5" />
                Tập
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default WatchDock;
