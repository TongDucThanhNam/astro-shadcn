import {
	CaptionButton,
	Controls,
	FullscreenButton,
	GoogleCastButton,
	isHLSProvider,
	MediaPlayer,
	type MediaPlayerInstance,
	MediaProvider,
	type MediaProviderAdapter,
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
} from "@vidstack/react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import "@vidstack/react/player/styles/base.css";
import {
	Cast,
	Expand,
	Gauge,
	LayoutPanelTop,
	Maximize2,
	MessageSquareText,
	Minimize2,
	MonitorPlay,
	Pause,
	Play,
	RefreshCw,
	Server,
	SkipBack,
	SkipForward,
	SlidersHorizontal,
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
	movieSlug?: string;
};

type PlaybackMode = "idle" | "vidstack" | "embed";

const TOP_ICON_BUTTON_CLASS =
	"inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[#3F3F46] bg-[#09090B]/90 text-[#FAFAFA] transition-all duration-200 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]";
const VIDSTACK_ICON_BUTTON_CLASS =
	"inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[#3F3F46] bg-[#09090B]/90 text-[#FAFAFA] transition-all duration-200 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] disabled:cursor-not-allowed disabled:opacity-40";
const VIDSTACK_SELECT_WRAP_CLASS =
	"inline-flex h-8 items-center gap-1 rounded-sm border border-[#3F3F46] bg-[#09090B]/95 px-2";
const VIDSTACK_SELECT_CLASS =
	"h-6 rounded-sm border border-[#3F3F46] bg-[#27272A] px-1 text-[10px] font-bold uppercase tracking-wide text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] disabled:opacity-50";

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

const hasPlayableSource = (
	episode: EpisodeSelectionDetail | null | undefined,
) => Boolean(episode?.linkM3u8?.trim() || episode?.linkEmbed?.trim());

const HLS_TYPE_HINT = "application/x-mpegurl";

