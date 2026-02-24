import {
  AirPlayButton,
  CaptionButton,
  Controls,
  FullscreenButton,
  GoogleCastButton,
  MuteButton,
  PIPButton,
  PlayButton,
  SeekButton,
  Spinner,
  Time,
  TimeSlider,
  useAudioOptions,
  useCaptionOptions,
  useMediaPlayer,
  useMediaStore,
  usePlaybackRateOptions,
  useVideoQualityOptions,
  VolumeSlider,
} from '@vidstack/react';
import type React from 'react';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Airplay,
  Cast,
  Expand,
  Gauge,
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
} from 'lucide-react';

export type PlayerControlLayerProps = {
  allowFallback: boolean;
  onFallback?: () => void;
};

const VIDSTACK_ICON_BUTTON_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-sm border border-[#3F3F46] bg-[#09090B]/90 text-[#FAFAFA] transition-all duration-200 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] disabled:cursor-not-allowed disabled:opacity-40';
const VIDSTACK_SELECT_WRAP_CLASS =
  'inline-flex h-8 items-center gap-1 rounded-sm border border-[#3F3F46] bg-[#09090B]/95 px-2';
const VIDSTACK_SELECT_CLASS =
  'h-6 rounded-sm border border-[#3F3F46] bg-[#27272A] px-1 text-[10px] font-bold uppercase tracking-wide text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] disabled:opacity-50';

// Spring animation variants for overlays
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

const springSlideUp = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 8 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
};

const normalizeSelectValue = (value: string) => value.replace(/\s+/g, ' ').trim();

