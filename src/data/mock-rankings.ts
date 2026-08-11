import { Match, Predictor } from '@/types/rankings';

export const UPCOMING_MATCHES: Match[] = [
  {
    id: '1',
    league: 'eFootball',
    leagueColor: '#00A651',
    time: 'Today • 18:30',
    countdown: '02h : 45m : 12s',
    home: { name: 'Quincy', rating: 1874, avatar: 'https://i.pravatar.cc/150?img=12' },
    away: { name: 'Loki', rating: 1692, avatar: 'https://i.pravatar.cc/150?img=33' },
    odds: { home: 2.45, draw: 3.2, away: 2.8 },
    predictions: 1248,
  },
  {
    id: '2',
    league: 'Premier League',
    leagueColor: '#3D195B',
    time: 'Today • 19:45',
    countdown: '03h : 60m : 12s',
    home: { name: 'Marcus', rating: 1763, avatar: 'https://i.pravatar.cc/150?img=11' },
    away: { name: 'Him', rating: 1580, avatar: 'https://i.pravatar.cc/150?img=68' },
    odds: { home: 1.92, draw: 3.4, away: 3.6 },
    predictions: 2531,
  },
  {
    id: '3',
    league: 'La Liga',
    leagueColor: '#EE8700',
    time: 'Today • 21:00',
    countdown: '05h : 15m : 12s',
    home: { name: 'Artetaball', rating: 1951, avatar: 'https://i.pravatar.cc/150?img=8' },
    away: { name: 'Racardoh', rating: 1643, avatar: 'https://i.pravatar.cc/150?img=15' },
    odds: { home: 1.85, draw: 3.55, away: 4.2 },
    predictions: 1895,
  },
];

export const TOP_PREDICTORS: Predictor[] = [
  { rank: 1, name: 'Quincy', points: 2450, avatar: 'https://i.pravatar.cc/150?img=12' },
  { rank: 2, name: 'Loki', points: 2120, avatar: 'https://i.pravatar.cc/150?img=33' },
  { rank: 3, name: 'Marcus', points: 1980, avatar: 'https://i.pravatar.cc/150?img=11' },
  { rank: 4, name: 'Him', points: 1860, avatar: 'https://i.pravatar.cc/150?img=68' },
  { rank: 5, name: 'Artetaball', points: 1720, avatar: 'https://i.pravatar.cc/150?img=8' },
];

export const FILTERS = ['All', 'eFootball', 'Premier League', 'La Liga', 'Serie A'];