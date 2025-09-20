import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { SudokuGrid, jsonToGrid } from '@/utils/sudoku';

interface Room {
  id: string;
  name: string;
  host_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_private: boolean;
  puzzle: any;
  solution: any;
  current_board: any;
  is_completed: boolean;
  created_at: string;
  profiles?: {
    display_name: string;
  } | null;
}

interface Move {
  id: number;
  room_id: string;
  player_id: string;
  row: number;
  col: number;
  value: number;
  is_valid: boolean;
  created_at: string;
  profiles?: {
    display_name: string;
  } | null;
}

interface Message {
  id: number;
  room_id: string;
  player_id: string;
  message: string;
  created_at: string;
  profiles?: {
    display_name: string;
  } | null;
}

interface GameState {
  // Room data
  rooms: Room[];
  currentRoom: Room | null;
  currentBoard: SudokuGrid;
  
  // Game data
  moves: Move[];
  messages: Message[];
  
  // Loading states
  loading: boolean;
  
  // Actions
  fetchRooms: () => Promise<void>;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  leaveRoom: () => void;
  makeMove: (row: number, col: number, value: number) => Promise<boolean>;
  sendMessage: (message: string) => Promise<void>;
  
  // Realtime subscriptions
  subscribeToRoom: (roomId: string) => void;
  unsubscribeFromRoom: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  currentBoard: Array(9).fill(null).map(() => Array(9).fill(null)),
  moves: [],
  messages: [],
  loading: false,

  fetchRooms: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          profiles!rooms_host_id_fkey (display_name)
        `)
        .eq('is_completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ rooms: (data || []) as any[] });
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      set({ loading: false });
    }
  },

  joinRoom: async (roomId: string, password?: string) => {
    try {
      // First, fetch the room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      // Check password for private rooms
      if (room.is_private && room.password && room.password !== password) {
        return false;
      }

      // Fetch moves and messages
      const [movesResponse, messagesResponse] = await Promise.all([
        supabase
          .from('moves')
          .select(`
            *,
            profiles!moves_player_id_fkey (display_name)
          `)
          .eq('room_id', roomId)
          .order('created_at', { ascending: true }),
        
        supabase
          .from('messages')
          .select(`
            *,
            profiles!messages_player_id_fkey (display_name)
          `)
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
      ]);

      if (movesResponse.error) throw movesResponse.error;
      if (messagesResponse.error) throw messagesResponse.error;

      // Build current board from moves
      const puzzleGrid = jsonToGrid(room.puzzle as Record<string, number | null>);
      const currentBoard = puzzleGrid.map(row => [...row]);
      
      movesResponse.data?.forEach(move => {
        if (move.is_valid) {
          currentBoard[move.row][move.col] = move.value;
        }
      });

      set({
        currentRoom: room as Room,
        currentBoard,
        moves: (movesResponse.data || []) as any[],
        messages: (messagesResponse.data || []) as any[]
      });

      // Subscribe to realtime updates
      get().subscribeToRoom(roomId);
      
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      return false;
    }
  },

  leaveRoom: () => {
    get().unsubscribeFromRoom();
    set({
      currentRoom: null,
      currentBoard: Array(9).fill(null).map(() => Array(9).fill(null)),
      moves: [],
      messages: []
    });
  },

  makeMove: async (row: number, col: number, value: number) => {
    const { currentRoom, currentBoard } = get();
    if (!currentRoom) return false;

    // Optimistic update
    const newBoard = currentBoard.map(r => [...r]);
    newBoard[row][col] = value;
    set({ currentBoard: newBoard });

    try {
      const { error } = await supabase
        .from('moves')
        .insert({
          room_id: currentRoom.id,
          player_id: (await supabase.auth.getUser()).data.user?.id,
          row,
          col,
          value
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      // Revert optimistic update
      set({ currentBoard });
      return false;
    }
  },

  sendMessage: async (message: string) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: currentRoom.id,
          player_id: (await supabase.auth.getUser()).data.user?.id,
          message
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  },

  subscribeToRoom: (roomId: string) => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moves'
      }, (payload) => {
        const newMove = payload.new as Move;
        if (newMove.room_id === roomId) {
          const { moves, currentBoard, currentRoom } = get();
          const solutionGrid = jsonToGrid(currentRoom!.solution as Record<string, number | null>);
          const isValid = solutionGrid[newMove.row][newMove.col] === newMove.value;
          
          // Update move validity
          newMove.is_valid = isValid;
          
          // Update board if valid
          if (isValid) {
            const newBoard = currentBoard.map(r => [...r]);
            newBoard[newMove.row][newMove.col] = newMove.value;
            set({ currentBoard: newBoard });
          }
          
          set({ moves: [...moves, newMove] });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const newMessage = payload.new as Message;
        if (newMessage.room_id === roomId) {
          const { messages } = get();
          set({ messages: [...messages, newMessage as Message] });
        }
      })
      .subscribe();

    // Store channel reference for cleanup
    (window as any).currentChannel = channel;
  },

  unsubscribeFromRoom: () => {
    if ((window as any).currentChannel) {
      supabase.removeChannel((window as any).currentChannel);
      (window as any).currentChannel = null;
    }
  }
}));