export interface Player {
  user_id: string;
  display_name: string;
  is_alive: boolean;
  is_ready: boolean;
  is_connected: boolean;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  channel: string;
  timestamp: string;
  is_ghost?: boolean;
}

export type GamePhase = 
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'NIGHT'
  | 'DAWN'
  | 'DISCUSSION'
  | 'VOTING'
  | 'EXECUTION'
  | 'GAME_OVER';
