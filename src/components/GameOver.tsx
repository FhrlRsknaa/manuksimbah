import { motion } from 'motion/react';
import { RotateCcw, Home, Award, Frown, Sparkles, AlertTriangle } from 'lucide-react';
import { gameAudio } from '../utils/audio';

interface GameOverProps {
  score: number;
  highScore: number;
  pipesPassed: number;
  jumps: number;
  onRestart: () => void;
  onGoToMenu: () => void;
}

export default function GameOver({
  score,
  highScore,
  pipesPassed,
  jumps,
  onRestart,
  onGoToMenu
}: GameOverProps) {
  
  const isNewHighScore = score > 0 && score >= highScore;

  const handleAction = (callback: () => void) => {
    gameAudio.playJumpSound();
    callback();
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-950/65 backdrop-blur-sm p-6 text-[#4a2c2a] font-sans z-10 select-none">
      
      {/* Decorative dots in background overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#8B4513 0.6px, transparent 0.6px)',
          backgroundSize: '16px 16px'
        }}
      />

      <motion.div
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="bg-white/45 backdrop-blur-xl text-[#4a2c2a] rounded-[30px] p-6 shadow-[0_24px_60px_rgba(74,44,42,0.25)] max-w-[340px] w-full border border-white/60 overflow-hidden relative"
      >
        
        {/* Playful Top Banner Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-[#FF4444]" />

        {/* Humorous Tilted Red Status Badge from the design spec */}
        <div className="flex flex-col items-center text-center mt-2 mb-4">
          <motion.div
            animate={{ rotate: [-0.6, 0.6, -0.6] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-full bg-[#FF4444]/95 text-white p-3 rotate-1 border border-white/30 rounded-2xl shadow-md text-center"
          >
            <span className="text-[9px] uppercase tracking-widest block opacity-90 mb-0.5 font-bold font-mono">
              STATUS TERBARU
            </span>
            <span className="text-2xl font-black italic font-serif">
              " nob bet lu "
            </span>
          </motion.div>
          
          <div className="text-[#FF4444] font-mono text-[9px] font-bold uppercase tracking-widest mt-2 animate-pulse">
            Cupu Pol! Belajar Terbang Lagi Yuk
          </div>
        </div>

        {/* Score Board - Elegant Glass */}
        <div className="bg-[#E9E4D4]/30 backdrop-blur-md rounded-[22px] p-4 border border-[#4a2c2a]/10 mb-6 relative">
          
          {isNewHighScore && (
            <div className="absolute -top-3.5 right-3 bg-[#FF4444] text-white font-black text-[9px] px-2.5 py-1 border border-white/30 rounded-full uppercase flex items-center gap-0.5 shadow-md animate-bounce">
              <Sparkles className="w-2.5 h-2.5" />
              REKOR BARU!
            </div>
          )}

          <div className="flex justify-between items-center py-2 border-b border-[#4a2c2a]/10">
            <span className="text-[#4a2c2a] text-xs font-serif font-bold flex items-center gap-1.5 uppercase">
              <Award className="w-4 h-4 text-amber-600" /> SKOR SEKARANG
            </span>
            <span className="text-3xl font-black text-[#4a2c2a] font-serif">{score}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-[#4a2c2a] text-xs font-serif font-bold flex items-center gap-1.5 uppercase">
              👑 REKOR TERTINGGI
            </span>
            <span className="text-xl font-bold text-[#4a2c2a] font-serif">
              {Math.max(score, highScore)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2.5 border-t border-[#4a2c2a]/10 text-[9px] font-mono text-slate-600 uppercase font-bold">
            <div>🎈 SAYAP: <span className="font-extrabold text-[#4a2c2a]">{jumps}X</span></div>
            <div className="text-right">🎋 BAMBU: <span className="font-extrabold text-[#4a2c2a]">{pipesPassed}</span></div>
          </div>
        </div>

        {/* Navigation Action Buttons - Glass Rounded */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleAction(onRestart)}
            className="w-full py-3.5 px-6 rounded-[20px] bg-[#4a2c2a]/95 text-[#E9E4D4] text-sm font-serif font-black shadow-[0_10px_25px_rgba(74,44,42,0.25)] border border-white/10 hover:bg-[#533331] transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="retry-btn"
          >
            <RotateCcw className="w-4 h-4" />
            <span>MAJU LAGI, LE!</span>
          </button>

          <button
            onClick={() => handleAction(onGoToMenu)}
            className="w-full py-2.5 px-4 rounded-[16px] bg-white/40 backdrop-blur-sm border border-white/50 hover:bg-white/60 text-[#4a2c2a] text-xs font-serif font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            id="menu-btn"
          >
            <Home className="w-3.5 h-3.5" />
            <span>KEMBALI KE MENU</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
}
