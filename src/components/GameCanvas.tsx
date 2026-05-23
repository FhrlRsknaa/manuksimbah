import React, { useEffect, useRef, useState } from 'react';
import { GameConfig, GameState, BirdState, Pipe, Particle, RaceObstacle } from '../types';
import { gameAudio } from '../utils/audio';
import defaultBirdUrl from '../assets/images/bird.png';
import fallbackBgUrl from '../assets/images/manuk_mbah_background_1779513507940.png';

interface GameCanvasProps {
  gameState: GameState;
  onGameOver: (score: number, pipesPassed: number, JumpsCount: number) => void;
  onScoreUpdate: (score: number) => void;
  customBirdUrl: string | null;
  difficulty: 'easy' | 'hard' | 'ultimate';
  gameMode: 'classic' | 'race';
}

const EASY_CONFIG: GameConfig = {
  gravity: 0.12, // Lighter fall ("santai / agak lambat")
  jumpForce: -3.5, // Responsive floating jump
  pipeSpeed: 1.8, // Calmer scrolling speed
  pipeSpawnInterval: 140, // Space items out more
  pipeGap: 175, // Rich room for flight
  minPipeHeight: 60,
};

const HARD_CONFIG: GameConfig = {
  gravity: 0.22, // High physical gravity
  jumpForce: -4.8, // Fast, punchy jump to fight gravity
  pipeSpeed: 3.2, // Intense scrolling velocity
  pipeSpawnInterval: 95, // Rapid incoming obstacles!
  pipeGap: 145, // Tighter pass boundaries
  minPipeHeight: 60,
};

const ULTIMATE_CONFIG: GameConfig = {
  gravity: 0.42, // Super fast fall, very heavy physics!
  jumpForce: -7.2, // Punchy and quick heavy jump
  pipeSpeed: 7.2, // Crazy fast scrolling speed (super cepat, paling tercepat!)
  pipeSpawnInterval: 38, // Extremely short spawn intervals - obstacles come rapid-fire!
  pipeGap: 110, // Extreme tight gap (paling susah!)
  minPipeHeight: 50,
};

const DEFAULT_BIRD: BirdState = {
  y: 250,
  vy: 0,
  radius: 22,
  angle: 0,
  targetAngle: 0,
  frame: 0,
  flapTime: 0,
};

// Internal canvas sizing
const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 620;

