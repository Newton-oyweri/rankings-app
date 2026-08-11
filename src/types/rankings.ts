export interface Player {
  name: string;
  rating: number;
  avatar: string;
}

export interface MatchOdds {
  home: number;
  draw: number;
  away: number;
}

export interface Match {
  id: string;
  league: string;
  leagueColor: string;
  time: string;
  countdown: string;
  home: Player;
  away: Player;
  odds: MatchOdds;
  predictions: number;
}

export interface Predictor {
  rank: number;
  name: string;
  points: number;
  avatar: string;
}