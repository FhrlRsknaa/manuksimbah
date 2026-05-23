export interface GameConfig {
  gravity: number; // Low gravity for gentle fall ("jatuhnya agak lambat")
  jumpForce: number; // Force applied when flapping
  pipeSpeed: number; // Scrolling speed
  pipeSpawnInterval: number; // Match spacing
  pipeGap: number; // Height of gap between top and bottom pipes
  minPipeHeight: number;
}

export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER';
export type GameMode = 'classic' | 'race' | 'hockey';

export interface RaceObstacle {
  x: number;
  width: number;
  height: number;
  type: 'block' | 'chasm';
  passed: boolean;
}

export interface BirdState {
  y: number;
  vy: number;
  radius: number;
  angle: number;
  targetAngle: number;
  frame: number;
  flapTime: number;
}

export interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
  width: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'feather' | 'sparkle' | 'leaf';
  rotation: number;
  vRotation: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  jumps: number;
  pipesPassed: number;
}
