import { cn } from '@/lib/utils';
import {
  CaptionButton,
  Controls,
  FullscreenButton,
  Gesture,
  GoogleCastButton,
  MuteButton,
  PIPButton,
  PlayButton,
  Spinner,
  Time,
  TimeSlider,
  VolumeSlider,
  useAudioOptions,
  useCaptionOptions,
  useMediaPlayer,
  useMediaStore,
  usePlaybackRateOptions,
  useVideoQualityOptions,
} from '@vidstack/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Cast,
  Check,
  ChevronRight,
  Copy,
  Expand,
  Gauge,
  Info,
  Keyboard,
  LayoutPanelTop,
  Link2,
  MessageSquareText,
  Minimize2,
  MonitorPlay,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  Server,
  Settings,
  SkipBack,
  SkipForward,
  Tv,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type PlayerControlLayerProps = {
  allowFallback: boolean;
  onFallback?: () => void;
  /** Episode label shown at top of player overlay */
  episodeLabel?: string;
  /** Source type label (e.g. "Vidstack HLS") */
  sourceLabel?: string;
  /** Server name badge */
  serverName?: string;
  /** Whether theater mode is currently active */
  isTheaterMode?: boolean;
  /** Whether a previous episode exists */
  hasPreviousEpisode?: boolean;
  /** Whether a next episode exists */
  hasNextEpisode?: boolean;
  /** Auto-advance to next episode when current ends */
  autoAdvance?: boolean;
  /** Toggle auto-advance */
  onAutoAdvanceChange?: (v: boolean) => void;
};

/* ── YouTube-style icon button ── */
const YT_ICON_BTN =
  'inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors duration-150 hover:text-white focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

/* ── Overlay animation presets ── */
const springOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25 },
};

const springScale = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { duration: 0.3, ease: 'backOut' as const },
};

/* ── Types ── */
type ContextMenuPos = { x: number; y: number } | null;
type SettingsView = 'main' | 'speed' | 'quality' | 'audio' | 'subtitles' | 'shortcuts' | null;

/* ═══════════════════════════════════════════════════════════════════════════ */

