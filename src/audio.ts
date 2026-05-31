function playKick(ctx: AudioContext, time: number, gainNode: GainNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(gainNode);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, time);
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.3);
  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.start(time);
  osc.stop(time + 0.3);
}

function playSnare(ctx: AudioContext, time: number, gainNode: GainNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.connect(gain);
  gain.connect(gainNode);
  osc.frequency.setValueAtTime(600, time);
  osc.frequency.exponentialRampToValueAtTime(400, time + 0.05);
  gain.gain.setValueAtTime(0.6, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc.start(time);
  osc.stop(time + 0.1);
}

function playHihat(ctx: AudioContext, time: number, gainNode: GainNode) {
  const bufferLength = ctx.sampleRate * 0.05;
  const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferLength; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(gainNode);
  noise.start(time);
  noise.stop(time + 0.05);
}

function playPerc(ctx: AudioContext, time: number, gainNode: GainNode) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(1200, time + 0.2);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.connect(gain);
    gain.connect(gainNode);
    osc.start(time);
    osc.stop(time + 0.3);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  
  private tracks: Record<string, TrackBuilder> = {};
  private trackGains: Record<string, GainNode> = {};

  public readonly sequencerConfig = {
    bpm: 90,
    grid: [
      new Array(16).fill(false),
      new Array(16).fill(false),
      new Array(16).fill(false),
      new Array(16).fill(false)
    ],
    labels: ['沉音 (Kick)', '木鱼 (Wood)', '沙锤 (Shaker)', '长铃 (Mallet)'],
    volumes: [0.8, 0.8, 0.8, 0.8],
    onStepCallback: null as ((step: number) => void) | null,
    isPlaying: false
  };

  public analyser: AnalyserNode | null = null;
  public get isPlayingState() { return this.isPlaying || this.sequencerConfig.isPlaying; }
  private seqGain: GainNode | null = null;
  private seqTrackGains: GainNode[] = [];
  private seqCurrentStep = 0;
  private seqNextNoteTime = 0;
  private seqTimerID: any = null;

  constructor() {}

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;

    // Use a DynamicsCompressorNode as a brickwall limiter to prevent clipping (bàoyīn/电流麦)
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-1.0, this.ctx.currentTime); // Threshold -1.0dB to catch heavy spikes
    compressor.knee.setValueAtTime(12, this.ctx.currentTime); // Quick but slightly rounded transition
    compressor.ratio.setValueAtTime(20.0, this.ctx.currentTime); // Brickwall limiting ratio
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime); // Ultra fast attack is crucial to kill pops instantly
    compressor.release.setValueAtTime(0.15, this.ctx.currentTime); // Decent release for high transparency

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.masterGain.connect(compressor);
    compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.seqGain = this.ctx.createGain();
    this.seqGain.gain.value = 0.6;
    this.seqGain.connect(this.masterGain);

    this.seqTrackGains = [];
    for (let i = 0; i < 4; i++) {
        const gain = this.ctx.createGain();
        gain.gain.value = this.sequencerConfig.volumes[i];
        gain.connect(this.seqGain);
        this.seqTrackGains.push(gain);
    }

    this.setupTracks();
  }

  private setupTracks() {
    if (!this.ctx || !this.masterGain) return;

    // 1. Drone
    this.tracks['drone'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0; // modulated
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      osc1.frequency.value = 65.41; // C2
      osc2.frequency.value = 130.81; // C3
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      const lfo = this.ctx!.createOscillator();
      lfo.frequency.value = 0.05; // very slow
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = 0.3;
      
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      
      osc1.connect(g);
      osc2.connect(g);
      
      osc1.start();
      osc2.start();
      lfo.start();
      
      return g;
    };

    // 2. Chimes (Pentatonic mallet)
    this.tracks['chimes'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0.5;
      
      // Delay effect for ethereal sound
      const delay = this.ctx!.createDelay();
      delay.delayTime.value = 0.7;
      const feedback = this.ctx!.createGain();
      feedback.gain.value = 0.6;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(g);
      
      // We will trigger notes periodically
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // C Major Pentatonic
      
      let interval: any;
      
      const playNote = () => {
        if (!this.isPlaying) return;
        const noteGain = this.ctx!.createGain();
        noteGain.gain.setValueAtTime(0, this.ctx!.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 2);
        
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle'; // triangle is rounder, mallets-like
        const freq = scale[Math.floor(Math.random() * scale.length)];
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
        
        osc.connect(noteGain);
        noteGain.connect(g);
        noteGain.connect(delay);
        
        osc.start();
        osc.stop(this.ctx!.currentTime + 2);
        
        interval = setTimeout(playNote, Math.random() * 2000 + 1000);
      };
      
      // Inject start/stop into the node for custom cleanup
      (g as any).customStart = playNote;
      (g as any).customStop = () => clearTimeout(interval);
      
      return g;
    };

    // 3. Wind (Natural Pink Noise + Filter)
    this.tracks['wind'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0.6;
      
      const bufferSize = this.ctx!.sampleRate * 2;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
      }
      
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300; 
      filter.Q.value = 2; // Resonance for slight whistling
      
      const lfo1 = this.ctx!.createOscillator();
      lfo1.frequency.value = 0.05;
      const lfoGain1 = this.ctx!.createGain();
      lfoGain1.gain.value = 300;
      
      const lfo2 = this.ctx!.createOscillator();
      lfo2.frequency.value = 0.07;
      const lfoGain2 = this.ctx!.createGain();
      lfoGain2.gain.value = 200;
      
      lfo1.connect(lfoGain1);
      lfo2.connect(lfoGain2);
      lfoGain1.connect(filter.frequency);
      lfoGain2.connect(filter.frequency);
      
      const gainMod = this.ctx!.createGain();
      gainMod.gain.value = 0.4;
      lfo1.connect(gainMod);
      const windGain = this.ctx!.createGain();
      windGain.gain.value = 0.6;
      gainMod.connect(windGain.gain);

      noise.connect(filter);
      filter.connect(windGain);
      windGain.connect(g);
      
      noise.start();
      lfo1.start();
      lfo2.start();
      
      return g;
    };

    // 4. Binaural Beats
    this.tracks['binaural'] = () => {
      const g = this.ctx!.createGain();
      
      const merger = this.ctx!.createChannelMerger(2);
      
      const leftOsc = this.ctx!.createOscillator();
      const rightOsc = this.ctx!.createOscillator();
      
      leftOsc.frequency.value = 200;
      rightOsc.frequency.value = 206; // 6Hz beat frequency (theta/alpha boundary)
      
      leftOsc.connect(merger, 0, 0);
      rightOsc.connect(merger, 0, 1);
      
      merger.connect(g);
      
      leftOsc.start();
      rightOsc.start();
      
      return g;
    };

    // 5. Crystal Bowl (Singing bowl resonance)
    this.tracks['bowl'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0;
      
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      
      osc1.frequency.value = 349.23; // F4 (Heart chakra)
      osc2.frequency.value = 351; // Slight detune
      
      const lfo = this.ctx!.createOscillator();
      lfo.frequency.value = 0.2;
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = 0.5;
      
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      
      osc1.connect(g);
      osc2.connect(g);
      
      osc1.start();
      osc2.start();
      lfo.start();
      
      return g;
    };

    // 6. Ocean Waves
    this.tracks['ocean'] = () => {
      const g = this.ctx!.createGain();
      
      const bufferSize = this.ctx!.sampleRate * 2;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
      }
      
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      
      const waveGain = this.ctx!.createGain();
      waveGain.gain.value = 0;

      noise.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(g);

      noise.start();
      
      let interval: any;
      const playWave = () => {
         if (!this.isPlaying) return;
         const now = this.ctx!.currentTime;
         const duration = 8 + Math.random() * 4;
         
         waveGain.gain.cancelScheduledValues(now);
         waveGain.gain.setValueAtTime(0.01, now);
         waveGain.gain.exponentialRampToValueAtTime(1.5, now + duration * 0.4);
         waveGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

         filter.frequency.cancelScheduledValues(now);
         filter.frequency.setValueAtTime(100, now);
         filter.frequency.exponentialRampToValueAtTime(800, now + duration * 0.4);
         filter.frequency.exponentialRampToValueAtTime(100, now + duration);
         
         interval = setTimeout(playWave, duration * 1000 + (Math.random() * 2000));
      };

      (g as any).customStart = playWave;
      (g as any).customStop = () => clearTimeout(interval);
      return g;
    };

    // 7. Bird Calls
    this.tracks['birds'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0.5;

      const delay = this.ctx!.createDelay();
      delay.delayTime.value = 0.4;
      const feedback = this.ctx!.createGain();
      feedback.gain.value = 0.3;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(g);

      let interval: any;
      const playBird = () => {
        if (!this.isPlaying) return;
        const now = this.ctx!.currentTime;
        
        const osc = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();
        
        osc.connect(noteGain);
        noteGain.connect(g);
        noteGain.connect(delay);
        
        const baseFreq = 2000 + Math.random() * 2000;
        
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(1, now + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq + 1000 + Math.random() * 1000, now + 0.1);
        
        osc.start(now);
        osc.stop(now + 0.2);
        
        if (Math.random() > 0.5) {
            const osc2 = this.ctx!.createOscillator();
            const noteGain2 = this.ctx!.createGain();
            osc2.connect(noteGain2);
            noteGain2.connect(g);
            noteGain2.connect(delay);
            
            noteGain2.gain.setValueAtTime(0, now + 0.15);
            noteGain2.gain.linearRampToValueAtTime(0.8, now + 0.2);
            noteGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            osc2.frequency.setValueAtTime(baseFreq - 500, now + 0.15);
            osc2.frequency.exponentialRampToValueAtTime(baseFreq + 500, now + 0.25);
            
            osc2.start(now + 0.15);
            osc2.stop(now + 0.35);
        }

        interval = setTimeout(playBird, 3000 + Math.random() * 8000);
      };

      (g as any).customStart = playBird;
      (g as any).customStop = () => clearTimeout(interval);
      
      return g;
    };

    // 8. Warm Pad
    this.tracks['warm_pad'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0.5;
      
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.connect(g);
      
      let interval: any;
      const chords = [
        [130.81, 164.81, 196.00, 246.94], // Cmaj7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [146.83, 174.61, 220.00, 293.66], // Dmin7
        [196.00, 246.94, 293.66, 392.00]  // Gmaj
      ];
      let chordIndex = 0;
      
      const playPad = () => {
         if (!this.isPlaying) return;
         const now = this.ctx!.currentTime;
         const freqs = chords[chordIndex];
         chordIndex = (chordIndex + 1) % chords.length;
         
         freqs.forEach(f => {
            const osc = this.ctx!.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now);
            
            const osc2 = this.ctx!.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(f * 2.01, now); // slight detune
            
            const env = this.ctx!.createGain();
            env.gain.setValueAtTime(0, now);
            env.gain.linearRampToValueAtTime(0.15, now + 2);
            env.gain.exponentialRampToValueAtTime(0.001, now + 8);
            
            osc.connect(env);
            osc2.connect(env);
            env.connect(filter);
            
            osc.start(now);
            osc2.start(now);
            osc.stop(now + 8);
            osc2.stop(now + 8);
         });
         
         interval = setTimeout(playPad, 6000);
      };
      
      (g as any).customStart = playPad;
      (g as any).customStop = () => clearTimeout(interval);
      return g;
    };

    // 9. Ethereal Flute
    this.tracks['flute'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0.5;
      
      const delay = this.ctx!.createDelay();
      delay.delayTime.value = 0.6;
      const feedback = this.ctx!.createGain();
      feedback.gain.value = 0.4;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(g);
      
      const notes = [329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99]; // E minor pentatonic
      
      let interval: any;
      const playFlute = () => {
         if (!this.isPlaying) return;
         const now = this.ctx!.currentTime;
         const freq = notes[Math.floor(Math.random() * notes.length)];
         
         const osc = this.ctx!.createOscillator();
         osc.type = 'sine';
         
         const vib = this.ctx!.createOscillator();
         vib.frequency.value = 5;
         const vibGain = this.ctx!.createGain();
         vibGain.gain.value = 4;
         vib.connect(vibGain);
         vibGain.connect(osc.frequency);
         vib.start(now);
         vib.stop(now + 4);
         
         const env = this.ctx!.createGain();
         env.gain.setValueAtTime(0, now);
         env.gain.linearRampToValueAtTime(0.3, now + 1);
         env.gain.exponentialRampToValueAtTime(0.001, now + 3);
         
         osc.frequency.setValueAtTime(freq, now);
         
         osc.connect(env);
         env.connect(g);
         env.connect(delay);
         
         osc.start(now);
         osc.stop(now + 4);
         
         interval = setTimeout(playFlute, Math.random() * 4000 + 3000);
      }
      
      (g as any).customStart = playFlute;
      (g as any).customStop = () => clearTimeout(interval);
      return g;
    };

    // 10. Classical Strings
    this.tracks['strings'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0.5;
      
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600; // soft and warm
      filter.connect(g);
      
      const notes = [130.81, 146.83, 174.61, 196.00, 220.00, 261.63]; // C3, D3, F3, G3, A3, C4
      
      let interval: any;
      const playString = () => {
         if (!this.isPlaying) return;
         const now = this.ctx!.currentTime;
         const freq = notes[Math.floor(Math.random() * notes.length)];
         
         const env = this.ctx!.createGain();
         env.gain.setValueAtTime(0, now);
         env.gain.linearRampToValueAtTime(0.2, now + 2);
         env.gain.exponentialRampToValueAtTime(0.001, now + 8);
         
         const numVoices = 3;
         for (let i = 0; i < numVoices; i++) {
           const osc = this.ctx!.createOscillator();
           osc.type = 'sawtooth';
           const detune = (Math.random() - 0.5) * 6; // slight detune for chorus effect
           osc.frequency.setValueAtTime(freq + detune, now);
           
           const vib = this.ctx!.createOscillator();
           vib.frequency.value = 4 + Math.random() * 2;
           const vibGain = this.ctx!.createGain();
           vibGain.gain.value = 2 + Math.random() * 2;
           vib.connect(vibGain);
           vibGain.connect(osc.frequency);
           
           osc.connect(env);
           vib.start(now);
           osc.start(now);
           
           vib.stop(now + 8);
           osc.stop(now + 8);
         }
         
         env.connect(filter);
         
         interval = setTimeout(playString, 5000 + Math.random() * 3000);
      };
      
      (g as any).customStart = playString;
      (g as any).customStop = () => clearTimeout(interval);
      return g;
    };

    // 11. AI Generated Ambient Track (From Mic Buffer)
    this.tracks['ai_gen'] = () => {
      const g = this.ctx!.createGain();
      g.gain.value = 0.6;
      
      const convolver = this.ctx!.createConvolver();
      // Generate a massive impulse response for ethereal reverb
      const length = this.ctx!.sampleRate * 4;
      const impulse = this.ctx!.createBuffer(2, length, this.ctx!.sampleRate);
      for (let i = 0; i < 2; i++) {
        const channel = impulse.getChannelData(i);
        for (let j = 0; j < length; j++) {
           channel[j] = (Math.random() * 2 - 1) * Math.exp(-j / (this.ctx!.sampleRate * 1.5));
        }
      }
      convolver.buffer = impulse;
      
      const dryGain = this.ctx!.createGain();
      dryGain.gain.value = 0.2;
      const wetGain = this.ctx!.createGain();
      wetGain.gain.value = 0.8;
      
      dryGain.connect(g);
      convolver.connect(wetGain);
      wetGain.connect(g);
      
      let sourceNodes: AudioBufferSourceNode[] = [];
      let interval: any;
      const playAI = () => {
         if (!this.isPlaying || !this.aiGenBuffer) {
             interval = setTimeout(playAI, 1000);
             return;
         }
         
         const source = this.ctx!.createBufferSource();
         source.buffer = this.aiGenBuffer;
         
         // Slow down and pitch down to make it sound "ambient / ethereal"
         const rate = [0.5, 0.75, 1.0, 1.25][Math.floor(Math.random() * 4)];
         source.playbackRate.value = rate;
         
         // Band-limiting filters to purify noisy microphone input and remove dc-offsets/crackles
         const hp = this.ctx!.createBiquadFilter();
         hp.type = 'highpass';
         hp.frequency.setValueAtTime(200, this.ctx!.currentTime);
         
         const lp = this.ctx!.createBiquadFilter();
         lp.type = 'lowpass';
         lp.frequency.setValueAtTime(3000, this.ctx!.currentTime);
         
         const env = this.ctx!.createGain();
         env.gain.setValueAtTime(0, this.ctx!.currentTime);
         env.gain.linearRampToValueAtTime(0.5, this.ctx!.currentTime + 1);
         env.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + this.aiGenBuffer.duration / rate + 2);
         
         source.connect(hp);
         hp.connect(lp);
         lp.connect(env);
         env.connect(dryGain);
         env.connect(convolver);
         
         source.start(this.ctx!.currentTime);
         sourceNodes.push(source);
         
         // Clean up old nodes
         source.onended = () => {
            sourceNodes = sourceNodes.filter(n => n !== source);
         };

         interval = setTimeout(playAI, (this.aiGenBuffer.duration / rate) * 500 + Math.random() * 2000);
      };
      
      (g as any).customStart = playAI;
      (g as any).customStop = () => {
         clearTimeout(interval);
         sourceNodes.forEach(n => {
           try { n.stop() } catch(e){}
         });
         sourceNodes = [];
      };
      return g;
    };
  }

  private trackNodes: Record<string, AudioNode> = {};
  public aiGenBuffer: AudioBuffer | null = null;
  
  public async generateAITrackFromMic(): Promise<void> {
    if (!this.ctx) await this.init();
    
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks: Blob[] = [];

            mediaRecorder.addEventListener("dataavailable", event => {
              audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async () => {
              stream.getTracks().forEach(track => track.stop());
              const audioBlob = new Blob(audioChunks);
              const arrayBuffer = await audioBlob.arrayBuffer();
              const audioCtx = this.ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
              const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
              this.aiGenBuffer = audioBuffer;
              resolve();
            });

            mediaRecorder.start();
            // Record for 3 seconds
            setTimeout(() => {
              mediaRecorder.stop();
            }, 8000);
        }).catch(err => reject(err));
    });
  }

  start() {
    if (!this.ctx || this.isPlaying) return;
    this.ctx.resume();
    this.isPlaying = true;
    
    Object.keys(this.tracks).forEach(key => {
      if (!this.trackNodes[key]) {
        const node = this.tracks[key]();
        this.trackNodes[key] = node;
        this.trackGains[key] = this.ctx!.createGain();
        this.trackGains[key].gain.value = 0; // start muted
        node.connect(this.trackGains[key]);
        this.trackGains[key].connect(this.masterGain!);
      }
      
      const node = this.trackNodes[key];
      if ((node as any).customStart) {
        (node as any).customStart();
      }
    });
  }

  stop() {
    if (!this.ctx || !this.isPlaying) return;
    this.isPlaying = false;
    this.ctx.suspend();
    Object.values(this.trackNodes).forEach(node => {
      if ((node as any).customStop) {
        (node as any).customStop();
      }
    });
  }
  
  toggle() {
    if (this.isPlaying) this.stop();
    else this.start();
    return this.isPlaying;
  }

  setTrackVolume(track: string, volume: number) {
    if (this.trackGains[track] && this.ctx) {
      // smooth transition
      this.trackGains[track].gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }
  }

  // --- Sequencer Integration ---
  
  private seqNextNote() {
    const secondsPerBeat = 60.0 / this.sequencerConfig.bpm;
    this.seqNextNoteTime += 0.25 * secondsPerBeat;
    this.seqCurrentStep++;
    if (this.seqCurrentStep === 16) {
      this.seqCurrentStep = 0;
    }
  }

  private seqScheduleNote(stepNumber: number, time: number) {
    if (this.sequencerConfig.onStepCallback) {
       const timeToWait = (time - this.ctx!.currentTime) * 1000;
       setTimeout(() => {
          if (this.sequencerConfig.onStepCallback) this.sequencerConfig.onStepCallback(stepNumber);
       }, Math.max(timeToWait, 0));
    }

    if (this.sequencerConfig.grid[0][stepNumber]) playKick(this.ctx!, time, this.seqTrackGains[0]!);
    if (this.sequencerConfig.grid[1][stepNumber]) playSnare(this.ctx!, time, this.seqTrackGains[1]!);
    if (this.sequencerConfig.grid[2][stepNumber]) playHihat(this.ctx!, time, this.seqTrackGains[2]!);
    if (this.sequencerConfig.grid[3][stepNumber]) playPerc(this.ctx!, time, this.seqTrackGains[3]!);
  }

  private seqScheduler() {
    while (this.seqNextNoteTime < this.ctx!.currentTime + 0.1) {
      this.seqScheduleNote(this.seqCurrentStep, this.seqNextNoteTime);
      this.seqNextNote();
    }
    this.seqTimerID = window.setTimeout(() => this.seqScheduler(), 25);
  }

  toggleSequencer() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    if (this.sequencerConfig.isPlaying) {
      this.sequencerConfig.isPlaying = false;
      if (this.seqTimerID !== null) window.clearTimeout(this.seqTimerID);
    } else {
      this.sequencerConfig.isPlaying = true;
      this.seqCurrentStep = 0;
      this.seqNextNoteTime = this.ctx.currentTime + 0.05;
      this.seqScheduler();
    }
    return this.sequencerConfig.isPlaying;
  }

  setSequencerVolume(volume: number) {
    if (this.seqGain && this.ctx) {
      this.seqGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }
  }

  setSequencerTrackVolume(index: number, volume: number) {
    this.sequencerConfig.volumes[index] = volume;
    if (this.seqTrackGains[index] && this.ctx) {
      this.seqTrackGains[index].gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }
  }
}

type TrackBuilder = () => AudioNode;

export const engine = new AudioEngine();
