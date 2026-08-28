import { create } from 'zustand';

interface GameState {
  phase: string;
  round: number;
  players: any[];
  myRole: string | null;
  myRoleName: string | null;
  myRoleFaction: string | null;
  myRoleDescription: string | null;
  myRoleAbility: string | null;
  myRolePassive: string | null;
  myUserId: string | null;
  isAlive: boolean;
  chatMessages: any[];
  voteCounts: Record<string, number>;
  votesCast: number;
  timeRemaining: number;
  roomId: string | null;
  roomCode: string | null;
  isHost: boolean;
  is_quick_play: boolean;
  dawnEvents: any[];
  timelineEvents: any[];
  gameOverData: any | null;
  lobbyCountdown: number | null;
  executionData: any | null;
  covenMateIds: string[];
  hasRevived: boolean;
  nonRevivableIds: string[];
  hasFinalWhisper: boolean;
  myArrows: number | null;
  lastProtectedTargetId: string | null;
  currentNightTargetId: string | null;
  wsStatus: 'disconnected' | 'connected' | 'reconnecting';
  
  setUserId: (id: string) => void;
  setWsStatus: (status: 'disconnected' | 'connected' | 'reconnecting') => void;
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
  myRoleName: null,
  myRoleFaction: null,
  myRoleDescription: null,
  myRoleAbility: null,
  myRolePassive: null,
  myUserId: null,
  isAlive: true,
  chatMessages: [],
  voteCounts: {},
  votesCast: 0,
  timeRemaining: 0,
  roomId: null,
  roomCode: null,
  isHost: false,
  is_quick_play: true,
  dawnEvents: [],
  timelineEvents: [],
  gameOverData: null,
  lobbyCountdown: null,
  executionData: null,
  covenMateIds: [],
  hasRevived: false,
  nonRevivableIds: [],
  hasFinalWhisper: false,
  myArrows: null,
  lastProtectedTargetId: null,
  currentNightTargetId: null,
  wsStatus: 'disconnected',

  setUserId: (id) => set({ myUserId: id }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setRoom: (id, code) => set({ roomId: id, roomCode: code }),
  clearDawnEvents: () => set({ dawnEvents: [] }),
  
  updateState: (payload) => set((state) => {
    switch (payload.type) {
      case 'lobby_update':
        return { 
          players: payload.players,
          isHost: payload.host_user_id === state.myUserId,
          roomCode: payload.room_code,
          is_quick_play: payload.is_quick_play
        };
      case 'game_state': {
        // Reconnection sync — extract own alive status and role-specific fields
        const myPlayer = payload.players?.find((p: any) => p.user_id === state.myUserId);
        return { 
          players: payload.players, 
          phase: payload.phase ? payload.phase.toUpperCase() : state.phase,
          round: payload.round_number || state.round,
          isAlive: myPlayer ? myPlayer.is_alive : state.isAlive,
          myRole: myPlayer?.role ? myPlayer.role.toUpperCase() : state.myRole,
          timeRemaining: payload.remaining_seconds || state.timeRemaining,
          myArrows: myPlayer?.arrows ?? state.myArrows,
          lastProtectedTargetId: myPlayer?.last_protected_target ?? state.lastProtectedTargetId,
          currentNightTargetId: state.phase === 'NIGHT' ? state.currentNightTargetId : null,
        };
      }
      case 'phase_changed':
        const isDawn = payload.phase.toUpperCase() === 'DAWN';
        return { 
          phase: payload.phase.toUpperCase(), 
          round: payload.round || state.round,
          timeRemaining: payload.duration || 0,
          voteCounts: {}, // reset votes on phase change
          votesCast: 0,
          dawnEvents: isDawn ? state.dawnEvents : [],
          lastProtectedTargetId: isDawn ? state.currentNightTargetId : state.lastProtectedTargetId,
          currentNightTargetId: isDawn ? null : state.currentNightTargetId
        };
      case 'role_assigned':
        return { 
          myRole: payload.role ? payload.role.toUpperCase() : null,
          myRoleName: payload.role_name || null,
          myRoleFaction: payload.faction || null,
          myRoleDescription: payload.description || null,
          myRoleAbility: payload.ability || null,
          myRolePassive: payload.passive || null,
          covenMateIds: payload.coven_mate_ids || [],
          hasFinalWhisper: payload.role?.toUpperCase() === 'NECROMANCER',
          myArrows: payload.role?.toUpperCase() === 'HUNTER' ? 2 : null,
          lastProtectedTargetId: null,
        };
      case 'chat_message': 
        return { 
          chatMessages: [...state.chatMessages, { 
            channel: payload.channel, 
            sender_name: payload.sender_name, 
            text: payload.content, 
            is_ghost: !payload.is_alive 
          }] 
        };
      case 'time_update':
        return { timeRemaining: payload.remaining };
      case 'dawn_event':
        return {
          dawnEvents: [...state.dawnEvents, payload],
          timelineEvents: [...state.timelineEvents, { ...payload, phase: 'DAWN', time: new Date().toISOString() }],
          isAlive: 
            (payload.event === 'death' && payload.target === state.myUserId) ? false : 
            (payload.event === 'necromancer_revive' && payload.target === state.myUserId) ? true :
            state.isAlive,
          myRole:
            (payload.event === 'cursed_transform') ? 'WEREWOLF' : state.myRole,
          players: state.players.map(p => {
            if (payload.event === 'death' && p.user_id === payload.target) return { ...p, is_alive: false };
            if (payload.event === 'necromancer_revive' && p.user_id === payload.target) return { ...p, is_alive: true };
            return p;
          })
        };
      case 'vote_update':
        return { voteCounts: payload.counts, votesCast: payload.votes_cast };
      case 'execution_result':
        return {
          timelineEvents: [...state.timelineEvents, { ...payload, phase: 'EXECUTION', time: new Date().toISOString() }],
          isAlive: (payload.event === 'execution' && payload.target === state.myUserId) ? false : state.isAlive,
          players: state.players.map(p => 
            (payload.event === 'execution' && p.user_id === payload.target) 
              ? { ...p, is_alive: false } 
              : p
          ),
          executionData: payload
        };
      case 'lobby_countdown':
        return { lobbyCountdown: payload.remaining };
      case 'lobby_countdown_stopped':
        return { lobbyCountdown: null };
      case 'game_over':
        return { gameOverData: payload, phase: 'VICTORY' };
      case 'non_revivable_ids':
        return { nonRevivableIds: payload.ids || [] };
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
    lobbyCountdown: null,
    executionData: null,
    covenMateIds: [],
    hasRevived: false,
    nonRevivableIds: [],
    hasFinalWhisper: false,
    myArrows: null,
    lastProtectedTargetId: null,
    currentNightTargetId: null,
  })
}));
