import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import {
  Expand,
  Minimize2,
  RefreshCw,
  SkipBack,
  SkipForward,
} from "lucide-react";

type EpisodeSelectionDetail = {
  ep: string;
  label?: string;
  linkEmbed: string;
  linkM3u8?: string;
  serverName?: string;
};

type VideoPlayerProps = {
  playlist?: EpisodeSelectionDetail[];
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  return target.isContentEditable;
};

const withCacheBust = (url: string) => {
  try {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set("_r", String(Date.now()));
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}_r=${Date.now()}`;
  }
};

const PLAYER_BUTTON_CLASS =
  "inline-flex items-center gap-2 border-2 border-[#3F3F46] bg-[#09090B] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#FAFAFA] transition hover:border-[#DFE104] hover:text-[#DFE104] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]";

const VideoPlayer: React.FC<VideoPlayerProps> = ({ playlist = [] }) => {
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeSelectionDetail | null>(
    null,
  );
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [isFrameLoading, setIsFrameLoading] = useState<boolean>(false);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const playerFrameRef = useRef<HTMLDivElement>(null);

  const currentEpisodeIndex = useMemo(() => {
    if (!selectedEpisode) {
      return -1;
    }

    const matchByLinkAndEpisode = playlist.findIndex(
      (episode) =>
        episode.linkEmbed === selectedEpisode.linkEmbed &&
        episode.ep === selectedEpisode.ep,
    );
    if (matchByLinkAndEpisode >= 0) {
      return matchByLinkAndEpisode;
    }

    const matchByEpisode = playlist.findIndex(
      (episode) => episode.ep === selectedEpisode.ep,
    );
    return matchByEpisode;
  }, [playlist, selectedEpisode]);

  const hasPreviousEpisode = currentEpisodeIndex > 0;
  const hasNextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < playlist.length - 1;

  const emitEpisodeSelection = useCallback((episode: EpisodeSelectionDetail) => {
    window.dispatchEvent(
      new CustomEvent("episodeSelected", {
        detail: episode,
      }),
    );
  }, []);

  const goToEpisodeIndex = useCallback(
    (index: number) => {
      const episode = playlist[index];
      if (!episode) {
        return;
      }
      emitEpisodeSelection(episode);
    },
    [emitEpisodeSelection, playlist],
  );

  const goToPreviousEpisode = useCallback(() => {
    if (!hasPreviousEpisode) {
      return;
    }
    goToEpisodeIndex(currentEpisodeIndex - 1);
  }, [currentEpisodeIndex, goToEpisodeIndex, hasPreviousEpisode]);

  const goToNextEpisode = useCallback(() => {
    if (!hasNextEpisode) {
      return;
    }
    goToEpisodeIndex(currentEpisodeIndex + 1);
  }, [currentEpisodeIndex, goToEpisodeIndex, hasNextEpisode]);

  const reloadCurrentEmbed = useCallback(() => {
    if (!selectedEpisode) {
      return;
    }
    setIsFrameLoading(true);
    setIframeSrc(withCacheBust(selectedEpisode.linkEmbed));
  }, [selectedEpisode]);

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
      // Ignore fullscreen API errors from unsupported contexts.
    }
  }, []);

  useEffect(() => {
    const handleEpisodeSelected = (event: Event) => {
      const detail = (event as CustomEvent<EpisodeSelectionDetail>).detail;

      if (!detail?.ep || !detail.linkEmbed) {
        return;
      }

      setSelectedEpisode(detail);
      setIframeSrc(detail.linkEmbed);
      setIsFrameLoading(true);

      if (videoSectionRef.current) {
        setTimeout(() => {
          const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          videoSectionRef.current?.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }, 100);
      }
    };

    window.addEventListener("episodeSelected", handleEpisodeSelected);

    return () => {
      window.removeEventListener("episodeSelected", handleEpisodeSelected);
    };
  }, []);

  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

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
        reloadCurrentEmbed();
        return;
      }

      if (key === "t") {
        event.preventDefault();
        setIsTheaterMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [goToNextEpisode, goToPreviousEpisode, reloadCurrentEmbed, toggleFullscreen]);

  useEffect(() => {
    if (!isTheaterMode) {
      return;
    }

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

  const currentLabel =
    selectedEpisode?.label ??
    (selectedEpisode?.ep ? `Tập ${selectedEpisode.ep}` : "Chưa chọn tập");

  return (
    <div
      ref={videoSectionRef}
      className={cn(
        "w-full space-y-3 px-0",
        isTheaterMode && "fixed inset-0 z-[75] bg-[#09090B]/95 p-3 sm:p-6",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-2 border-[#3F3F46] bg-[#09090B]/95 p-2",
          isTheaterMode && "mx-auto w-full max-w-6xl",
        )}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#A1A1AA]">
            Player Control
          </p>
          <p className="truncate text-sm font-bold uppercase tracking-wide text-[#FAFAFA]">
            {currentLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousEpisode}
            className={PLAYER_BUTTON_CLASS}
            disabled={!hasPreviousEpisode}
            aria-label="Tập trước"
          >
            <SkipBack className="h-3.5 w-3.5" />
            Trước
          </button>
          <button
            type="button"
            onClick={goToNextEpisode}
            className={PLAYER_BUTTON_CLASS}
            disabled={!hasNextEpisode}
            aria-label="Tập tiếp theo"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Sau
          </button>
          <button
            type="button"
            onClick={reloadCurrentEmbed}
            className={PLAYER_BUTTON_CLASS}
            disabled={!selectedEpisode}
            aria-label="Tải lại nguồn phát"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className={PLAYER_BUTTON_CLASS}
            disabled={!selectedEpisode}
            aria-label="Toàn màn hình"
          >
            <Expand className="h-3.5 w-3.5" />
            Full
          </button>
          <button
            type="button"
            onClick={() => setIsTheaterMode((prev) => !prev)}
            className={PLAYER_BUTTON_CLASS}
            disabled={!selectedEpisode}
            aria-label="Bật chế độ rạp"
          >
            {isTheaterMode ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Expand className="h-3.5 w-3.5" />
            )}
            {isTheaterMode ? "Thoát rạp" : "Chế độ rạp"}
          </button>
        </div>
      </div>

      <div
        ref={playerFrameRef}
        className={cn("relative", isTheaterMode && "mx-auto w-full max-w-6xl")}
      >
        <AspectRatio
          ratio={16 / 9}
          className="overflow-hidden border-2 border-[#3F3F46] bg-[#09090B]"
        >
          {selectedEpisode ? (
            <div className="relative h-full w-full">
              <iframe
                src={iframeSrc || selectedEpisode.linkEmbed}
                title={`Trình phát ${selectedEpisode.label ?? selectedEpisode.ep}`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setIsFrameLoading(false)}
                className={cn(
                  "h-full w-full transition-opacity duration-300",
                  isFrameLoading ? "opacity-0" : "opacity-100",
                )}
              ></iframe>
              {isFrameLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#09090B] text-[#A1A1AA]">
                  <div className="h-1 w-36 overflow-hidden bg-[#27272A]">
                    <div className="h-full w-1/2 animate-pulse bg-[#DFE104]"></div>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em]">
                    Đang tải nguồn phát
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm uppercase tracking-wide text-[#A1A1AA]">
              Chọn tập để bắt đầu phát
            </div>
          )}
        </AspectRatio>
      </div>

      <p
        className={cn(
          "text-xs uppercase tracking-[0.2em] text-[#71717A]",
          isTheaterMode && "mx-auto w-full max-w-6xl",
        )}
      >
        Hotkeys: J/L đổi tập, R reload, F full screen, T chế độ rạp.
      </p>
    </div>
  );
};

export default VideoPlayer;
