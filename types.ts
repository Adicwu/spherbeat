export interface Song {
  id: string;
  file: File;
  name: string;
  duration?: number;
  url: string;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}