const PlayerControlLayer: React.FC<PlayerControlLayerProps> = ({
  allowFallback,
  onFallback,
  episodeLabel,
  sourceLabel,
  serverName,
  isTheaterMode,
  hasPreviousEpisode,
  hasNextEpisode,
  autoAdvance,
  onAutoAdvanceChange,
}) => {
  /* ── Local state ── */
  const [contextMenu, setContextMenu] = useState<ContextMenuPos>(null);
  const [settingsView, setSettingsView] = useState<SettingsView>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [clickIndicator, setClickIndicator] = useState<'play' | 'pause' | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  /* ── Player state ── */
  const player = useMediaPlayer();
  const {
    paused,
    muted,
    fullscreen,
    waiting,
    seeking,
    ended,
    started,
    volume,
    pictureInPicture,
    canPictureInPicture,
    canGoogleCast,
    canFullscreen,
    canPlay,
    playbackRate,
    live,
    liveEdge,
    bufferedEnd,
    duration,
    quality,
    qualities,
    autoQuality,
    canSetVolume,
    canSetPlaybackRate,
    canSetQuality,
    pointer,
    error,
    autoPlayError,
    isGoogleCastConnected,
    isAirPlayConnected,
    remotePlaybackInfo,
    streamType,
    viewType,
  } = useMediaStore();

  const audioOptions = useAudioOptions();
  const qualityOptions = useVideoQualityOptions({ auto: true, sort: 'descending' });
  const playbackRateOptions = usePlaybackRateOptions({
    rates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    normalLabel: 'Bình thường',
  });
  const captionOptions = useCaptionOptions({ off: 'Tắt' });

  /* ── Derived ── */
  const isRemoteActive = isGoogleCastConnected || isAirPlayConnected;
  const remoteDeviceName = remotePlaybackInfo?.deviceName?.trim() || 'Thiết bị';
  const remoteLabel = isGoogleCastConnected ? 'Google Cast' : 'AirPlay';
  const canInteract = canPlay && !error;

  const finiteDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const bufferedPercent = finiteDuration
    ? Math.max(0, Math.min(100, (bufferedEnd / finiteDuration) * 100))
    : 0;

  const shouldShowInitialSplash = canPlay && !error && !isRemoteActive && !started && paused;
  const activeQualityLabel =
    quality?.height && Number.isFinite(quality.height) ? `${quality.height}p` : null;

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  /* ── Click indicator animation (brief play/pause ripple) ── */
  useEffect(() => {
    if (clickIndicator) {
      const timer = setTimeout(() => setClickIndicator(null), 600);
      return () => clearTimeout(timer);
    }
  }, [clickIndicator]);

  const prevPausedRef = useRef(paused);
  useEffect(() => {
    if (prevPausedRef.current !== paused && started) {
      setClickIndicator(paused ? 'pause' : 'play');
    }
    prevPausedRef.current = paused;
  }, [paused, started]);

  /* ── Loop mode sync ── */
  useEffect(() => {
    if (!player) return;
    const videoEl = player.el?.querySelector('video');
    if (videoEl) videoEl.loop = loopEnabled;
  }, [loopEnabled, player]);

  /* ── Right-click context menu via player element ── */
  useEffect(() => {
    const playerEl = player?.el;
    if (!playerEl) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      const rect = playerEl.getBoundingClientRect();
      setContextMenu({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    playerEl.addEventListener('contextmenu', handler);
    return () => playerEl.removeEventListener('contextmenu', handler);
  }, [player]);

  /* ── Close context menu on outside click / scroll / esc ── */
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleScroll = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClick, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  /* ── Close settings on outside click ── */
  useEffect(() => {
    if (!settingsView) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsView(null);
      }
    };
    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, [settingsView]);

  const copyToClipboard = useCallback(async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFeedback(label || 'Đã sao chép!');
      setTimeout(() => setCopiedFeedback(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Screenshot ── */
  const takeScreenshot = useCallback(() => {
    if (!player) return;
    const videoEl = player.el?.querySelector('video');
    if (!videoEl) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoEl, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot-${Math.floor(player.currentTime || 0)}s.png`;
        a.click();
        URL.revokeObjectURL(url);
        setCopiedFeedback('Đã chụp ảnh!');
        setTimeout(() => setCopiedFeedback(null), 2000);
      }, 'image/png');
    } catch {
      /* ignore */
    }
  }, [player]);

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  JSX                                                                   */
  /* ═══════════════════════════════════════════════════════════════════════ */

  return (
    <>
      {/* ─── Gestures: click → play/pause, double-click → fullscreen ─── */}
      <Gesture className="absolute inset-0 z-0" event="pointerup" action="toggle:paused" />
      <Gesture className="absolute inset-0 z-0" event="dblpointerup" action="toggle:fullscreen" />

      {/* ─── Center click indicator (play / pause ripple) ─── */}
      <AnimatePresence>
        {clickIndicator && (
          <motion.div
            key={clickIndicator}
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50">
              {clickIndicator === 'play' ? (
                <Play className="h-6 w-6 translate-x-[1px] fill-white text-white" />
              ) : (
                <Pause className="h-6 w-6 fill-white text-white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Controls overlay ─── */}
      <Controls.Root
        className={cn(
          'absolute inset-0 z-[2] flex flex-col pointer-events-none',
          'opacity-0 transition-opacity duration-300',
          'group-hover/player:opacity-100 group-data-[paused]/player:opacity-100',
          'group-data-[waiting]/player:opacity-100 group-data-[seeking]/player:opacity-100',
          pointer === 'coarse' && 'opacity-100',
        )}
      >
        {/* Top gradient */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />

        {/* ─── Top info bar ─── */}
        {(episodeLabel || sourceLabel || serverName) && (
          <Controls.Group className="pointer-events-auto relative z-10 flex items-center justify-between gap-2 px-3 pt-3">
            {episodeLabel && (
              <p className="min-w-0 truncate text-sm font-bold uppercase tracking-tight text-white drop-shadow-lg sm:text-[15px]">
                {episodeLabel}
              </p>
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              {sourceLabel && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70 backdrop-blur-sm">
                  <Server className="h-3 w-3" />
                  {sourceLabel}
                </span>
              )}
              {serverName && (
                <span className="rounded-sm bg-[#DFE104]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#DFE104] backdrop-blur-sm">
                  {serverName}
                </span>
              )}
            </div>
          </Controls.Group>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Live badge */}
        {live && (
          <div className="pointer-events-auto absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded bg-black/70 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                liveEdge ? 'bg-red-500 animate-pulse' : 'bg-gray-500',
              )}
            />
            <span className={cn(liveEdge ? 'text-red-500' : 'text-gray-400')}>TRỰC TIẾP</span>
          </div>
        )}

        {/* ─── Progress bar (YouTube-style) ─── */}
        <Controls.Group className="pointer-events-auto relative z-10 w-full px-3">
          {seeking && (
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full rounded bg-black/80 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              Đang tìm kiếm…
            </div>
          )}
          <TimeSlider.Root
            className={cn(
              'group/time relative flex h-[20px] w-full cursor-pointer items-center',
              !canInteract && 'pointer-events-none opacity-60',
            )}
          >
            <TimeSlider.Track className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-150 group-hover/time:h-[5px] group-data-[dragging]/time:h-[5px]">
              {/* Buffered */}
              <TimeSlider.Progress
                className="absolute inset-y-0 left-0 bg-white/40"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Played – accent yellow */}
              <TimeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]" />
            </TimeSlider.Track>
            <TimeSlider.Thumb className="pointer-events-none absolute left-[var(--slider-fill)] top-1/2 z-[3] block h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#DFE104] opacity-0 shadow-sm transition-opacity group-hover/time:opacity-100 group-data-[active]/time:opacity-100 group-data-[dragging]/time:opacity-100" />
          </TimeSlider.Root>
        </Controls.Group>

        {/* ─── Control buttons row ─── */}
        <Controls.Group className="pointer-events-auto relative z-10 flex items-center justify-between px-1.5 pb-1.5 pt-0.5 sm:px-2">
          {/* Left side */}
          <div className="flex items-center gap-0.5">
            {/* Previous episode */}
            {hasPreviousEpisode !== undefined && (
              <button
                type="button"
                className={cn(YT_ICON_BTN, 'hidden sm:inline-flex')}
                aria-label="Tập trước"
                title="Tập trước (J)"
                disabled={!hasPreviousEpisode}
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
                }}
              >
                <SkipBack className="h-[20px] w-[20px]" />
              </button>
            )}

            {/* Play / Pause */}
            <PlayButton
              className={YT_ICON_BTN}
              aria-label="Phát hoặc tạm dừng"
              title="Phát/Tạm dừng (K)"
              disabled={!canInteract}
            >
              {paused ? (
                <Play className="h-[22px] w-[22px] translate-x-[1px] fill-white text-white" />
              ) : (
                <Pause className="h-[22px] w-[22px] fill-white text-white" />
              )}
            </PlayButton>

            {/* Next episode */}
            {hasNextEpisode !== undefined && (
              <button
                type="button"
                className={cn(YT_ICON_BTN, 'hidden sm:inline-flex')}
                aria-label="Tập tiếp theo"
                title="Tập tiếp theo (L)"
                disabled={!hasNextEpisode}
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true }));
                }}
              >
                <SkipForward className="h-[20px] w-[20px]" />
              </button>
            )}

            {/* Volume – compact, hover to expand */}
            <div className="group/vol flex items-center">
              <MuteButton
                className={YT_ICON_BTN}
                aria-label="Bật hoặc tắt tiếng"
                title="Tắt tiếng (M)"
                disabled={!canInteract}
              >
                <VolumeIcon className="h-[22px] w-[22px]" />
              </MuteButton>

              {canSetVolume && (
                <div className="flex w-0 items-center overflow-hidden transition-all duration-200 ease-out group-hover/vol:w-[80px] group-focus-within/vol:w-[80px]">
                  <VolumeSlider.Root className="group/volslider relative inline-flex h-10 w-[72px] cursor-pointer items-center px-0">
                    <VolumeSlider.Track className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/30">
                      <VolumeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] rounded-full bg-white" />
                    </VolumeSlider.Track>
                    <VolumeSlider.Thumb className="absolute left-[var(--slider-fill)] top-1/2 z-[3] block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-sm transition-opacity group-hover/vol:opacity-100 group-data-[dragging]/volslider:opacity-100" />
                  </VolumeSlider.Root>
                </div>
              )}
            </div>

            {/* Time display */}
            <div className="ml-1.5 flex items-center gap-1.5 text-[13px] font-medium tabular-nums text-white/90">
              <Time type="current" className="inline" />
              <span className="text-white/50">/</span>
              <Time type="duration" className="inline text-white/50" />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-0.5">
            {/* Auto-advance toggle */}
            {hasNextEpisode && autoAdvance !== undefined && onAutoAdvanceChange && (
              <button
                type="button"
                className={cn(
                  'hidden items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors sm:inline-flex',
                  autoAdvance
                    ? 'bg-[#DFE104] text-[#09090B]'
                    : 'bg-white/10 text-white/60 hover:bg-white/20',
                )}
                onClick={() => onAutoAdvanceChange(!autoAdvance)}
                title={autoAdvance ? 'Auto-advance đang bật' : 'Auto-advance đang tắt'}
              >
                {autoAdvance ? 'Auto' : 'Auto ✕'}
              </button>
            )}

            {/* Captions toggle */}
            {captionOptions.length > 1 && (
              <CaptionButton
                className={cn(YT_ICON_BTN, 'hidden sm:inline-flex')}
                aria-label="Phụ đề"
                title="Phụ đề (C)"
                disabled={!canInteract}
              >
                <MessageSquareText className="h-[22px] w-[22px]" />
              </CaptionButton>
            )}

            {/* Screenshot */}
            <button
              type="button"
              className={cn(YT_ICON_BTN, 'hidden lg:inline-flex')}
              aria-label="Chụp ảnh màn hình"
              title="Chụp ảnh màn hình"
              onClick={takeScreenshot}
              disabled={!canInteract}
            >
              <Camera className="h-[20px] w-[20px]" />
            </button>

            {/* Reload source */}
            <button
              type="button"
              className={cn(YT_ICON_BTN, 'hidden sm:inline-flex')}
              aria-label="Tải lại nguồn phát"
              title="Tải lại nguồn (R)"
              disabled={!canInteract}
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
              }}
            >
              <RefreshCw className="h-[18px] w-[18px]" />
            </button>

            {/* Settings gear */}
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                className={cn(YT_ICON_BTN, settingsView && 'text-white')}
                onClick={(e) => {
                  e.stopPropagation();
                  setSettingsView((prev) => (prev ? null : 'main'));
                }}
                aria-label="Cài đặt"
                title="Cài đặt"
                disabled={!canInteract}
              >
                <Settings
                  className={cn(
                    'h-[22px] w-[22px] transition-transform duration-300',
                    settingsView && 'rotate-[30deg]',
                  )}
                />
              </button>

              {/* ── Settings popup ── */}
              <AnimatePresence>
                {settingsView && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-12 right-0 z-20 min-w-[260px] overflow-hidden rounded-xl bg-[#212121]/95 py-2 shadow-2xl backdrop-blur-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* ── Main view ── */}
                    {settingsView === 'main' && (
                      <div className="flex flex-col">
                        {/* Playback Speed */}
                        <button
                          type="button"
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => setSettingsView('speed')}
                          disabled={!canSetPlaybackRate}
                        >
                          <div className="flex items-center gap-3">
                            <Gauge className="h-5 w-5 text-white/60" />
                            <span>Tốc độ phát</span>
                          </div>
                          <div className="flex items-center gap-1 text-white/50">
                            <span className="text-xs">
                              {playbackRate === 1 ? 'Bình thường' : `${playbackRate}x`}
                            </span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </button>

                        {/* Quality */}
                        {qualities.length > 0 && (
                          <button
                            type="button"
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                            onClick={() => setSettingsView('quality')}
                            disabled={!canSetQuality}
                          >
                            <div className="flex items-center gap-3">
                              <Tv className="h-5 w-5 text-white/60" />
                              <span>Chất lượng</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/50">
                              <span className="text-xs">
                                {autoQuality
                                  ? `Tự động${activeQualityLabel ? ` (${activeQualityLabel})` : ''}`
                                  : activeQualityLabel || 'Tự động'}
                              </span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </button>
                        )}

                        {/* Audio tracks */}
                        {audioOptions.length > 1 && (
                          <button
                            type="button"
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                            onClick={() => setSettingsView('audio')}
                          >
                            <div className="flex items-center gap-3">
                              <Volume2 className="h-5 w-5 text-white/60" />
                              <span>Âm thanh</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/50">
                              <span className="text-xs">{audioOptions.selectedValue}</span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </button>
                        )}

                        {/* Subtitles */}
                        {captionOptions.length > 1 && (
                          <button
                            type="button"
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                            onClick={() => setSettingsView('subtitles')}
                          >
                            <div className="flex items-center gap-3">
                              <MessageSquareText className="h-5 w-5 text-white/60" />
                              <span>Phụ đề</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/50">
                              <span className="text-xs">
                                {captionOptions.selectedValue || 'Tắt'}
                              </span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </button>
                        )}

                        <div className="my-1 border-t border-white/10" />

                        {/* Auto-advance */}
                        {hasNextEpisode && autoAdvance !== undefined && onAutoAdvanceChange && (
                          <button
                            type="button"
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                            onClick={() => onAutoAdvanceChange(!autoAdvance)}
                          >
                            <div className="flex items-center gap-3">
                              <SkipForward className="h-5 w-5 text-white/60" />
                              <span>Tự động chuyển tập</span>
                            </div>
                            <div
                              className={cn(
                                'h-4 w-8 rounded-full transition-colors',
                                autoAdvance ? 'bg-[#DFE104]' : 'bg-white/20',
                              )}
                            >
                              <div
                                className={cn(
                                  'h-4 w-4 rounded-full bg-white shadow transition-transform',
                                  autoAdvance && 'translate-x-4',
                                )}
                              />
                            </div>
                          </button>
                        )}

                        {/* Loop toggle */}
                        <button
                          type="button"
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => setLoopEnabled((prev) => !prev)}
                        >
                          <div className="flex items-center gap-3">
                            <Repeat className="h-5 w-5 text-white/60" />
                            <span>Vòng lặp</span>
                          </div>
                          <div
                            className={cn(
                              'h-4 w-8 rounded-full transition-colors',
                              loopEnabled ? 'bg-[#DFE104]' : 'bg-white/20',
                            )}
                          >
                            <div
                              className={cn(
                                'h-4 w-4 rounded-full bg-white shadow transition-transform',
                                loopEnabled && 'translate-x-4',
                              )}
                            />
                          </div>
                        </button>

                        {/* Screenshot */}
                        <button
                          type="button"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => {
                            takeScreenshot();
                            setSettingsView(null);
                          }}
                          disabled={!canInteract}
                        >
                          <Camera className="h-5 w-5 text-white/60" />
                          <span>Chụp ảnh màn hình</span>
                        </button>

                        {/* Keyboard shortcuts */}
                        <button
                          type="button"
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => setSettingsView('shortcuts')}
                        >
                          <div className="flex items-center gap-3">
                            <Keyboard className="h-5 w-5 text-white/60" />
                            <span>Phím tắt</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/50" />
                        </button>
                      </div>
                    )}

                    {/* ── Speed sub-view ── */}
                    {settingsView === 'speed' && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          <span>Tốc độ phát</span>
                        </button>
                        {playbackRateOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              'flex items-center gap-3 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10',
                              option.selected && 'text-white font-medium',
                            )}
                            onClick={() => {
                              option.select();
                              setSettingsView('main');
                            }}
                          >
                            <span className="w-5">
                              {option.selected && <Check className="h-4 w-4" />}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Quality sub-view ── */}
                    {settingsView === 'quality' && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          <span>Chất lượng</span>
                        </button>
                        {qualityOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              'flex items-center gap-3 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10',
                              option.selected && 'text-white font-medium',
                            )}
                            onClick={() => {
                              option.select();
                              setSettingsView('main');
                            }}
                          >
                            <span className="w-5">
                              {option.selected && <Check className="h-4 w-4" />}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Audio sub-view ── */}
                    {settingsView === 'audio' && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          <span>Âm thanh</span>
                        </button>
                        {audioOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              'flex items-center gap-3 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10',
                              option.selected && 'text-white font-medium',
                            )}
                            onClick={() => {
                              option.select();
                              setSettingsView('main');
                            }}
                          >
                            <span className="w-5">
                              {option.selected && <Check className="h-4 w-4" />}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Shortcuts sub-view ── */}
                    {settingsView === 'shortcuts' && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          <span>Phím tắt</span>
                        </button>
                        <div className="max-h-[300px] overflow-y-auto px-4 py-2">
                          {[
                            ['K / Space', 'Phát / Tạm dừng'],
                            ['M', 'Bật / Tắt tiếng'],
                            ['F', 'Toàn màn hình'],
                            ['T', 'Chế độ rạp'],
                            ['P', 'Picture-in-Picture'],
                            ['C', 'Bật / Tắt phụ đề'],
                            ['J / ←', 'Tập trước'],
                            ['L / →', 'Tập tiếp theo'],
                            ['↑ / ↓', 'Tăng / giảm âm lượng'],
                            ['R', 'Tải lại nguồn phát'],
                            ['Esc', 'Thoát chế độ rạp'],
                          ].map(([key, desc]) => (
                            <div key={key} className="flex items-center justify-between py-1.5">
                              <span className="text-xs text-white/60">{desc}</span>
                              <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/80">
                                {key}
                              </kbd>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Subtitles sub-view ── */}
                    {settingsView === 'subtitles' && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          <span>Phụ đề</span>
                        </button>
                        {captionOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              'flex items-center gap-3 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10',
                              option.selected && 'text-white font-medium',
                            )}
                            onClick={() => {
                              option.select();
                              setSettingsView('main');
                            }}
                          >
                            <span className="w-5">
                              {option.selected && <Check className="h-4 w-4" />}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Google Cast */}
            {canGoogleCast && (
              <GoogleCastButton
                className={cn(
                  YT_ICON_BTN,
                  'hidden sm:inline-flex',
                  isGoogleCastConnected && 'text-[#DFE104]',
                )}
                aria-label={isGoogleCastConnected ? 'Ngắt Google Cast' : 'Google Cast'}
                title={isGoogleCastConnected ? 'Ngắt Google Cast' : 'Google Cast'}
                disabled={!canInteract}
              >
                <Cast className="h-[20px] w-[20px]" />
              </GoogleCastButton>
            )}

            {/* PiP */}
            {canPictureInPicture && (
              <PIPButton
                className={cn(
                  YT_ICON_BTN,
                  'hidden sm:inline-flex',
                  pictureInPicture && 'text-white',
                )}
                aria-label="Trình phát thu nhỏ"
                title="Trình phát thu nhỏ (P)"
                disabled={!canInteract}
              >
                <MonitorPlay className="h-[22px] w-[22px]" />
              </PIPButton>
            )}

            {/* Theater mode */}
            <button
              type="button"
              className={cn(YT_ICON_BTN, isTheaterMode && 'text-[#DFE104]')}
              aria-label={isTheaterMode ? 'Thoát chế độ rạp' : 'Chế độ rạp'}
              title={isTheaterMode ? 'Thoát rạp (T)' : 'Chế độ rạp (T)'}
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
              }}
            >
              <LayoutPanelTop className="h-[20px] w-[20px]" />
            </button>

            {/* Fullscreen */}
            <FullscreenButton
              className={cn(YT_ICON_BTN, !canFullscreen && 'opacity-40 cursor-not-allowed')}
              aria-label="Toàn màn hình"
              title="Toàn màn hình (F)"
              disabled={!canFullscreen}
            >
              {fullscreen ? (
                <Minimize2 className="h-[22px] w-[22px]" />
              ) : (
                <Expand className="h-[22px] w-[22px]" />
              )}
            </FullscreenButton>
          </div>
        </Controls.Group>
      </Controls.Root>

      {/* ─── Right-click context menu ─── */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute z-[50] min-w-[280px] overflow-hidden rounded-xl bg-[#212121]/95 py-2 shadow-2xl backdrop-blur-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Loop */}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
              onClick={() => {
                setLoopEnabled((prev) => !prev);
                setContextMenu(null);
              }}
            >
              <Repeat className="h-5 w-5 text-white/60" />
              <span>Vòng lặp</span>
              {loopEnabled && <Check className="ml-auto h-4 w-4 text-white/70" />}
            </button>

            {/* PiP */}
            {canPictureInPicture && (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                onClick={() => {
                  if (pictureInPicture) {
                    player?.exitPictureInPicture();
                  } else {
                    player?.enterPictureInPicture();
                  }
                  setContextMenu(null);
                }}
              >
                <MonitorPlay className="h-5 w-5 text-white/60" />
                <span>Trình phát thu nhỏ</span>
              </button>
            )}

            {/* Copy video URL */}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
              onClick={() => {
                void copyToClipboard(window.location.href, 'Đã sao chép URL!');
                setContextMenu(null);
              }}
            >
              <Link2 className="h-5 w-5 text-white/60" />
              <span>Sao chép URL video</span>
            </button>

            {/* Copy video URL at current time */}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
              onClick={() => {
                const currentTime = player?.currentTime ? Math.floor(player.currentTime) : 0;
                const url = new URL(window.location.href);
                url.searchParams.set('t', String(currentTime));
                void copyToClipboard(url.toString(), 'Đã sao chép URL!');
                setContextMenu(null);
              }}
            >
              <Link2 className="h-5 w-5 text-white/60" />
              <span>Sao chép URL video trong thời gian hiện tại</span>
            </button>

            {/* Copy embed code */}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
              onClick={() => {
                const code = `<iframe src="${window.location.href}" frameborder="0" allowfullscreen></iframe>`;
                void copyToClipboard(code, 'Đã sao chép mã nhúng!');
                setContextMenu(null);
              }}
            >
              <Copy className="h-5 w-5 text-white/60" />
              <span>Sao chép mã nhúng</span>
            </button>

            <div className="my-1 border-t border-white/10" />

            {/* Embed fallback */}
            {allowFallback && onFallback && (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                onClick={() => {
                  onFallback();
                  setContextMenu(null);
                }}
              >
                <Server className="h-5 w-5 text-white/60" />
                <span>Nguồn dự phòng (Embed)</span>
              </button>
            )}

            {/* Screenshot */}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
              onClick={() => {
                takeScreenshot();
                setContextMenu(null);
              }}
            >
              <Camera className="h-5 w-5 text-white/60" />
              <span>Chụp ảnh màn hình</span>
            </button>

            {/* Stats */}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
              onClick={() => {
                setShowStats((prev) => !prev);
                setContextMenu(null);
              }}
            >
              <Info className="h-5 w-5 text-white/60" />
              <span>Thống kê chi tiết</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Stats overlay ─── */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-3 top-3 z-[30] max-w-xs rounded-lg bg-black/80 p-3 font-mono text-[11px] text-white/80 backdrop-blur-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-white">Thống kê chi tiết</span>
              <button
                type="button"
                className="text-white/50 transition-colors hover:text-white"
                onClick={() => setShowStats(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-0.5">
              <p>
                Quality: {activeQualityLabel || 'N/A'}
                {autoQuality ? ' (auto)' : ''}
              </p>
              <p>Speed: {playbackRate}x</p>
              <p>Volume: {Math.round(volume * 100)}%</p>
              <p>Buffer: {bufferedPercent.toFixed(1)}%</p>
              <p>Duration: {finiteDuration.toFixed(1)}s</p>
              <p>Stream: {streamType || 'unknown'}</p>
              <p>View: {viewType || 'unknown'}</p>
              <p>Pointer: {pointer}</p>
              {quality && <p>Codec: {quality.codec || 'N/A'}</p>}
              <p>Loop: {loopEnabled ? 'On' : 'Off'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Initial splash (play button center) ─── */}
      <AnimatePresence>
        {shouldShowInitialSplash && (
          <motion.div
            {...springOverlay}
            className="absolute inset-0 z-[3] flex items-center justify-center"
          >
            <button
              type="button"
              onClick={() => player?.play()}
              className="group flex h-[68px] w-[68px] items-center justify-center rounded-full bg-black/50 text-white transition-all duration-200 hover:scale-110 hover:bg-[#DFE104]/90 hover:text-[#09090B]"
              aria-label="Bắt đầu phát"
            >
              <Play className="h-8 w-8 translate-x-[2px] fill-white text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Remote playback overlay ─── */}
      <AnimatePresence>
        {isRemoteActive && (
          <motion.div
            {...springOverlay}
            className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-black/80 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
              {isGoogleCastConnected ? (
                <Tv className="h-8 w-8" />
              ) : (
                <MonitorPlay className="h-8 w-8" />
              )}
            </div>
            <p className="text-xs font-medium text-white/60">Đang phát trên {remoteLabel}</p>
            <p className="text-sm font-semibold text-white">{remoteDeviceName}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Loading / Error overlay ─── */}
      <AnimatePresence>
        {(waiting || error) && (
          <motion.div
            {...springOverlay}
            className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-black/50"
          >
            <Spinner.Root className="h-10 w-10 text-white">
              <Spinner.Track className="stroke-white/20" />
              <Spinner.TrackFill className="stroke-white" />
            </Spinner.Root>
            {error && <p className="text-xs font-medium text-white/80">Nguồn phát gặp lỗi</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Ended overlay ─── */}
      <AnimatePresence>
        {ended && !waiting && !error && (
          <motion.div
            {...springScale}
            className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-4 bg-black/70"
          >
            <button
              type="button"
              onClick={() => player?.play()}
              className="group flex flex-col items-center gap-3"
              aria-label="Phát lại video"
            >
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white/10 text-white transition-all duration-200 hover:scale-110 hover:bg-white/20">
                <RefreshCw className="h-8 w-8" />
              </div>
              <span className="text-sm font-medium text-white/90">Phát lại</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Autoplay error ─── */}
      {autoPlayError && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
          Autoplay bị chặn. Nhấn play để tiếp tục.
        </div>
      )}

      {/* ─── Copied / Screenshot feedback toast ─── */}
      <AnimatePresence>
        {copiedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-none absolute bottom-16 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-black/85 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm"
          >
            {copiedFeedback}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PlayerControlLayer;
