export type UserRole = 'admin' | 'team_owner';

export interface Team {
  id: number;
  name: string;
  short_code: string;
  logo_url?: string | null;
  owner_user_id?: number | null;
  owner_name?: string | null;
  purse_total: number;
  purse_remaining: number;
  squad_count: number;
}

export interface Player {
  id: number;
  name: string;
  role: 'batsman' | 'bowler' | 'all_rounder' | 'wicket_keeper';
  base_price: number;
  photo_url?: string | null;
  added_by_name?: string | null;
  nationality: string;
  rating: number;
  status: 'available' | 'sold' | 'unsold';
}

export interface AuctionState {
  sessionId: number | null;
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentPlayer: null | {
    id: number;
    name: string;
    role: string;
    basePrice: number;
    photoUrl?: string | null;
    nationality: string;
    rating: number;
  };
  highestBid: null | {
    teamId: number;
    teamName: string;
    amount: number;
  };
  timerSeconds: number;
}

export interface ChatMessage {
  room_id?: string;
  roomId?: string;
  message: string;
  user_id?: number;
  userId?: number;
  user_name?: string;
  userName?: string;
  user_role?: 'admin' | 'team_owner';
  userRole?: 'admin' | 'team_owner';
  created_at?: string;
  createdAt?: string;
}

export interface AutoBidRule {
  id: number;
  team_id: number;
  team_name: string;
  is_enabled: number;
  max_bid: number;
  increment_by: number;
  updated_at: string;
}
