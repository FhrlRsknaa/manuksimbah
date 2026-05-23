import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Compass, Bird } from 'lucide-react';

import MainMenu from './components/MainMenu';
import GameOver from './components/GameOver';
import GameCanvas from './components/GameCanvas';
import { GameState, GameStats } from './types';
import { gameAudio } from './utils/audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  // Custom file states
  const [customBirdUrl, setCustomBirdUrl] = useState<string | null>(null);
  const [customBirdName, setCustomBirdName] = useState<string>('');
  const [customBgmName, setCustomBgmName] = useState<string>('');

  // Stats
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    jumps: 0,
    pipesPassed: 0
  });

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('manuk_mbah_high_score');
    if (saved) {
      setStats(prev => ({ ...prev, highScore: parseInt(saved, 10) }));
    }
  }, []);

  const handleStartGame = () => {
    setGameState('PLAYING');
    // Run the beautiful Javanese loop background music
    gameAudio.playMusic();
  };

  const handleScoreUpdate = (score: number) => {
    setStats(prev => ({ ...prev, score }));
  };

  const handleGameOver = (finalScore: number, pipesPassed: number, jumps: number) => {
    setGameState('GAMEOVER');
    gameAudio.pauseMusic();

    setStats(prev => {
      const nextHighScore = Math.max(finalScore, prev.highScore);
      localStorage.setItem('manuk_mbah_high_score', nextHighScore.toString());
      return {
        ...prev,
        score: finalScore,
        highScore: nextHighScore,
        pipesPassed: prev.pipesPassed + pipesPassed,
        jumps: prev.jumps + jumps
      };
    });
  };

  const handleGoToMenu = () => {
    setGameState('MENU');
    gameAudio.pauseMusic();
  };

  // Files loader callbacks
  const handleCustomBird = (file: File) => {
    const url = URL.createObjectURL(file);
    setCustomBirdUrl(url);
    setCustomBirdName(file.name);
  };

  const handleCustomBgm = (file: File) => {
    gameAudio.loadCustomMusic(file);
    setCustomBgmName(file.name);
  };

  const handleCustomJump = (file: File) => {
    gameAudio.loadCustomJump(file);
  };

  return (
    <div className="min-h-screen w-full bg-[#E9E4D4] flex flex-col justify-center items-center p-4 relative overflow-hidden" id="app-container">
      
      {/* Immersive Background Decor - Subtle Javanese retro layout circles */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#8B4513 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="absolute top-20 left-10 w-32 h-16 bg-white rounded-full opacity-40 blur-md pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-48 h-20 bg-white rounded-full opacity-30 blur-lg pointer-events-none"></div>

      {/* Main Heritage Arcade Frame Wrapper - Elegant Rounded Glass Theme */}
      <main className="relative w-full max-w-[420px] rounded-[36px] overflow-hidden bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-xl shadow-[0_24px_50px_rgba(74,44,42,0.18)] border-2 border-white/50 p-2" id="game-frame-wrapper">
        
        {/* Aspect locked game container */}
        <div className="relative aspect-[420/620] w-full bg-slate-900 rounded-[28px] overflow-hidden">
          
          {/* Active 60fps Game Canvas */}
          <GameCanvas
            gameState={gameState}
            onGameOver={handleGameOver}
            onScoreUpdate={handleScoreUpdate}
            customBirdUrl={customBirdUrl}
          />

          {/* Overlays styled with AnimatePresence */}
          <AnimatePresence mode="wait">
            {gameState === 'MENU' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#E9E4D4]"
              >
                <MainMenu
                  onStartGame={handleStartGame}
                  highScore={stats.highScore}
                  onCustomBird={handleCustomBird}
                  onCustomBgm={handleCustomBgm}
                  onCustomJump={handleCustomJump}
                  customBirdName={customBirdName}
                  customBgmName={customBgmName}
                />
              </motion.div>
            )}

            {gameState === 'GAMEOVER' && (
              <motion.div
                key="gameover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
              >
                <GameOver
                  score={stats.score}
                  highScore={stats.highScore}
                  pipesPassed={stats.pipesPassed}
                  jumps={stats.jumps}
                  onRestart={handleStartGame}
                  onGoToMenu={handleGoToMenu}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      {/* Sederhana, Humoris Footer Info */}
      <div className="mt-6 flex flex-col items-center gap-1 opacity-70 text-center select-none z-10">
        <p className="text-[10px] text-[#4a2c2a] font-bold tracking-widest flex items-center gap-1.5 font-mono uppercase">
          <Bird className="w-3.5 h-3.5 text-[#8B4513] animate-bounce" />
          <span>SAYA AKAN LAWAN!!!!</span>
        </p>
      </div>

    </div>
  );
}