const isM3u8Url = (url: string) => /\.m3u8(?:$|[?#])/i.test(url);

const toPlayerSrc = (linkM3u8: string): PlayerSrc =>
	isM3u8Url(linkM3u8) ? linkM3u8 : { src: linkM3u8, type: HLS_TYPE_HINT };

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
	episode?.label?.trim() ||
	(episode?.ep ? `Tập ${episode.ep}` : "Chưa chọn tập");

const normalizeSelectValue = (value: string) => {
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized;
};

const extractReasonMessage = (reason: unknown) => {
	if (typeof reason === "string") return reason;
	if (reason instanceof Error) return reason.message;
	if (reason && typeof reason === "object") {
		if ("message" in reason && typeof reason.message === "string") {
			return reason.message;
		}
		if ("toString" in reason && typeof reason.toString === "function") {
			return reason.toString();
		}
	}
	return "";
};

type PlayerControlLayerProps = {
	allowFallback: boolean;
	onFallback?: () => void;
	onTogglePiP?: () => void;
};

const PlayerControlLayer: React.FC<PlayerControlLayerProps> = ({
	allowFallback,
	onFallback,
	onTogglePiP,
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
	const qualityOptions = useVideoQualityOptions({
		auto: true,
		sort: "descending",
	});
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
			<Controls.Root className="absolute inset-0 z-[2] flex flex-col justify-end bg-gradient-to-t from-[#09090B]/96 via-[#09090B]/55 to-transparent px-1.5 pb-1.5 pt-12 opacity-0 transition-opacity duration-200 group-hover/player:opacity-100 group-data-[paused]/player:opacity-100 group-data-[waiting]/player:opacity-100 group-data-[seeking]/player:opacity-100">
				{isQuickPanelOpen ? (
					<div className="absolute bottom-14 right-1.5 z-10 flex min-w-[220px] flex-col gap-1 border-2 border-[#3F3F46] bg-[#09090B]/98 p-2 backdrop-blur-sm">
						<label className={VIDSTACK_SELECT_WRAP_CLASS} title="Tốc độ phát">
							<Gauge className="h-3.5 w-3.5 text-[#A1A1AA]" />
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

						<label
							className={VIDSTACK_SELECT_WRAP_CLASS}
							title="Chất lượng phát"
						>
							<Tv className="h-3.5 w-3.5 text-[#A1A1AA]" />
							<select
								value={qualityOptions.selectedValue ?? ""}
								onChange={(event) =>
									selectOption(qualityOptions, event.target.value)
								}
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
							<MessageSquareText className="h-3.5 w-3.5 text-[#A1A1AA]" />
							<select
								value={captionOptions.selectedValue ?? ""}
								onChange={(event) =>
									selectOption(captionOptions, event.target.value)
								}
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
								className="inline-flex h-8 items-center justify-center gap-1 border border-[#3F3F46] bg-[#27272A] px-2 text-[10px] font-bold uppercase tracking-wide text-[#FAFAFA] transition hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]"
								aria-label="Chuyển sang nguồn dự phòng"
								title="Chuyển sang nguồn dự phòng"
							>
								<Server className="h-3.5 w-3.5" />
								Embed Fallback
							</button>
						) : null}
					</div>
				) : null}

				<Controls.Group className="w-full">
					<TimeSlider.Root className="group/time relative flex h-5 w-full cursor-pointer items-center">
						<TimeSlider.Track className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 overflow-hidden rounded-sm bg-[#27272A] transition-all duration-200 group-hover/time:h-1 group-data-[dragging]/time:h-1">
							<TimeSlider.Progress className="absolute inset-y-0 left-0 w-[var(--slider-progress)] bg-[#A1A1AA]/50" />
							<TimeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]" />
						</TimeSlider.Track>
						<TimeSlider.Thumb
							style={{ left: "var(--slider-fill)" }}
							className="pointer-events-none absolute top-1/2 z-[3] block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#09090B] bg-[#DFE104] opacity-0 transition-opacity group-data-[active]/time:opacity-100 group-data-[dragging]/time:opacity-100 group-hover/time:opacity-100"
						/>
					</TimeSlider.Root>
				</Controls.Group>

				<Controls.Group className="mt-1.5 flex items-center justify-between gap-1.5">
					<div className="flex min-w-0 flex-1 items-center gap-1">
						<PlayButton
							className={VIDSTACK_ICON_BUTTON_CLASS}
							aria-label="Phát hoặc tạm dừng"
							title="Phát/Tạm dừng (K)"
						>
							{paused ? (
								<Play className="h-3.5 w-3.5" />
							) : (
								<Pause className="h-3.5 w-3.5" />
							)}
						</PlayButton>

						<SeekButton
							seconds={-10}
							className={cn(
								VIDSTACK_ICON_BUTTON_CLASS,
								"hidden lg:inline-flex",
							)}
							aria-label="Tua lùi 10 giây"
							title="Lùi 10 giây"
						>
							<SkipBack className="h-3.5 w-3.5" />
						</SeekButton>
						<SeekButton
							seconds={10}
							className={cn(
								VIDSTACK_ICON_BUTTON_CLASS,
								"hidden lg:inline-flex",
							)}
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
							<VolumeSlider.Root className="group/volume hidden h-8 w-20 cursor-pointer items-center px-1 md:flex">
								<VolumeSlider.Track className="relative h-1 w-full overflow-hidden rounded-sm bg-[#27272A]">
									<VolumeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]" />
								</VolumeSlider.Track>
								<VolumeSlider.Thumb className="mt-[-4px] block h-2.5 w-2.5 border border-[#09090B] bg-[#DFE104] opacity-0 transition-opacity group-data-[dragging]/volume:opacity-100 group-hover/volume:opacity-100" />
							</VolumeSlider.Root>
						) : null}

						<div className="ml-0.5 inline-flex min-w-[88px] items-center gap-1 border border-[#3F3F46] bg-[#09090B]/95 px-1.5 py-0.5 text-[11px] font-bold tracking-tight text-[#FAFAFA] sm:min-w-[118px]">
							<Time type="current" className="inline tabular-nums" />
							<span className="hidden text-[#A1A1AA] sm:inline">/</span>
							<Time
								type="duration"
								className="hidden tabular-nums text-[#A1A1AA] sm:inline"
							/>
						</div>
					</div>

					<div className="flex shrink-0 items-center gap-1">
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
								isCastConnecting && "border-[#DFE104] text-[#DFE104]",
								isCastConnected &&
									"border-[#DFE104] bg-[#DFE104] text-[#09090B] hover:bg-[#DFE104] hover:text-[#09090B]",
							)}
							aria-label={
								canGoogleCast ? castAriaLabel : "Google Cast chưa khả dụng"
							}
							title={
								canGoogleCast
									? castTitle
									: "Google Cast chưa khả dụng trên trình duyệt hoặc thiết bị hiện tại"
							}
							disabled={!canGoogleCast}
						>
							<Cast
								className={cn(
									"h-3.5 w-3.5",
									isCastConnecting && "animate-pulse",
								)}
							/>
						</GoogleCastButton>

						<button
							type="button"
							onClick={onTogglePiP}
							className={cn(
								VIDSTACK_ICON_BUTTON_CLASS,
								"hidden sm:inline-flex",
							)}
							aria-label="Picture-in-Picture"
							title="Picture-in-Picture (P)"
						>
							<MonitorPlay className="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							className={cn(
								VIDSTACK_ICON_BUTTON_CLASS,
								isQuickPanelOpen &&
									"border-[#DFE104] bg-[#DFE104] text-[#09090B] hover:bg-[#DFE104] hover:text-[#09090B]",
							)}
							onClick={() => setIsQuickPanelOpen((prev) => !prev)}
							aria-label="Mở cài đặt nhanh"
							aria-pressed={isQuickPanelOpen}
							title="Cài đặt nhanh"
						>
							<SlidersHorizontal className="h-3.5 w-3.5" />
						</button>

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
					</div>
				</Controls.Group>
			</Controls.Root>

			{(waiting || error) && (
				<div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-[#09090B]/70">
					<Spinner.Root className="h-8 w-8 text-[#DFE104]">
						<Spinner.Track className="stroke-[#27272A]" />
						<Spinner.TrackFill className="stroke-[#DFE104]" />
					</Spinner.Root>
					<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FAFAFA]">
						{error ? "Nguồn phát gặp lỗi." : "Đang tải nguồn phát"}
					</p>
				</div>
			)}
		</>
	);
};

