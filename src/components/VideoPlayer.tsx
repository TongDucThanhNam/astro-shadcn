import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import {
  Captions,
  CaptionButton,
  Controls,
  FullscreenButton,
  GoogleCastButton,
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
  MuteButton,
  PlayButton,
  type PlayerSrc,
  SeekButton,
  Spinner,
  Time,
  TimeSlider,
  useCaptionOptions,
  useMediaStore,
  usePlaybackRateOptions,
  useVideoQualityOptions,
  VolumeSlider,
  type MediaProviderAdapter,
} from "@vidstack/react";
import "@vidstack/react/player/styles/base.css";
import {
  Cast,
  Expand,
  Gauge,
  LayoutPanelTop,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  Server,
  SlidersHorizontal,
  SkipBack,
  SkipForward,
  Tv,
  Volume2,
  VolumeX,
} from "lucide-react";

type EpisodeSelectionDetail = {
  ep: string;
  label?: string;
  linkEmbed?: string;
  linkM3u8?: string;
  serverName?: string;
};

type VideoPlayerProps = {
  playlist?: EpisodeSelectionDetail[];
};

type PlaybackMode = "idle" | "vidstack" | "embed";

const TOP_ICON_BUTTON_CLASS =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#3F3F46] bg-[#09090B]/85 text-[#FAFAFA] transition hover:border-[#DFE104] hover:text-[#DFE104] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]";
const VIDSTACK_ICON_BUTTON_CLASS =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#3F3F46] bg-[#09090B]/85 text-[#FAFAFA] transition hover:border-[#DFE104] hover:text-[#DFE104] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] disabled:cursor-not-allowed disabled:opacity-40";
const VIDSTACK_SELECT_WRAP_CLASS =
  "inline-flex h-7 items-center gap-1 rounded-md border border-[#3F3F46] bg-[#09090B]/85 px-1.5";
const VIDSTACK_SELECT_CLASS =
  "h-5 rounded-sm border border-[#3F3F46] bg-[#27272A] px-1 text-[10px] font-bold uppercase text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] disabled:opacity-50";

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
};

const hasPlayableSource = (episode: EpisodeSelectionDetail | null | undefined) =>
  Boolean(episode?.linkM3u8?.trim() || episode?.linkEmbed?.trim());

