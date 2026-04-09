import { AspectRatio } from '@/components/ui/aspect-ratio';
import PlayerControlLayer, {
  type PlayerSourceOption,
} from '@/components/video-player/PlayerControlLayer';
import { cn } from '@/lib/utils';
import {
  MediaPlayer,
  type MediaPlayerInstance,
  MediaProvider,
  type MediaProviderAdapter,
  type MediaRemotePlaybackChangeEventDetail,
  type PlayerSrc,
  isHLSProvider,
  useMediaState,
} from '@vidstack/react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '@vidstack/react/player/styles/base.css';

type EpisodeSelectionDetail = {
  ep: string;
  label?: string;
  linkEmbed?: string;
  linkM3u8?: string;
  serverName?: string;
};

type VideoPlayerProps = {
  playlist?: EpisodeSelectionDetail[];
  movieSlug?: string;
};

type PlaybackMode = 'idle' | 'vidstack' | 'embed';

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
};

const hasPlayableSource = (episode: EpisodeSelectionDetail | null | undefined) =>
  Boolean(episode?.linkM3u8?.trim() || episode?.linkEmbed?.trim());

const normalizeSourceName = (sourceName: string | undefined) => sourceName?.trim() ?? '';

const isSameEpisodeSource = (
  episode: EpisodeSelectionDetail,
  selectedEpisode: EpisodeSelectionDetail,
) => {
  if (episode.ep !== selectedEpisode.ep) return false;

  const selectedM3u8 = selectedEpisode.linkM3u8?.trim();
  const episodeM3u8 = episode.linkM3u8?.trim();
  if (selectedM3u8 && episodeM3u8) {
    return selectedM3u8 === episodeM3u8;
  }

  const selectedEmbed = selectedEpisode.linkEmbed?.trim();
  const episodeEmbed = episode.linkEmbed?.trim();
  if (selectedEmbed && episodeEmbed) {
    return selectedEmbed === episodeEmbed;
  }

  return false;
};

const HLS_TYPE_HINT = 'application/x-mpegurl';

