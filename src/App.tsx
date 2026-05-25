import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Share2, Waves, Bell, Wind, Brain, Droplet, X, GripHorizontal, Link2, Bird, Activity, Grid3X3, SlidersHorizontal, Cloud, Feather, Music } from 'lucide-react';
import { engine } from './audio';
import { TRACKS } from './types';
import { Visualizer } from './Visualizer';

const IconMap: Record<string, React.ReactNode> = {
  'drone': <Activity className="w-5 h-5" />,
  'chimes': <Bell className="w-5 h-5" />,
  'wind': <Wind className="w-5 h-5" />,
  'binaural': <Brain className="w-5 h-5" />,
  'bowl': <Droplet className="w-5 h-5" />,
  'ocean': <Waves className="w-5 h-5" />,
  'birds': <Bird className="w-5 h-5" />,
  'warm_pad': <Cloud className="w-5 h-5" />,
  'flute': <Feather className="w-5 h-5" />,
  'strings': <Music className="w-5 h-5" />
};

export default function App() {
  const [activeMode, setActiveMode] = useState<'mixer' | 'sequencer'>('mixer');
  const [isPlaying, setIsPlaying] = useState(false);
  const [channels, setChannels] = useState<(string | null)[]>(['drone', 'chimes', null, null]);
  const [channelVolumes, setChannelVolumes] = useState<number[]>([0.7, 0.4, 0.5, 0.5]);
  const [showToast, setShowToast] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const params = new URLSearchParams(hash);
      if (params.has('c')) {
        let initialChannels = params.get('c')!.split(',').map(s => s === '' ? null : s);
        while(initialChannels.length < 4) initialChannels.push(null);
        setChannels(initialChannels.slice(0, 4));
      }
      if (params.has('v')) {
        let initialVolumes = params.get('v')!.split(',').map(s => parseFloat(s) || 0);
        while(initialVolumes.length < 4) initialVolumes.push(0.5);
        setChannelVolumes(initialVolumes.slice(0, 4));
      }
    }
  }, []);

  const handlePlayToggle = async () => {
    if (!initRef.current) {
      await engine.init();
      initRef.current = true;
    }
    
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
    } else {
      engine.start();
      setIsPlaying(true);
      // apply current volumes mapped to channels
      TRACKS.forEach(t => {
        const idx = channels.indexOf(t.id);
        if (idx !== -1) {
          engine.setTrackVolume(t.id, channelVolumes[idx]);
        } else {
          engine.setTrackVolume(t.id, 0);
        }
      });
    }
  };

  const handleVolumeChange = (channelIndex: number, newVol: number) => {
    const newVolumes = [...channelVolumes];
    newVolumes[channelIndex] = newVol;
    setChannelVolumes(newVolumes);
    
    const trackId = channels[channelIndex];
    if (trackId && isPlaying) {
      engine.setTrackVolume(trackId, newVol);
    }
  };

  const clearChannel = (channelIndex: number) => {
    const trackId = channels[channelIndex];
    if (trackId && isPlaying) {
      engine.setTrackVolume(trackId, 0);
    }
    const newChannels = [...channels];
    newChannels[channelIndex] = null;
    setChannels(newChannels);
  };

  const handleDrop = (e: React.DragEvent, targetChannel: number) => {
    const trackId = e.dataTransfer.getData('text/plain');
    if (!trackId) return;
    
    const newChannels = [...channels];
    
    // Remove from old slot if exists
    const oldIndex = newChannels.indexOf(trackId);
    if (oldIndex !== -1) {
        newChannels[oldIndex] = null;
    }
    
    const replacedTrack = newChannels[targetChannel];
    if (replacedTrack && replacedTrack !== trackId && isPlaying) {
        engine.setTrackVolume(replacedTrack, 0);
    }
    
    newChannels[targetChannel] = trackId;
    setChannels(newChannels);
    
    if (isPlaying) {
        engine.setTrackVolume(trackId, channelVolumes[targetChannel]);
    }
  };

  const handleDragStart = (e: React.DragEvent, trackId: string) => {
      e.dataTransfer.setData('text/plain', trackId);
  };

  const handleShare = () => {
    const cStr = channels.map(c => c || '').join(',');
    const vStr = channelVolumes.map(v => v.toFixed(2)).join(',');
    const url = `${window.location.origin}${window.location.pathname}#c=${cStr}&v=${vStr}`;
    navigator.clipboard.writeText(url);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 flex flex-col items-center p-6 relative overflow-x-hidden pt-12 md:pt-20">
      
      {/* Visualizer Background */}
      <Visualizer />

      {/* Background ambient glow */}
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[140px] opacity-10 pointer-events-none transition-all duration-1000 z-0"
        style={{
          background: isPlaying ? 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(59,130,246,0.2) 100%)' : 'transparent',
          transform: `translate(-50%, -50%) scale(${isPlaying ? 1.05 : 1})`
        }}
      />

      <div className="max-w-3xl w-full z-10 flex flex-col gap-10">
        
        <header className="flex flex-col sm:flex-row justify-between items-center sm:items-end border-b border-white/10 pb-6 shrink-0 gap-6">
          <div className="text-center sm:text-left">
             <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-white mb-2">禅音 ZenMix</h1>
             <p className="text-gray-400 text-xs md:text-sm tracking-[0.2em] uppercase">多轨沉浸声景</p>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
            <button
               onClick={() => setActiveMode('mixer')}
               className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
                 activeMode === 'mixer' 
                 ? 'bg-white text-black shadow-md' 
                 : 'text-gray-400 hover:text-white'
               }`}
            >
               <SlidersHorizontal className="w-4 h-4" />
               <span className="hidden md:inline">氛围混音</span>
            </button>
            <button
               onClick={() => setActiveMode('sequencer')}
               className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
                 activeMode === 'sequencer' 
                 ? 'bg-white text-black shadow-md' 
                 : 'text-gray-400 hover:text-white'
               }`}
            >
               <Grid3X3 className="w-4 h-4" />
               <span className="hidden md:inline">节奏工坊</span>
            </button>
          </div>

          <div className="flex gap-4">
             <button
                onClick={handleShare}
                className="flex items-center justify-center w-12 h-12 md:w-auto md:px-6 md:py-3 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300"
                title="分享组合"
              >
                <Link2 className="w-5 h-5" />
                <span className="hidden md:inline ml-2 text-sm font-medium tracking-wide">分享</span>
             </button>
             <button
               onClick={handlePlayToggle}
               className="flex items-center justify-center w-12 h-12 md:w-auto md:px-8 md:py-3 rounded-full bg-white text-black hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
             >
               {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1 md:ml-0" />}
               <span className="hidden md:inline ml-3 font-semibold tracking-wider text-sm">{isPlaying ? '暂停' : '播放'}</span>
             </button>
          </div>
        </header>

        {activeMode === 'mixer' ? (
          <>
            {/* Mixer Board */}
            <div className="flex flex-col gap-4">
               {channels.map((trackId, i) => (
                 <div 
                   key={i} 
                   className="flex flex-col sm:flex-row bg-[#0A0A0A] p-4 rounded-3xl gap-6 items-center border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden group/mixer"
                 >
               {/* Drag and Drop Zone */}
               <div 
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-500/10'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-500/10'); }}
                  onDrop={(e) => { 
                     e.preventDefault(); 
                     e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-500/10'); 
                     handleDrop(e, i); 
                  }}
                  className="w-full sm:w-48 h-20 sm:h-24 rounded-2xl border border-dashed border-white/15 flex flex-col items-center justify-center relative shrink-0 transition-all group z-10"
               >
                 {trackId ? (
                     <>
                       <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl pointer-events-none" />
                       <div className={`flex flex-col items-center gap-2 z-10 transition-transform ${isPlaying ? 'scale-105' : ''}`}>
                          <div className={isPlaying && trackId ? 'text-indigo-400 animate-pulse' : 'text-gray-400'}>
                             {IconMap[trackId]}
                          </div>
                          <span className="text-sm font-medium text-white tracking-wide">{TRACKS.find(t => t.id === trackId)?.name}</span>
                       </div>
                       <button 
                          onClick={() => clearChannel(i)}
                          className="absolute -top-2 -right-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md"
                       >
                          <X size={12} />
                       </button>
                     </>
                 ) : (
                     <div className="flex flex-col items-center gap-2 text-white/30 font-medium text-[10px] tracking-widest uppercase">
                       <GripHorizontal size={18} className="text-white/20" />
                       <span>拖拽音源至此</span>
                     </div>
                 )}
               </div>
               
               {/* Volume Slider Section */}
               <div className={`flex-1 w-full relative flex items-center h-12 transition-opacity duration-500 pb-2 sm:pb-0 ${trackId ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <div className="absolute w-full h-1.5 bg-white/5 rounded-full pointer-events-none shadow-inner overflow-hidden">
                     <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-75"
                        style={{width: `${channelVolumes[i] * 100}%`}}
                     />
                  </div>
                  <input 
                     type="range" 
                     min="0" max="1" step="0.01" 
                     value={channelVolumes[i]} 
                     onChange={(e) => handleVolumeChange(i, parseFloat(e.target.value))}
                     className="absolute w-full h-full opacity-0 cursor-pointer" 
                     disabled={!trackId}
                  />
                  <div className="absolute -bottom-2 sm:-bottom-4 left-0 right-0 flex justify-between px-1 pointer-events-none">
                      <span className="text-[9px] text-white/20 font-mono tracking-widest">静音</span>
                      <span className="text-[9px] text-white/20 font-mono tracking-widest">最大</span>
                  </div>
               </div>
               
               <div className={`hidden sm:block w-12 text-right font-mono text-xs transition-opacity duration-300 ${trackId ? 'text-gray-400' : 'text-gray-700'}`}>
                  {trackId ? Math.round(channelVolumes[i] * 100) : '00'}
               </div>
             </div>
           ))}
        </div>

        {/* Inventory Shelf */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl mt-4">
            <h2 className="text-white/30 text-xs font-semibold tracking-[0.2em] mb-6 text-center">可用音源库</h2>
            <div className="flex flex-wrap gap-4 justify-center">
                {TRACKS.map(t => {
                    const inUse = channels.includes(t.id);
                    return (
                        <div
                            key={t.id}
                            draggable={!inUse}
                            onDragStart={(e) => handleDragStart(e, t.id)}
                            className={`px-4 sm:px-5 py-3 sm:py-4 rounded-2xl flex items-center gap-3 sm:gap-4 border transition-all ${
                                inUse 
                                ? 'border-transparent bg-white/5 text-white/20 cursor-not-allowed opacity-50'
                                : 'border-white/10 bg-white/5 text-white cursor-grab hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-xl active:scale-95 active:cursor-grabbing'
                            }`}
                        >
                            <div className={`${inUse ? 'opacity-30' : 'text-indigo-400'}`}>
                               {IconMap[t.id]}
                            </div>
                            <div className="flex flex-col">
                               <span className="font-medium text-sm tracking-wide leading-tight">{t.name}</span>
                               <span className="text-[10px] text-white/40 tracking-wider hidden sm:block mt-1">{t.description}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-center text-white/20 text-xs mt-8">将音源卡片拖拽至上方混音轨道</p>
        </div>
        </>
        ) : (
           <SequencerView initRef={initRef} />
        )}

      </div>

      {/* Toast Notification */}
      <div 
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full shadow-2xl font-medium tracking-wide text-sm transition-all duration-500 z-50 ${
          showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        混音链接已复制到剪贴板！
      </div>
    
    </div>
  );
}

function SequencerView({ initRef }: { initRef: React.MutableRefObject<boolean> }) {
  const [isPlaying, setIsPlaying] = useState(engine.sequencerConfig.isPlaying);
  const [bpm, setBpm] = useState(engine.sequencerConfig.bpm);
  const [grid, setGrid] = useState<boolean[][]>(engine.sequencerConfig.grid);
  const [currentStep, setCurrentStep] = useState(0);
  const [trackVolumes, setTrackVolumes] = useState(engine.sequencerConfig.volumes);

  useEffect(() => {
    engine.sequencerConfig.onStepCallback = (step) => {
      setCurrentStep(step);
    };
    return () => {
      engine.sequencerConfig.onStepCallback = null;
    };
  }, []);

  const handleTogglePlay = async () => {
    if (!initRef.current) {
      await engine.init();
      initRef.current = true;
    }
    const playing = engine.toggleSequencer();
    setIsPlaying(playing);
  };

  const toggleCell = (row: number, col: number) => {
    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = !newGrid[row][col];
    setGrid(newGrid);
    engine.sequencerConfig.grid = newGrid;
  };

  const clearGrid = () => {
    const newGrid = grid.map(r => new Array(16).fill(false));
    setGrid(newGrid);
    engine.sequencerConfig.grid = newGrid;
  };

  const adjustBpm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = Math.max(40, Math.min(240, parseInt(e.target.value) || 120));
    setBpm(newBpm);
    engine.sequencerConfig.bpm = newBpm;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl flex flex-col gap-8 shadow-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/10 pb-6 gap-6">
        <div className="flex items-center gap-6">
          <button
            onClick={handleTogglePlay}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-500 text-white hover:bg-indigo-400 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
          <div className="flex flex-col">
            <span className="text-white font-medium text-lg tracking-wide">{bpm} BPM</span>
            <span className="text-[10px] text-white/40 tracking-widest uppercase">Tempo</span>
          </div>
        </div>
        <div className="flex items-center gap-6 w-full sm:w-auto">
          <input 
            type="range" 
            min="40" 
            max="200" 
            value={bpm} 
            onChange={adjustBpm}
            className="flex-1 sm:w-48 h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white cursor-pointer"
          />
          <button 
            onClick={clearGrid}
            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:bg-red-400/10 px-4 py-2 rounded-full transition-colors whitespace-nowrap"
          >
            清空序列
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0">
        <div className="min-w-[700px] flex flex-col gap-3">
          {/* Step indicators */}
          <div className="flex mb-2 pl-24">
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={`indicator-${i}`} 
                className="flex-1 flex justify-center"
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${
                  currentStep === i && isPlaying ? 'bg-indigo-400 scale-150 shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-white/10'
                }`} />
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {grid.map((row, rIndex) => (
            <div key={`row-${rIndex}`} className="flex items-center gap-4 bg-black/20 p-2 rounded-xl group/row hover:bg-black/40 transition-colors">
               <div className="w-24 flex flex-col gap-2 justify-center pl-2">
                <span className="text-xs font-semibold tracking-wider uppercase text-white/50 group-hover/row:text-white/80 transition-colors">
                  {engine.sequencerConfig.labels[rIndex]}
                </span>
                <input 
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={trackVolumes[rIndex]}
                  onChange={(e) => {
                    const newVols = [...trackVolumes];
                    newVols[rIndex] = parseFloat(e.target.value);
                    setTrackVolumes(newVols);
                    engine.setSequencerTrackVolume(rIndex, newVols[rIndex]);
                  }}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 cursor-pointer"
                />
              </div>
              <div className="flex flex-1 gap-1.5">
                {row.map((cell, cIndex) => {
                  const isBeat = cIndex % 4 === 0;
                  return (
                    <button
                      key={`cell-${rIndex}-${cIndex}`}
                      onClick={() => toggleCell(rIndex, cIndex)}
                      className={`flex-1 h-12 rounded-md transition-all duration-100 relative overflow-hidden ${
                        cell ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]' : (isBeat ? 'bg-white/10' : 'bg-white/5 hover:bg-white/20')
                      } ${currentStep === cIndex && isPlaying && cell ? 'brightness-150 scale-105' : ''} ${currentStep === cIndex && isPlaying && !cell ? 'bg-white/10' : ''}`}
                    >
                      {cell && (
                         <div className="absolute inset-0 bg-white/20 opacity-0 active:opacity-100 transition-opacity" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