const WATCHED_THRESHOLD = 0.85; // consider watched at 85%

const getStorageKey = (movieSlug: string | undefined, ep: string) =>
	movieSlug ? `watch-progress-${movieSlug}-${ep}` : null;

const VideoPlayer: React.FC<VideoPlayerProps> = ({
	playlist = [],
	movieSlug,
}) => {
	const [selectedEpisode, setSelectedEpisode] =
		useState<EpisodeSelectionDetail | null>(null);
	const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("idle");
	const [playerSrc, setPlayerSrc] = useState<PlayerSrc | null>(null);
	const [iframeSrc, setIframeSrc] = useState("");
	const [streamHint, setStreamHint] = useState<string | null>(null);
	const [isEmbedLoading, setIsEmbedLoading] = useState(false);
	const [isTheaterMode, setIsTheaterMode] = useState(false);
	const [autoAdvance, setAutoAdvance] = useState(true);

	const videoSectionRef = useRef<HTMLDivElement>(null);
	const playerFrameRef = useRef<HTMLDivElement>(null);
	const mediaPlayerRef = useRef<MediaPlayerInstance | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const lastSavedTimeRef = useRef<number>(0);
	const hlsFallbackEpisodeRef = useRef<string | null>(null);

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
	const hasNextEpisode =
		currentEpisodeIndex >= 0 && currentEpisodeIndex < playlist.length - 1;

	const emitEpisodeSelection = useCallback(
		(episode: EpisodeSelectionDetail) => {
			window.dispatchEvent(
				new CustomEvent("episodeSelected", { detail: episode }),
			);
		},
		[],
	);

	const applyEpisodeSelection = useCallback(
		(episode: EpisodeSelectionDetail) => {
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
				setPlayerSrc(toPlayerSrc(linkM3u8));
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
		},
		[],
	);

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

	const activateEmbedFallback = useCallback(
		(reason: string) => {
			const fallback = selectedEpisode?.linkEmbed?.trim();
			if (!fallback) {
				setStreamHint(reason);
				return;
			}

			const fallbackKey = `${selectedEpisode?.ep ?? "unknown"}:${selectedEpisode?.linkM3u8 ?? ""}`;
			if (
				hlsFallbackEpisodeRef.current === fallbackKey &&
				playbackMode === "embed"
			) {
				setStreamHint(reason);
				return;
			}

			hlsFallbackEpisodeRef.current = fallbackKey;
			setPlaybackMode("embed");
			setIframeSrc(fallback);
			setIsEmbedLoading(true);
			setStreamHint(reason);
		},
		[playbackMode, selectedEpisode],
	);

	const switchToEmbedFallback = useCallback(() => {
		activateEmbedFallback("Đã chuyển sang nguồn dự phòng embed.");
	}, [activateEmbedFallback]);

	const reloadCurrentSource = useCallback(() => {
		if (!selectedEpisode) return;
		const linkM3u8 = selectedEpisode.linkM3u8?.trim();
		const linkEmbed = selectedEpisode.linkEmbed?.trim();
		setStreamHint(null);

		if (playbackMode === "vidstack" && linkM3u8) {
			setPlayerSrc(toPlayerSrc(withCacheBust(linkM3u8)));
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

	const onProviderChange = useCallback(
		(provider: MediaProviderAdapter | null) => {
			if (!provider || !isHLSProvider(provider)) return;
			// Use direct hls.js import to avoid fragile internal lazy chunks in dev.
			provider.library = () => import("hls.js");
			provider.config = {
				lowLatencyMode: true,
				backBufferLength: 90,
			};
			// Try to get video element from provider
			const providerAny = provider as unknown as { el?: HTMLVideoElement };
			if (providerAny.el) {
				videoRef.current = providerAny.el;
			}
		},
		[],
	);

	const onGoogleCastPromptOpen = useCallback(() => {
		setStreamHint("Đang mở danh sách thiết bị Google Cast...");
	}, []);

	const onGoogleCastPromptClose = useCallback(() => {
		setStreamHint((current) =>
			current === "Đang mở danh sách thiết bị Google Cast..." ? null : current,
		);
	}, []);

	const onGoogleCastPromptError = useCallback(
		(detail: { code?: string } | undefined) => {
			const code = detail?.code;
			switch (code) {
				case "CANCEL":
					setStreamHint("Bạn đã hủy chọn thiết bị Google Cast.");
					return;
				case "NO_DEVICES_AVAILABLE":
					setStreamHint("Không tìm thấy thiết bị Google Cast cùng mạng.");
					return;
				case "CAST_NOT_AVAILABLE":
					setStreamHint(
						"Google Cast chưa sẵn sàng trên trình duyệt hoặc thiết bị này.",
					);
					return;
				case "LOAD_MEDIA_FAILED":
					setStreamHint(
						"Thiết bị Cast không tải được media (thường do URL/CORS).",
					);
					return;
				case "RECEIVER_UNAVAILABLE":
					setStreamHint("Thiết bị nhận Cast không khả dụng.");
					return;
				case "TIMEOUT":
					setStreamHint("Kết nối Google Cast bị timeout.");
					return;
				default:
					setStreamHint(
						code
							? `Google Cast lỗi: ${code}`
							: "Không thể kết nối Google Cast lúc này.",
					);
			}
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
				localStorage.setItem(
					key,
					JSON.stringify({ time: currentTime, progress, duration }),
				);
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
		setStreamHint("Sẽ chuyển tập tiếp theo...");
		setTimeout(() => {
			goToNextEpisode();
		}, 3000);
	}, [autoAdvance, hasNextEpisode, goToNextEpisode]);

	// Toggle Picture-in-Picture
	const togglePiP = useCallback(async () => {
		try {
			if (!videoRef.current) return;

			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			} else {
				await videoRef.current.requestPictureInPicture();
			}
		} catch {
			// PiP not supported or failed
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
	}, [
		onGoogleCastPromptClose,
		onGoogleCastPromptError,
		onGoogleCastPromptOpen,
		playbackMode,
		playerSrc,
	]);

	useEffect(() => {
		hlsFallbackEpisodeRef.current = null;
	}, [selectedEpisode?.ep, selectedEpisode?.linkM3u8]);

	useEffect(() => {
		if (playbackMode !== "vidstack") return;
		const player = mediaPlayerRef.current;
		if (!player) return;

		const handlePlayerError = (event: Event) => {
			const detail = (event as Event & { detail?: unknown }).detail;
			const message = extractReasonMessage(detail).toLowerCase();

			if (message.includes("google cast")) {
				setStreamHint(
					"Google Cast request failed. Kiểm tra thiết bị Cast và mạng.",
				);
				return;
			}

			if (message.includes("decoder") || message.includes("mpegurl")) {
				activateEmbedFallback(
					"HLS không giải mã được trên môi trường hiện tại. Đã chuyển sang embed fallback.",
				);
				return;
			}

			activateEmbedFallback(
				"Nguồn HLS lỗi runtime. Đã chuyển sang embed fallback.",
			);
		};

		player.addEventListener("error", handlePlayerError);
		return () => player.removeEventListener("error", handlePlayerError);
	}, [activateEmbedFallback, playbackMode]);

	useEffect(() => {
		if (playbackMode !== "vidstack") return;

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			const message = extractReasonMessage(event.reason).toLowerCase();
			const isViteOptimizeError =
				message.includes(".vite/deps") ||
				message.includes("outdated optimize dep") ||
				message.includes("dynamically imported module") ||
				message.includes("ns_error_corrupted_content");
			if (!isViteOptimizeError) return;

			activateEmbedFallback(
				"Dev server đang lỗi optimize cache (.vite/deps). Đã chuyển sang embed fallback.",
			);
		};

		window.addEventListener("unhandledrejection", handleUnhandledRejection);
		return () =>
			window.removeEventListener(
				"unhandledrejection",
				handleUnhandledRejection,
			);
	}, [activateEmbedFallback, playbackMode]);

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
		return () =>
			window.removeEventListener("episodeSelected", onEpisodeSelected);
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
				return;
			}
			if (key === "p" && playbackMode === "vidstack") {
				event.preventDefault();
				void togglePiP();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		goToNextEpisode,
		goToPreviousEpisode,
		reloadCurrentSource,
		toggleFullscreen,
		togglePiP,
		playbackMode,
	]);

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
			if (
				savedTime > 0 &&
				videoRef.current &&
				savedTime < videoRef.current.duration - 5
			) {
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

		player.addEventListener(
			"provider-change",
			handleProviderChange as unknown as EventListener,
		);
		player.addEventListener("loadedmetadata", handleLoadedMetadata);
		player.addEventListener("timeupdate", handleTimeUpdate);
		player.addEventListener("ended", handleEnded);
		player.addEventListener("play", handlePlay);
		player.addEventListener("pause", handlePause);

		return () => {
			player.removeEventListener(
				"provider-change",
				handleProviderChange as unknown as EventListener,
			);
			player.removeEventListener("loadedmetadata", handleLoadedMetadata);
			player.removeEventListener("timeupdate", handleTimeUpdate);
			player.removeEventListener("ended", handleEnded);
			player.removeEventListener("play", handlePlay);
			player.removeEventListener("pause", handlePause);
			if (timeUpdateInterval) {
				clearInterval(timeUpdateInterval);
			}
		};
	}, [loadProgress, saveProgress, handleVideoEnd, clearProgress]);

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
					"flex flex-wrap items-center justify-between gap-1.5 border-2 border-[#3F3F46] bg-[#09090B] px-2 py-1.5",
					isTheaterMode && "mx-auto w-full max-w-6xl",
				)}
			>
				<div className="min-w-0">
					<p className="truncate text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] sm:text-[15px]">
						{getEpisodeLabel(selectedEpisode)}
					</p>
				</div>

				<div className="flex items-center gap-1.5">
					<span className="inline-flex items-center gap-1 border border-[#3F3F46] bg-[#09090B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A1A1AA]">
						<Server className="h-3 w-3" />
						{sourceLabel}
					</span>
					{selectedEpisode?.serverName ? (
						<span className="border border-[#DFE104] bg-[#DFE104]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#DFE104]">
							{selectedEpisode.serverName}
						</span>
					) : null}
					{hasNextEpisode && playbackMode === "vidstack" && (
						<button
							type="button"
							onClick={() => setAutoAdvance((prev) => !prev)}
							className={cn(
								"inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition",
								autoAdvance
									? "border-[#DFE104] bg-[#DFE104] text-[#09090B]"
									: "border-[#3F3F46] bg-[#09090B] text-[#A1A1AA]",
							)}
							title={
								autoAdvance
									? "Auto-advance đang bật - click để tắt"
									: "Auto-advance đang tắt - click để bật"
							}
						>
							{autoAdvance ? "Auto" : "Auto ✕"}
						</button>
					)}
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
					"relative overflow-hidden border-2 border-[#3F3F46] bg-[#09090B]",
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
									<div className="h-1 w-36 overflow-hidden rounded-sm bg-[#27272A]">
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
							className="group/player relative h-full w-full bg-[#09090B] text-[#FAFAFA]"
						>
							<MediaProvider className="h-full w-full bg-[#09090B]" />
							<PlayerControlLayer
								allowFallback={Boolean(selectedEpisode.linkEmbed)}
								onFallback={switchToEmbedFallback}
								onTogglePiP={togglePiP}
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
						"border border-[#DFE104] bg-[#DFE104]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#DFE104]",
						isTheaterMode && "mx-auto w-full max-w-6xl",
					)}
				>
					{streamHint}
				</p>
			) : null}

			<p
				className={cn(
					"hidden text-[10px] uppercase tracking-[0.12em] text-[#A1A1AA] md:block",
					isTheaterMode && "mx-auto w-full max-w-6xl",
				)}
			>
				Hotkeys: J/L đổi tập, R reload, F full screen, T theater, P PiP.
				Autoadvance: {autoAdvance ? "bật" : "tắt"} (click để đổi).
			</p>
		</div>
	);
};

export default VideoPlayer;
