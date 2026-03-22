export type PracticeLoop = {
  id: string;
  videoId: string;
  start_time: number;
  end_time: number;
  title: string;
  tags: string[];
  created_at: string;
};

export type LoopProgress = {
  loop_count: number;
  total_play_time: number;
  last_played_at: string | null;
};

export type LoopProgressMap = Record<string, LoopProgress>;
