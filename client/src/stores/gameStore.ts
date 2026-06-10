import { create } from 'zustand';

interface GameState {
  phase: string;
  round: number;
  players: any[];
  myRole: string | null;
  myUserId: string | null;
  isAlive: boolean;
  chatMessages: any[];
  voteCounts: Record<string, number>;
  votesCast: number;
  timeRemaining: number;
  roomId: string | null;
  roomCode: string | null;
  isHost: boolean;
  dawnEvents: any[];
  timelineEvents: any[];
  gameOverData: any | null;
  
  setUserId: (id: string) => void;
  setRoom: (id: string, code: string | null) => void;
  updateState: (payload: any) => void;
  clearDawnEvents: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'LOBBY',
  round: 0,
  players: [],
  myRole: null,
  myUserId: null,
  isAlive: true,
  chatMessages: [],
  voteCounts: {},
  votesCast: 0,
  timeRemaining: 0,
  roomId: null,
  roomCode: null,
  isHost: false,
  dawnEvents: [],
  timelineEvents: [],
  gameOverData: null,

  setUserId: (id) => set({ myUserId: id }),
  setRoom: (id, code) => set({ roomId: id, roomCode: code }),
  clearDawnEvents: () => set({ dawnEvents: [] }),
  
  updateState: (payload) => set((state) => {
    switch (payload.type) {
      case 'lobby_update':
        return { 
          players: payload.players,
          isHost: payload.host_id === state.myUserId
        };
      case 'game_state':
        return { 
          players: payload.players, 
          phase: payload.phase || state.phase 
        };
      case 'phase_changed':
        return { 
          phase: payload.phase, 
          round: payload.round || state.round,
          timeRemaining: payload.duration || 0,
          voteCounts: {}, // reset votes on phase change
          votesCast: 0,
          dawnEvents: payload.phase === 'DAWN' ? state.dawnEvents : []
        };
      case 'role_assigned':
        return { myRole: payload.role };
      case 'chat_message':
        return { chatMessages: [...state.chatMessages, payload.message] };
      case 'time_update':
        return { timeRemaining: payload.remaining };
      case 'dawn_event':
        return {
          dawnEvents: [...state.dawnEvents, payload],
          timelineEvents: [...state.timelineEvents, { ...payload, phase: 'DAWN', time: new Date().toISOString() }],
          isAlive: (payload.event === 'death' && payload.target === state.myUserId) ? false : state.isAlive
        };
      case 'vote_update':
        return { voteCounts: payload.counts, votesCast: payload.votes_cast };
      case 'execution_result':
        return {
          timelineEvents: [...state.timelineEvents, { ...payload, phase: 'EXECUTION', time: new Date().toISOString() }],
          isAlive: (payload.outcome === 'execution' && payload.executed_id === state.myUserId) ? false : state.isAlive
        };
      case 'game_over':
        return { gameOverData: payload, phase: 'VICTORY' };
      default:
        return state;
    }
  }),
  
  reset: () => set({
    phase: 'LOBBY',
    round: 0,
    players: [],
    myRole: null,
    isAlive: true,
    chatMessages: [],
    voteCounts: {},
    votesCast: 0,
    timeRemaining: 0,
    roomId: null,
    roomCode: null,
    isHost: false,
    dawnEvents: [],
    timelineEvents: [],
    gameOverData: null,
  })
}));