const isM3u8Url = (url: string) => /\.m3u8(?:$|[?#])/i.test(url);

const toPlayerSrc = (linkM3u8: string): PlayerSrc =>
  isM3u8Url(linkM3u8) ? linkM3u8 : { src: linkM3u8, type: HLS_TYPE_HINT };

const withCacheBust = (url: string) => {
  try {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set('_r', String(Date.now()));
    return parsed.toString();
  } catch {
    return `${url}${url.includes('?') ? '&' : '?'}_r=${Date.now()}`;
  }
};

const getEpisodeLabel = (episode: EpisodeSelectionDetail | null) =>
  episode?.label?.trim() || (episode?.ep ? `Tập ${episode.ep}` : 'Chưa chọn tập');

const extractReasonMessage = (reason: unknown) => {
  if (typeof reason === 'string') return reason;
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object') {
    if ('message' in reason && typeof reason.message === 'string') {
      return reason.message;
    }
    if ('toString' in reason && typeof reason.toString === 'function') {
      return reason.toString();
    }
  }
  return '';
};

const WATCHED_THRESHOLD = 0.85; // consider watched at 85%

const getStorageKey = (movieSlug: string | undefined, ep: string) =>
  movieSlug ? `watch-progress-${movieSlug}-${ep}` : null;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ playlist = [], movieSlug }) => {
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeSelectionDetail | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('idle');
  const [playerSrc, setPlayerSrc] = useState<PlayerSrc | null>(null);
  const [iframeSrc, setIframeSrc] = useState('');
  const [streamHint, setStreamHint] = useState<string | null>(null);
  const [isEmbedLoading, setIsEmbedLoading] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const hasInitialized = useRef(false);

  const videoSectionRef = useRef<HTMLDivElement>(null);
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const mediaPlayerRef = useRef<MediaPlayerInstance | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const hlsFallbackEpisodeRef = useRef<string | null>(null);
  const isPlayerFullscreen = useMediaState('fullscreen', mediaPlayerRef);
  const isPlayerPiP = useMediaState('pictureInPicture', mediaPlayerRef);
  const canRootOrientScreen = useMediaState('canOrientScreen', mediaPlayerRef);
  const rootPointer = useMediaState('pointer', mediaPlayerRef);

  const playablePlaylist = useMemo(
    () =>
      playlist.filter((episode): episode is EpisodeSelectionDetail => hasPlayableSource(episode)),
    [playlist],
  );

  const episodesBySource = useMemo(() => {
    const sourceMap = new Map<string, EpisodeSelectionDetail[]>();
    for (const episode of playablePlaylist) {
      const sourceName = normalizeSourceName(episode.serverName);
      if (!sourceName) continue;
      const sourceEpisodes = sourceMap.get(sourceName) ?? [];
      sourceEpisodes.push(episode);
      sourceMap.set(sourceName, sourceEpisodes);
    }
    return sourceMap;
  }, [playablePlaylist]);

  const activeSourceName = useMemo(() => {
    if (!selectedEpisode) return '';

    const explicitSource = normalizeSourceName(selectedEpisode.serverName);
    if (explicitSource && episodesBySource.has(explicitSource)) {
      return explicitSource;
    }

    const matchedEpisode = playablePlaylist.find((episode) =>
      isSameEpisodeSource(episode, selectedEpisode),
    );
    return normalizeSourceName(matchedEpisode?.serverName);
  }, [episodesBySource, playablePlaylist, selectedEpisode]);

  const activeSourcePlaylist = useMemo(() => {
    if (activeSourceName) {
      return episodesBySource.get(activeSourceName) ?? [];
    }
    return playablePlaylist;
  }, [activeSourceName, episodesBySource, playablePlaylist]);

  const sourceOptions = useMemo<PlayerSourceOption[]>(() => {
    if (!episodesBySource.size) return [];

    const selectedEp = selectedEpisode?.ep;
    return Array.from(episodesBySource.entries()).map(([name, sourceEpisodes]) => {
      const hasCurrentEpisode = selectedEp
        ? sourceEpisodes.some((episode) => episode.ep === selectedEp)
        : true;

      return {
        name,
        active: name === activeSourceName,
        available: hasCurrentEpisode,
        unavailableReason: hasCurrentEpisode ? undefined : 'Nguồn này chưa có tập hiện tại',
      };
    });
  }, [activeSourceName, episodesBySource, selectedEpisode?.ep]);

  const currentEpisodeIndex = useMemo(() => {
    if (!selectedEpisode) return -1;
    const indexBySource = activeSourcePlaylist.findIndex((episode) =>
      isSameEpisodeSource(episode, selectedEpisode),
    );
    if (indexBySource >= 0) return indexBySource;
    return activeSourcePlaylist.findIndex((episode) => episode.ep === selectedEpisode.ep);
  }, [activeSourcePlaylist, selectedEpisode]);

  const hasPreviousEpisode = currentEpisodeIndex > 0;
  const hasNextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < activeSourcePlaylist.length - 1;

  const emitEpisodeSelection = useCallback((episode: EpisodeSelectionDetail) => {
    window.dispatchEvent(new CustomEvent('episodeSelected', { detail: episode }));
  }, []);

  const applyEpisodeSelection = useCallback((episode: EpisodeSelectionDetail) => {
    const linkM3u8 = episode.linkM3u8?.trim();
    const linkEmbed = episode.linkEmbed?.trim();
    const normalizedEpisode: EpisodeSelectionDetail = {
      ...episode,
      linkM3u8,
      linkEmbed,
    };

    setSelectedEpisode(normalizedEpisode);
    setStreamHint(null);
    setIsEmbedLoading(false);

    if (linkM3u8) {
      setPlaybackMode('vidstack');
      setPlayerSrc(toPlayerSrc(linkM3u8));
      setIframeSrc('');
      return;
    }

    if (linkEmbed) {
      setPlaybackMode('embed');
      setIframeSrc(linkEmbed);
      setPlayerSrc(null);
      setIsEmbedLoading(true);
      return;
    }

    setPlaybackMode('idle');
    setPlayerSrc(null);
    setIframeSrc('');
  }, []);

  const goToEpisodeIndex = useCallback(
    (index: number) => {
      const episode = activeSourcePlaylist[index];
      if (!episode || !hasPlayableSource(episode)) return;
      emitEpisodeSelection(episode);
    },
    [activeSourcePlaylist, emitEpisodeSelection],
  );

  const goToPreviousEpisode = useCallback(() => {
    if (!hasPreviousEpisode) return;
    goToEpisodeIndex(currentEpisodeIndex - 1);
  }, [currentEpisodeIndex, goToEpisodeIndex, hasPreviousEpisode]);

  const goToNextEpisode = useCallback(() => {
    if (!hasNextEpisode) return;
    goToEpisodeIndex(currentEpisodeIndex + 1);
  }, [currentEpisodeIndex, goToEpisodeIndex, hasNextEpisode]);

  const seekWithinCurrentEpisode = useCallback(
    (deltaSeconds: number) => {
      const player = mediaPlayerRef.current;
      if (
        !player ||
        playbackMode !== 'vidstack' ||
        !Number.isFinite(deltaSeconds) ||
        deltaSeconds === 0
      )
        return;

      const currentTime = Number.isFinite(player.currentTime) ? player.currentTime : 0;
      const duration = Number.isFinite(player.duration) ? player.duration : 0;
      const maxTime =
        duration > 0 ? duration : Math.max(currentTime + deltaSeconds, currentTime, 0);
      const nextTime = Math.min(Math.max(currentTime + deltaSeconds, 0), maxTime);

      const remoteApi = player.remote as unknown as { seek?: (time: number) => void };
      if (typeof remoteApi.seek === 'function') {
        remoteApi.seek(nextTime);
        return;
      }

      player.currentTime = nextTime;
    },
    [playbackMode],
  );

  const switchEpisodeSource = useCallback(
    (sourceName: string) => {
      const normalizedSource = normalizeSourceName(sourceName);
      if (!selectedEpisode || !normalizedSource || normalizedSource === activeSourceName) return;

      const targetEpisode = episodesBySource
        .get(normalizedSource)
        ?.find((episode) => episode.ep === selectedEpisode.ep && hasPlayableSource(episode));

      if (!targetEpisode) {
        setStreamHint(`Nguồn ${normalizedSource} chưa có ${getEpisodeLabel(selectedEpisode)}.`);
        return;
      }

      emitEpisodeSelection(targetEpisode);
    },
    [activeSourceName, emitEpisodeSelection, episodesBySource, selectedEpisode],
  );

  const activateEmbedFallback = useCallback(
    ({
      userHint,
      logMessage,
    }: {
      userHint: string | null;
      logMessage?: string;
    }) => {
      const fallback = selectedEpisode?.linkEmbed?.trim();
      if (logMessage) {
        console.warn(`[VideoPlayer] ${logMessage}`);
      }
      if (!fallback) {
        setStreamHint(userHint);
        return;
      }

      const fallbackKey = `${selectedEpisode?.ep ?? 'unknown'}:${selectedEpisode?.linkM3u8 ?? ''}`;
      if (hlsFallbackEpisodeRef.current === fallbackKey && playbackMode === 'embed') {
        setStreamHint(userHint);
        return;
      }

      hlsFallbackEpisodeRef.current = fallbackKey;
      setPlaybackMode('embed');
      setIframeSrc(fallback);
      setIsEmbedLoading(true);
      setStreamHint(userHint);
    },
    [playbackMode, selectedEpisode],
  );

  const switchToEmbedFallback = useCallback(() => {
    activateEmbedFallback({
      userHint: 'Đã chuyển sang nguồn dự phòng embed.',
      logMessage: 'Manual fallback triggered by user.',
    });
  }, [activateEmbedFallback]);

  const reloadCurrentSource = useCallback(() => {
    if (!selectedEpisode) return;
    const linkM3u8 = selectedEpisode.linkM3u8?.trim();
    const linkEmbed = selectedEpisode.linkEmbed?.trim();
    setStreamHint(null);

    if (playbackMode === 'vidstack' && linkM3u8) {
      setPlayerSrc(toPlayerSrc(withCacheBust(linkM3u8)));
      return;
    }

    if (linkEmbed) {
      setPlaybackMode('embed');
      setIframeSrc(withCacheBust(linkEmbed));
      setIsEmbedLoading(true);
      return;
    }
  }, [playbackMode, selectedEpisode]);

  const toggleFullscreen = useCallback(async () => {
    try {
      const player = mediaPlayerRef.current;
      if (player) {
        if (isPlayerFullscreen) {
          await player.exitFullscreen();
        } else {
          await player.enterFullscreen();
        }
        return;
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (playerFrameRef.current?.requestFullscreen) {
        await playerFrameRef.current.requestFullscreen();
      }
    } catch {
      // Ignore Fullscreen API errors.
    }
  }, [isPlayerFullscreen]);

  const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
    if (!provider || !isHLSProvider(provider)) return;
    // Use direct hls.js import to avoid fragile internal lazy chunks in dev.
    provider.library = () => import('hls.js');
    provider.config = {
      lowLatencyMode: true,
      backBufferLength: 90,
    };
    // Try to get video element from provider
    const providerAny = provider as unknown as { el?: HTMLVideoElement };
    if (providerAny.el) {
      videoRef.current = providerAny.el;
    }
  }, []);

  const onGoogleCastPromptOpen = useCallback(() => {
    setStreamHint('Đang mở danh sách thiết bị Google Cast...');
  }, []);

  const onGoogleCastPromptClose = useCallback(() => {
    setStreamHint((current) =>
      current === 'Đang mở danh sách thiết bị Google Cast...' ? null : current,
    );
  }, []);

  const onGoogleCastPromptError = useCallback((detail: { code?: string } | undefined) => {
    const code = detail?.code;
    switch (code) {
      case 'CANCEL':
        setStreamHint('Bạn đã hủy chọn thiết bị Google Cast.');
        return;
      case 'NO_DEVICES_AVAILABLE':
        setStreamHint('Không tìm thấy thiết bị Google Cast cùng mạng.');
        return;
      case 'CAST_NOT_AVAILABLE':
        setStreamHint('Google Cast chưa sẵn sàng trên trình duyệt hoặc thiết bị này.');
        return;
      case 'LOAD_MEDIA_FAILED':
        setStreamHint('Thiết bị Cast không tải được media (thường do URL/CORS).');
        return;
      case 'RECEIVER_UNAVAILABLE':
        setStreamHint('Thiết bị nhận Cast không khả dụng.');
        return;
      case 'TIMEOUT':
        setStreamHint('Kết nối Google Cast bị timeout.');
        return;
      default:
        setStreamHint(code ? `Google Cast lỗi: ${code}` : 'Không thể kết nối Google Cast lúc này.');
    }
  }, []);

  const onRemotePlaybackChange = useCallback(
    ({ type, state }: MediaRemotePlaybackChangeEventDetail) => {
      if (state === 'connecting') {
        setStreamHint(
          type === 'google-cast'
            ? 'Đang kết nối Google Cast...'
            : type === 'airplay'
              ? 'Đang kết nối AirPlay...'
              : null,
        );
        return;
      }

      if (state === 'connected') {
        setStreamHint(
          type === 'google-cast'
            ? 'Đã kết nối Google Cast.'
            : type === 'airplay'
              ? 'Đã kết nối AirPlay.'
              : null,
        );
        return;
      }

      setStreamHint((current) => {
        if (!current) return null;
        const remoteHints = [
          'Đang kết nối Google Cast...',
          'Đang kết nối AirPlay...',
          'Đã kết nối Google Cast.',
          'Đã kết nối AirPlay.',
        ];
        return remoteHints.includes(current) ? null : current;
      });
    },
    [],
  );

  // Save progress to localStorage
  const saveProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (!movieSlug || !selectedEpisode) return;
      const key = getStorageKey(movieSlug, selectedEpisode.ep);
      if (!key) return;

      // Only save every 10 seconds to avoid excessive writes
      if (Math.abs(currentTime - lastSavedTimeRef.current) < 10) return;
      lastSavedTimeRef.current = currentTime;

      const progress = duration > 0 ? currentTime / duration : 0;
      try {
        localStorage.setItem(key, JSON.stringify({ time: currentTime, progress, duration }));
      } catch {
        // Ignore localStorage errors
      }
    },
    [movieSlug, selectedEpisode],
  );

  // Load progress from localStorage
  const loadProgress = useCallback((): number => {
    if (!movieSlug || !selectedEpisode) return 0;
    const key = getStorageKey(movieSlug, selectedEpisode.ep);
    if (!key) return 0;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return 0;
      const data = JSON.parse(stored);
      // Only restore if not fully watched
      if (data.progress < WATCHED_THRESHOLD) {
        return data.time || 0;
      }
    } catch {
      // Ignore errors
    }
    return 0;
  }, [movieSlug, selectedEpisode]);

  // Clear progress when episode completes
  const clearProgress = useCallback(() => {
    if (!movieSlug || !selectedEpisode) return;
    const key = getStorageKey(movieSlug, selectedEpisode.ep);
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }, [movieSlug, selectedEpisode]);

  // Handle video end - auto advance
  const handleVideoEnd = useCallback(() => {
    if (!autoAdvance || !hasNextEpisode) return;
    setStreamHint('Sẽ chuyển tập tiếp theo...');
    setTimeout(() => {
      goToNextEpisode();
    }, 3000);
  }, [autoAdvance, hasNextEpisode, goToNextEpisode]);

  // Toggle Picture-in-Picture via Vidstack API.
  const togglePiP = useCallback(async () => {
    const player = mediaPlayerRef.current;
    if (!player) return;
    try {
      if (isPlayerPiP) {
        await player.exitPictureInPicture();
      } else {
        await player.enterPictureInPicture();
      }
    } catch {
      // PiP not supported or failed.
    }
  }, [isPlayerPiP]);

  useEffect(() => {
    const player = mediaPlayerRef.current;
    if (!player) return;

    const handlePromptOpen = () => {
      onGoogleCastPromptOpen();
    };

    const handlePromptClose = () => {
      onGoogleCastPromptClose();
    };

    const handlePromptError = (event: Event) => {
      const castEvent = event as Event & { detail?: { code?: string } };
      onGoogleCastPromptError(castEvent.detail);
    };

    const handleRemotePlaybackChange = (event: Event) => {
      const remotePlaybackEvent = event as Event & {
        detail?: MediaRemotePlaybackChangeEventDetail;
      };
      if (!remotePlaybackEvent.detail) return;
      onRemotePlaybackChange(remotePlaybackEvent.detail);
    };

    player.addEventListener('google-cast-prompt-open', handlePromptOpen);
    player.addEventListener('google-cast-prompt-close', handlePromptClose);
    player.addEventListener('google-cast-prompt-error', handlePromptError);
    player.addEventListener('remote-playback-change', handleRemotePlaybackChange);

    return () => {
      player.removeEventListener('google-cast-prompt-open', handlePromptOpen);
      player.removeEventListener('google-cast-prompt-close', handlePromptClose);
      player.removeEventListener('google-cast-prompt-error', handlePromptError);
      player.removeEventListener('remote-playback-change', handleRemotePlaybackChange);
    };
  }, [
    onGoogleCastPromptClose,
    onGoogleCastPromptError,
    onGoogleCastPromptOpen,
    onRemotePlaybackChange,
    playbackMode,
    playerSrc,
  ]);

  useEffect(() => {
    hlsFallbackEpisodeRef.current = null;
  }, [selectedEpisode?.ep, selectedEpisode?.linkM3u8]);

  useEffect(() => {
    if (playbackMode !== 'vidstack') return;
    const player = mediaPlayerRef.current;
    if (!player) return;

    const handlePlayerError = (event: Event) => {
      const detail = (event as Event & { detail?: unknown }).detail;
      const message = extractReasonMessage(detail).toLowerCase();

      if (message.includes('google cast')) {
        setStreamHint('Google Cast request failed. Kiểm tra thiết bị Cast và mạng.');
        return;
      }

      if (message.includes('decoder') || message.includes('mpegurl')) {
        activateEmbedFallback({
          userHint:
            'HLS không giải mã được trên môi trường hiện tại. Đã chuyển sang embed fallback.',
          logMessage:
            'HLS decoder/mpegurl runtime error. Switched to embed fallback for compatibility.',
        });
        return;
      }

      activateEmbedFallback({
        userHint: null,
        logMessage: 'Nguồn HLS lỗi runtime. Đã chuyển sang embed fallback.',
      });
    };

    player.addEventListener('error', handlePlayerError);
    return () => player.removeEventListener('error', handlePlayerError);
  }, [activateEmbedFallback, playbackMode]);

  useEffect(() => {
    if (playbackMode !== 'vidstack') return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = extractReasonMessage(event.reason).toLowerCase();
      const isViteOptimizeError =
        message.includes('.vite/deps') ||
        message.includes('outdated optimize dep') ||
        message.includes('dynamically imported module') ||
        message.includes('ns_error_corrupted_content');
      if (!isViteOptimizeError) return;

      activateEmbedFallback({
        userHint: 'Dev server đang lỗi optimize cache (.vite/deps). Đã chuyển sang embed fallback.',
        logMessage: 'Vite optimize deps cache issue detected from unhandledrejection.',
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [activateEmbedFallback, playbackMode]);

  // Auto-select the first episode on mount (no autoplay, no scroll)
  useEffect(() => {
    if (hasInitialized.current || !playablePlaylist.length) return;
    const first = playablePlaylist[0];
    if (!first || !hasPlayableSource(first)) return;
    hasInitialized.current = true;
    applyEpisodeSelection(first);
    // Sync EpisodeSelector UI
    window.dispatchEvent(
      new CustomEvent('episodeSelected', {
        detail: { ...first, autoSelect: true },
      }),
    );
  }, [playablePlaylist, applyEpisodeSelection]);

  useEffect(() => {
    const onEpisodeSelected = (event: Event) => {
      const detail = (event as CustomEvent<EpisodeSelectionDetail & { autoSelect?: boolean }>)
        .detail;
      if (!detail?.ep || !hasPlayableSource(detail)) return;

      // Skip if this is the init echo from ourselves
      if (detail.autoSelect) return;

      setShouldAutoPlay(true);
      applyEpisodeSelection(detail);

      if (videoSectionRef.current) {
        window.setTimeout(() => {
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          videoSectionRef.current?.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'nearest',
          });
        }, 100);
      }
    };

    window.addEventListener('episodeSelected', onEpisodeSelected);
    return () => window.removeEventListener('episodeSelected', onEpisodeSelected);
  }, [applyEpisodeSelection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if ((event.shiftKey && key === 'p') || event.key === 'PageUp') {
        event.preventDefault();
        goToPreviousEpisode();
        return;
      }

      if ((event.shiftKey && key === 'n') || event.key === 'PageDown') {
        event.preventDefault();
        goToNextEpisode();
        return;
      }

      if (key === 'j' || event.key === 'ArrowLeft') {
        event.preventDefault();
        seekWithinCurrentEpisode(-10);
        return;
      }

      if (key === 'l' || event.key === 'ArrowRight') {
        event.preventDefault();
        seekWithinCurrentEpisode(10);
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        reloadCurrentSource();
        return;
      }
      if (key === 't') {
        event.preventDefault();
        setIsTheaterMode((prev) => !prev);
        return;
      }
      if (key === 'p' && playbackMode === 'vidstack') {
        event.preventDefault();
        void togglePiP();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    goToNextEpisode,
    goToPreviousEpisode,
    reloadCurrentSource,
    seekWithinCurrentEpisode,
    toggleFullscreen,
    togglePiP,
    playbackMode,
  ]);

  useEffect(() => {
    if (!isTheaterMode) return;
    document.documentElement.style.overflow = 'hidden';
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTheaterMode(false);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onEscape);
    };
  }, [isTheaterMode]);

  useEffect(() => {
    if (playbackMode !== 'vidstack') return;
    const player = mediaPlayerRef.current;
    if (!player || rootPointer !== 'coarse') return;

    const nativeOrientation = screen.orientation as
      | (ScreenOrientation & {
          lock?: (orientation: OrientationLockType) => Promise<void>;
          unlock?: () => void;
        })
      | undefined;

    const syncOrientation = async () => {
      try {
        if (isPlayerFullscreen) {
          if (canRootOrientScreen) {
            await player.orientation.lock('landscape');
            return;
          }
          await nativeOrientation?.lock?.('landscape');
        } else {
          if (canRootOrientScreen) {
            await player.orientation.unlock();
            return;
          }
          nativeOrientation?.unlock?.();
        }
      } catch {
        // Ignore orientation lock/unlock failures.
      }
    };

    void syncOrientation();
    return () => {
      if (canRootOrientScreen) {
        void player.orientation.unlock().catch(() => undefined);
        return;
      }
      nativeOrientation?.unlock?.();
    };
  }, [playbackMode, isPlayerFullscreen, canRootOrientScreen, rootPointer]);

  // Handle video events for progress tracking
  useEffect(() => {
    const player = mediaPlayerRef.current;
    if (!player) return;

    let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

    const handleProviderChange = (provider: MediaProviderAdapter | null) => {
      if (!provider || !isHLSProvider(provider)) return;
      // Get the native video element from the provider
      const videoEl = (provider as unknown as { el: HTMLVideoElement }).el;
      if (videoEl) {
        videoRef.current = videoEl;
      }
    };

    const handleLoadedMetadata = () => {
      // Try to restore saved position
      const savedTime = loadProgress();
      if (savedTime > 0 && videoRef.current && savedTime < videoRef.current.duration - 5) {
        videoRef.current.currentTime = savedTime;
      }
    };

    const handleTimeUpdate = () => {
      if (!videoRef.current) return;
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    };

    const handleEnded = () => {
      handleVideoEnd();
      // Mark as fully watched
      clearProgress();
    };

    const handlePlay = () => {
      // Start time tracking interval
      timeUpdateInterval = setInterval(() => {
        if (videoRef.current) {
          saveProgress(videoRef.current.currentTime, videoRef.current.duration);
        }
      }, 10000);
    };

    const handlePause = () => {
      // Save immediately on pause
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
      }
    };

    player.addEventListener('provider-change', handleProviderChange as unknown as EventListener);
    player.addEventListener('loadedmetadata', handleLoadedMetadata);
    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('ended', handleEnded);
    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);

    return () => {
      player.removeEventListener(
        'provider-change',
        handleProviderChange as unknown as EventListener,
      );
      player.removeEventListener('loadedmetadata', handleLoadedMetadata);
      player.removeEventListener('timeupdate', handleTimeUpdate);
      player.removeEventListener('ended', handleEnded);
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
      }
    };
  }, [loadProgress, saveProgress, handleVideoEnd, clearProgress]);

  const sourceLabel =
    playbackMode === 'vidstack'
      ? 'Vidstack HLS'
      : playbackMode === 'embed'
        ? 'Embed Fallback'
        : 'No Source';

  // Spring animation for theater mode - proper spring physics from Motion docs
  const theaterSpring = useSpring(0, { stiffness: 300, damping: 30 });
  const theaterScale = useTransform(theaterSpring, [0, 1], [0.95, 1]);
  const theaterBlur = useTransform(theaterSpring, [0, 1], [8, 0]);
  const theaterFilter = useTransform(theaterBlur, (v) => `blur(${v}px)`);

  useEffect(() => {
    theaterSpring.set(isTheaterMode ? 1 : 0);
  }, [isTheaterMode, theaterSpring]);

  const playerContent = (
    <div ref={videoSectionRef} className="mx-auto w-full max-w-none space-y-2 px-0">
      <motion.div
        ref={playerFrameRef}
        data-cursor-disabled
        style={{
          scale: isTheaterMode ? theaterScale : 1,
          filter: isTheaterMode ? theaterFilter : 'none',
        }}
        onPointerEnter={() => window.dispatchEvent(new Event('cursor:disable-zone'))}
        onPointerLeave={() => window.dispatchEvent(new Event('cursor:enable-zone'))}
        className="relative mx-auto w-full cursor-auto overflow-hidden border-2 border-[#3F3F46] bg-[#09090B] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]"
      >
        <AspectRatio ratio={16 / 9} className="overflow-hidden bg-[#09090B]">
          {!selectedEpisode ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm uppercase tracking-wide text-[#A1A1AA]">
              Chọn tập để bắt đầu phát
            </div>
          ) : playbackMode === 'embed' ? (
            <div className="relative h-full w-full">
              <iframe
                src={iframeSrc || selectedEpisode.linkEmbed}
                title={`Trình phát ${getEpisodeLabel(selectedEpisode)}`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setIsEmbedLoading(false)}
                className={cn(
                  'h-full w-full transition-opacity duration-300',
                  isEmbedLoading ? 'opacity-0' : 'opacity-100',
                )}
              />
              {isEmbedLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#09090B] text-[#A1A1AA]">
                  <div className="h-1 w-36 overflow-hidden bg-[#27272A]">
                    <div className="h-full w-1/2 animate-pulse bg-[#DFE104]" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em]">
                    Đang tải nguồn dự phòng
                  </p>
                </div>
              ) : null}
            </div>
          ) : playbackMode === 'vidstack' && playerSrc ? (
            <MediaPlayer
              ref={mediaPlayerRef}
              title={getEpisodeLabel(selectedEpisode)}
              artist="AstroFilm"
              src={playerSrc}
              load="visible"
              preload="metadata"
              crossOrigin="anonymous"
              googleCast={{ receiverApplicationId: 'CC1AD845' }}
              playsInline
              autoPlay={shouldAutoPlay}
              onProviderChange={onProviderChange}
              className="group/player relative h-full w-full cursor-auto bg-[#09090B] text-[#FAFAFA]"
            >
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[120px] bg-gradient-to-t from-[#09090B]/95 to-transparent" />
              <MediaProvider className="h-full w-full bg-[#09090B]" />
              <PlayerControlLayer
                allowFallback={Boolean(selectedEpisode.linkEmbed)}
                onFallback={switchToEmbedFallback}
                episodeLabel={getEpisodeLabel(selectedEpisode)}
                sourceLabel={sourceLabel}
                serverName={selectedEpisode.serverName}
                sourceOptions={sourceOptions}
                onSourceChange={switchEpisodeSource}
                isTheaterMode={isTheaterMode}
                hasPreviousEpisode={hasPreviousEpisode}
                hasNextEpisode={hasNextEpisode}
                autoAdvance={autoAdvance}
                onAutoAdvanceChange={setAutoAdvance}
              />
            </MediaPlayer>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm uppercase tracking-wide text-[#A1A1AA]">
              Tập hiện tại chưa có nguồn phát khả dụng.
            </div>
          )}
        </AspectRatio>
      </motion.div>

      {streamHint ? (
        <p
          className={cn(
            'border border-[#DFE104] bg-[#DFE104]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#DFE104]',
          )}
        >
          {streamHint}
        </p>
      ) : null}
    </div>
  );

  if (isTheaterMode) {
    return createPortal(
      <div
        className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#111111] p-4 sm:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsTheaterMode(false);
        }}
      >
        {playerContent}
      </div>,
      document.body,
    );
  }

  return playerContent;
};

export default VideoPlayer;
