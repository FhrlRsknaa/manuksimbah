// Web Audio API Retro Sound and Music Synth Engine for "Manuk Mbah"
// Supports fully local procedural audio, as well as file configuration placeholders.

import defaultMusicUrl from '../assets/audio/music.mp3';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bgmInterval: any = null;
  private isMuted: boolean = false;
  private volume: number = 0.3; // Default comfortable volume
  private isBgmPlaying: boolean = false;
  private bgmTempo: number = 135; // bpm
  private customMusicFile: HTMLAudioElement | null = null;
  private customJumpFile: HTMLAudioElement | null = null;
  private customHitFile: HTMLAudioElement | null = null;
  private customScoreFile: HTMLAudioElement | null = null;
  private customGameOverFile: HTMLAudioElement | null = null;

  // Paths for standard local assets (can be overwritten by the user if files are dropped in)
  private localPaths = {
    bgm: defaultMusicUrl,
    jump: '/src/assets/audio/jump.mp3',
    hit: '/src/assets/audio/hit.mp3',
    score: '/src/assets/audio/score.mp3',
    gameover: '/src/assets/audio/gameover.mp3',
  };

  constructor() {
    this.preloadLocalFiles();
  }

  private preloadLocalFiles() {
    // Attempt sequentially to load standard and public audio paths.
    // Highly robust fallback. Uses the first one that succeeded, else defaults to procedurally generated chiptunes.
    const tryLoadPaths = (paths: string[], successCallback: (audio: HTMLAudioElement) => void) => {
      let index = 0;
      
      const tryNext = () => {
        if (index >= paths.length) return;
        const currentPath = paths[index];
        const audio = new Audio(currentPath);
        audio.volume = this.volume;
        
        const onCanPlay = () => {
          successCallback(audio);
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('loadeddata', onCanPlay);
          audio.removeEventListener('error', onError);
        };
        
        const onError = () => {
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('loadeddata', onCanPlay);
          audio.removeEventListener('error', onError);
          index++;
          tryNext();
        };
        
        audio.addEventListener('canplaythrough', onCanPlay);
        audio.addEventListener('loadeddata', onCanPlay);
        audio.addEventListener('error', onError);
        audio.load();
      };

      tryNext();
    };

    const bgmPaths = [
      defaultMusicUrl,
      '/src/assets/audio/music.mp3',
      '/music.mp3',
      '/audio/music.mp3'
    ];

    const jumpPaths = [
      '/src/assets/audio/jump.mp3',
      '/audio/jump.mp3',
      '/jump.mp3'
    ];

    const hitPaths = [
      '/src/assets/audio/hit.mp3',
      '/audio/hit.mp3',
      '/hit.mp3'
    ];

    const scorePaths = [
      '/src/assets/audio/score.mp3',
      '/audio/score.mp3',
      '/score.mp3'
    ];

    const gameoverPaths = [
      '/src/assets/audio/gameover.mp3',
      '/audio/gameover.mp3',
      '/gameover.mp3'
    ];

    try {
      const audio = new Audio(defaultMusicUrl);
      audio.loop = true;
      audio.volume = this.volume;
      this.customMusicFile = audio;
    } catch (e) {
      console.warn("Failed to instantly load local BGM asset", e);
    }

    tryLoadPaths(bgmPaths, (audio) => {
      audio.loop = true;
      this.customMusicFile = audio;
      // If music was requested, play it
      if (this.isBgmPlaying && !this.isMuted) {
        this.pauseMusic();
        this.isBgmPlaying = true;
        this.customMusicFile.play().catch(() => {});
      }
    });

    tryLoadPaths(jumpPaths, (audio) => {
      this.customJumpFile = audio;
    });

    tryLoadPaths(hitPaths, (audio) => {
      this.customHitFile = audio;
    });

    tryLoadPaths(scorePaths, (audio) => {
      this.customScoreFile = audio;
    });

    tryLoadPaths(gameoverPaths, (audio) => {
      this.customGameOverFile = audio;
    });
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    // Autoplay policy defense: trigger audio play on first touch / interaction
    if (this.isBgmPlaying && this.customMusicFile && this.customMusicFile.paused && !this.isMuted) {
      this.customMusicFile.play().catch(() => {});
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (mute) {
      this.pauseMusic();
    } else {
      this.playMusic();
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMuteState() {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume() {
    return this.volume;
  }

  // Hook up custom user file uploads if they choose to upload files in-game
  public loadCustomMusic(file: File) {
    const url = URL.createObjectURL(file);
    if (this.customMusicFile) {
      this.customMusicFile.pause();
    }
    this.customMusicFile = new Audio(url);
    this.customMusicFile.loop = true;
    this.customMusicFile.volume = this.volume;
    if (this.isBgmPlaying && !this.isMuted) {
      this.customMusicFile.play();
    }
  }

  public loadCustomJump(file: File) {
    const url = URL.createObjectURL(file);
    this.customJumpFile = new Audio(url);
  }

  public loadCustomHit(file: File) {
    const url = URL.createObjectURL(file);
    this.customHitFile = new Audio(url);
  }

  // Play retro jump sound (Flap)
  public playJumpSound() {
    if (this.isMuted) return;
    this.initContext();

    // Check custom audio file first
    if (this.customJumpFile) {
      this.customJumpFile.currentTime = 0;
      this.customJumpFile.volume = this.volume;
      this.customJumpFile.play().catch(() => {});
    }
  }

  // Play retro score point sound
  public playScoreSound() {
    if (this.isMuted) return;
    this.initContext();

    if (this.customScoreFile) {
      this.customScoreFile.currentTime = 0;
      this.customScoreFile.volume = this.volume;
      this.customScoreFile.play().catch(() => {});
    }
  }

  // Play retro crash/impact sound
  public playHitSound() {
    if (this.isMuted) return;
    this.initContext();

    if (this.customHitFile) {
      this.customHitFile.currentTime = 0;
      this.customHitFile.volume = this.volume;
      this.customHitFile.play().catch(() => {});
    }
  }

  // Play retro crash details
  public playGameOverSound() {
    if (this.isMuted) return;
    this.initContext();

    if (this.customGameOverFile) {
      this.customGameOverFile.currentTime = 0;
      this.customGameOverFile.volume = this.volume;
      this.customGameOverFile.play().catch(() => {});
    }
  }

  // Cheerful Javanese Gamelan Slendro scale chiptune loop
  // Note frequencies: C4(261.63), D4(293.66), F4(349.23), G4(392.00), A4(440.00)
  public playMusic() {
    this.isBgmPlaying = true;
    if (this.isMuted) return;

    if (this.customMusicFile) {
      this.customMusicFile.volume = this.volume;
      this.customMusicFile.play().catch((err) => {
        console.warn("Audio BGM failed to play", err);
      });
    }
  }

  private playProceduralBgm() {
    // Disabled to strictly prioritize and only play local asset files
  }

  private playNote(freq: number, duration: number, type: OscillatorType, gainVal: number, startTime: number) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(gainVal, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  public pauseMusic() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.customMusicFile) {
      this.customMusicFile.pause();
    }
  }

  public resumeMusic() {
    this.playMusic();
  }
}

export const gameAudio = new AudioEngine();
