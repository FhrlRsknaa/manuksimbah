import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Play, Sparkles, HelpCircle } from 'lucide-react';
import { gameAudio } from '../utils/audio';
import { GameMode } from '../types';
import defaultBg from '../assets/images/manuk_mbah_background_1779513507940.png';

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void;
  highScore: number;
  onCustomBird: (file: File) => void;
  onCustomBgm: (file: File) => void;
  onCustomJump: (file: File) => void;
  customBirdName: string;
  customBgmName: string;
  difficulty: 'easy' | 'hard' | 'ultimate';
  onDifficultyChange: (diff: 'easy' | 'hard' | 'ultimate') => void;
}

export default function MainMenu({
  onStartGame,
  highScore,
  onCustomBird,
  onCustomBgm,
  onCustomJump,
  customBirdName,
  customBgmName,
  difficulty,
  onDifficultyChange
}: MainMenuProps) {
  const [isMuted, setIsMuted] = useState(gameAudio.getMuteState());
  const [showTutorial, setShowTutorial] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);

  const handleToggleMute = () => {
    const nextState = gameAudio.toggleMute();
    setIsMuted(nextState);
    if (!nextState) {
      gameAudio.playJumpSound();
    }
  };

  const handleStart = () => {
    gameAudio.playJumpSound();
    setShowModeSelection(true);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between items-center p-4 sm:p-6 text-[#4a2c2a] font-sans z-10 selection:bg-amber-100 overflow-y-auto overflow-x-hidden scrollbar-none">
      
      {/* Dynamic Local Background Image with generated fallback */}
      <img 
        src="/src/assets/images/background.png" 
        onError={(e) => { 
          e.currentTarget.src = defaultBg;
        }} 
        className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none z-0" 
      />

      {/* Glossy Glass Backdrop Tint */}
      <div className="absolute inset-0 bg-white/15 backdrop-blur-sm z-0" />

      {/* Vintage Textured Dots Overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none z-0" 
        style={{
          backgroundImage: 'radial-gradient(#8B4513 0.6px, transparent 0.6px)',
          backgroundSize: '16px 16px'
        }}
      />

      {/* Upper Status Bar - Classy Glossy Glass */}
      <div className="w-full flex justify-between items-center z-10 mb-2">
        <div className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/50 shadow-[0_4px_12px_rgba(74,44,42,0.08)] text-[#4a2c2a] font-mono text-[9px] sm:text-[10px] uppercase font-black tracking-widest">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 animate-spin" />
          <span>REKOR TINGGI: {highScore}</span>
        </div>
        
        <button
          onClick={handleToggleMute}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-white/40 backdrop-blur-md border border-white/50 rounded-full flex items-center justify-center shadow-md hover:bg-white/60 hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer"
          id="toggle-mute-btn"
          title="Toggle Sound"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-600" /> : <Volume2 className="w-3.5 h-3.5 text-[#4a2c2a] animate-pulse" />}
        </button>
      </div>

      {/* Center Hero/Title Section - Glossy Rounded Container */}
      <div className="flex flex-col items-center text-center my-auto py-2 z-10 w-full max-w-[325px] sm:max-w-[340px]">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: [1, 1.02, 1], opacity: 1 }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative px-5 py-5 sm:px-6 sm:py-6 flex flex-col items-center bg-white/30 backdrop-blur-lg rounded-[28px] border border-white/40 shadow-[0_12px_32px_rgba(74,44,42,0.12)] w-full"
        >
          <span className="absolute -top-2.5 right-4 text-[8px] bg-[#FF4444] text-white font-mono px-2.5 py-0.5 rounded-full border border-white/45 font-bold uppercase tracking-widest rotate-6 shadow-md">
            simbah version
          </span>
          
          <h1 className="text-4xl sm:text-5xl font-serif font-black text-[#4a2c2a] tracking-tight uppercase leading-none filter drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] mt-1">
            manuk<br/>mbah
          </h1>
          
          <p className="text-[#8B4513] italic text-[11px] mt-2.5 border-y border-[#8B4513]/20 py-1.5 font-serif tracking-wide w-full max-w-[190px] leading-tight select-none">
            konon katanya nih orang toxic bet di gsm
          </p>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-[220px] sm:w-[240px] mt-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="w-full py-3 px-5 bg-[#4a2c2a]/95 text-[#E9E4D4] rounded-[20px] font-serif font-black text-[16px] sm:text-[18px] shadow-[0_10px_25px_rgba(74,44,42,0.22)] hover:bg-[#533331] transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
            id="start-btn"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>MULAI MAIN</span>
          </motion.button>

          <button
            onClick={() => {
              setShowTutorial(true);
              gameAudio.playJumpSound();
            }}
            className="w-full py-2 px-3 rounded-[14px] bg-white/45 backdrop-blur-md border border-white/50 text-[#4a2c2a] font-serif font-bold text-[11px] flex items-center justify-center gap-1.5 hover:bg-white/55 transition-all cursor-pointer shadow-xs"
            id="tutorial-btn"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#8B4513]" />
            <span>Cara Main</span>
          </button>
        </div>

        {/* Dynamic Level Difficulty Selectors - Upgraded with premium touch-safety target and instant mobile interaction handlers */}
        <div className="flex bg-white/20 backdrop-blur-md rounded-2xl p-1.5 border border-white/30 w-[290px] sm:w-[330px] mt-3.5 z-10 font-bold text-[10px] sm:text-[11px] shadow-md select-none touch-manipulation">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onDifficultyChange('easy');
              gameAudio.playJumpSound();
            }}
            onClick={() => {
              onDifficultyChange('easy');
              gameAudio.playJumpSound();
            }}
            className={`flex-1 py-3 px-1 rounded-xl transition-all cursor-pointer text-center font-bold active:scale-95 ${
              difficulty === 'easy'
                ? 'bg-[#4a2c2a] text-[#E9E4D4] shadow-md scale-102 font-black'
                : 'text-[#4a2c2a] hover:bg-white/25'
            }`}
          >
            Santai (Easy)
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onDifficultyChange('hard');
              gameAudio.playJumpSound();
            }}
            onClick={() => {
              onDifficultyChange('hard');
              gameAudio.playJumpSound();
            }}
            className={`flex-1 py-3 px-1 rounded-xl transition-all cursor-pointer text-center font-bold active:scale-95 ${
              difficulty === 'hard'
                ? 'bg-[#FF4444] text-white shadow-md scale-102 font-black'
                : 'text-[#4a2c2a] hover:bg-white/25'
            }`}
          >
            Kencang (Hard)
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onDifficultyChange('ultimate');
              gameAudio.playJumpSound();
            }}
            onClick={() => {
              onDifficultyChange('ultimate');
              gameAudio.playJumpSound();
            }}
            className={`flex-1 py-3 px-1 rounded-xl transition-all cursor-pointer text-center font-extrabold uppercase active:scale-95 ${
              difficulty === 'ultimate'
                ? 'bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white shadow-lg animate-pulse-slow font-black scale-102'
                : 'text-red-700 hover:bg-white/25 font-black'
            }`}
          >
            Ultimate (WNI)
          </button>
        </div>
      </div>

      {/* Decorative Javanese Greeting Tag with premium frame border */}
      <div className="z-10 mt-3 mb-1 select-none flex justify-center items-center">
        <div className="px-5 py-1.5 bg-white/30 backdrop-blur-md rounded-full border border-[#8B4513]/25 shadow-xs text-center">
          <span className="font-mono text-[9px] sm:text-[10px] text-[#4a2c2a] font-bold tracking-widest uppercase opacity-90">
            build by fhrul
          </span>
        </div>
      </div>

      {/* Tutorial Popup Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-20"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white/40 backdrop-blur-xl rounded-[28px] p-6 shadow-[0_20px_50px_rgba(74,44,42,0.2)] max-w-sm w-full border border-white/60"
            >
              <h3 className="text-2xl font-serif font-black text-[#4a2c2a] mb-4 flex items-center gap-2 uppercase">
                <HelpCircle className="text-[#8B4513] w-5 h-5" />
                <span>Petunjuk</span>
              </h3>
              
              <div className="space-y-3.5 text-xs text-[#4a2c2a] mb-6 font-semibold select-none">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 px-2.5 bg-[#4a2c2a] text-[#E9E4D4] font-mono text-[9px] font-bold mt-0.5 rounded-lg">SPASI</div>
                  <p>Ketuk tombol <b>Spasi</b> untuk kontrol terbang / lompat.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1 px-2.5 bg-[#4a2c2a] text-[#E9E4D4] font-mono text-[9px] font-bold mt-0.5 rounded-lg">TAP</div>
                  <p>Atau klik <b>Layar Game</b> untuk terbang lincah / lompat mobil.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1 px-1.5 bg-amber-100/70 border border-amber-600/20 rounded-lg text-amber-800 font-mono text-[9px] font-bold mt-0.5">SLOW</div>
                  <p>Pilih mode <b>Santai</b> jika ingin melaju lambat.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1 px-2 bg-emerald-100/70 border border-emerald-600/20 rounded-lg text-emerald-800 font-mono text-[9px] font-bold mt-0.5">🏁</div>
                  <p>Di <b>Manuk Balapan</b>, hindari balok rintangan maut & kolam jurang!</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowTutorial(false);
                  gameAudio.playJumpSound();
                }}
                className="w-full py-3 bg-[#4a2c2a]/95 hover:bg-[#533331] text-[#E9E4D4] font-serif font-black uppercase text-sm rounded-[18px] border border-white/10 shadow-md cursor-pointer"
              >
                Saya Mengerti Mbah!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Mode Selection Popup Medal */}
      <AnimatePresence>
        {showModeSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 z-25"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white/45 backdrop-blur-2xl rounded-[32px] p-5.5 shadow-[0_24px_60px_rgba(74,44,42,0.25)] max-w-sm w-full border border-white/60 text-center"
            >
              <h3 className="text-2xl font-serif font-black text-[#4a2c2a] tracking-tight uppercase leading-none filter mb-1">
                Pilih Game
              </h3>
              <p className="text-[#8B4513] italic text-[11px] mb-5 font-serif select-none">
                Mau main game yang mana nih?
              </p>

              <div className="space-y-3">
                {/* Mode 1: Classic Flappy */}
                <motion.button
                  whileHover={{ scale: 1.03, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    gameAudio.playJumpSound();
                    setShowModeSelection(false);
                    onStartGame('classic');
                  }}
                  className="w-full p-4 bg-white/45 hover:bg-white/75 border border-white/60 rounded-[22px] text-left transition-all shadow-sm flex items-start gap-3 cursor-pointer select-none"
                >
                  <span className="text-3xl p-1 bg-amber-100 rounded-xl leading-none">🐥</span>
                  <div className="flex-1">
                    <h4 className="font-serif font-extrabold text-sm text-[#4a2c2a] leading-tight">1. Manuk Mabur</h4>
                    <p className="text-[10px] text-[#8B4513] font-medium leading-normal mt-0.5">Kepak sayap hindari tiang bambu legendaris! Klasik & santai.</p>
                  </div>
                </motion.button>

                {/* Mode 2: Car Race Pou style */}
                <motion.button
                  whileHover={{ scale: 1.03, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    gameAudio.playJumpSound();
                    setShowModeSelection(false);
                    onStartGame('race');
                  }}
                  className="w-full p-4 bg-white/45 hover:bg-white/75 border border-white/60 rounded-[22px] text-left transition-all shadow-sm flex items-start gap-3 cursor-pointer select-none"
                >
                  <span className="text-3xl p-1 bg-red-100 rounded-xl leading-none">🏎️</span>
                  <div className="flex-1">
                    <h4 className="font-serif font-extrabold text-sm text-[#4a2c2a] leading-tight">2. Manuk Balapan</h4>
                    <p className="text-[10px] text-[#8B4513] font-medium leading-normal mt-0.5">Kendarai mobil gokart melompati balok rintangan & jurang maut Pou style!</p>
                  </div>
                </motion.button>

                {/* Mode 3: Air Hockey VS Bot */}
                <motion.button
                  whileHover={{ scale: 1.03, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    gameAudio.playJumpSound();
                    setShowModeSelection(false);
                    onStartGame('hockey');
                  }}
                  className="w-full p-4 bg-white/45 hover:bg-white/75 border border-white/60 rounded-[22px] text-left transition-all shadow-sm flex items-start gap-3 cursor-pointer select-none animate-pulse-slow"
                >
                  <span className="text-3xl p-1 bg-blue-100 rounded-xl leading-none">🏓</span>
                  <div className="flex-1">
                    <h4 className="font-serif font-extrabold text-sm text-[#4a2c2a] leading-tight">3. Air Hockey VS Bot (Baru)</h4>
                    <p className="text-[10px] text-[#8B4513] font-medium leading-normal mt-0.5">Geser pemukul untuk cetak 7 gol melawan Bot Mbah! Mode Ultimate bot sangat agresif!</p>
                  </div>
                </motion.button>
              </div>

              {/* Close / Cancel Button */}
              <button
                onClick={() => {
                  setShowModeSelection(false);
                  gameAudio.playJumpSound();
                }}
                className="mt-5 text-[10px] font-mono tracking-widest uppercase font-extrabold text-[#8b4513]/80 hover:text-[#4a2c2a] transition-colors cursor-pointer"
              >
                Kembali ke Menu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
