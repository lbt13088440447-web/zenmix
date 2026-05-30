export interface TrackDefinition {
  id: string;
  name: string;
  description: string;
  defaultVolume: number;
}

export const TRACKS: TrackDefinition[] = [
  { id: 'drone', name: '深沉基音', description: '低频基础氛围', defaultVolume: 0.5 },
  { id: 'chimes', name: '空灵风铃', description: '五声音阶延迟', defaultVolume: 0.3 },
  { id: 'wind', name: '和煦微风', description: '柔和自然风声', defaultVolume: 0.2 },
  { id: 'binaural', name: '阿尔法专注', description: '6Hz 双耳频差', defaultVolume: 0 },
  { id: 'bowl', name: '水晶钵', description: '共鸣颂钵', defaultVolume: 0.1 },
  { id: 'ocean', name: '海浪', description: '律动海浪拍击', defaultVolume: 0.3 },
  { id: 'birds', name: '鸟鸣', description: '遥远森林鸟鸣', defaultVolume: 0.4 },
  { id: 'warm_pad', name: '温暖绒音', description: '柔和的合成和弦', defaultVolume: 0.4 },
  { id: 'flute', name: '空灵长笛', description: '悠远木管旋律', defaultVolume: 0.4 },
  { id: 'strings', name: '古典弦乐', description: '悠扬的提琴合奏', defaultVolume: 0.4 },
  { id: 'ai_gen', name: 'AI 环境音轨', description: '基于麦克风环境音生成', defaultVolume: 0.6 }
];