export default function GameCanvas({
  gameState,
  onGameOver,
  onScoreUpdate,
  customBirdUrl,
  difficulty,
  gameMode
}: GameCanvasProps) {
  const config = 
    difficulty === 'ultimate' ? ULTIMATE_CONFIG :
    difficulty === 'hard' ? HARD_CONFIG : EASY_CONFIG;

  // Stale-defense reference layer
  const currentPropsRef = useRef({ difficulty, gameMode, config });
  useEffect(() => {
    currentPropsRef.current = { difficulty, gameMode, config };
  }, [difficulty, gameMode, config]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States to keep track for statistics
  const scoreRef = useRef<number>(0);
  const jumpsRef = useRef<number>(0);
  const pipesPassedRef = useRef<number>(0);
  const activeLoopRef = useRef<number | null>(null);

  // Loaded assets refs
  const birdImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const processedBirdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game elements
  const birdRef = useRef<BirdState>({ ...DEFAULT_BIRD });
  const pipesRef = useRef<Pipe[]>([]);
  const raceObstaclesRef = useRef<RaceObstacle[]>([]);
  const jumpsInAirRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const backgroundScrollRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Monitor custom URL to reset loaded assets
  useEffect(() => {
    if (customBirdUrl) {
      loadCustomBirdImage(customBirdUrl);
    } else {
      loadDefaultBirdImage();
    }
  }, [customBirdUrl]);

  // Initial load
  useEffect(() => {
    // Load background
    const bg = new Image();
    // Prioritize standard local path
    bg.src = '/src/assets/images/background.png';
    bg.onload = () => {
      bgImgRef.current = bg;
    };
    bg.onerror = () => {
      // Fallback path if background.png is not yet populated
      const bgFallback = new Image();
      bgFallback.src = fallbackBgUrl;
      bgFallback.onload = () => {
        bgImgRef.current = bgFallback;
      };
    };

    if (!customBirdUrl) {
      loadDefaultBirdImage();
    }

    // Set keyboard listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'PLAYING') {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          triggerFlap();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopGameLoop();
    };
  }, [gameState, customBirdUrl, gameMode, difficulty]);

  const loadDefaultBirdImage = () => {
    const bird = new Image();
    // Prioritize standard local path using ESM import for robust resolution & load speed
    bird.src = defaultBirdUrl;
    bird.onload = () => {
      birdImgRef.current = bird;
      processBirdTransparency();
    };
    bird.onerror = () => {
      // If the file is empty, corrupted, or not yet prepared, reset image refs
      // to fallback cleanly to the beautiful vector representation of "Mbah" in-canvas.
      birdImgRef.current = null;
      processedBirdCanvasRef.current = null;
    };
  };

  const loadCustomBirdImage = (url: string) => {
    const bird = new Image();
    bird.src = url;
    bird.onload = () => {
      birdImgRef.current = bird;
      processBirdTransparency();
    };
  };

  // Chroma key helper: Removes solid white/light grey background pixels from generated assets 
  // so the bird looks clean, isolated, and premium in-canvas.
  const processBirdTransparency = () => {
    const img = birdImgRef.current;
    if (!img) return;

    // Create an offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = img.width || 512;
    offscreen.height = img.height || 512;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // Draw raw image
    ctx.drawImage(img, 0, 0);

    try {
      const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
      const data = imgData.data;

      // Scan every pixel: examine if R, G, B are all very close to white 
      // (or if close to solid corners on a clean canvas)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        // Is it close to white background?
        if (r > 235 && g > 235 && b > 235) {
          data[i + 3] = 0; // Set Alpha to 0 (Fully transparent)
        }
      }

      ctx.putImageData(imgData, 0, 0);
      processedBirdCanvasRef.current = offscreen;
    } catch (e) {
      console.warn('Cross-origin/local image blocking pixel reading, fallback to normal img', e);
      processedBirdCanvasRef.current = null;
    }
  };

  // Trigger flap action
  const triggerFlap = () => {
    if (gameState !== 'PLAYING') return;

    const { gameMode: activeGameMode, config: activeConfig } = currentPropsRef.current;

    if (activeGameMode === 'race') {
      const groundLimit = CANVAS_HEIGHT - 100;
      const isCurrentlyOnGround = birdRef.current.y >= groundLimit - 50;

      if (isCurrentlyOnGround) {
        jumpsInAirRef.current = 1;
      } else if (jumpsInAirRef.current < 2) {
        jumpsInAirRef.current += 1;
      } else {
        // Already double jumped, block further jumps in mid-air
        return;
      }

      // Stronger upward impulse to jump over gaps
      birdRef.current.vy = activeConfig.jumpForce * 1.35;
      jumpsRef.current += 1;
      gameAudio.playJumpSound();

      // Spawn puff smoke/sparkle tyre particles
      spawnParticles(
        90,
        birdRef.current.y + 16,
        'sparkle',
        6,
        '#d1d5db' // Grey tire smoke
      );
    } else {
      // Apply simple slow upward velocity
      birdRef.current.vy = activeConfig.jumpForce;
      birdRef.current.targetAngle = -0.35; // Tilt up
      birdRef.current.flapTime = 10;
      jumpsRef.current += 1;

      // Play synthesized wing flap
      gameAudio.playJumpSound();

      // Spawn cute feather particles
      spawnParticles(
        birdRef.current.radius + 10,
        birdRef.current.y,
        'feather',
        5,
        '#fbbf24' // Warm amber
      );
    }
  };

  // Spawns beautifully animated particle trails
  const spawnParticles = (
    x: number,
    y: number,
    type: 'feather' | 'sparkle' | 'leaf',
    count: number,
    baseColor: string
  ) => {
    const colors = [baseColor, '#fef3c7', '#ffffff', '#f59e0b', '#10b981'];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      const life = Math.random() * 15 + 15;

      particlesRef.current.push({
        id: Math.random() + Date.now(),
        x: x + (Math.random() * 10 - 5),
        y: y + (Math.random() * 10 - 5),
        vx: Math.cos(angle) * speed - (type === 'feather' ? 1.5 : 0), // Feathers drift backward slightly
        vy: Math.sin(angle) * speed + 0.5, // Gravity drift
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3,
        alpha: 1,
        life: life,
        maxLife: life,
        type: type,
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.1,
      });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    triggerFlap();
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    triggerFlap();
  };

  // Start game loop when state switches to playing
  useEffect(() => {
    if (gameState === 'PLAYING') {
      resetGame();
      startGameLoop();
    } else {
      stopGameLoop();
    }
  }, [gameState]);

  const resetGame = () => {
    const { gameMode: activeGameMode } = currentPropsRef.current;
    scoreRef.current = 0;
    jumpsRef.current = 0;
    pipesPassedRef.current = 0;
    frameCountRef.current = 0;
    jumpsInAirRef.current = 0;
    onScoreUpdate(0);

    const groundLimit = CANVAS_HEIGHT - 100;
    const initialY = activeGameMode === 'race' ? (groundLimit - 48) : 250;

    birdRef.current = { 
      ...DEFAULT_BIRD, 
      y: initialY,
      angle: 0,
      targetAngle: 0,
      vy: 0
    };
    pipesRef.current = [];
    raceObstaclesRef.current = [];
    particlesRef.current = [];

    if (activeGameMode === 'race') {
      spawnRaceObstacle();
    } else {
      spawnPipe();
    }
  };

  const spawnRaceObstacle = () => {
    const isChasm = Math.random() < 0.35;
    const type = isChasm ? 'chasm' : 'block';
    
    // Width: Gaps (chasms) are 75px to 95px, blocks are 32px to 45px
    const width = isChasm ? Math.floor(Math.random() * 20 + 75) : Math.floor(Math.random() * 15 + 32);
    // Height: Blocks sit on the ground and can be 30px to 40px tall. Gaps/Chasms don't care about height.
    const height = isChasm ? 100 : Math.floor(Math.random() * 10 + 32);

    raceObstaclesRef.current.push({
      x: CANVAS_WIDTH + 80,
      width,
      height,
      type,
      passed: false,
    });
  };

  const spawnPipe = () => {
    const { config } = currentPropsRef.current;
    const width = 64;
    // Calculate randomized bamboo obstacle lengths
    const totalPlayHeight = CANVAS_HEIGHT - 100; // Leaving room for the ground layer
    const availableHeight = totalPlayHeight - config.pipeGap;
    
    // Random height for top
    const topHeight = Math.floor(
      Math.random() * (availableHeight - 2 * config.minPipeHeight) + 
      config.minPipeHeight
    );
    const bottomHeight = totalPlayHeight - topHeight - config.pipeGap;

    pipesRef.current.push({
      x: CANVAS_WIDTH + 50,
      topHeight,
      bottomHeight,
      passed: false,
      width,
    });
  };

  const startGameLoop = () => {
    stopGameLoop();
    
    let lastTime: number | null = null;
    const timestep = 1000 / 60; // 60 updates per second (60 FPS)
    let accumulator = 0;

    const loop = (currentTime: number) => {
      const timeNow = currentTime || performance.now();
      if (lastTime === null) {
        lastTime = timeNow;
      }
      let delta = timeNow - lastTime;
      if (isNaN(delta) || delta < 0) {
        delta = timestep;
      }
      if (delta > 250) delta = 250; // Cap delay logic to avoid spiral on focus loss
      lastTime = timeNow;

      accumulator += delta;
      if (isNaN(accumulator)) {
        accumulator = 0;
      }

      while (accumulator >= timestep) {
        updateGame();
        accumulator -= timestep;
      }

      drawGame();
      activeLoopRef.current = requestAnimationFrame(loop);
    };

    activeLoopRef.current = requestAnimationFrame(loop);
  };

  const stopGameLoop = () => {
    if (activeLoopRef.current) {
      cancelAnimationFrame(activeLoopRef.current);
      activeLoopRef.current = null;
    }
  };

  const triggerGameOver = () => {
    stopGameLoop();
    gameAudio.playHitSound();

    // Dramatic defeat delay
    setTimeout(() => {
      gameAudio.playGameOverSound();
      onGameOver(scoreRef.current, pipesPassedRef.current, jumpsRef.current);
    }, 450);
  };

  // Physics update step
  const updateGame = () => {
    const { gameMode, config } = currentPropsRef.current;
    frameCountRef.current++;
    const bird = birdRef.current;
    const groundLimit = CANVAS_HEIGHT - 100;

    if (gameMode === 'race') {
      // --- CAR RACING MODE PHYSICS ---
      const speedMultiplier = 1.35;
      const currentSpeed = config.pipeSpeed * speedMultiplier;

      // 1. Position update (gravity)
      bird.vy += config.gravity;
      const terminalCarVelocity = difficulty === 'ultimate' ? 14 : 9;
      if (bird.vy > terminalCarVelocity) {
        bird.vy = terminalCarVelocity; // terminal velocity for the car falling
      }
      bird.y += bird.vy;

      // 2. Resting height of the car is groundLimit - 32
      const carBaseY = groundLimit - 32;

      // 3. Over chasm checks
      let overChasm = false;
      const obstacles = raceObstaclesRef.current;
      const birdX = 90;

      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (obs.type === 'chasm') {
          // If the car's position overlaps directly with the chasm bounds
          if (birdX + 12 > obs.x && birdX - 12 < obs.x + obs.width) {
            overChasm = true;
            break;
          }
        }
      }

      if (overChasm) {
        // Fall into the chasm if we are active on ground level
        if (bird.y >= carBaseY - 5) {
          bird.vy += 0.35; // Rapid pull of gravity into abyss
          bird.targetAngle = 0.3; // Angle tilts forward down
        }
      } else {
        // Land on solid grass
        if (bird.y >= carBaseY) {
          bird.y = carBaseY;
          bird.vy = 0;
          bird.angle = 0;
          bird.targetAngle = 0;
          jumpsInAirRef.current = 0; // Reset double jumps
        }
      }

      // If falls out of bounds (into chasm), Game Over
      if (bird.y > CANVAS_HEIGHT + 60) {
        spawnParticles(birdX, CANVAS_HEIGHT - 10, 'leaf', 16, '#3b82f6'); // Mud/water splash
        triggerGameOver();
        return;
      }

      // 4. Face rotation adjustments
      if (!overChasm && bird.y < carBaseY) {
        bird.targetAngle = bird.vy * 0.05;
      }
      bird.angle += (bird.targetAngle - bird.angle) * 0.15;

      // Rotate wheel frames fast
      if (frameCountRef.current % 4 === 0) {
        bird.frame = (bird.frame + 1) % 4; // 4 wheels rotation frames
      }

      // Scroll Background
      backgroundScrollRef.current = (backgroundScrollRef.current - currentSpeed * 0.5) % CANVAS_WIDTH;

      // Spawn race obstacles
      if (frameCountRef.current % (config.pipeSpawnInterval + 15) === 0) {
        spawnRaceObstacle();
      }

      // Update blocks & gaps
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= currentSpeed;

        // Clean out screen items
        if (obs.x < -obs.width - 50) {
          obstacles.splice(i, 1);
          continue;
        }

        // Block collision checks
        if (obs.type === 'block') {
          const blockY = groundLimit - obs.height;
          
          // Outer dimensions of the car sitting at bird.y (width: ~50, height: ~30)
          const carLeft = birdX - 25;
          const carRight = birdX + 25;
          const carBottom = bird.y + 16;
          const carTop = bird.y - 16;

          if (carRight > obs.x && carLeft < obs.x + obs.width) {
            // Check vertical collision
            if (carBottom > blockY && carTop < groundLimit) {
              spawnParticles(birdX, bird.y, 'leaf', 15, '#f59e0b'); // Sparks
              triggerGameOver();
              return;
            }
          }
        }

        // Score check
        const halfPoint = obs.x + obs.width / 2;
        if (!obs.passed && halfPoint < birdX) {
          obs.passed = true;
          scoreRef.current += 1;
          pipesPassedRef.current += 1;
          onScoreUpdate(scoreRef.current);

          gameAudio.playScoreSound();
          spawnParticles(birdX + 22, bird.y, 'sparkle', 6, '#22c55e'); // Shiny green sparkles
        }
      }

      // Update particles
      const prts = particlesRef.current;
      for (let i = prts.length - 1; i >= 0; i--) {
        const p = prts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life <= 0) {
          prts.splice(i, 1);
        }
      }

    } else {
      // --- ORIGINAL FLAPPY CLASSIC MODE ---
      // Slow, floaty gravity update ("jatuhnya agak lambat")
      bird.vy += config.gravity;
      // Cap falling velocity based on difficulty so it matches physics speed
      const terminalVelocity = difficulty === 'ultimate' ? 12.0 : (difficulty === 'hard' ? 7.0 : 4.5);
      if (bird.vy > terminalVelocity) {
        bird.vy = terminalVelocity;
      }
      bird.y += bird.vy;

      // Angle of bird tilting
      if (bird.flapTime > 0) {
        bird.flapTime--;
      } else {
        // Gentle dive rotation when descending
        bird.targetAngle += 0.04;
        if (bird.targetAngle > 0.6) {
          bird.targetAngle = 0.6;
        }
      }
      bird.angle += (bird.targetAngle - bird.angle) * 0.15;

      // Wrap frame flap rate animation
      if (frameCountRef.current % 12 === 0) {
        bird.frame = (bird.frame + 1) % 3;
      }

      // Scroll Background slowly
      backgroundScrollRef.current = (backgroundScrollRef.current - 0.45) % CANVAS_WIDTH;

      // Obstacles Pipes physics & colliders
      if (frameCountRef.current % config.pipeSpawnInterval === 0) {
        spawnPipe();
      }

      const pipes = pipesRef.current;
      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= config.pipeSpeed;

        // Boundary deletion
        if (pipe.x < -pipe.width - 50) {
          pipes.splice(i, 1);
          continue;
        }

        // Collisions checker
        const birdX = 90; // Fixed x drawing for birds in Flappy Bird
        const birdY = bird.y;
        const bRad = bird.radius - 4.5; // Slightly forgiving bounds

        // Horizontal overlaps
        if (birdX + bRad > pipe.x && birdX - bRad < pipe.x + pipe.width) {
          // Did we hit top bamboo?
          if (birdY - bRad < pipe.topHeight) {
            // Play impact and leaf explosion
            spawnParticles(birdX, birdY, 'leaf', 12, '#10b981');
            triggerGameOver();
            return;
          }

          // Did we hit bottom bamboo?
          const bottomYLimit = CANVAS_HEIGHT - 100 - pipe.bottomHeight;
          if (birdY + bRad > bottomYLimit) {
            spawnParticles(birdX, birdY, 'leaf', 12, '#10b981');
            triggerGameOver();
            return;
          }
        }

        // Check if scored
        if (!pipe.passed && pipe.x + pipe.width / 2 < birdX) {
          pipe.passed = true;
          scoreRef.current += 1;
          pipesPassedRef.current += 1;
          onScoreUpdate(scoreRef.current);
          
          // Play rewarding arcade sound
          gameAudio.playScoreSound();

          // Spawn shiny score sparkles
          spawnParticles(birdX + 25, birdY, 'sparkle', 6, '#fef08a');
        }
      }

      // Ground & Ceiling Limit check
      if (bird.y - bird.radius < 5) {
        bird.y = 5 + bird.radius;
        bird.vy = 0;
      }
      if (bird.y + bird.radius > groundLimit - 4) {
        spawnParticles(90, bird.y, 'leaf', 14, '#15803d');
        triggerGameOver();
        return;
      }

      // Particles updater
      const prts = particlesRef.current;
      for (let i = prts.length - 1; i >= 0; i--) {
        const p = prts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life <= 0) {
          prts.splice(i, 1);
        }
      }
    }
  };

  // High performance custom Canvas drawings
  const drawGame = () => {
    const { gameMode } = currentPropsRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear whole container
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. DRAW SCROLLING AMBIENT BACKGROUNDS
    if (bgImgRef.current) {
      // Side scrolling layers
      const speedOffset = backgroundScrollRef.current;
      ctx.drawImage(bgImgRef.current, speedOffset, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(bgImgRef.current, speedOffset + CANVAS_WIDTH, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      // Flat atmospheric retro vector fallback if image loading fails or slow
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#bae6fd'); // Sun Sky Blue
      bgGrad.addColorStop(0.7, '#fef08a'); // Warm Javanese Sunrise amber
      bgGrad.addColorStop(1, '#fed7aa');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // 2. DRAW PARTICLES TRAIL (feathers, leaves)
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'feather') {
        // Draw soft leaf/feather oval
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Feather rib line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-p.size * 1.6, 0);
        ctx.lineTo(p.size * 1.6, 0);
        ctx.stroke();
      } else if (p.type === 'leaf') {
        // Draw dynamic leaf
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 1.5, 0, 0, p.size);
        ctx.quadraticCurveTo(-p.size * 1.5, 0, 0, -p.size);
        ctx.fill();
      } else {
        // Sparkle star
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 3. DRAW BAMBOO POLES OR RACE OBSTACLES
    if (gameMode === 'classic') {
      pipesRef.current.forEach((pipe) => {
        // Draw top bamboo
        drawBambooPole(ctx, pipe.x, 0, pipe.width, pipe.topHeight, true);

        // Draw bottom bamboo
        const bottomY = CANVAS_HEIGHT - 100 - pipe.bottomHeight;
        drawBambooPole(ctx, pipe.x, bottomY, pipe.width, pipe.bottomHeight, false);
      });
    } else {
      // Draw race obstacles (blocks)
      raceObstaclesRef.current.forEach((obs) => {
        if (obs.type === 'block') {
          const blockY = CANVAS_HEIGHT - 100 - obs.height;
          
          // Draw a beautifully detailed wooden crate obstacle
          ctx.save();
          // Crate body
          const crateGrad = ctx.createLinearGradient(obs.x, blockY, obs.x + obs.width, blockY + obs.height);
          crateGrad.addColorStop(0, '#b45309'); // Warm orange-brown
          crateGrad.addColorStop(0.5, '#92400e'); // Rich amber wood
          crateGrad.addColorStop(1, '#78350f'); // Shadowed wood
          
          ctx.fillStyle = crateGrad;
          ctx.fillRect(obs.x, blockY, obs.width, obs.height);
          
          // Borders
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 3;
          ctx.strokeRect(obs.x, blockY, obs.width, obs.height);
          
          // Planks texture
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, blockY);
          ctx.lineTo(obs.x + obs.width / 2, blockY + obs.height);
          ctx.stroke();
          
          // 'X' Diagonal support straps
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(obs.x + 5, blockY + 5);
          ctx.lineTo(obs.x + obs.width - 5, blockY + obs.height - 5);
          ctx.moveTo(obs.x + obs.width - 5, blockY + 5);
          ctx.lineTo(obs.x + 5, blockY + obs.height - 5);
          ctx.stroke();

          // Hazard safety yellow-black stripes purely for retro elegance
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(obs.x + 3, blockY, 8, 4);
          ctx.fillStyle = '#000000';
          ctx.fillRect(obs.x + 11, blockY, 8, 4);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(obs.x + 19, blockY, 8, 4);
          
          ctx.restore();
        }
      });
    }

    // 4. DRAW GROUND LAYER (Adjusted dynamically for cliffs in race mode)
    const groundY = CANVAS_HEIGHT - 100;
    
    // Helper to paint solid ground chunk
    const paintSolidGround = (xStart: number, xEnd: number) => {
      if (xEnd <= xStart) return;
      
      ctx.save();
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, '#5ea32a'); // Green grass top
      groundGrad.addColorStop(0.1, '#4ade80');
      groundGrad.addColorStop(0.2, '#ca8a04'); // Javanese soil clay
      groundGrad.addColorStop(1, '#854d0e');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(xStart, groundY, xEnd - xStart, 100);

      // Grass blades details
      ctx.fillStyle = '#22c55e';
      const bladeSpacing = 28;
      let startOffset = (backgroundScrollRef.current * 1.8) % bladeSpacing;
      if (startOffset < 0) startOffset += bladeSpacing;
      
      for (let tx = xStart - bladeSpacing + startOffset; tx < xEnd; tx += bladeSpacing) {
        if (tx < xStart) continue;
        ctx.beginPath();
        ctx.moveTo(tx, groundY);
        ctx.lineTo(tx + 7, groundY - 7);
        ctx.lineTo(tx + 14, groundY);
        ctx.fill();
      }

      // Traditional Wooden protective fencing
      ctx.fillStyle = '#451a03';
      ctx.fillRect(xStart, groundY + 12, xEnd - xStart, 7);
      
      const railSpacing = 36;
      let fenceOffset = (backgroundScrollRef.current * 1.25) % railSpacing;
      if (fenceOffset < 0) fenceOffset += railSpacing;
      for (let rx = xStart - railSpacing + fenceOffset; rx < xEnd; rx += railSpacing) {
        if (rx < xStart) continue;
        ctx.fillRect(rx, groundY + 12, 6, 20);
      }
      ctx.restore();
    };

    if (gameMode === 'classic') {
      // Classic mode is solid across the entire width
      paintSolidGround(0, CANVAS_WIDTH);
    } else {
      // Race mode cuts empty gaps (chasms) out of the ground dynamically
      // Sort chasms from left to right that are visible
      const visibleChasms = raceObstaclesRef.current
        .filter(obs => obs.type === 'chasm')
        .sort((a, b) => a.x - b.x);

      let currentX = 0;

      visibleChasms.forEach((chasm) => {
        // Draw normal solid ground before the chasm
        if (chasm.x > currentX) {
          paintSolidGround(currentX, Math.min(CANVAS_WIDTH, chasm.x));
        }

        // Draw cliff textures inside the chasm
        if (chasm.x + chasm.width > 0 && chasm.x < CANVAS_WIDTH) {
          const cLeft = Math.max(0, chasm.x);
          const cRight = Math.min(CANVAS_WIDTH, chasm.x + chasm.width);

          ctx.save();
          // Draw dark scary background depth inside chasm
          ctx.fillStyle = '#1e1b4b'; // Dark midnight abyss background
          ctx.fillRect(cLeft, groundY, cRight - cLeft, 100);

          // Deep water line at bottom of chasm
          ctx.fillStyle = '#1d4ed8'; // Water blue
          ctx.fillRect(cLeft, CANVAS_HEIGHT - 38, cRight - cLeft, 38);
          // Splashing waves highlight
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(cLeft, CANVAS_HEIGHT - 38, cRight - cLeft, 3);

          // Left cliff wall erosion lines
          if (chasm.x > 0 && chasm.x < CANVAS_WIDTH) {
            ctx.fillStyle = '#451a03'; // Dark earth shadow
            ctx.fillRect(chasm.x - 4, groundY, 4, 100);
            
            // Rock edge highlights
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(chasm.x - 4, groundY, 4, 12);
          }

          // Right cliff wall
          const rightEdge = chasm.x + chasm.width;
          if (rightEdge > 0 && rightEdge < CANVAS_WIDTH) {
            ctx.fillStyle = '#451a03';
            ctx.fillRect(rightEdge, groundY, 4, 100);
            
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(rightEdge, groundY, 4, 12);
          }
          ctx.restore();
        }

        currentX = chasm.x + chasm.width;
      });

      // Paint remaining solid ground after last chasm
      if (currentX < CANVAS_WIDTH) {
        paintSolidGround(currentX, CANVAS_WIDTH);
      }
    }

    // 5. DRAW PLAYABLE PROFILE
    const bird = birdRef.current;
    
    if (gameMode === 'classic') {
      // --- Draw traditional flappy bird ---
      ctx.save();
      ctx.translate(90, bird.y);
      ctx.rotate(bird.angle);

      const processedImg = processedBirdCanvasRef.current;
      const rawImg = birdImgRef.current;

      if (processedImg) {
        ctx.drawImage(processedImg, -bird.radius, -bird.radius, bird.radius * 2, bird.radius * 2);
      } else if (rawImg) {
        ctx.drawImage(rawImg, -bird.radius, -bird.radius, bird.radius * 2, bird.radius * 2);
      } else {
        // Draw the cute custom vector backup Javanese bird
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = '#f59e0b';
        const wingYOffset = bird.frame === 0 ? 3 : bird.frame === 1 ? -4 : 0;
        ctx.translate(-8, wingYOffset);
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Javanese Blangkon
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.arc(0, -bird.radius + 3, 11, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-11, -bird.radius + 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Spectacles
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(10, -1, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, -1);
        ctx.lineTo(8, -1);
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(10, -1, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(bird.radius - 2, -2);
        ctx.lineTo(bird.radius + 9, 2);
        ctx.lineTo(bird.radius - 2, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

    } else {
      // --- CAR RACER MODE (BIRD DRIVES A SUPER RACING GOKART!) ---
      ctx.save();
      // Translate to character position
      ctx.translate(90, bird.y);
      ctx.rotate(bird.angle);

      // Define visual assets
      const processedImg = processedBirdCanvasRef.current;
      const rawImg = birdImgRef.current;

      // 1. Draw the bird sitting inside driver cabin
      ctx.save();
      // Shrink driver bird slightly to fit steering wheel cabin scale nicely
      ctx.translate(2, -18); // Shifted slightly higher & forward in drivers seat
      if (processedImg) {
        ctx.drawImage(processedImg, -14, -14, 28, 28);
      } else if (rawImg) {
        ctx.drawImage(rawImg, -14, -14, 28, 28);
      } else {
        // Direct backup vector bird inside cabin but smaller
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Simple eyes and beak
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(4, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(12, -2);
        ctx.lineTo(18, 0);
        ctx.lineTo(12, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mini blangkon
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.arc(0, -11, 7.5, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 2. Draw Gokart / Racing Toy Car Chassis
      ctx.save();
      // Main body color - glossy sports red
      const bodyGrad = ctx.createLinearGradient(-35, -5, 35, 15);
      bodyGrad.addColorStop(0, '#ef4444'); // Ferrari Red
      bodyGrad.addColorStop(0.4, '#dc2626');
      bodyGrad.addColorStop(1, '#991b1b'); // Shadows at far right
      ctx.fillStyle = bodyGrad;

      // Draw sporty racecar chassis
      ctx.beginPath();
      ctx.moveTo(-34, 10);
      ctx.lineTo(-30, -5);   // Cool rear wing support
      ctx.lineTo(-24, -5);
      ctx.lineTo(-20, 4);   // Spoiler drop
      ctx.lineTo(-8, 4);    // Seat level
      ctx.lineTo(12, 4);    // Dash level
      ctx.lineTo(18, -2);   // Glossy hood
      ctx.lineTo(34, 4);    // Nose cone
      ctx.lineTo(34, 15);   // Front chassis floor
      ctx.lineTo(-34, 15);  // Flat floor plate
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Rear Spoiler spoiler wing (high-contrast yellow/grey sport detail)
      ctx.fillStyle = '#fbbf24'; // Sporty amber wing
      ctx.fillRect(-35, -11, 14, 6);
      ctx.strokeRect(-35, -11, 14, 6);

      // Dash Steering Wheel
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(10, -1, 6, 0, Math.PI * 2); // Tiny wheel frame
      ctx.stroke();
      // Wheel column
      ctx.beginPath();
      ctx.moveTo(10, 5);
      ctx.lineTo(14, 11);
      ctx.stroke();

      // Exhaust Pipe fire/fume effects at back
      if (gameState === 'PLAYING') {
        ctx.fillStyle = frameCountRef.current % 4 < 2 ? '#f97316' : '#ef4444'; // Orange/red exhaust backfire
        ctx.beginPath();
        ctx.moveTo(-33, 10);
        ctx.lineTo(-44 - (Math.random() * 8), 11);
        ctx.lineTo(-33, 13);
        ctx.fill();
      }

      // Front bumper fender (Toy look)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(30, 8, 6, 6);
      ctx.strokeRect(30, 8, 6, 6);

      // 3. Draw Rotational Wheels (Based on bird.frame spokes check!)
      // Front wheel at X=20, Rear wheel at X=-22
      const drawWheel = (wx: number) => {
        ctx.save();
        ctx.translate(wx, 15); // Bottom baseline center for tires

        // Tire rubber
        ctx.fillStyle = '#1e293b'; // Charcoal black tires
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Metal Rim plate
        ctx.fillStyle = '#94a3b8'; // Light silver grey
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spokes rotating lines based on bird.frame
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.25;
        const spokeRotation = (bird.frame * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(-Math.cos(spokeRotation) * 5, -Math.sin(spokeRotation) * 5);
        ctx.lineTo(Math.cos(spokeRotation) * 5, Math.sin(spokeRotation) * 5);
        ctx.stroke();

        const spokeRotation2 = spokeRotation + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(-Math.cos(spokeRotation2) * 5, -Math.sin(spokeRotation2) * 5);
        ctx.lineTo(Math.cos(spokeRotation2) * 5, Math.sin(spokeRotation2) * 5);
        ctx.stroke();

        ctx.restore();
      };

      drawWheel(-21); // Rear wheel
      drawWheel(19);  // Front wheel

      ctx.restore();
      ctx.restore();
    }

    // 6. DRAW HUGE FLOATING IN-GAME SCORE
    if (gameState === 'PLAYING') {
      ctx.font = "900 48px 'system-ui', sans-serif";
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 6;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(scoreRef.current.toString(), CANVAS_WIDTH / 2, 80);
      ctx.fillText(scoreRef.current.toString(), CANVAS_WIDTH / 2, 80);
    }
  };

  // Dedicated bamboo texture painter
  const drawBambooPole = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    isTop: boolean
  ) => {
    ctx.save();
    
    // Create gradient for 3D round cylinder effect
    const bGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    bGrad.addColorStop(0, '#15803d');   // Dark green shadow
    bGrad.addColorStop(0.3, '#22c55e'); // Vibrant bamboo green
    bGrad.addColorStop(0.7, '#4ade80'); // Glossy highlight
    bGrad.addColorStop(0.9, '#166534'); // Far shadow
    bGrad.addColorStop(1, '#14532d');

    ctx.fillStyle = bGrad;
    ctx.fillRect(x, y, width, height);

    // Bamboo Joint Segment Intervals (approx 55px apart)
    const segmentInterval = 55;
    ctx.strokeStyle = '#14532d'; // Dark brown-green node line
    ctx.lineWidth = 4;
    
    const startOffset = isTop ? height % segmentInterval : 0;
    
    for (let sy = startOffset; sy < height; sy += segmentInterval) {
      const jointY = y + sy;
      
      // Node rim rings
      ctx.strokeStyle = '#115e59';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x - 2, jointY);
      ctx.lineTo(x + width + 2, jointY);
      ctx.stroke();

      ctx.strokeStyle = '#86efac'; // Joint highlight glow
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 2, jointY - 2);
      ctx.lineTo(x + width + 2, jointY - 2);
      ctx.stroke();

      // Draw cute hanging little bamboo leaves purely for aesthetics on joint!
      if (Math.sin(jointY) > 0.3) {
        ctx.save();
        ctx.fillStyle = '#15c54e';
        ctx.translate(x + (Math.sin(jointY) > 0.6 ? width + 1 : -1), jointY);
        ctx.rotate(Math.sin(jointY) * 0.5 + (Math.sin(jointY) > 0.6 ? 0.4 : -2.2));
        ctx.beginPath();
        ctx.ellipse(8, 0, 10, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Outer bamboo rim hat borders (lip caps) at tip
    const rimHeight = 20;
    const rimY = isTop ? y + height - rimHeight : y;

    const rimGrad = ctx.createLinearGradient(x - 4, 0, x + width + 4, 0);
    rimGrad.addColorStop(0, '#0f6e30');
    rimGrad.addColorStop(0.35, '#22c55e');
    rimGrad.addColorStop(0.65, '#86efac');
    rimGrad.addColorStop(1, '#0c4a22');
    
    ctx.fillStyle = rimGrad;
    ctx.fillRect(x - 3, rimY, width + 6, rimHeight);
    
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - 3, rimY, width + 6, rimHeight);

    ctx.restore();
  };

  return (
    <div className="relative overflow-hidden w-full h-full flex justify-center items-center bg-slate-900 shadow-inner">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasTouchStart}
        className="cursor-pointer max-w-full rounded-2xl border-4 border-amber-900/65 shadow-2xl overflow-hidden aspect-[420/620] touch-none select-none"
        id="game-canvas"
      />
      
      {/* Visual Keyboard prompt overlay (Hidden on play to prevent clutter) */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] text-white/90 font-mono tracking-widest font-bold pointer-events-none uppercase transition-opacity">
          SPIASI / TAP UNTUK TERBANG
        </div>
      )}
    </div>
  );
}
