import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SphereVisualizer } from './components/SphereVisualizer';
import { PlayerControls } from './components/PlayerControls';
import { Song, AudioState } from './types';
import { ListMusic, Info } from 'lucide-react';
import { SciFiButton } from './components/SciFiButton';

const App: React.FC = () => {
  // Audio Core
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // State
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
  });

  // Initialization (Browser requires user gesture to start AudioContext)
  const initializeAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512; // Controls visual resolution

    audioContextRef.current = ctx;
    analyserRef.current = analyser;

    // Create Audio Element
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    // Connect nodes
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = source;

    // Event Listeners for Audio Element
    audio.addEventListener('timeupdate', () => {
      setAudioState(prev => ({ ...prev, currentTime: audio.currentTime }));
    });
    audio.addEventListener('loadedmetadata', () => {
      setAudioState(prev => ({ ...prev, duration: audio.duration }));
    });
    audio.addEventListener('ended', handleNext);

    setIsInitialized(true);
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isInitialized) initializeAudioContext();

    const files = e.target.files;
    if (files && files.length > 0) {
      const newSongs: Song[] = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        url: URL.createObjectURL(file),
      }));

      setSongs(prev => [...prev, ...newSongs]);
      
      // If no song playing, start first new one
      if (currentSongIndex === -1) {
        setCurrentSongIndex(songs.length); // Points to the first of the newly added
        playSong(newSongs[0]);
      }
    }
  };

  const playSong = async (song: Song) => {
    if (!audioRef.current || !audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    audioRef.current.src = song.url;
    audioRef.current.volume = audioState.volume;
    
    try {
        await audioRef.current.play();
        setIsPlaying(true);
        setAudioState(prev => ({ ...prev, isPlaying: true }));
    } catch (err) {
        console.error("Playback failed", err);
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (audioState.isPlaying) {
      audioRef.current.pause();
    } else {
      if (currentSongIndex === -1 && songs.length > 0) {
          playSong(songs[0]);
          setCurrentSongIndex(0);
          return;
      }
      audioRef.current.play();
    }
    const newState = !audioState.isPlaying;
    setIsPlaying(newState);
    setAudioState(prev => ({ ...prev, isPlaying: newState }));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setAudioState(prev => ({ ...prev, volume: vol }));
    }
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % songs.length;
    setCurrentSongIndex(nextIndex);
    playSong(songs[nextIndex]);
  };

  const handlePrev = () => {
     if (songs.length === 0) return;
     const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
     setCurrentSongIndex(prevIndex);
     playSong(songs[prevIndex]);
  };

  const selectSong = (index: number) => {
      setCurrentSongIndex(index);
      playSong(songs[index]);
  }

  // Effect to clean up object URLs when songs change significantly or unmount
  useEffect(() => {
    return () => {
      // Cleanup logic if needed
    };
  }, []);

  const currentSong = songs[currentSongIndex];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* 3D Visualizer Background */}
      <SphereVisualizer 
        analyser={analyserRef.current} 
        isPlaying={isPlaying} 
      />

      {/* Main UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
        
        {/* Header / Top Bar */}
        <header className="p-6 flex justify-between items-start pointer-events-auto bg-gradient-to-b from-black/80 to-transparent">
            <div>
                <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-sci-cyan to-blue-500 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                    SPHERE<span className="text-white font-thin">BEAT</span>
                </h1>
                <p className="text-xs text-cyan-500/60 tracking-[0.3em] mt-1">AUDIO VISUALIZATION SYSTEM</p>
            </div>
            
            <div className="flex gap-2">
                <SciFiButton 
                    icon={<ListMusic className="w-5 h-5" />} 
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    active={showPlaylist}
                />
            </div>
        </header>

        {/* Playlist Sidebar (Floating) */}
        <div className={`
            absolute top-24 right-6 w-80 max-h-[60vh] overflow-y-auto 
            bg-sci-panel backdrop-blur-md border border-cyan-900/50 
            transition-transform duration-500 pointer-events-auto z-20
            ${showPlaylist ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}
        `}>
            <div className="p-4 border-b border-cyan-900/50 text-xs font-mono text-sci-cyan uppercase tracking-widest flex justify-between items-center">
                <span>Playlist Queue</span>
                <span className="bg-cyan-900/50 px-2 py-0.5 rounded text-white">{songs.length}</span>
            </div>
            <ul className="p-2">
                {songs.length === 0 ? (
                    <li className="text-gray-500 text-sm text-center py-8 italic">
                        No audio data loaded.<br/>Use 'LOAD' below.
                    </li>
                ) : (
                    songs.map((song, idx) => (
                        <li key={song.id}>
                            <button 
                                onClick={() => selectSong(idx)}
                                className={`
                                    w-full text-left px-3 py-3 text-sm font-mono truncate transition-all duration-200
                                    border-l-2
                                    ${currentSongIndex === idx 
                                        ? 'bg-cyan-900/30 text-sci-cyan border-sci-cyan shadow-[inset_10px_0_20px_-10px_rgba(0,243,255,0.2)]' 
                                        : 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-gray-500'}
                                `}
                            >
                                {idx + 1}. {song.name}
                            </button>
                        </li>
                    ))
                )}
            </ul>
        </div>

        {/* Center Start Overlay (If not initialized) */}
        {!isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm z-30">
                <div className="text-center p-8 border border-sci-cyan/30 bg-black/80 shadow-[0_0_50px_rgba(0,243,255,0.1)] max-w-md">
                    <Info className="w-12 h-12 text-sci-cyan mx-auto mb-4 animate-pulse" />
                    <h2 className="text-2xl font-bold mb-2">SYSTEM READY</h2>
                    <p className="text-gray-400 mb-6 text-sm">
                        Audio context requires user interaction to initialize. 
                        Load files to generate visualization.
                    </p>
                    <label className="cursor-pointer">
                        <input type="file" className="hidden" accept="audio/*" multiple onChange={handleUpload} />
                        <div className="inline-block px-8 py-3 bg-sci-cyan text-black font-bold tracking-widest hover:bg-white hover:shadow-[0_0_20px_#00f3ff] transition-all">
                            INITIALIZE & LOAD
                        </div>
                    </label>
                </div>
            </div>
        )}
      </div>

      {/* Bottom Controls */}
      <PlayerControls 
        audioState={audioState}
        onPlayPause={togglePlayPause}
        onSeek={handleSeek}
        onVolumeChange={handleVolume}
        onNext={handleNext}
        onPrev={handlePrev}
        onUpload={handleUpload}
        currentSongName={currentSong?.name || null}
      />
    </div>
  );
};

export default App;