export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  countryFlag: string;
  country: string;
  city: string;
  level: string;
  currentXp: number;
  maxXp: number;
  nationalRank: number;
  rankChange: number;
  totalPoints: number;
}

export interface QuickStat {
  id: string;
  icon: 'trophy' | 'target' | 'percent' | 'flame' | 'chart';
  label: string;
  value: string;
}

export interface GameStat {
  id: string;
  name: string;
  rating: string;
  rank: string;
  brandColor: string;
  logoText: string;
}

export interface Activity {
  id: string;
  points: string;
  pointsColor: string;
  status: 'Correct' | 'Incorrect';
  league: string;
  time: string;
  player1: { name: string; avatarUrl: string };
  player2: { name: string; avatarUrl: string };
  score: string;
  isCorrect: boolean;
  note?: string;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  isCompleted: boolean;
  progressText?: string;
}