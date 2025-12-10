import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Upload, Music, VolumeX } from 'lucide-react';
import { SciFiButton } from './SciFiButton';
import { AudioState } from '../types';

interface PlayerControlsProps {
  audioState: AudioState;
  onPlayPause: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onPrev: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentSongName: string | null;
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  audioState,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onNext,
  onPrev,
  onUpload,
  currentSongName,
}) => {
  const duration = (isFinite(audioState.duration) && !isNaN(audioState.duration)) ? audioState.duration : 0;
  const currentTime = (isFinite(audioState.currentTime) && !isNaN(audioState.currentTime)) ? audioState.currentTime : 0;
  
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="absolute bottom-0 left-0 w-full z-10">
      {/* Glass Panel */}
      <div className="bg-sci-panel backdrop-blur-md border-t border-cyan-900/50 p-6 pb-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          
          {/* Song Info & Progress */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end text-sci-cyan font-mono text-sm">
               <div className="flex items-center gap-2 overflow-hidden">
                  <Music className="w-4 h-4 animate-pulse" />
                  <span className="truncate max-w-[200px] md:max-w-md">
                    {currentSongName || "SYSTEM STANDBY - AWAITING DATA"}
                  </span>
               </div>
               <div className="flex gap-1 text-xs text-cyan-400/70">
                 <span>{formatTime(currentTime)}</span>
                 <span>/</span>
                 <span>{formatTime(duration)}</span>
               </div>
            </div>
            
            {/* Custom Range Slider */}
            <div className="relative w-full h-1 group cursor-pointer">
              <div className="absolute top-0 left-0 w-full h-full bg-cyan-900/50 rounded-full"></div>
              <div 
                className="absolute top-0 left-0 h-full bg-sci-cyan rounded-full shadow-[0_0_10px_#00f3ff]"
                style={{ width: `${progressPercent}%` }}
              ></div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={onSeek}
                className="absolute top-[-5px] left-0 w-full h-4 opacity-0 cursor-pointer z-20"
              />
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between mt-2">
            
            {/* Upload Button */}
            <div className="relative">
                <input 
                    type="file" 
                    id="audio-upload" 
                    accept="audio/*" 
                    multiple 
                    onChange={onUpload} 
                    className="hidden" 
                />
                <label htmlFor="audio-upload">
                    <SciFiButton as="span" icon={<Upload />} label="Load" className="cursor-pointer" />
                </label>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-4">
              <button onClick={onPrev} className="text-gray-400 hover:text-sci-cyan transition-colors">
                <SkipBack className="w-6 h-6" />
              </button>
              
              <button 
                onClick={onPlayPause}
                className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-sci-cyan bg-cyan-900/20 text-sci-cyan shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:bg-sci-cyan hover:text-black transition-all duration-300"
              >
                {audioState.isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current pl-1" />}
              </button>

              <button onClick={onNext} className="text-gray-400 hover:text-sci-cyan transition-colors">
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 w-32 group">
              <button 
                onClick={() => {
                   // Toggle mute logic could go here
                }}
                className="text-gray-400 group-hover:text-sci-cyan transition-colors"
              >
                {audioState.volume === 0 ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="relative w-full h-1">
                 <div className="absolute top-0 left-0 w-full h-full bg-cyan-900/50 rounded-full"></div>
                 <div 
                   className="absolute top-0 left-0 h-full bg-sci-cyan rounded-full"
                   style={{ width: `${audioState.volume * 100}%` }}
                 ></div>
                 <input
                   type="range"
                   min="0"
                   max="1"
                   step="0.01"
                   value={audioState.volume}
                   onChange={onVolumeChange}
                   className="absolute top-[-5px] left-0 w-full h-4 opacity-0 cursor-pointer"
                 />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};