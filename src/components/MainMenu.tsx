import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Play, Sparkles, HelpCircle } from 'lucide-react';
import { gameAudio } from '../utils/audio';
import defaultBg from '../assets/images/manuk_mbah_background_1779513507940.png';

interface MainMenuProps {
  onStartGame: () => void;
  highScore: number;
  onCustomBird: (file: File) => void;
  onCustomBgm: (file: File) => void;
  onCustomJump: (file: File) => void;
  customBirdName: string;
  customBgmName: string;
}

export default function MainMenu({
  onStartGame,
  highScore,
  onCustomBird,
  onCustomBgm,
  onCustomJump,
  customBirdName,
  customBgmName
}: MainMenuProps) {
  const [isMuted, setIsMuted] = useState(gameAudio.getMuteState());
  const [showTutorial, setShowTutorial] = useState(false);

  const handleToggleMute = () => {
    const nextState = gameAudio.toggleMute();
    setIsMuted(nextState);
    if (!nextState) {
      gameAudio.playJumpSound();
    }
  };

  const handleStart = () => {
    gameAudio.playJumpSound();
    onStartGame();
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between items-center p-6 text-[#4a2c2a] font-sans z-10 selection:bg-amber-100 overflow-hidden">
      
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
      <div className="w-full flex justify-between items-center z-10">
        <div className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 shadow-[0_4px_12px_rgba(74,44,42,0.08)] text-[#4a2c2a] font-mono text-[10px] uppercase font-black tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          <span>REKOR TINGGI: {highScore}</span>
        </div>
        
        <button
          onClick={handleToggleMute}
          className="w-10 h-10 bg-white/40 backdrop-blur-md border border-white/50 rounded-full flex items-center justify-center shadow-md hover:bg-white/60 hover:scale-105 active:scale-95 transition-all outline-none"
          id="toggle-mute-btn"
          title="Toggle Sound"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-600" /> : <Volume2 className="w-4 h-4 text-[#4a2c2a] animate-pulse" />}
        </button>
      </div>

      {/* Center Hero/Title Section - Glossy Rounded Container */}
      <div className="flex flex-col items-center text-center mt-3 z-10 w-full max-w-[340px]">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: [1, 1.02, 1], opacity: 1 }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative px-6 py-6 flex flex-col items-center bg-white/30 backdrop-blur-lg rounded-[28px] border border-white/40 shadow-[0_12px_32px_rgba(74,44,42,0.12)] w-full"
        >
          <span className="absolute -top-3 right-6 text-[9px] bg-[#FF4444] text-white font-mono px-3 py-1 rounded-full border border-white/40 font-bold uppercase tracking-widest rotate-6 shadow-md">
            simbah version
          </span>
          
          <h1 className="text-6xl font-serif font-black text-[#4a2c2a] tracking-tight uppercase leading-none filter drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
            manuk<br/>mbah
          </h1>
          
          <p className="text-[#8B4513] italic text-xs mt-3 border-y border-[#8B4513]/20 py-1.5 font-serif tracking-wide w-full max-w-[200px] leading-tight select-none">
            konon katanya nih orang toxic bet di gsm
          </p>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3.5 w-[240px] mt-6">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="w-full py-4 px-6 bg-[#4a2c2a]/95 text-[#E9E4D4] rounded-[22px] font-serif font-black text-xl shadow-[0_12px_30px_rgba(74,44,42,0.25)] hover:bg-[#533331] transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
            id="start-btn"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>MULAI MAIN</span>
          </motion.button>

          <button
            onClick={() => {
              setShowTutorial(true);
              gameAudio.playJumpSound();
            }}
            className="w-full py-2.5 px-3 rounded-[16px] bg-white/40 backdrop-blur-md border border-white/50 text-[#4a2c2a] font-serif font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-white/50 transition-all cursor-pointer shadow-sm"
            id="tutorial-btn"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#8B4513]" />
            <span>Cara Main</span>
          </button>
        </div>
      </div>

      {/* Decorative Javanese Greeting Tag */}
      <div className="text-center pb-2 text-[10px] text-[#8B4513] font-mono tracking-widest uppercase opacity-75 z-10 select-none">
        build by fhrul
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
                  <p>Ketuk tombol <b>Spasi</b> untuk terbang tinggi.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1 px-2.5 bg-[#4a2c2a] text-[#E9E4D4] font-mono text-[9px] font-bold mt-0.5 rounded-lg">TAP</div>
                  <p>Atau klik <b>Layar Game</b> untuk mengepakkan sayap.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1 px-1.5 bg-amber-100/70 border border-amber-600/20 rounded-lg text-amber-800 font-mono text-[9px] font-bold mt-0.5">SLOW</div>
                  <p>Gravitasi <b>lebih santai/lambat</b> agar terbangnya bersahabat!</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1 px-2 bg-emerald-100/70 border border-emerald-600/20 rounded-lg text-emerald-800 font-mono text-[9px] font-bold mt-0.5">🎍</div>
                  <p>Hindari tiang <b>Bambu Nusantara</b> agar manuk mbah tidak tumbang.</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowTutorial(false);
                  gameAudio.playJumpSound();
                }}
                className="w-full py-3 bg-[#4a2c2a]/95 hover:bg-[#533331] text-[#E9E4D4] font-serif font-black uppercase text-sm rounded-[18px] border border-white/10 shadow-md"
              >
                Saya Mengerti Mbah!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
