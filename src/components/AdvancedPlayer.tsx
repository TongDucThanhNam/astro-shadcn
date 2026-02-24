// AdvancedPlayer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { MediaFox, formatTime, type VideoTrackInfo, type AudioTrackInfo } from '@mediafox/core';

interface AdvancedPlayerProps {
  src: string | File | Blob;
}

export function AdvancedPlayer({ src }: AdvancedPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<MediaFox>();
  const [state, setState] = useState<any>(null);
  const [videoTracks, setVideoTracks] = useState<VideoTrackInfo[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;

    const player = new MediaFox({
      renderTarget: canvasRef.current,
      volume,
    });

    playerRef.current = player;

    // Subscribe to state
    const unsubscribe = player.subscribe(setState);

    // Load media
    player.load(src).then(() => {
      // Get tracks
      setVideoTracks(player.getVideoTracks());
      setAudioTracks(player.getAudioTracks());
    });

    // Handle metadata
    player.on('loadedmetadata', (info) => {
      console.log('Media info:', info);
    });

    return () => {
      unsubscribe.unsubscribe();
      player.dispose();
    };
  }, [src]);

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (playerRef.current) {
      playerRef.current.volume = value;
    }
  };

  // Playback rate
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.playbackRate = rate;
    }
  };

  // Track selection
  const handleVideoTrackChange = async (trackId: string) => {
    setSelectedVideo(trackId);
    await playerRef.current?.selectVideoTrack(trackId);
  };

  const handleAudioTrackChange = async (trackId: string) => {
    setSelectedAudio(trackId);
    await playerRef.current?.selectAudioTrack(trackId);
  };

  // Screenshot
  const takeScreenshot = async () => {
    const blob = await playerRef.current?.screenshot({
      format: 'png',
    });

    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'screenshot.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const player = playerRef.current;
      if (!player) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (player.paused) {
            player.play();
          } else {
            player.pause();
          }
          break;
        case 'ArrowLeft':
          player.currentTime = Math.max(0, player.currentTime - 5);
          break;
        case 'ArrowRight':
          player.currentTime = Math.min(player.duration, player.currentTime + 5);
          break;
        case 'ArrowUp':
          player.volume = Math.min(1, player.volume + 0.1);
          break;
        case 'ArrowDown':
          player.volume = Math.max(0, player.volume - 0.1);
          break;
        case 'm':
          player.muted = !player.muted;
          break;
        case 'f':
          // Toggle fullscreen
          if (canvasRef.current?.requestFullscreen) {
            canvasRef.current.requestFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!state) {
    console.log('State not ready yet', src);
    return <div>Loading...</div>;
  }

  return (
    <div className="advanced-player">
      <canvas ref={canvasRef} className="video-canvas" style={{ width: '100%', height: 'auto' }} />

      <div className="controls">
        {/* Playback controls */}
        <div className="control-row">
          <button onClick={() => playerRef.current?.play()}>▶️</button>
          <button onClick={() => playerRef.current?.pause()}>⏸</button>
          <button onClick={() => playerRef.current?.stop()}>⏹</button>

          <span className="time">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          <button onClick={takeScreenshot}>Screenshot</button>
        </div>

        {/* Progress bar */}
        <div className="control-row">
          <input
            type="range"
            min="0"
            max={state.duration}
            value={state.currentTime}
            onChange={(e) => {
              playerRef.current!.currentTime = parseFloat(e.target.value);
            }}
            style={{ width: '100%' }}
          />
        </div>

        {/* Volume and rate controls */}
        <div className="control-row">
          <label>
            Volume:
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
            />
            {Math.round(volume * 100)}%
          </label>

          <label>
            Speed:
            <select
              value={playbackRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </label>
        </div>

        {/* Track selection */}
        {videoTracks.length > 1 && (
          <div className="control-row">
            <label>
              Video Track:
              <select
                value={selectedVideo}
                onChange={(e) => handleVideoTrackChange(e.target.value)}
              >
                {videoTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.codec} {track.width}x{track.height}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {audioTracks.length > 1 && (
          <div className="control-row">
            <label>
              Audio Track:
              <select
                value={selectedAudio}
                onChange={(e) => handleAudioTrackChange(e.target.value)}
              >
                {audioTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.language || track.codec} {track.channels}ch
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
