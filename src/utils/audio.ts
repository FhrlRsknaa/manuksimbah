// Web Audio API Retro Sound and Music Synth Engine for "Manuk Mbah"
// Supports fully local procedural audio, as well as file configuration placeholders.

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bgmInterval: any = null;
  private isMuted: boolean = false;
  private volume: number = 100; // Default comfortable volume
  private isBgmPlaying: boolean = false;
  private bgmTempo: number = 135; // bpm
  private customMusicFile: HTMLAudioElement | null = null;
  private customJumpFile: HTMLAudioElement | null = null;
  private customHitFile: HTMLAudioElement | null = null;

  // Paths for standard local assets (can be overwritten by the user if files are dropped in)
  private localPaths = {
    bgm: '/src/assets/audio/music.mp3',
    jump: '/src/assets/audio/jump.mp3',
    hit: '/src/assets/audio/hit.mp3',
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
      '/music.mp3',
      '/audio/music.mp3',
      '/src/assets/audio/music.mp3'
    ];

    const jumpPaths = [
      '/jump.mp3',
      '/audio/jump.mp3',
      '/src/assets/audio/jump.mp3'
    ];

    const hitPaths = [
      '/hit.mp3',
      '/audio/hit.mp3',
      '/src/assets/audio/hit.mp3'
    ];

    tryLoadPaths(bgmPaths, (audio) => {
      audio.loop = true;
      this.customMusicFile = audio;
      // If music is already playing synth, switch to this
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

  // Synthesise retro jump sound (Flap)
  public playJumpSound() {
    if (this.isMuted) return;
    this.initContext();

    // Check custom audio file first
    if (this.customJumpFile) {
      this.customJumpFile.currentTime = 0;
      this.customJumpFile.volume = this.volume;
      this.customJumpFile.play().catch(() => {});
      return;
    }

    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // Warm retro square-triangle blend
    osc.type = 'triangle';
    
    const now = this.ctx.currentTime;
    // Frequency sweeps upwards for high flap feel
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.12);

    // Short decay
    gainNode.gain.setValueAtTime(this.volume * 0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Synthesise retro score point sound
  public playScoreSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.type = 'sine';
    const now = this.ctx.currentTime;

    // Classic arcade high bell ding
    // Plays dynamic pentatonic interval
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5

    gainNode.gain.setValueAtTime(this.volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Synthesise retro crash/impact sound
  public playHitSound() {
    if (this.isMuted) return;
    this.initContext();

    if (this.customHitFile) {
      this.customHitFile.currentTime = 0;
      this.customHitFile.volume = this.volume;
      this.customHitFile.play().catch(() => {});
      return;
    }

    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(20, now + 0.3);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(80, now);
    osc2.frequency.linearRampToValueAtTime(10, now + 0.4);

    gainNode.gain.setValueAtTime(this.volume * 0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  // Synthesise retro crash details
  public playGameOverSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.type = 'sine';
    const now = this.ctx.currentTime;

    // Sad descending retro chord
    osc.frequency.setValueAtTime(330, now); // E4
    osc.frequency.setValueAtTime(293.66, now + 0.15); // D4
    osc.frequency.setValueAtTime(261.63, now + 0.3); // C4
    osc.frequency.setValueAtTime(196, now + 0.45); // G3

    gainNode.gain.setValueAtTime(this.volume * 0.4, now);
    gainNode.gain.setValueAtTime(this.volume * 0.4, now + 0.35);
    gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.75);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  // Cheerful Javanese Gamelan Slendro scale chiptune loop
  // Note frequencies: C4(261.63), D4(293.66), F4(349.23), G4(392.00), A4(440.00)
  public playMusic() {
    this.isBgmPlaying = true;
    if (this.isMuted) return;

    if (this.customMusicFile) {
      this.customMusicFile.volume = this.volume;
      this.customMusicFile.play().catch(() => {});
      return;
    }

    this.initContext();
    if (!this.ctx) return;

    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
    }

    const slendroScale = [261.63, 293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46];
    
    // Simple cheerful backing track (AABB style loop)
    const leadMelody = [
      4, 5, 6, 5,  4, 4, 3, 2,  // Bar 1 & 2
      5, 5, 4, 3,  2, 1, 0, 1,  // Bar 3 & 4
      4, 5, 6, 7,  6, 5, 4, 5,  // Bar 5 & 6
      6, 4, 3, 2,  1, 2, 3, 4   // Bar 7 & 8
    ];

    const bassLine = [
      0, 2, 0, 2,  1, 3, 1, 3,
      2, 4, 2, 4,  0, 1, 2, 3
    ];

    let melodyStep = 0;
    let tickCount = 0;
    const itemIntervalMs = (60 / this.bgmTempo) * 1000 * 0.5; // Eighth notes

    this.bgmInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;

      const now = this.ctx.currentTime;

      // Play bass support (quarter notes)
      if (tickCount % 2 === 0) {
        const bassIdx = bassLine[Math.floor(tickCount / 2) % bassLine.length];
        const bassFreq = slendroScale[bassIdx] * 0.5; // Down an octave
        this.playNote(bassFreq, 0.25, 'triangle', this.volume * 0.25, now);
      }

      // Play retro lead melody (eighth notes with slight ornamentations)
      const noteIdx = leadMelody[melodyStep % leadMelody.length];
      const frequency = slendroScale[noteIdx];
      
      // Let's sound like a classic Javanese Saron / chiptune synth
      this.playNote(frequency, 0.15, 'sine', this.volume * 0.2, now);

      melodyStep++;
      tickCount++;
    }, itemIntervalMs);
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