const PlayerControlLayer: React.FC<PlayerControlLayerProps> = ({ allowFallback, onFallback }) => {
  const [isQuickPanelOpen, setIsQuickPanelOpen] = useState(false);
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
    canAirPlay,
    canPlay,
    playbackRate,
    live,
    liveEdge,
    bufferedEnd,
    duration,
    quality,
    qualities,
    autoQuality,
    audioTracks,
    textTracks,
    autoPlayError,
    canGoogleCast,
    canOrientScreen,
    canSetVolume,
    canSetPlaybackRate,
    canSetQuality,
    viewType,
    streamType,
    pointer,
    remotePlaybackState,
    remotePlaybackType,
    remotePlaybackInfo,
    isAirPlayConnected,
    isGoogleCastConnected,
    error,
  } = useMediaStore();
  const audioOptions = useAudioOptions();
  const qualityOptions = useVideoQualityOptions({ auto: true, sort: 'descending' });
  const playbackRateOptions = usePlaybackRateOptions({
    rates: [0.75, 1, 1.25, 1.5, 2],
    normalLabel: '1x',
  });
  const captionOptions = useCaptionOptions({ off: 'Tắt' });

  const isGoogleCast = remotePlaybackType === 'google-cast';
  const isCastConnecting = isGoogleCast && remotePlaybackState === 'connecting';
  const isCastConnected =
    isGoogleCastConnected || (isGoogleCast && remotePlaybackState === 'connected');
  const isAirPlayConnecting =
    remotePlaybackType === 'airplay' && remotePlaybackState === 'connecting';
  const isAirPlayActive =
    isAirPlayConnected || (remotePlaybackType === 'airplay' && remotePlaybackState === 'connected');
  const isRemoteActive = isCastConnected || isAirPlayActive;
  const remoteDeviceName = remotePlaybackInfo?.deviceName?.trim() || 'Thiết bị';
  const remoteLabel = isCastConnected ? 'Google Cast' : 'AirPlay';
  const canInteract = canPlay && !error;

  const finiteDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const bufferedPercent = finiteDuration
    ? Math.max(0, Math.min(100, (bufferedEnd / finiteDuration) * 100))
    : 0;
  const shouldShowInitialSplash = canPlay && !error && !isRemoteActive && !started && paused;

  const activeQualityLabel =
    quality?.height && Number.isFinite(quality.height) ? `${quality.height}p` : null;
  const qualityBadge = autoQuality
    ? activeQualityLabel
      ? `Auto (${activeQualityLabel})`
      : 'Auto'
    : activeQualityLabel;

  const castAriaLabel = isCastConnected
    ? 'Google Cast đang kết nối'
    : isCastConnecting
      ? 'Google Cast đang kết nối thiết bị'
      : 'Google Cast';
  const castTitle = isCastConnected
    ? 'Google Cast: Đã kết nối'
    : isCastConnecting
      ? 'Google Cast: Đang kết nối'
      : 'Google Cast';

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
      <Controls.Root
        className={cn(
          'absolute inset-0 z-[2] flex flex-col justify-end px-1.5 pb-1.5 pt-12 opacity-0 transition-opacity duration-200 group-hover/player:opacity-100 group-data-[paused]/player:opacity-100 group-data-[waiting]/player:opacity-100 group-data-[seeking]/player:opacity-100',
          pointer === 'coarse' && 'opacity-100',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#09090B]/72 via-[#09090B]/26 to-transparent" />

        {live && (
          <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-sm bg-[#09090B]/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                liveEdge ? 'bg-green-500 animate-pulse' : 'bg-red-500',
              )}
            />
            <span className={cn(liveEdge ? 'text-green-500' : 'text-red-500')}>LIVE</span>
          </div>
        )}

        {isRemoteActive && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-sm bg-[#09090B]/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#DFE104]">
            {isCastConnected ? (
              <Cast className="h-3.5 w-3.5" />
            ) : (
              <Airplay className="h-3.5 w-3.5" />
            )}
            <span>
              {remoteLabel}: {remoteDeviceName}
            </span>
          </div>
        )}

        <AnimatePresence>
          {isQuickPanelOpen && (
            <motion.div
              {...springSlideUp}
              className="absolute bottom-14 right-1.5 z-10 flex min-w-[220px] flex-col gap-1 border-2 border-[#3F3F46] bg-[#09090B]/98 p-2 backdrop-blur-sm"
            >
              {audioOptions.length > 1 ? (
                <label className={VIDSTACK_SELECT_WRAP_CLASS} title="Track âm thanh">
                  <Volume2 className="h-3.5 w-3.5 text-[#A1A1AA]" />
                  <select
                    value={audioOptions.selectedValue ?? ''}
                    onChange={(event) => selectOption(audioOptions, event.target.value)}
                    disabled={audioOptions.disabled || !canInteract}
                    className={cn(VIDSTACK_SELECT_CLASS, 'w-full')}
                    aria-label="Chọn track âm thanh"
                  >
                    {audioOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className={VIDSTACK_SELECT_WRAP_CLASS} title="Tốc độ phát">
                <Gauge className="h-3.5 w-3.5 text-[#A1A1AA]" />
                <select
                  value={playbackRateOptions.selectedValue ?? ''}
                  onChange={(event) => selectOption(playbackRateOptions, event.target.value)}
                  disabled={playbackRateOptions.disabled || !canSetPlaybackRate || !canInteract}
                  className={cn(VIDSTACK_SELECT_CLASS, 'w-full')}
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
                <Tv className="h-3.5 w-3.5 text-[#A1A1AA]" />
                <select
                  value={qualityOptions.selectedValue ?? ''}
                  onChange={(event) => selectOption(qualityOptions, event.target.value)}
                  disabled={qualityOptions.disabled || !canSetQuality || !canInteract}
                  className={cn(VIDSTACK_SELECT_CLASS, 'w-full')}
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
                  value={captionOptions.selectedValue ?? ''}
                  onChange={(event) => selectOption(captionOptions, event.target.value)}
                  disabled={captionOptions.disabled || !canInteract}
                  className={cn(VIDSTACK_SELECT_CLASS, 'w-full')}
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
                  disabled={!canInteract}
                >
                  <Server className="h-3.5 w-3.5" />
                  Embed Fallback
                </button>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        <Controls.Group className="w-full">
          {seeking && (
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full animate-pulse rounded-sm bg-[#DFE104] px-2 py-0.5 text-[10px] font-bold text-[#09090B]">
              Đang tìm kiếm...
            </div>
          )}
          <TimeSlider.Root
            className={cn(
              'group/time relative flex h-5 w-full cursor-pointer items-center',
              !canInteract && 'pointer-events-none opacity-60',
            )}
          >
            <TimeSlider.Track className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 overflow-hidden rounded-sm bg-[#27272A] transition-all duration-200 group-hover/time:h-1 group-data-[dragging]/time:h-1">
              <TimeSlider.Progress
                className="absolute inset-y-0 left-0 bg-[#A1A1AA]/50"
                style={{ width: `${bufferedPercent}%` }}
              />
              <TimeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]" />
            </TimeSlider.Track>
            <TimeSlider.Thumb className="pointer-events-none absolute top-1/2 z-[3] block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#09090B] bg-[#DFE104] opacity-0 transition-opacity group-data-[active]/time:opacity-100 group-data-[dragging]/time:opacity-100 group-hover/time:opacity-100" />
          </TimeSlider.Root>
        </Controls.Group>

        <Controls.Group className="mt-1.5 flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <PlayButton
              className={VIDSTACK_ICON_BUTTON_CLASS}
              aria-label="Phát hoặc tạm dừng"
              title="Phát/Tạm dừng (K)"
              disabled={!canInteract}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </PlayButton>

            <SeekButton
              seconds={-10}
              className={cn(VIDSTACK_ICON_BUTTON_CLASS, 'hidden lg:inline-flex')}
              aria-label="Tua lùi 10 giây"
              title="Lùi 10 giây"
              disabled={!canInteract}
            >
              <SkipBack className="h-3.5 w-3.5" />
            </SeekButton>

            <SeekButton
              seconds={10}
              className={cn(VIDSTACK_ICON_BUTTON_CLASS, 'hidden lg:inline-flex')}
              aria-label="Tua tới 10 giây"
              title="Tới 10 giây"
              disabled={!canInteract}
            >
              <SkipForward className="h-3.5 w-3.5" />
            </SeekButton>

            <MuteButton
              className={VIDSTACK_ICON_BUTTON_CLASS}
              aria-label="Bật hoặc tắt tiếng"
              title="Mute (M)"
              disabled={!canInteract}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </MuteButton>

            {canSetVolume ? (
              <div className="group/volume hidden items-center md:flex">
                <VolumeSlider.Root className="h-8 w-20 cursor-pointer items-center px-1">
                  <VolumeSlider.Track className="relative h-1 w-full overflow-hidden rounded-sm bg-[#27272A]">
                    <VolumeSlider.TrackFill className="absolute inset-y-0 left-0 w-[var(--slider-fill)] bg-[#DFE104]" />
                  </VolumeSlider.Track>
                  <VolumeSlider.Thumb className="mt-[-4px] block h-2.5 w-2.5 border border-[#09090B] bg-[#DFE104] opacity-0 transition-opacity group-data-[dragging]/volume:opacity-100 group-hover/volume:opacity-100" />
                </VolumeSlider.Root>
                <span className="ml-0.5 select-none text-[10px] font-bold tabular-nums text-[#A1A1AA]">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            ) : null}

            <div className="ml-0.5 inline-flex min-w-[88px] items-center gap-1 border border-[#3F3F46] bg-[#09090B]/95 px-1.5 py-0.5 text-[11px] font-bold tracking-tight text-[#FAFAFA] sm:min-w-[118px]">
              <Time type="current" className="inline tabular-nums" />
              <span className="hidden text-[#A1A1AA] sm:inline">/</span>
              <Time type="duration" className="hidden tabular-nums text-[#A1A1AA] sm:inline" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <CaptionButton
              className={VIDSTACK_ICON_BUTTON_CLASS}
              aria-label="Bật hoặc tắt phụ đề"
              title="Bật/Tắt phụ đề"
              disabled={captionOptions.disabled || !canInteract}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
            </CaptionButton>

            <GoogleCastButton
              className={cn(
                VIDSTACK_ICON_BUTTON_CLASS,
                !canGoogleCast && 'opacity-45',
                isCastConnecting && 'border-[#DFE104] text-[#DFE104]',
                isCastConnected &&
                  'border-[#DFE104] bg-[#DFE104] text-[#09090B] hover:bg-[#DFE104] hover:text-[#09090B]',
              )}
              aria-label={canGoogleCast ? castAriaLabel : 'Google Cast chưa khả dụng'}
              title={
                canGoogleCast
                  ? castTitle
                  : 'Google Cast chưa khả dụng trên trình duyệt hoặc thiết bị hiện tại'
              }
              disabled={!canGoogleCast || !canInteract}
            >
              <Cast className={cn('h-3.5 w-3.5', isCastConnecting && 'animate-pulse')} />
            </GoogleCastButton>

            {canAirPlay && (
              <AirPlayButton
                className={cn(
                  VIDSTACK_ICON_BUTTON_CLASS,
                  'hidden lg:inline-flex',
                  isAirPlayConnecting && 'border-[#DFE104] text-[#DFE104]',
                  isAirPlayActive &&
                    'border-[#DFE104] bg-[#DFE104] text-[#09090B] hover:bg-[#DFE104] hover:text-[#09090B]',
                )}
                aria-label="AirPlay"
                title="AirPlay"
                disabled={!canInteract}
              >
                <Airplay className="h-3.5 w-3.5" />
              </AirPlayButton>
            )}

            {canPictureInPicture && (
              <PIPButton
                className={cn(
                  VIDSTACK_ICON_BUTTON_CLASS,
                  'hidden sm:inline-flex',
                  pictureInPicture &&
                    'border-[#DFE104] bg-[#DFE104] text-[#09090B] hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]',
                )}
                aria-label="Picture-in-Picture"
                title="Picture-in-Picture (P)"
                disabled={!canInteract}
              >
                <MonitorPlay className="h-3.5 w-3.5" />
              </PIPButton>
            )}

            <button
              type="button"
              className={cn(
                VIDSTACK_ICON_BUTTON_CLASS,
                isQuickPanelOpen &&
                  'border-[#DFE104] bg-[#DFE104] text-[#09090B] hover:bg-[#DFE104] hover:text-[#09090B]',
              )}
              onClick={() => setIsQuickPanelOpen((prev) => !prev)}
              aria-label="Mở cài đặt nhanh"
              aria-pressed={isQuickPanelOpen}
              title="Cài đặt nhanh"
              disabled={!canInteract}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>

            {qualityBadge && qualities.length > 0 && (
              <span className="rounded-sm border border-[#3F3F46] bg-[#09090B]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A1A1AA]">
                {qualityBadge}
              </span>
            )}

            {playbackRate !== 1 && (
              <span className="rounded-sm bg-[#DFE104] px-1.5 py-0.5 text-[10px] font-bold text-[#09090B]">
                {playbackRate}x
              </span>
            )}

            {audioTracks.length > 1 && (
              <span className="hidden rounded-sm border border-[#3F3F46] bg-[#09090B]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A1A1AA] md:inline-flex">
                Audio {audioTracks.length}
              </span>
            )}

            {textTracks.length > 0 && (
              <span className="hidden rounded-sm border border-[#3F3F46] bg-[#09090B]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A1A1AA] md:inline-flex">
                Sub {textTracks.length}
              </span>
            )}

            {(streamType.includes('live') || viewType === 'video') && (
              <span className="hidden rounded-sm border border-[#3F3F46] bg-[#09090B]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A1A1AA] lg:inline-flex">
                {pointer === 'coarse' ? 'Touch' : 'Mouse'}
              </span>
            )}

            <FullscreenButton
              className={cn(
                VIDSTACK_ICON_BUTTON_CLASS,
                !canFullscreen && 'opacity-40 cursor-not-allowed',
              )}
              aria-label={canFullscreen ? 'Toàn màn hình' : 'Toàn màn hình chưa khả dụng'}
              title={
                canFullscreen
                  ? 'Toàn màn hình (F)'
                  : 'Toàn màn hình chưa khả dụng trên trình duyệt này'
              }
              disabled={!canFullscreen}
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

      <AnimatePresence>
        {shouldShowInitialSplash && (
          <motion.div
            {...springOverlay}
            className="absolute inset-0 z-[1] flex items-center justify-center"
          >
            <button
              type="button"
              onClick={() => player?.play()}
              className="group flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#DFE104] bg-[#09090B]/80 text-[#DFE104] transition-all duration-200 hover:scale-110 hover:bg-[#DFE104] hover:text-[#09090B]"
              aria-label="Bắt đầu phát"
            >
              <Play className="h-7 w-7 translate-x-[1px]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRemoteActive && (
          <motion.div
            {...springOverlay}
            className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-black/82 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#DFE104] bg-[#DFE104]/10 text-[#DFE104]">
              {isCastConnected ? <Cast className="h-8 w-8" /> : <Airplay className="h-8 w-8" />}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A1A1AA]">
              Đang phát trên thiết bị từ xa
            </p>
            <p className="text-sm font-bold uppercase tracking-wide text-[#FAFAFA]">
              {remoteDeviceName}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(waiting || error) && (
          <motion.div
            {...springOverlay}
            className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-[#09090B]/70"
          >
            <Spinner.Root className="h-8 w-8 text-[#DFE104]">
              <Spinner.Track className="stroke-[#27272A]" />
              <Spinner.TrackFill className="stroke-[#DFE104]" />
            </Spinner.Root>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FAFAFA]">
              {error ? 'Nguồn phát gặp lỗi.' : 'Đang tải nguồn phát'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ended && !waiting && !error && (
          <motion.div
            {...springScale}
            className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-4 bg-[#09090B]/80"
          >
            <button
              type="button"
              onClick={() => player?.play()}
              className="group flex flex-col items-center gap-2"
              aria-label="Phát lại video"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#DFE104] bg-[#DFE104]/10 text-[#DFE104] transition-transform duration-200 hover:scale-110 hover:bg-[#DFE104] hover:text-[#09090B]">
                <RefreshCw className="h-8 w-8" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-[#FAFAFA]">
                Phát lại
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {autoPlayError && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-sm bg-amber-600/90 px-3 py-1.5 text-[11px] font-bold text-white">
          Autoplay bị chặn. Nhấn play để tiếp tục.
        </div>
      )}

      {canOrientScreen && pointer === 'coarse' && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-[1] rounded-sm border border-[#3F3F46] bg-[#09090B]/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A1A1AA]">
          Auto Rotate Ready
        </div>
      )}
    </>
  );
};

export default PlayerControlLayer;
