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

export enum GamePhase {
  LOBBY = 'LOBBY',
  ROLE_ASSIGNMENT = 'ROLE_ASSIGNMENT',
  NIGHT = 'NIGHT',
  DAWN = 'DAWN',
  DISCUSSION = 'DISCUSSION',
  VOTING = 'VOTING',
  EXECUTION = 'EXECUTION',
  GAME_OVER = 'GAME_OVER'
}
