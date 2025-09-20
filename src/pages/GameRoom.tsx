import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useAuth } from '@/hooks/useAuth';
import { jsonToGrid, isPuzzleComplete, validateMove } from '@/utils/sudoku';
import SudokuBoard from '@/components/SudokuBoard';
import ChatBox from '@/components/ChatBox';
import MoveLog from '@/components/MoveLog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Trophy, Star } from 'lucide-react';

const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRoom, currentBoard, joinRoom, leaveRoom, makeMove } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/');
      return;
    }

    const loadRoom = async () => {
      setLoading(true);
      const success = await joinRoom(roomId);
      if (!success) {
        toast({
          title: "Error joining room",
          description: "Unable to join the room.",
          variant: "destructive"
        });
        navigate('/');
      }
      setLoading(false);
    };

    loadRoom();

    return () => {
      leaveRoom();
    };
  }, [roomId, user, joinRoom, leaveRoom, navigate]);

  useEffect(() => {
    // Check if puzzle is complete
    if (currentRoom && isPuzzleComplete(currentBoard)) {
      setShowCompletionModal(true);
    }
  }, [currentBoard, currentRoom]);

  const handleCellChange = async (row: number, col: number, value: number | null) => {
    if (!currentRoom || !value) return;

    // Don't allow changing puzzle cells
    const puzzleGrid = jsonToGrid(currentRoom.puzzle as Record<string, number | null>);
    if (puzzleGrid[row][col] !== null) {
      toast({
        title: "Invalid move",
        description: "You cannot change puzzle cells.",
        variant: "destructive"
      });
      return;
    }

    // Validate move against solution
    const solutionGrid = jsonToGrid(currentRoom.solution as Record<string, number | null>);
    const isValid = validateMove(solutionGrid, row, col, value);
    
    if (!isValid) {
      toast({
        title: "Incorrect number",
        description: `${value} is not correct for this position.`,
        variant: "destructive"
      });
    }

    // Make the move (valid or invalid)
    await makeMove(row, col, value);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Room not found</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rooms
          </Button>
        </div>
      </div>
    );
  }

  const puzzleGrid = jsonToGrid(currentRoom.puzzle as Record<string, number | null>);
  const solutionGrid = jsonToGrid(currentRoom.solution as Record<string, number | null>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Leave Room
              </Button>
              <div>
                <h1 className="text-xl font-bold">{currentRoom.name}</h1>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Badge className={`${getDifficultyColor(currentRoom.difficulty)} text-white text-xs`}>
                    {currentRoom.difficulty}
                  </Badge>
                  <Users className="h-4 w-4" />
                  <span>Multiplayer Room</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Game Board - Center */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-lg"
            >
              <SudokuBoard
                puzzle={puzzleGrid}
                currentBoard={currentBoard}
                solution={solutionGrid}
                onCellChange={handleCellChange}
                disabled={currentRoom.is_completed}
              />
            </motion.div>
          </div>

          {/* Right Sidebar - Chat & Move Log */}
          <div className="lg:col-span-6 grid grid-rows-2 gap-4 h-full">
            {/* Chat Box */}
            <Card className="h-full">
              <ChatBox />
            </Card>

            {/* Move Log */}
            <Card className="h-full">
              <MoveLog />
            </Card>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Trophy className="h-12 w-12 text-yellow-500" />
              </div>
              Puzzle Completed!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-lg">
              🎉 Congratulations! The Sudoku puzzle has been solved!
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">Room: {currentRoom.name}</span>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowCompletionModal(false)}>
                View Board
              </Button>
              <Button variant="outline" onClick={handleLeaveRoom}>
                Leave Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GameRoom;