const withCacheBust = (url: string) => {
  try {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set("_r", String(Date.now()));
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}_r=${Date.now()}`;
  }
};

const getEpisodeLabel = (episode: EpisodeSelectionDetail | null) =>
  episode?.label?.trim() || (episode?.ep ? `Tập ${episode.ep}` : "Chưa chọn tập");

const normalizeSelectValue = (value: string) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized;
};

type PlayerControlLayerProps = {
  allowFallback: boolean;
  onFallback?: () => void;
};

const PlayerControlLayer: React.FC<PlayerControlLayerProps> = ({
  allowFallback,
  onFallback,
}) => {
  const [isQuickPanelOpen, setIsQuickPanelOpen] = useState(false);
  const {
    paused,
    muted,
    fullscreen,
    waiting,
    canGoogleCast,
    canSetVolume,
    canSetPlaybackRate,
    canSetQuality,
    remotePlaybackState,
    remotePlaybackType,
    error,
  } = useMediaStore();
  const qualityOptions = useVideoQualityOptions({ auto: true, sort: "descending" });
  const playbackRateOptions = usePlaybackRateOptions({
    rates: [0.75, 1, 1.25, 1.5, 2],
    normalLabel: "1x",
  });
  const captionOptions = useCaptionOptions({ off: "Tắt" });
  const isGoogleCast = remotePlaybackType === "google-cast";
  const isCastConnecting = isGoogleCast && remotePlaybackState === "connecting";
  const isCastConnected = isGoogleCast && remotePlaybackState === "connected";
  const castAriaLabel = isCastConnected
    ? "Google Cast đang kết nối"
    : isCastConnecting
      ? "Google Cast đang kết nối thiết bị"
      : "Google Cast";
  const castTitle = isCastConnected
    ? "Google Cast: Đã kết nối"
    : isCastConnecting
      ? "Google Cast: Đang kết nối"
      : "Google Cast";

  const selectOption = useCallback(
    (
      options: Array<{
        value: string;
        select: (trigger?: Event) => void;
      }>,
      selectedValue: string,
    ) => {
      const normalizedValue = normalizeSelectValue(selectedValue);
      const matched = options.find(
        (option) => normalizeSelectValue(option.value) === normalizedValue,
      );
      if (matched) {
        matched.select();
      }
    },
    [],
  );

  return (
    <>
      <Captions className="pointer-events-none absolute inset-x-4 bottom-[4.2rem] z-[3] rounded-md bg-black/55 px-2 py-0.5 text-center text-xs font-semibold text-[#FAFAFA] [text-shadow:0_2px_4px_rgba(0,0,0,0.8)] sm:bottom-[4.5rem]" />

      <Controls.Root className="absolute inset-0 z-[2] flex flex-col justify-end p-1.5 sm:p-2">
        <div className="relative space-y-1.5 rounded-lg border border-[#3F3F46]/90 bg-black/55 p-1.5 shadow-[0_14px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
          {isQuickPanelOpen ? (
            <div className="absolute bottom-full right-0 z-10 mb-1.5 flex min-w-[188px] flex-col gap-1 rounded-md border border-[#3F3F46] bg-[#09090B]/95 p-1.5">
              <label className={VIDSTACK_SELECT_WRAP_CLASS} title="Tốc độ phát">
                <Gauge className="h-3 w-3 text-[#A1A1AA]" />
                <select
                  value={playbackRateOptions.selectedValue ?? ""}
                  onChange={(event) =>
                    selectOption(playbackRateOptions, event.target.value)
                  }
                  disabled={playbackRateOptions.disabled || !canSetPlaybackRate}
                  className={cn(VIDSTACK_SELECT_CLASS, "w-full")}
                  aria-label="Chọn tốc độ phát"
                >
                  {playbackRateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={VIDSTACK_SELECT_WRAP_CLASS} title="Chất lượng phát">
                <Tv className="h-3 w-3 text-[#A1A1AA]" />
                <select
                  value={qualityOptions.selectedValue ?? ""}
                  onChange={(event) => selectOption(qualityOptions, event.target.value)}
                  disabled={qualityOptions.disabled || !canSetQuality}
                  className={cn(VIDSTACK_SELECT_CLASS, "w-full")}
                  aria-label="Chọn chất lượng phát"
                >
                  {qualityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={VIDSTACK_SELECT_WRAP_CLASS} title="Phụ đề">
                <MessageSquareText className="h-3 w-3 text-[#A1A1AA]" />
                <select
                  value={captionOptions.selectedValue ?? ""}
                  onChange={(event) => selectOption(captionOptions, event.target.value)}
                  disabled={captionOptions.disabled}
                  className={cn(VIDSTACK_SELECT_CLASS, "w-full")}
                  aria-label="Chọn phụ đề"
                >
                  {captionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {allowFallback && onFallback ? (
                <button
                  type="button"
                  onClick={onFallback}
                  className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-[#3F3F46] bg-[#09090B]/85 px-2 text-[10px] font-bold uppercase tracking-wide text-[#FAFAFA] transition hover:border-[#DFE104] hover:text-[#DFE104]"
                  aria-label="Chuyển sang nguồn dự phòng"
                  title="Chuyển sang nguồn dự phòng"
                >
                  <Server className="h-3 w-3" />
                  Embed
                </button>
              ) : null}
            </div>
          ) : null}

          <Controls.Group className="w-full">
            <TimeSlider.Root className="group/time w-full cursor-pointer">
              <TimeSlider.Track className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#27272A]/90">
                <TimeSlider.Progress className="absolute inset-y-0 left-0 w-[var(--slider-progress)] bg-[#3F3F46]" />
                <TimeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="mt-[-4px] block h-3 w-3 rounded-full border-2 border-[#09090B] bg-[#DFE104] opacity-0 transition-opacity group-data-[dragging]/time:opacity-100 group-hover/time:opacity-100" />
            </TimeSlider.Root>
          </Controls.Group>

          <Controls.Group className="flex items-center gap-1">
            <PlayButton
              className={VIDSTACK_ICON_BUTTON_CLASS}
              aria-label="Phát hoặc tạm dừng"
              title="Phát/Tạm dừng (K)"
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </PlayButton>

            <SeekButton
              seconds={-10}
              className={cn(VIDSTACK_ICON_BUTTON_CLASS, "hidden sm:inline-flex")}
              aria-label="Tua lùi 10 giây"
              title="Lùi 10 giây"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </SeekButton>
            <SeekButton
              seconds={10}
              className={cn(VIDSTACK_ICON_BUTTON_CLASS, "hidden sm:inline-flex")}
              aria-label="Tua tới 10 giây"
              title="Tới 10 giây"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </SeekButton>

            <MuteButton
              className={VIDSTACK_ICON_BUTTON_CLASS}
              aria-label="Bật hoặc tắt tiếng"
              title="Mute (M)"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </MuteButton>

            {canSetVolume ? (
              <VolumeSlider.Root className="group/volume hidden h-7 min-w-[52px] flex-1 cursor-pointer items-center px-1 min-[420px]:flex">
                <VolumeSlider.Track className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#27272A]/90">
                  <VolumeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]" />
                </VolumeSlider.Track>
                <VolumeSlider.Thumb className="mt-[-4px] block h-3 w-3 rounded-full border-2 border-[#09090B] bg-[#DFE104] opacity-0 transition-opacity group-data-[dragging]/volume:opacity-100 group-hover/volume:opacity-100" />
              </VolumeSlider.Root>
            ) : null}

            <CaptionButton
              className={VIDSTACK_ICON_BUTTON_CLASS}
              aria-label="Bật hoặc tắt phụ đề"
              title="Bật/Tắt phụ đề"
            >
              <MessageSquareText className="h-3.5 w-3.5" />
            </CaptionButton>

            <GoogleCastButton
              className={cn(
                VIDSTACK_ICON_BUTTON_CLASS,
                !canGoogleCast && "opacity-45",
                isCastConnecting && "border-[#DFE104]/70 text-[#DFE104]",
                isCastConnected && "border-[#DFE104] bg-[#DFE104]/15 text-[#DFE104]",
              )}
              aria-label={canGoogleCast ? castAriaLabel : "Google Cast chưa khả dụng"}
              title={
                canGoogleCast
                  ? castTitle
                  : "Google Cast chưa khả dụng trên trình duyệt hoặc thiết bị hiện tại"
              }
              disabled={!canGoogleCast}
            >
              <Cast className={cn("h-3.5 w-3.5", isCastConnecting && "animate-pulse")} />
            </GoogleCastButton>

            <FullscreenButton
              className={VIDSTACK_ICON_BUTTON_CLASS}
              aria-label="Toàn màn hình"
              title="Toàn màn hình (F)"
            >
              {fullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Expand className="h-3.5 w-3.5" />
              )}
            </FullscreenButton>

            <button
              type="button"
              className={cn(
                VIDSTACK_ICON_BUTTON_CLASS,
                isQuickPanelOpen && "border-[#DFE104] text-[#DFE104]",
              )}
              onClick={() => setIsQuickPanelOpen((prev) => !prev)}
              aria-label="Mở cài đặt nhanh"
              aria-pressed={isQuickPanelOpen}
              title="Cài đặt nhanh"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>

            <span className="ml-auto inline-flex items-center rounded-md border border-[#3F3F46] bg-[#09090B]/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FAFAFA]">
              <Time type="current" /> / <Time type="duration" />
            </span>
          </Controls.Group>
        </div>
      </Controls.Root>

      {(waiting || error) && (
        <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-[#09090B]/55">
          <Spinner.Root className="h-9 w-9 text-[#DFE104]">
            <Spinner.Track className="stroke-[#27272A]" />
            <Spinner.TrackFill className="stroke-[#DFE104]" />
          </Spinner.Root>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FAFAFA]">
            {error ? "Nguồn phát gặp lỗi." : "Đang tải nguồn phát"}
          </p>
        </div>
      )}
    </>
  );
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ playlist = [] }) => {
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeSelectionDetail | null>(
    null,
  );
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("idle");
  const [playerSrc, setPlayerSrc] = useState<PlayerSrc | null>(null);
  const [iframeSrc, setIframeSrc] = useState("");
  const [streamHint, setStreamHint] = useState<string | null>(null);
  const [isEmbedLoading, setIsEmbedLoading] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const videoSectionRef = useRef<HTMLDivElement>(null);
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const mediaPlayerRef = useRef<MediaPlayerInstance | null>(null);

  const currentEpisodeIndex = useMemo(() => {
    if (!selectedEpisode) return -1;
    const indexBySource = playlist.findIndex((episode) => {
      if (episode.ep !== selectedEpisode.ep) return false;
      if (selectedEpisode.linkM3u8 && episode.linkM3u8) {
        return selectedEpisode.linkM3u8 === episode.linkM3u8;
      }
      if (selectedEpisode.linkEmbed && episode.linkEmbed) {
        return selectedEpisode.linkEmbed === episode.linkEmbed;
      }
      return false;
    });
    if (indexBySource >= 0) return indexBySource;
    return playlist.findIndex((episode) => episode.ep === selectedEpisode.ep);
  }, [playlist, selectedEpisode]);

  const hasPreviousEpisode = currentEpisodeIndex > 0;
  const hasNextEpisode = currentEpisodeIndex >= 0 && currentEpisodeIndex < playlist.length - 1;

  const emitEpisodeSelection = useCallback((episode: EpisodeSelectionDetail) => {
    window.dispatchEvent(new CustomEvent("episodeSelected", { detail: episode }));
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
      setPlaybackMode("vidstack");
      setPlayerSrc({
        src: linkM3u8,
        type: "application/x-mpegurl",
      });
      setIframeSrc("");
      return;
    }

    if (linkEmbed) {
      setPlaybackMode("embed");
      setIframeSrc(linkEmbed);
      setPlayerSrc(null);
      setIsEmbedLoading(true);
      return;
    }

    setPlaybackMode("idle");
    setPlayerSrc(null);
    setIframeSrc("");
  }, []);

  const goToEpisodeIndex = useCallback(
    (index: number) => {
      const episode = playlist[index];
      if (!episode || !hasPlayableSource(episode)) return;
      emitEpisodeSelection(episode);
    },
    [emitEpisodeSelection, playlist],
  );

  const goToPreviousEpisode = useCallback(() => {
    if (!hasPreviousEpisode) return;
    goToEpisodeIndex(currentEpisodeIndex - 1);
  }, [currentEpisodeIndex, goToEpisodeIndex, hasPreviousEpisode]);

  const goToNextEpisode = useCallback(() => {
    if (!hasNextEpisode) return;
    goToEpisodeIndex(currentEpisodeIndex + 1);
  }, [currentEpisodeIndex, goToEpisodeIndex, hasNextEpisode]);

  const switchToEmbedFallback = useCallback(() => {
    const fallback = selectedEpisode?.linkEmbed?.trim();
    if (!fallback) {
      setStreamHint("Nguồn này không có fallback embed.");
      return;
    }
    setPlaybackMode("embed");
    setIframeSrc(fallback);
    setIsEmbedLoading(true);
    setStreamHint("Đã chuyển sang nguồn dự phòng embed.");
  }, [selectedEpisode]);

  const reloadCurrentSource = useCallback(() => {
    if (!selectedEpisode) return;
    const linkM3u8 = selectedEpisode.linkM3u8?.trim();
    const linkEmbed = selectedEpisode.linkEmbed?.trim();
    setStreamHint(null);

    if (playbackMode === "vidstack" && linkM3u8) {
      setPlayerSrc({
        src: withCacheBust(linkM3u8),
        type: "application/x-mpegurl",
      });
      return;
    }

    if (linkEmbed) {
      setPlaybackMode("embed");
      setIframeSrc(withCacheBust(linkEmbed));
      setIsEmbedLoading(true);
      return;
    }
  }, [playbackMode, selectedEpisode]);

  const toggleFullscreen = useCallback(async () => {
    try {
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
  }, []);

  const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
    if (!provider || !isHLSProvider(provider)) return;
    provider.config = {
      lowLatencyMode: true,
      backBufferLength: 90,
    };
  }, []);

  const onGoogleCastPromptOpen = useCallback(() => {
    setStreamHint("Đang mở danh sách thiết bị Google Cast...");
  }, []);

  const onGoogleCastPromptClose = useCallback(() => {
    setStreamHint((current) =>
      current === "Đang mở danh sách thiết bị Google Cast..." ? null : current,
    );
  }, []);

  const onGoogleCastPromptError = useCallback((detail: { code?: string } | undefined) => {
    const code = detail?.code;
    switch (code) {
      case "CANCEL":
        setStreamHint("Bạn đã hủy chọn thiết bị Google Cast.");
        return;
      case "NO_DEVICES_AVAILABLE":
        setStreamHint("Không tìm thấy thiết bị Google Cast cùng mạng.");
        return;
      case "CAST_NOT_AVAILABLE":
        setStreamHint("Google Cast chưa sẵn sàng trên trình duyệt hoặc thiết bị này.");
        return;
      case "LOAD_MEDIA_FAILED":
        setStreamHint("Thiết bị Cast không tải được media (thường do URL/CORS).");
        return;
      case "RECEIVER_UNAVAILABLE":
        setStreamHint("Thiết bị nhận Cast không khả dụng.");
        return;
      case "TIMEOUT":
        setStreamHint("Kết nối Google Cast bị timeout.");
        return;
      default:
        setStreamHint(code ? `Google Cast lỗi: ${code}` : "Không thể kết nối Google Cast lúc này.");
    }
  }, []);

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

    player.addEventListener("google-cast-prompt-open", handlePromptOpen);
    player.addEventListener("google-cast-prompt-close", handlePromptClose);
    player.addEventListener("google-cast-prompt-error", handlePromptError);

    return () => {
      player.removeEventListener("google-cast-prompt-open", handlePromptOpen);
      player.removeEventListener("google-cast-prompt-close", handlePromptClose);
      player.removeEventListener("google-cast-prompt-error", handlePromptError);
    };
  }, [onGoogleCastPromptClose, onGoogleCastPromptError, onGoogleCastPromptOpen, playbackMode, playerSrc]);

  useEffect(() => {
    const onEpisodeSelected = (event: Event) => {
      const detail = (event as CustomEvent<EpisodeSelectionDetail>).detail;
      if (!detail?.ep || !hasPlayableSource(detail)) return;
      applyEpisodeSelection(detail);

      if (videoSectionRef.current) {
        window.setTimeout(() => {
          const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          videoSectionRef.current?.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }, 100);
      }
    };

    window.addEventListener("episodeSelected", onEpisodeSelected);
    return () => window.removeEventListener("episodeSelected", onEpisodeSelected);
  }, [applyEpisodeSelection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "j" || event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousEpisode();
        return;
      }
      if (key === "l" || event.key === "ArrowRight") {
        event.preventDefault();
        goToNextEpisode();
        return;
      }
      if (key === "f") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (key === "r") {
        event.preventDefault();
        reloadCurrentSource();
        return;
      }
      if (key === "t") {
        event.preventDefault();
        setIsTheaterMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToNextEpisode, goToPreviousEpisode, reloadCurrentSource, toggleFullscreen]);

  useEffect(() => {
    if (!isTheaterMode) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTheaterMode(false);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [isTheaterMode]);

  const sourceLabel =
    playbackMode === "vidstack"
      ? "Vidstack HLS"
      : playbackMode === "embed"
        ? "Embed Fallback"
        : "No Source";

  return (
    <div
      ref={videoSectionRef}
      className={cn(
        "w-full space-y-1.5 px-0",
        isTheaterMode && "fixed inset-0 z-[75] bg-[#050507]/95 p-2 sm:p-5",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[#27272A] bg-[linear-gradient(135deg,rgba(9,9,11,0.94),rgba(15,15,20,0.88))] p-2 shadow-[0_10px_26px_rgba(0,0,0,0.34)]",
          isTheaterMode && "mx-auto w-full max-w-6xl",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-[#FAFAFA] sm:text-sm">
            {getEpisodeLabel(selectedEpisode)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-[#3F3F46] bg-[#27272A] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#A1A1AA]">
            <Server className="h-3 w-3" />
            {sourceLabel}
          </span>
          {selectedEpisode?.serverName ? (
            <span className="rounded-md border border-[#DFE104]/60 bg-[#DFE104]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#DFE104]">
              {selectedEpisode.serverName}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={goToPreviousEpisode}
            className={TOP_ICON_BUTTON_CLASS}
            disabled={!hasPreviousEpisode}
            aria-label="Tập trước"
            title="Tập trước (J)"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={goToNextEpisode}
            className={TOP_ICON_BUTTON_CLASS}
            disabled={!hasNextEpisode}
            aria-label="Tập tiếp theo"
            title="Tập tiếp theo (L)"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={reloadCurrentSource}
            className={TOP_ICON_BUTTON_CLASS}
            disabled={!selectedEpisode}
            aria-label="Tải lại nguồn phát"
            title="Reload nguồn (R)"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className={TOP_ICON_BUTTON_CLASS}
            disabled={!selectedEpisode}
            aria-label="Toàn màn hình"
            title="Toàn màn hình (F)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsTheaterMode((prev) => !prev)}
            className={TOP_ICON_BUTTON_CLASS}
            disabled={!selectedEpisode}
            aria-label="Bật chế độ rạp"
            title={isTheaterMode ? "Thoát chế độ rạp (T)" : "Chế độ rạp (T)"}
          >
            {isTheaterMode ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <LayoutPanelTop className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <div
        ref={playerFrameRef}
        className={cn(
          "relative overflow-hidden rounded-xl border border-[#27272A] bg-[#050507] shadow-[0_20px_56px_rgba(0,0,0,0.5)]",
          isTheaterMode && "mx-auto w-full max-w-6xl",
        )}
      >
        <AspectRatio ratio={16 / 9} className="overflow-hidden bg-[#09090B]">
          {!selectedEpisode ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm uppercase tracking-wide text-[#A1A1AA]">
              Chọn tập để bắt đầu phát
            </div>
          ) : playbackMode === "embed" ? (
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
                  "h-full w-full transition-opacity duration-300",
                  isEmbedLoading ? "opacity-0" : "opacity-100",
                )}
              ></iframe>
              {isEmbedLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#09090B] text-[#A1A1AA]">
                  <div className="h-1 w-36 overflow-hidden rounded-full bg-[#27272A]">
                    <div className="h-full w-1/2 animate-pulse bg-[#DFE104]"></div>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em]">
                    Đang tải nguồn dự phòng
                  </p>
                </div>
              ) : null}
            </div>
          ) : playbackMode === "vidstack" && playerSrc ? (
            <MediaPlayer
              ref={mediaPlayerRef}
              title={getEpisodeLabel(selectedEpisode)}
              src={playerSrc}
              load="visible"
              preload="metadata"
              crossOrigin="anonymous"
              googleCast={{ receiverApplicationId: "CC1AD845" }}
              playsInline
              autoPlay
              onProviderChange={onProviderChange}
              className="group/player relative h-full w-full bg-black text-[#FAFAFA]"
            >
              <MediaProvider className="h-full w-full bg-black" />
              <PlayerControlLayer
                allowFallback={Boolean(selectedEpisode.linkEmbed)}
                onFallback={switchToEmbedFallback}
              />
            </MediaPlayer>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm uppercase tracking-wide text-[#A1A1AA]">
              Tập hiện tại chưa có nguồn phát khả dụng.
            </div>
          )}
        </AspectRatio>
      </div>

      {streamHint ? (
        <p
          className={cn(
            "rounded-lg border border-[#DFE104]/40 bg-[#DFE104]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#DFE104]",
            isTheaterMode && "mx-auto w-full max-w-6xl",
          )}
        >
          {streamHint}
        </p>
      ) : null}

      <p
        className={cn(
          "hidden text-[10px] uppercase tracking-[0.14em] text-[#71717A] sm:block",
          isTheaterMode && "mx-auto w-full max-w-6xl",
        )}
      >
        Hotkeys: J/L đổi tập, R reload nguồn, F full screen, T chế độ rạp. Bên trong
        player có play/pause, seek, volume, speed, quality, captions và Google Cast.
      </p>
    </div>
  );
};

export default VideoPlayer;
