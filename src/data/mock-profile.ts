import { Achievement, Activity, GameStat, QuickStat, UserProfile } from '@/types/profile';

export const mockUserProfile: UserProfile = {
  id: 'usr_1',
  name: 'Quincy',
  handle: '@Quincy07',
  avatarUrl: 'https://i.pravatar.cc/150?img=12',
  countryFlag: '🇰🇪',
  country: 'Kenya',
  city: 'Nairobi',
  level: 'Level 1a',
  currentXp: 3250,
  maxXp: 5000,
  nationalRank: 1,
  rankChange: 5,
  totalPoints: 2450,
};

export const mockQuickStats: QuickStat[] = [
  { id: '1', icon: 'trophy', label: 'Predictions', value: '326' },
  { id: '2', icon: 'target', label: 'Correct', value: '187' },
  { id: '3', icon: 'percent', label: 'Win Rate', value: '57%' },
  { id: '4', icon: 'flame', label: 'Current Streak', value: '6' },
  { id: '5', icon: 'chart', label: 'Best Streak', value: '14' },
];

export const mockGames: GameStat[] = [
  { id: 'g1', name: 'eFootball', rating: '1,874', rank: '#2 Kenya', brandColor: '#00A651', logoText: '⚽' },
  { id: 'g2', name: 'EA FC', rating: '920', rank: '#15 Kenya', brandColor: '#000000', logoText: 'EA' },
  { id: 'g3', name: 'COD Mobile', rating: '740', rank: '#28 Kenya', brandColor: '#1A1A1A', logoText: 'COD' },
  { id: 'g4', name: 'PUBG Mobile', rating: '620', rank: '#33 Kenya', brandColor: '#F5A623', logoText: 'PUBG' },
  { id: 'g5', name: 'Free Fire', rating: '510', rank: '#46 Kenya', brandColor: '#FF4500', logoText: 'FF' },
];

export const mockActivities: Activity[] = [
  {
    id: 'a1',
    points: '+120 pts',
    pointsColor: '#16A34A',
    status: 'Correct',
    league: 'eFootball',
    time: 'Today, 18:30',
    player1: { name: 'Quincy', avatarUrl: 'https://i.pravatar.cc/40?img=11' },
    player2: { name: 'Loki', avatarUrl: 'https://i.pravatar.cc/40?img=33' },
    score: '3 - 1',
    isCorrect: true,
  },
  {
    id: 'a2',
    points: '-20 pts',
    pointsColor: '#DC2626',
    status: 'Incorrect',
    league: 'La Liga',
    time: 'Today, 21:00',
    player1: { name: 'Artetaball', avatarUrl: 'https://i.pravatar.cc/40?img=15' },
    player2: { name: 'Racardoh', avatarUrl: 'https://i.pravatar.cc/40?img=22' },
    score: '2 - 2',
    isCorrect: false,
    note: 'You predicted 2 - 1',
  },
];

export const mockAchievements: Achievement[] = [
  { id: 'ch1', icon: '👑', title: 'Top Predictor', description: 'Win 1000 pts', isCompleted: true },
  { id: 'ch2', icon: '🎯', title: 'Sharp Shooter', description: '10 correct in a row', isCompleted: true },
  { id: 'ch3', icon: '🏆', title: 'Champion', description: 'Win a weekly', isCompleted: true },
  { id: 'ch4', icon: '👤', title: 'Legend', description: 'Win 10 weeks', isCompleted: false, progressText: '0/10' },
];