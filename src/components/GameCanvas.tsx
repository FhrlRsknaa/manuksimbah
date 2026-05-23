import React, { useEffect, useRef, useState } from 'react';
import { GameConfig, GameState, BirdState, Pipe, Particle } from '../types';
import { gameAudio } from '../utils/audio';
import defaultBirdUrl from '../assets/images/bird.png';
import fallbackBgUrl from '../assets/images/manuk_mbah_background_1779513507940.png';

interface GameCanvasProps {
  gameState: GameState;
  onGameOver: (score: number, pipesPassed: number, JumpsCount: number) => void;
  onScoreUpdate: (score: number) => void;
  customBirdUrl: string | null;
}

const DEFAULT_CONFIG: GameConfig = {
  gravity: 0.14, // Lower gravity for gentle slow fall ("jatuhnya agak lambat")
  jumpForce: -3.8, // Floatier jump force
  pipeSpeed: 2.1, // Chill scrolling pace
  pipeSpawnInterval: 125, // Frames spacing
  pipeGap: 165, // More generous space to pass
  minPipeHeight: 60,
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
  customBirdUrl
}: GameCanvasProps) {
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
  }, [gameState, customBirdUrl]);

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

    // Apply simple slow upward velocity
    birdRef.current.vy = DEFAULT_CONFIG.jumpForce;
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
    scoreRef.current = 0;
    jumpsRef.current = 0;
    pipesPassedRef.current = 0;
    frameCountRef.current = 0;
    onScoreUpdate(0);

    birdRef.current = { ...DEFAULT_BIRD };
    pipesRef.current = [];
    particlesRef.current = [];

    // Spawn first pipe
    spawnPipe();
  };

  const spawnPipe = () => {
    const width = 64;
    // Calculate randomized bamboo obstacle lengths
    const totalPlayHeight = CANVAS_HEIGHT - 100; // Leaving room for the ground layer
    const availableHeight = totalPlayHeight - DEFAULT_CONFIG.pipeGap;
    
    // Random height for top
    const topHeight = Math.floor(
      Math.random() * (availableHeight - 2 * DEFAULT_CONFIG.minPipeHeight) + 
      DEFAULT_CONFIG.minPipeHeight
    );
    const bottomHeight = totalPlayHeight - topHeight - DEFAULT_CONFIG.pipeGap;

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
    
    const loop = () => {
      updateGame();
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
    frameCountRef.current++;
    
    // Slow, floaty gravity update ("jatuhnya agak lambat")
    const bird = birdRef.current;
    bird.vy += DEFAULT_CONFIG.gravity;
    // Cap falling velocity so it feels relaxing and responsive
    if (bird.vy > 4.5) {
      bird.vy = 4.5;
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
    if (frameCountRef.current % DEFAULT_CONFIG.pipeSpawnInterval === 0) {
      spawnPipe();
    }

    const pipes = pipesRef.current;
    for (let i = pipes.length - 1; i >= 0; i--) {
      const pipe = pipes[i];
      pipe.x -= DEFAULT_CONFIG.pipeSpeed;

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
    const groundLimit = CANVAS_HEIGHT - 100;
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
  };

  // High performance custom Canvas drawings
  const drawGame = () => {
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

    // 3. DRAW BAMBOO POLES (Bamboo Nusantara Obstacles)
    pipesRef.current.forEach((pipe) => {
      // Draw top bamboo
      drawBambooPole(ctx, pipe.x, 0, pipe.width, pipe.topHeight, true);

      // Draw bottom bamboo
      const bottomY = CANVAS_HEIGHT - 100 - pipe.bottomHeight;
      drawBambooPole(ctx, pipe.x, bottomY, pipe.width, pipe.bottomHeight, false);
    });

    // 4. DRAW GROUND LAYER
    const groundY = CANVAS_HEIGHT - 100;
    
    // Grassy base blend
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, CANVAS_HEIGHT);
    groundGrad.addColorStop(0, '#5ea32a'); // Green grass top
    groundGrad.addColorStop(0.1, '#4ade80');
    groundGrad.addColorStop(0.2, '#ca8a04'); // Javanese rich soil clay
    groundGrad.addColorStop(1, '#854d0e');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, CANVAS_WIDTH, 100);

    // Grass turf texture lines
    ctx.fillStyle = '#22c55e';
    for (let x = (backgroundScrollRef.current * 2) % 30; x < CANVAS_WIDTH; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 8, groundY - 8);
      ctx.lineTo(x + 16, groundY);
      ctx.fill();
    }

    // Traditional Ground Wood Railing
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, groundY + 12, CANVAS_WIDTH, 7);
    for (let rx = (backgroundScrollRef.current * 1.5) % 40; rx < CANVAS_WIDTH; rx += 40) {
      ctx.fillRect(rx, groundY + 12, 6, 20);
    }

    // 5. DRAW MANUK MBAH BIRD
    const bird = birdRef.current;
    ctx.save();
    ctx.translate(90, bird.y);
    ctx.rotate(bird.angle);

    // Determine visual model
    const processedImg = processedBirdCanvasRef.current;
    const rawImg = birdImgRef.current;

    if (processedImg) {
      // Render beautifully processed transparent bird!
      ctx.drawImage(
        processedImg,
        -bird.radius,
        -bird.radius,
        bird.radius * 2,
        bird.radius * 2
      );
    } else if (rawImg) {
      // Fallback to raw loaded (if chroma key is offline/prevented)
      ctx.drawImage(
        rawImg,
        -bird.radius,
        -bird.radius,
        bird.radius * 2,
        bird.radius * 2
      );
    } else {
      // Cute geometric vector bird representing "Mbah" in case assets suffer delay
      // Draw body (yellow circle)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Wing flapper
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      // Flap amplitude
      const wingYOffset = bird.frame === 0 ? 3 : bird.frame === 1 ? -4 : 0;
      ctx.translate(-8, wingYOffset);
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 6, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Small Blangkon Hat (Traditional Javanese Hat)
      ctx.fillStyle = '#7c2d12'; // Dark rich brown
      ctx.beginPath();
      ctx.arc(0, -bird.radius + 3, 11, Math.PI, Math.PI * 2);
      ctx.fill();
      // Blangkon knot at back
      ctx.beginPath();
      ctx.arc(-11, -bird.radius + 5, 4, 0, Math.PI * 2);
      ctx.fill();

      // Mbah Spectacles/Glasses (Circle frames)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(10, -1, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, -1);
      ctx.lineTo(8, -1);
      ctx.stroke();

      // Eye pupil
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(10, -1, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Beak (oren)
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
        className="cursor-pointer max-w-full rounded-2xl border-4 border-amber-900/65 shadow-2xl overflow-hidden aspect-[420/620]"
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
