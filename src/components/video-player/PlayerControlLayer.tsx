import { cn } from '@/lib/utils';
import { ArrowClockwise as RefreshCw } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { Camera } from '@phosphor-icons/react/dist/ssr/Camera';
import { CaretDown as ChevronDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretRight as ChevronRight } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ChatText as MessageSquareText } from '@phosphor-icons/react/dist/ssr/ChatText';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { Copy } from '@phosphor-icons/react/dist/ssr/Copy';
import { Gauge } from '@phosphor-icons/react/dist/ssr/Gauge';
import { GearSix as Settings } from '@phosphor-icons/react/dist/ssr/GearSix';
import { Info } from '@phosphor-icons/react/dist/ssr/Info';
import { Keyboard } from '@phosphor-icons/react/dist/ssr/Keyboard';
import { LinkSimple as Link2 } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { MonitorPlay } from '@phosphor-icons/react/dist/ssr/MonitorPlay';
import { Repeat } from '@phosphor-icons/react/dist/ssr/Repeat';
import { SkipBack } from '@phosphor-icons/react/dist/ssr/SkipBack';
import { SkipForward } from '@phosphor-icons/react/dist/ssr/SkipForward';
import { SpeakerHigh as Volume2 } from '@phosphor-icons/react/dist/ssr/SpeakerHigh';
import { StackSimple as Server } from '@phosphor-icons/react/dist/ssr/StackSimple';
import { Television as Tv } from '@phosphor-icons/react/dist/ssr/Television';
import { X } from '@phosphor-icons/react/dist/ssr/X';
import {
  AirPlayButton,
  AudioGainSlider,
  Controls,
  FullscreenButton,
  Gesture,
  GoogleCastButton,
  MuteButton,
  PlayButton,
  Spinner,
  Time,
  TimeSlider,
  VolumeSlider,
  isGoogleCastProvider,
  useAudioOptions,
  useCaptionOptions,
  useMediaPlayer,
  useMediaStore,
  usePlaybackRateOptions,
  useVideoQualityOptions,
} from '@vidstack/react';
import { AnimatePresence, motion } from 'framer-motion';
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
  /** Source switch options for the current episode */
  sourceOptions?: PlayerSourceOption[];
  /** Switch to a selected source */
  onSourceChange?: (sourceName: string) => void;
};

export type PlayerSourceOption = {
  name: string;
  active: boolean;
  available: boolean;
  unavailableReason?: string;
};

type SharpIconProps = {
  className?: string;
};

const SHARP_STROKE_ICON =
  'h-[21px] w-[21px] stroke-current [stroke-linecap:square] [stroke-linejoin:miter] [stroke-width:1.7]';
const SHARP_FILL_ICON = 'h-[21px] w-[21px] fill-current';

const SharpPlayIcon = ({ className }: SharpIconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <polygon points="7,4 20,12 7,20" fill="currentColor" />
  </svg>
);

const SharpPauseIcon = ({ className }: SharpIconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="6" y="4" width="4" height="16" fill="currentColor" />
    <rect x="14" y="4" width="4" height="16" fill="currentColor" />
  </svg>
);

const SharpVolumeIcon = ({ className }: SharpIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
    <line x1="15.5" y1="8.5" x2="15.5" y2="15.5" />
    <line x1="19" y1="6.5" x2="19" y2="17.5" />
  </svg>
);

const SharpMutedIcon = ({ className }: SharpIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
    <line x1="15" y1="9" x2="22" y2="16" />
    <line x1="15" y1="16" x2="22" y2="9" />
  </svg>
);

const SharpFullscreenIcon = ({ className }: SharpIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <polyline points="3,9 3,3 9,3" />
    <polyline points="21,9 21,3 15,3" />
    <polyline points="3,15 3,21 9,21" />
    <polyline points="21,15 21,21 15,21" />
  </svg>
);

const SharpFullscreenExitIcon = ({ className }: SharpIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <polyline points="9,3 9,9 3,9" />
    <polyline points="15,3 15,9 21,9" />
    <polyline points="9,21 9,15 3,15" />
    <polyline points="15,21 15,15 21,15" />
  </svg>
);

const SharpEpisodesIcon = ({ className }: SharpIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="4" />
    <rect x="3" y="10" width="18" height="4" />
    <rect x="3" y="16" width="18" height="4" />
  </svg>
);

/* ── Brutalist player control primitives ── */
const BRUTAL_ICON_BTN =
  'inline-flex h-12 shrink-0 items-center justify-center border-r border-[#3F3F46] px-5 text-[#FAFAFA] transition-none hover:bg-[#DFE104] hover:text-[#09090B] focus-visible:outline-none focus-visible:bg-[#DFE104] focus-visible:text-[#09090B] disabled:cursor-not-allowed disabled:text-[#71717A] disabled:hover:bg-transparent disabled:hover:text-[#71717A]';
const BRUTAL_SERVER_BADGE =
  'inline-flex h-12 max-w-[220px] items-center gap-2 border-l border-[#3F3F46] border-r border-[#3F3F46] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#A1A1AA] transition-none hover:bg-[#DFE104] hover:text-[#09090B] focus-visible:outline-none focus-visible:bg-[#DFE104] focus-visible:text-[#09090B]';
const BRUTAL_TIMECODE =
  'flex h-12 items-center border-r border-[#3F3F46] px-6 text-[15px] font-bold tracking-[-0.02em] tabular-nums text-[#FAFAFA]';
const BRUTAL_TOP_ICON_BTN =
  'inline-flex h-9 w-9 items-center justify-center border border-[#3F3F46] bg-[#09090B]/58 text-[#A1A1AA] shadow-[0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-xl backdrop-saturate-150 transition-none hover:bg-[#DFE104] hover:text-[#09090B] focus-visible:outline-none focus-visible:bg-[#DFE104] focus-visible:text-[#09090B] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#09090B]/58 disabled:hover:text-[#A1A1AA]';
const PLAYER_GLASS_BAR =
  'bg-[#09090B]/56 shadow-[0_-12px_32px_rgba(0,0,0,0.28)] backdrop-blur-[18px] backdrop-saturate-150';
const DESKTOP_CONTROLS_HIDE_DELAY = 900;
const TOUCH_CONTROLS_HIDE_DELAY = 1800;
const TOUCH_ICON_BTN = 'h-11 min-w-11 px-2.5';
const TOUCH_ICON_ONLY_BTN = 'h-11 w-11 px-0';
const TOUCH_FILL_ICON = 'h-[13px] w-[13px]';
const TOUCH_STROKE_ICON = 'h-[15px] w-[15px] [stroke-width:1.85]';

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
type SettingsView =
  | 'main'
  | 'source'
  | 'speed'
  | 'quality'
  | 'audio'
  | 'audio-gain'
  | 'subtitles'
  | 'shortcuts'
  | null;
const CONTEXT_MENU_EDGE_PADDING = 8;

const clamp = (value: number, min: number, max: number) => {
  if (max <= min) return min;
  return Math.min(Math.max(value, min), max);
};

/* ═══════════════════════════════════════════════════════════════════════════ */

const PlayerControlLayer: React.FC<PlayerControlLayerProps> = ({
  allowFallback,
  onFallback,
  episodeLabel,
  sourceLabel,
  serverName,
  hasNextEpisode,
  autoAdvance,
  onAutoAdvanceChange,
  sourceOptions,
  onSourceChange,
}) => {
  /* ── Local state ── */
  const [contextMenu, setContextMenu] = useState<ContextMenuPos>(null);
  const [settingsView, setSettingsView] = useState<SettingsView>(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [clickIndicator, setClickIndicator] = useState<'play' | 'pause' | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);
  const [desktopControlsVisible, setDesktopControlsVisible] = useState(true);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [isVolumeHoverOpen, setIsVolumeHoverOpen] = useState(false);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const desktopHideTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

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
    canFullscreen,
    playbackRate,
    live,
    liveEdge,
    bufferedEnd,
    duration,
    quality,
    qualities,
    autoQuality,
    canSetPlaybackRate,
    canSetQuality,
    canSetVolume,
    canSetAudioGain,
    canAirPlay,
    canGoogleCast,
    audioGain,
    remotePlaybackState,
    remotePlaybackType,
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
  const canInteract = !error;
  const canSwitchSources = Boolean(onSourceChange && (sourceOptions?.length ?? 0) > 1);
  const activeSource = sourceOptions?.find((option) => option.active);
  const sourceMenuLabel = activeSource?.name || serverName || 'Nguồn phát';
  const hasSourceBadge = Boolean(activeSource?.name || serverName);
  const canUseGoogleCast = canGoogleCast || isGoogleCastConnected;
  const canUseAirPlay = canAirPlay || isAirPlayConnected;

  const finiteDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const bufferedPercent = finiteDuration
    ? Math.max(0, Math.min(100, (bufferedEnd / finiteDuration) * 100))
    : 0;

  const shouldShowInitialSplash = !error && !isRemoteActive && !started && paused;
  const activeQualityLabel =
    quality?.height && Number.isFinite(quality.height) ? `${quality.height}p` : null;

  const isMuted = muted || volume === 0;
  const audioGainMultiplier = audioGain == null ? 1 : audioGain > 10 ? audioGain / 100 : audioGain;
  const audioGainPercent = Math.round(audioGainMultiplier * 100);
  const isTouchUI = pointer === 'coarse';
  const isCompactViewport = isTouchUI || isNarrowViewport;
  const controlsHideDelay = isTouchUI ? TOUCH_CONTROLS_HIDE_DELAY : DESKTOP_CONTROLS_HIDE_DELAY;
  const useCompactControls = isCompactViewport || isRemoteActive;
  const showInlineVolumeControl = !isCompactViewport || isRemoteActive;
  const showCompactSeekButtons = isCompactViewport && !isRemoteActive;
  const showVolumeHoverSlider = canSetVolume && !isTouchUI;
  const shouldForceControlsVisible =
    isTouchUI || paused || waiting || seeking || ended || Boolean(settingsView || isSourceMenuOpen);
  const googleCastState =
    remotePlaybackType === 'google-cast'
      ? remotePlaybackState
      : isGoogleCastConnected
        ? 'connected'
        : 'disconnected';
  const airPlayState =
    remotePlaybackType === 'airplay'
      ? remotePlaybackState
      : isAirPlayConnected
        ? 'connected'
        : 'disconnected';

  const getRemoteStateLabel = useCallback(
    (type: 'google-cast' | 'airplay', state: string) => {
      if (state === 'connecting') return 'Đang kết nối...';
      if (state === 'connected') {
        return type === 'google-cast' ? remoteDeviceName : 'Đã kết nối';
      }
      return 'Sẵn sàng';
    },
    [remoteDeviceName],
  );

  /* ── Click indicator animation (brief play/pause ripple) ── */
  useEffect(() => {
    if (clickIndicator) {
      const timer = setTimeout(() => setClickIndicator(null), 600);
      return () => clearTimeout(timer);
    }
  }, [clickIndicator]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const updateViewport = () => setIsNarrowViewport(mediaQuery.matches);
    updateViewport();

    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

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

  const clearDesktopHideTimer = useCallback(() => {
    if (desktopHideTimerRef.current !== null) {
      window.clearTimeout(desktopHideTimerRef.current);
      desktopHideTimerRef.current = null;
    }
  }, []);

  const hideDesktopControls = useCallback(() => {
    clearDesktopHideTimer();
    if (shouldForceControlsVisible) {
      setDesktopControlsVisible(true);
      return;
    }
    setDesktopControlsVisible(false);
  }, [clearDesktopHideTimer, shouldForceControlsVisible]);

  const showDesktopControls = useCallback(
    (delay = controlsHideDelay) => {
      clearDesktopHideTimer();
      setDesktopControlsVisible(true);
      if (shouldForceControlsVisible) return;
      desktopHideTimerRef.current = window.setTimeout(() => {
        setDesktopControlsVisible(false);
      }, delay);
    },
    [clearDesktopHideTimer, controlsHideDelay, shouldForceControlsVisible],
  );

  // Keep controls pinned while source/settings menu is open.
  useEffect(() => {
    if (!player) return;
    const shouldPauseControls = Boolean(settingsView || isSourceMenuOpen);
    if (shouldPauseControls) {
      player.remote?.pauseControls?.();
      return;
    }
    player.remote?.resumeControls?.();
  }, [player, settingsView, isSourceMenuOpen]);

  useEffect(() => {
    if (!desktopControlsVisible && isVolumeHoverOpen) {
      setIsVolumeHoverOpen(false);
    }
  }, [desktopControlsVisible, isVolumeHoverOpen]);

  useEffect(() => {
    if (shouldForceControlsVisible) {
      clearDesktopHideTimer();
      setDesktopControlsVisible(true);
      return;
    }
    showDesktopControls();
    return clearDesktopHideTimer;
  }, [clearDesktopHideTimer, shouldForceControlsVisible, showDesktopControls]);

  useEffect(() => {
    if (isTouchUI) {
      clearDesktopHideTimer();
      setDesktopControlsVisible(true);
      return;
    }

    const playerEl = player?.el;
    if (!playerEl) return;

    const handlePointerMove = () => {
      showDesktopControls();
    };

    const handlePointerDown = () => {
      showDesktopControls();
    };

    const handlePointerLeave = () => {
      hideDesktopControls();
    };

    const handleFocusIn = () => {
      clearDesktopHideTimer();
      setDesktopControlsVisible(true);
    };

    const handleFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && playerEl.contains(next)) return;
      if (shouldForceControlsVisible) {
        setDesktopControlsVisible(true);
        return;
      }
      showDesktopControls();
    };

    playerEl.addEventListener('pointermove', handlePointerMove, { passive: true });
    playerEl.addEventListener('pointerdown', handlePointerDown, { passive: true });
    playerEl.addEventListener('pointerleave', handlePointerLeave);
    playerEl.addEventListener('focusin', handleFocusIn);
    playerEl.addEventListener('focusout', handleFocusOut);

    return () => {
      playerEl.removeEventListener('pointermove', handlePointerMove);
      playerEl.removeEventListener('pointerdown', handlePointerDown);
      playerEl.removeEventListener('pointerleave', handlePointerLeave);
      playerEl.removeEventListener('focusin', handleFocusIn);
      playerEl.removeEventListener('focusout', handleFocusOut);
    };
  }, [
    clearDesktopHideTimer,
    hideDesktopControls,
    isTouchUI,
    player,
    shouldForceControlsVisible,
    showDesktopControls,
  ]);

  useEffect(() => clearDesktopHideTimer, [clearDesktopHideTimer]);

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

  useEffect(() => {
    if (!contextMenu) return;
    const playerEl = player?.el;
    const menuEl = contextMenuRef.current;
    if (!playerEl || !menuEl) return;

    const frameId = window.requestAnimationFrame(() => {
      const playerRect = playerEl.getBoundingClientRect();
      const menuRect = menuEl.getBoundingClientRect();
      const maxX = Math.max(
        CONTEXT_MENU_EDGE_PADDING,
        playerRect.width - menuRect.width - CONTEXT_MENU_EDGE_PADDING,
      );
      const maxY = Math.max(
        CONTEXT_MENU_EDGE_PADDING,
        playerRect.height - menuRect.height - CONTEXT_MENU_EDGE_PADDING,
      );
      const x = clamp(contextMenu.x, CONTEXT_MENU_EDGE_PADDING, maxX);
      const y = clamp(contextMenu.y, CONTEXT_MENU_EDGE_PADDING, maxY);

      if (Math.abs(x - contextMenu.x) > 0.5 || Math.abs(y - contextMenu.y) > 0.5) {
        setContextMenu({ x, y });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [contextMenu, player]);

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

  useEffect(() => {
    if (!isSourceMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target as Node)) {
        setIsSourceMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSourceMenuOpen(false);
    };
    window.addEventListener('click', handleClick, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isSourceMenuOpen]);

  useEffect(() => {
    if (canSwitchSources) return;
    setIsSourceMenuOpen(false);
  }, [canSwitchSources]);

  const copyToClipboard = useCallback(async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFeedback(label || 'Đã sao chép!');
      setTimeout(() => setCopiedFeedback(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const requestGoogleCast = useCallback(async () => {
    if (!player || !canGoogleCast) return;
    try {
      await player.requestGoogleCast();
    } catch {
      setCopiedFeedback('Không thể mở Google Cast.');
      setTimeout(() => setCopiedFeedback(null), 2500);
    }
  }, [player, canGoogleCast]);

  const requestAirPlay = useCallback(async () => {
    if (!player || !canAirPlay) return;
    try {
      await player.requestAirPlay();
    } catch {
      setCopiedFeedback('Không thể mở AirPlay.');
      setTimeout(() => setCopiedFeedback(null), 2500);
    }
  }, [player, canAirPlay]);

  const seekBySeconds = useCallback(
    (deltaSeconds: number) => {
      if (!player || !Number.isFinite(deltaSeconds) || deltaSeconds === 0) return;

      const currentTime = Number.isFinite(player.currentTime) ? player.currentTime : 0;
      const maxTime =
        finiteDuration > 0 ? finiteDuration : Math.max(currentTime + deltaSeconds, currentTime, 0);
      const nextTime = clamp(currentTime + deltaSeconds, 0, maxTime);

      const remoteApi = player.remote as unknown as { seek?: (time: number) => void };
      if (typeof remoteApi?.seek === 'function') {
        remoteApi.seek(nextTime);
        return;
      }

      player.currentTime = nextTime;
    },
    [player, finiteDuration],
  );

  const disconnectRemotePlayback = useCallback(() => {
    if (!player) return;

    const provider = player.provider;
    if (isGoogleCastProvider(provider)) {
      try {
        provider.cast?.endCurrentSession?.(true);
        setCopiedFeedback('Đã ngắt Google Cast.');
        setTimeout(() => setCopiedFeedback(null), 2000);
      } catch {
        setCopiedFeedback('Không thể ngắt Google Cast lúc này.');
        setTimeout(() => setCopiedFeedback(null), 2500);
      }
      return;
    }

    if (isAirPlayConnected) {
      const videoEl = player.el?.querySelector('video');
      const airPlayVideo = videoEl as
        | (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void })
        | null;

      if (typeof airPlayVideo?.webkitShowPlaybackTargetPicker === 'function') {
        airPlayVideo.webkitShowPlaybackTargetPicker();
        setCopiedFeedback('Mở AirPlay picker. Chọn thiết bị hiện tại để ngắt.');
      } else {
        setCopiedFeedback('Hãy ngắt AirPlay từ thiết bị phát hoặc Control Center.');
      }
      setTimeout(() => setCopiedFeedback(null), 2800);
    }
  }, [player, isAirPlayConnected]);

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
            <div className="flex h-14 w-14 items-center justify-center border border-[#3F3F46] bg-[#09090B]/90 text-[#FAFAFA] backdrop-blur-sm">
              {clickIndicator === 'play' ? (
                <SharpPlayIcon className={SHARP_FILL_ICON} />
              ) : (
                <SharpPauseIcon className={SHARP_FILL_ICON} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Controls overlay ─── */}
      <Controls.Root
        hideDelay={controlsHideDelay}
        hideOnMouseLeave
        className={cn(
          'absolute inset-0 z-[2] flex flex-col justify-end pointer-events-none',
          'opacity-0 transition-opacity duration-200',
          (shouldForceControlsVisible || desktopControlsVisible) && 'opacity-100',
        )}
      >
        {/* Top gradient */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#09090B]/72 via-[#09090B]/38 to-transparent" />

        {/* ─── Top info bar ─── */}
        {/* {(episodeLabel || sourceLabel || serverName) && (
          <Controls.Group className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-3 pt-3">
            {episodeLabel && (
              <p className="min-w-0 max-w-[min(70vw,34rem)] truncate border border-[#3F3F46] bg-[#09090B]/85 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#FAFAFA] backdrop-blur-md sm:text-[13px]">
                {episodeLabel}
              </p>
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              {sourceLabel && (
                <span className="hidden border border-[#3F3F46] bg-[#09090B]/85 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A1A1AA] backdrop-blur-md sm:inline-flex">
                  {sourceLabel}
                </span>
              )}
              {hasSourceBadge && (
                <span className="hidden border border-[#3F3F46] bg-[#09090B]/85 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A1A1AA] backdrop-blur-md sm:inline-flex">
                  #{sourceMenuLabel}
                </span>
              )}
            </div>
          </Controls.Group>
        )} */}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#09090B]/76 via-[#09090B]/34 to-transparent" />

        {/* Top-right quick actions (remote playback) */}
        {(canUseGoogleCast || canUseAirPlay) && !isRemoteActive && (
          <Controls.Group className="pointer-events-auto absolute right-3 top-3 z-10 flex items-center gap-1.5">
            {canUseGoogleCast && (
              <div onPointerUp={(event) => event.stopPropagation()}>
                <GoogleCastButton
                  className={cn(
                    BRUTAL_TOP_ICON_BTN,
                    googleCastState === 'connected' &&
                      'border-[#DFE104] bg-[#DFE104] text-[#09090B]',
                    googleCastState === 'connecting' && 'animate-pulse text-[#FAFAFA]',
                  )}
                  disabled={!canGoogleCast || googleCastState === 'connecting'}
                  aria-label="Google Cast"
                  title={`Google Cast • ${getRemoteStateLabel('google-cast', googleCastState)}`}
                >
                  <Tv className="h-[18px] w-[18px]" />
                </GoogleCastButton>
              </div>
            )}

            {canUseAirPlay && (
              <div onPointerUp={(event) => event.stopPropagation()}>
                <AirPlayButton
                  className={cn(
                    BRUTAL_TOP_ICON_BTN,
                    airPlayState === 'connected' && 'border-[#DFE104] bg-[#DFE104] text-[#09090B]',
                    airPlayState === 'connecting' && 'animate-pulse text-[#FAFAFA]',
                  )}
                  disabled={!canAirPlay || airPlayState === 'connecting'}
                  aria-label="AirPlay"
                  title={`AirPlay • ${getRemoteStateLabel('airplay', airPlayState)}`}
                >
                  <MonitorPlay className="h-[18px] w-[18px]" />
                </AirPlayButton>
              </div>
            )}
          </Controls.Group>
        )}

        {/* Live badge (top-left) */}
        {live && (
          <div className="pointer-events-auto absolute left-3 top-3 z-10 flex items-center gap-1.5 border border-[#3F3F46] bg-[#09090B]/58 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] shadow-[0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-xl backdrop-saturate-150">
            <span
              className={cn('h-1.5 w-1.5', liveEdge ? 'bg-red-500 animate-pulse' : 'bg-gray-500')}
            />
            <span className={cn(liveEdge ? 'text-red-500' : 'text-[#71717A]')}>TRỰC TIẾP</span>
          </div>
        )}

        {/* ─── Progress bar (Brutalist blade) ─── */}
        <Controls.Group className="pointer-events-auto relative z-10 w-full border-t border-[#3F3F46]">
          {seeking && (
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full border border-[#3F3F46] bg-[#09090B]/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FAFAFA] backdrop-blur-md">
              Đang tải
            </div>
          )}
          <TimeSlider.Root
            className={cn(
              'group/time relative flex w-full cursor-pointer transition-[height] duration-150',
              isTouchUI
                ? 'h-4 items-center py-[5px] data-[dragging]:h-4'
                : 'h-[3px] items-stretch hover:h-[10px] data-[dragging]:h-[10px]',
              !canInteract && 'pointer-events-none opacity-60',
            )}
          >
            <TimeSlider.Track
              className={cn(
                'relative w-full overflow-hidden bg-white/20',
                isTouchUI ? 'h-[4px] rounded-full' : 'h-full',
              )}
            >
              {/* Buffered */}
              <TimeSlider.Progress
                className={cn('absolute inset-y-0 left-0 bg-white/35', isTouchUI && 'rounded-full')}
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Played – accent yellow */}
              <TimeSlider.TrackFill
                className={cn(
                  'absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]',
                  isTouchUI && 'rounded-full',
                )}
              />
            </TimeSlider.Track>
            <TimeSlider.Thumb
              className={cn(
                'pointer-events-none absolute left-[var(--slider-fill)] top-1/2 z-[3] block -translate-x-1/2 -translate-y-1/2 transition-[opacity,width,height] duration-150',
                isTouchUI
                  ? 'h-[10px] w-[10px] rounded-full border border-[#09090B] bg-[#FAFAFA] opacity-0 shadow-[0_0_0_2px_rgba(223,225,4,0.35)] group-data-[active]/time:opacity-100 group-data-[dragging]/time:opacity-100'
                  : 'h-[12px] w-[2px] bg-[#FAFAFA] opacity-0 shadow-[0_0_10px_rgba(223,225,4,0.5)] group-hover/time:w-[4px] group-hover/time:opacity-100 group-data-[active]/time:w-[4px] group-data-[active]/time:opacity-100 group-data-[dragging]/time:w-[4px] group-data-[dragging]/time:opacity-100',
              )}
            />
          </TimeSlider.Root>
        </Controls.Group>

        {/* ─── Control buttons row ─── */}
        <Controls.Group className="pointer-events-auto relative z-10">
          <div
            className={cn(
              'flex items-stretch overflow-hidden',
              PLAYER_GLASS_BAR,
              useCompactControls ? 'h-11' : 'h-12',
            )}
          >
            <div className="flex min-w-0 items-stretch">
              {/* Play / Pause */}
              <PlayButton
                className={cn(BRUTAL_ICON_BTN, useCompactControls && TOUCH_ICON_BTN)}
                aria-label="Phát hoặc tạm dừng"
                title="Phát/Tạm dừng (K)"
                disabled={!canInteract}
              >
                {paused ? (
                  <SharpPlayIcon
                    className={cn(SHARP_FILL_ICON, useCompactControls && TOUCH_FILL_ICON)}
                  />
                ) : (
                  <SharpPauseIcon
                    className={cn(SHARP_FILL_ICON, useCompactControls && TOUCH_FILL_ICON)}
                  />
                )}
              </PlayButton>

              {showCompactSeekButtons && (
                <>
                  <button
                    type="button"
                    className={cn(BRUTAL_ICON_BTN, TOUCH_ICON_BTN)}
                    aria-label="Lùi 10 giây"
                    title="Lùi 10 giây"
                    onClick={() => seekBySeconds(-10)}
                    disabled={!canInteract}
                  >
                    <SkipBack className="h-[15px] w-[15px]" />
                  </button>
                  <button
                    type="button"
                    className={cn(BRUTAL_ICON_BTN, TOUCH_ICON_BTN)}
                    aria-label="Tiến 10 giây"
                    title="Tiến 10 giây"
                    onClick={() => seekBySeconds(10)}
                    disabled={!canInteract}
                  >
                    <SkipForward className="h-[15px] w-[15px]" />
                  </button>
                </>
              )}

              {isRemoteActive && (
                <>
                  <button
                    type="button"
                    className={cn(BRUTAL_ICON_BTN, 'h-10 px-3')}
                    aria-label="Lùi 10 giây"
                    title="Lùi 10 giây"
                    onClick={() => seekBySeconds(-10)}
                    disabled={!canInteract}
                  >
                    <SkipBack className="h-[16px] w-[16px]" />
                  </button>
                  <button
                    type="button"
                    className={cn(BRUTAL_ICON_BTN, 'h-10 px-3')}
                    aria-label="Tiến 10 giây"
                    title="Tiến 10 giây"
                    onClick={() => seekBySeconds(10)}
                    disabled={!canInteract}
                  >
                    <SkipForward className="h-[16px] w-[16px]" />
                  </button>
                </>
              )}

              {showInlineVolumeControl && (
                <div
                  className={cn(
                    'group/volume flex items-stretch border-r border-[#3F3F46] bg-transparent',
                    useCompactControls ? 'h-11' : 'h-12',
                    showVolumeHoverSlider && 'w-[56px] transition-[width] duration-200 ease-out',
                    showVolumeHoverSlider &&
                      'hover:w-[210px] focus-within:w-[210px] data-[open=true]:w-[210px]',
                  )}
                  data-open={isVolumeHoverOpen}
                  onPointerEnter={() => {
                    if (showVolumeHoverSlider) setIsVolumeHoverOpen(true);
                  }}
                  onPointerLeave={() => setIsVolumeHoverOpen(false)}
                  onFocusCapture={() => {
                    if (showVolumeHoverSlider) setIsVolumeHoverOpen(true);
                  }}
                  onBlurCapture={(event) => {
                    const next = event.relatedTarget;
                    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
                      setIsVolumeHoverOpen(false);
                    }
                  }}
                >
                  <MuteButton
                    className={cn(
                      'inline-flex h-12 w-[56px] shrink-0 items-center justify-center text-[#FAFAFA] transition-none hover:bg-[#DFE104] hover:text-[#09090B] focus-visible:outline-none focus-visible:bg-[#DFE104] focus-visible:text-[#09090B] disabled:cursor-not-allowed disabled:text-[#71717A] disabled:hover:bg-transparent disabled:hover:text-[#71717A]',
                      useCompactControls && TOUCH_ICON_ONLY_BTN,
                      showVolumeHoverSlider && 'border-r border-[#3F3F46]',
                    )}
                    aria-label="Bật hoặc tắt tiếng"
                    title="Tắt tiếng (M)"
                    disabled={!canInteract}
                  >
                    {isMuted ? (
                      <SharpMutedIcon
                        className={cn(SHARP_STROKE_ICON, useCompactControls && TOUCH_STROKE_ICON)}
                      />
                    ) : (
                      <SharpVolumeIcon
                        className={cn(SHARP_STROKE_ICON, useCompactControls && TOUCH_STROKE_ICON)}
                      />
                    )}
                  </MuteButton>

                  {showVolumeHoverSlider && (
                    <div
                      className={cn(
                        'flex min-w-0 flex-1 items-center overflow-hidden px-0 opacity-0 transition-[opacity,padding] duration-150',
                        'group-hover/volume:px-3 group-hover/volume:opacity-100',
                        'group-focus-within/volume:px-3 group-focus-within/volume:opacity-100',
                      )}
                    >
                      <VolumeSlider.Root
                        className={cn(
                          'group/volslider relative flex h-4 min-w-0 w-full cursor-pointer items-center',
                          !canInteract && 'pointer-events-none opacity-60',
                        )}
                      >
                        <VolumeSlider.Track className="relative h-[3px] w-full bg-white/20">
                          <VolumeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]" />
                        </VolumeSlider.Track>
                        <VolumeSlider.Thumb className="absolute left-[var(--slider-fill)] top-1/2 block h-[11px] w-[3px] -translate-x-1/2 -translate-y-1/2 bg-[#FAFAFA] opacity-0 shadow-[0_0_10px_rgba(223,225,4,0.5)] transition-[opacity,width] duration-150 group-hover/volslider:w-[4px] group-hover/volslider:opacity-100 group-data-[active]/volslider:w-[4px] group-data-[active]/volslider:opacity-100 group-data-[dragging]/volslider:w-[4px] group-data-[dragging]/volslider:opacity-100" />
                      </VolumeSlider.Root>
                    </div>
                  )}
                </div>
              )}

              {/* Time display */}
              <div
                className={cn(
                  BRUTAL_TIMECODE,
                  useCompactControls &&
                    'h-11 min-w-0 border-r-0 px-1.5 text-[12px] tracking-[-0.01em]',
                )}
              >
                <Time type="current" className="inline" />
                <span
                  className={cn(
                    'px-2.5 text-[#3F3F46]',
                    isCompactViewport && 'hidden px-1.5 min-[390px]:inline',
                  )}
                >
                  /
                </span>
                <Time
                  type="duration"
                  className={cn(
                    'inline text-[#A1A1AA]',
                    isCompactViewport && 'hidden min-[390px]:inline',
                  )}
                />
              </div>
            </div>

            <div className="flex-1" />

            {/* Right side */}
            <div className="flex shrink-0 items-stretch">
              {isRemoteActive ? (
                <>
                  <span className="hidden h-10 max-w-[220px] items-center border-l border-r border-[#3F3F46] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#A1A1AA] sm:inline-flex">
                    {remoteLabel}: {remoteDeviceName}
                  </span>

                  {isGoogleCastConnected && (
                    <div onPointerUp={(event) => event.stopPropagation()}>
                      <GoogleCastButton
                        className={cn(
                          BRUTAL_ICON_BTN,
                          'h-10 border-r-0 border-l border-[#3F3F46] px-3',
                        )}
                        disabled={!canGoogleCast || googleCastState === 'connecting'}
                        aria-label="Google Cast"
                        title={`Google Cast • ${getRemoteStateLabel('google-cast', googleCastState)}`}
                      >
                        <Tv className="h-[16px] w-[16px]" />
                      </GoogleCastButton>
                    </div>
                  )}

                  {isAirPlayConnected && (
                    <div onPointerUp={(event) => event.stopPropagation()}>
                      <AirPlayButton
                        className={cn(
                          BRUTAL_ICON_BTN,
                          'h-10 border-r-0 border-l border-[#3F3F46] px-3',
                        )}
                        disabled={!canAirPlay || airPlayState === 'connecting'}
                        aria-label="AirPlay"
                        title={`AirPlay • ${getRemoteStateLabel('airplay', airPlayState)}`}
                      >
                        <MonitorPlay className="h-[16px] w-[16px]" />
                      </AirPlayButton>
                    </div>
                  )}

                  <button
                    type="button"
                    className={cn(
                      BRUTAL_ICON_BTN,
                      'h-10 border-r-0 border-l border-[#3F3F46] px-3 text-[#FAFAFA]',
                    )}
                    aria-label={isGoogleCastConnected ? 'Ngắt Google Cast' : 'Ngắt AirPlay'}
                    title={isGoogleCastConnected ? 'Ngắt Google Cast' : 'Ngắt AirPlay'}
                    onClick={disconnectRemotePlayback}
                  >
                    <X className="h-[15px] w-[15px] shrink-0" />
                    <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:inline">
                      Ngắt
                    </span>
                  </button>
                </>
              ) : canSwitchSources && !isCompactViewport ? (
                <div className="relative" ref={sourceMenuRef}>
                  <button
                    type="button"
                    className={cn(
                      BRUTAL_SERVER_BADGE,
                      isCompactViewport &&
                        `${TOUCH_ICON_ONLY_BTN} justify-center border-l border-r`,
                      isSourceMenuOpen && 'bg-[#DFE104] text-[#09090B]',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettingsView(null);
                      setIsSourceMenuOpen((prev) => !prev);
                    }}
                    aria-expanded={isSourceMenuOpen}
                    aria-label="Đổi nguồn phát"
                    title="Đổi nguồn phát"
                  >
                    {isCompactViewport ? (
                      <Server className="h-[15px] w-[15px]" />
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 shrink-0 bg-current opacity-85" />
                        <span className="truncate">#{sourceMenuLabel}</span>
                        <ChevronDown
                          className={cn('h-3 w-3 shrink-0', isSourceMenuOpen && 'rotate-180')}
                        />
                      </>
                    )}
                  </button>
                  <AnimatePresence>
                    {isSourceMenuOpen && sourceOptions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          'absolute bottom-[calc(100%+4px)] right-0 z-30 min-w-[220px] overflow-hidden border border-[#3F3F46] bg-[#09090B]/95 py-1 shadow-2xl backdrop-blur-md',
                          isCompactViewport && 'w-[min(18rem,calc(100vw-24px))] min-w-0',
                        )}
                      >
                        {sourceOptions.map((source) => {
                          const isDisabled = !source.available || source.active;
                          return (
                            <button
                              key={source.name}
                              type="button"
                              disabled={isDisabled}
                              className={cn(
                                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] transition-none',
                                source.active
                                  ? 'bg-[#DFE104]/12 text-[#DFE104]'
                                  : 'text-[#FAFAFA] hover:bg-[#DFE104] hover:text-[#09090B]',
                                !source.available &&
                                  'cursor-not-allowed text-[#71717A] hover:bg-transparent hover:text-[#71717A]',
                              )}
                              onClick={() => {
                                if (isDisabled || !onSourceChange) return;
                                onSourceChange(source.name);
                                setIsSourceMenuOpen(false);
                              }}
                            >
                              <div className="min-w-0">
                                <p className="truncate">{source.name}</p>
                                {!source.available && (
                                  <p className="mt-0.5 truncate text-[10px] font-medium normal-case tracking-normal text-[#71717A]">
                                    {source.unavailableReason || 'Chưa có tập này'}
                                  </p>
                                )}
                              </div>
                              {source.active && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                hasSourceBadge &&
                !isCompactViewport && (
                  <span className="inline-flex h-12 max-w-[220px] items-center gap-2 border-l border-[#3F3F46] border-r border-[#3F3F46] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#A1A1AA]">
                    <span className="h-1.5 w-1.5 shrink-0 bg-current opacity-85" />
                    <span className="truncate">#{sourceMenuLabel}</span>
                  </span>
                )
              )}

              <button
                type="button"
                className={cn(
                  BRUTAL_ICON_BTN,
                  'hidden border-r-0 border-l border-[#3F3F46] sm:inline-flex',
                )}
                aria-label="Chọn tập"
                title="Danh sách tập"
                onClick={() => {
                  document.getElementById('episode-selection')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
              >
                <SharpEpisodesIcon className={SHARP_STROKE_ICON} />
              </button>

              {/* Settings gear */}
              <div className="relative" ref={settingsRef}>
                <button
                  type="button"
                  className={cn(
                    BRUTAL_ICON_BTN,
                    'border-r-0 border-l border-[#3F3F46]',
                    isCompactViewport && TOUCH_ICON_BTN,
                    settingsView && 'bg-[#DFE104] text-[#09090B]',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSourceMenuOpen(false);
                    setSettingsView((prev) => (prev ? null : 'main'));
                  }}
                  aria-label="Cài đặt"
                  title="Cài đặt"
                  disabled={!canInteract}
                >
                  <Settings
                    className={cn(
                      'h-[20px] w-[20px]',
                      isCompactViewport && 'h-[15px] w-[15px]',
                      settingsView ? 'text-[#09090B]' : 'text-[#FAFAFA]',
                    )}
                    weight="regular"
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
                      className="absolute bottom-[calc(100%+4px)] right-0 z-20 min-w-[260px] overflow-hidden border border-[#3F3F46] bg-[#09090B]/95 py-2 shadow-2xl backdrop-blur-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* ── Main view ── */}
                      {settingsView === 'main' && (
                        <div className="flex flex-col">
                          {isCompactViewport && canSwitchSources && (
                            <button
                              type="button"
                              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10"
                              onClick={() => setSettingsView('source')}
                            >
                              <div className="flex items-center gap-3">
                                <Server className="h-5 w-5 text-white/60" />
                                <span>Nguồn phát</span>
                              </div>
                              <div className="flex items-center gap-1 text-white/50">
                                <span className="max-w-[8rem] truncate text-xs">
                                  {sourceMenuLabel}
                                </span>
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            </button>
                          )}

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

                          {/* Audio gain */}

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

                          {(canUseGoogleCast || canUseAirPlay) && (
                            <>
                              <div className="my-1 border-t border-white/10" />

                              {canUseGoogleCast && (
                                <button
                                  type="button"
                                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                                  onClick={() => {
                                    void requestGoogleCast();
                                  }}
                                  disabled={!canGoogleCast || googleCastState === 'connecting'}
                                >
                                  <div className="flex items-center gap-3">
                                    <Tv className="h-5 w-5 text-white/60" />
                                    <span>Google Cast</span>
                                  </div>
                                  <span className="text-xs text-white/50">
                                    {getRemoteStateLabel('google-cast', googleCastState)}
                                  </span>
                                </button>
                              )}

                              {canUseAirPlay && (
                                <button
                                  type="button"
                                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                                  onClick={() => {
                                    void requestAirPlay();
                                  }}
                                  disabled={!canAirPlay || airPlayState === 'connecting'}
                                >
                                  <div className="flex items-center gap-3">
                                    <MonitorPlay className="h-5 w-5 text-white/60" />
                                    <span>AirPlay</span>
                                  </div>
                                  <span className="text-xs text-white/50">
                                    {getRemoteStateLabel('airplay', airPlayState)}
                                  </span>
                                </button>
                              )}
                            </>
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

                      {/* ── Source sub-view ── */}
                      {settingsView === 'source' && sourceOptions && (
                        <div className="flex flex-col">
                          <button
                            type="button"
                            className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                            onClick={() => setSettingsView('main')}
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                            <span>Nguồn phát</span>
                          </button>
                          {sourceOptions.map((source) => {
                            const isDisabled = !source.available;
                            return (
                              <button
                                key={source.name}
                                type="button"
                                disabled={isDisabled}
                                className={cn(
                                  'flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                                  source.active
                                    ? 'bg-[#DFE104]/12 font-medium text-[#DFE104]'
                                    : 'text-white/90 hover:bg-white/10',
                                  isDisabled &&
                                    'cursor-not-allowed text-white/35 hover:bg-transparent',
                                )}
                                onClick={() => {
                                  if (isDisabled || !onSourceChange) return;
                                  onSourceChange(source.name);
                                  setSettingsView('main');
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="truncate">{source.name}</div>
                                  {!source.available && (
                                    <div className="mt-0.5 text-xs text-white/35">
                                      {source.unavailableReason || 'Chưa có tập này'}
                                    </div>
                                  )}
                                </div>
                                {source.active && <Check className="h-4 w-4 shrink-0" />}
                              </button>
                            );
                          })}
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

                      {/* ── Audio gain sub-view ── */}
                      {settingsView === 'audio-gain' && (
                        <div className="flex flex-col">
                          <button
                            type="button"
                            className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                            onClick={() => setSettingsView('main')}
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                            <span>Audio Gain</span>
                          </button>
                          <div className="space-y-3 px-4 py-3">
                            <AudioGainSlider.Root
                              min={100}
                              max={200}
                              step={5}
                              keyStep={5}
                              className={cn(
                                'group/gain relative flex h-5 w-full cursor-pointer items-center',
                                !canSetAudioGain && 'pointer-events-none opacity-50',
                              )}
                            >
                              <AudioGainSlider.Track className="relative h-[4px] w-full bg-white/20">
                                <AudioGainSlider.TrackFill className="absolute inset-y-0 left-0 bg-[#DFE104]" />
                              </AudioGainSlider.Track>
                              <AudioGainSlider.Thumb className="absolute left-[var(--slider-fill)] top-1/2 block h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 bg-[#FAFAFA] shadow-[0_0_8px_rgba(223,225,4,0.5)]" />
                            </AudioGainSlider.Root>

                            <div className="flex items-center justify-between text-xs text-white/60">
                              <span>100%</span>
                              <span className="font-medium text-[#DFE104]">
                                {audioGainPercent}%
                              </span>
                              <span>200%</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {[100, 125, 150, 200].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  className={cn(
                                    'border border-white/15 px-2 py-1 text-xs font-medium text-white/75 transition-colors hover:border-[#DFE104] hover:text-[#DFE104]',
                                    Math.abs(audioGainPercent - preset) <= 2 &&
                                      'border-[#DFE104] text-[#DFE104]',
                                  )}
                                  onClick={() => player?.remote?.changeAudioGain?.(preset / 100)}
                                >
                                  {preset}%
                                </button>
                              ))}
                            </div>
                          </div>
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
                              ['J / ←', 'Lùi 10 giây'],
                              ['L / →', 'Tiến 10 giây'],
                              ['M', 'Bật / Tắt tiếng'],
                              ['F', 'Toàn màn hình'],
                              ['T', 'Chế độ rạp'],
                              ['P', 'Picture-in-Picture'],
                              ['C', 'Bật / Tắt phụ đề'],
                              ['Shift+P / PageUp', 'Tập trước'],
                              ['Shift+N / PageDown', 'Tập tiếp theo'],
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

              {/* Fullscreen */}
              <FullscreenButton
                className={cn(
                  BRUTAL_ICON_BTN,
                  'border-r-0 border-l border-[#3F3F46]',
                  useCompactControls && TOUCH_ICON_BTN,
                  !canFullscreen && 'opacity-40 cursor-not-allowed',
                )}
                aria-label="Toàn màn hình"
                title="Toàn màn hình (F)"
                disabled={!canFullscreen}
              >
                {fullscreen ? (
                  <SharpFullscreenExitIcon
                    className={cn(SHARP_STROKE_ICON, useCompactControls && TOUCH_STROKE_ICON)}
                  />
                ) : (
                  <SharpFullscreenIcon
                    className={cn(SHARP_STROKE_ICON, useCompactControls && TOUCH_STROKE_ICON)}
                  />
                )}
              </FullscreenButton>
            </div>
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
            className="absolute z-[50] w-[280px] max-w-[calc(100%-16px)] overflow-hidden bg-[#212121]/95 py-2 shadow-2xl backdrop-blur-md"
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
            className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center"
          >
            <button
              type="button"
              onClick={() => player?.play()}
              className="group pointer-events-auto flex h-[80px] w-[80px] items-center justify-center border border-[#3F3F46] bg-[#09090B]/90 text-[#FAFAFA] transition-none hover:bg-[#DFE104] hover:text-[#09090B]"
              aria-label="Bắt đầu phát"
            >
              <SharpPlayIcon className="h-9 w-9 fill-current" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Remote playback overlay ─── */}
      <AnimatePresence>
        {isRemoteActive && (
          <motion.div
            {...springOverlay}
            className="pointer-events-none absolute inset-x-0 top-3 z-[3] flex justify-center px-3"
          >
            <div className="flex items-center gap-2 border border-[#3F3F46] bg-[#09090B]/88 px-3 py-1.5 text-[#FAFAFA] backdrop-blur-md">
              {isGoogleCastConnected ? (
                <Tv className="h-4 w-4" />
              ) : (
                <MonitorPlay className="h-4 w-4" />
              )}
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#A1A1AA]">
                  {remoteLabel}
                </p>
                <p className="max-w-[min(50vw,14rem)] truncate text-xs font-semibold">
                  {remoteDeviceName}
                </p>
              </div>
            </div>
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
