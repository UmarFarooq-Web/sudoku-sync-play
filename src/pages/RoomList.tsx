import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generatePuzzle, gridToJson } from '@/utils/sudoku';
import { Plus, Lock, Users, Clock } from 'lucide-react';

const RoomList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rooms, loading, fetchRooms, joinRoom } = useGameStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [password, setPassword] = useState('');
  
  // Create room form
  const [roomName, setRoomName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    try {
      const { puzzle, solution } = generatePuzzle(difficulty);
      
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: roomName,
          host_id: user.id,
          difficulty,
          is_private: isPrivate,
          password: isPrivate ? roomPassword : null,
          puzzle: gridToJson(puzzle),
          solution: gridToJson(solution),
          current_board: gridToJson(puzzle)
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Room created!",
        description: `${roomName} has been created successfully.`
      });

      setCreateDialogOpen(false);
      setRoomName('');
      setRoomPassword('');
      setIsPrivate(false);
      fetchRooms();
      
      // Join the newly created room
      navigate(`/room/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating room",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string, isPrivateRoom: boolean = false) => {
    if (isPrivateRoom) {
      setSelectedRoom(roomId);
      setJoinDialogOpen(true);
      return;
    }

    const success = await joinRoom(roomId);
    if (success) {
      navigate(`/room/${roomId}`);
    } else {
      toast({
        title: "Error joining room",
        description: "Unable to join the room.",
        variant: "destructive"
      });
    }
  };

  const handleJoinPrivateRoom = async () => {
    const success = await joinRoom(selectedRoom, password);
    if (success) {
      navigate(`/room/${selectedRoom}`);
      setJoinDialogOpen(false);
      setPassword('');
    } else {
      toast({
        title: "Access denied",
        description: "Invalid password for this room.",
        variant: "destructive"
      });
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Game Rooms</h1>
          <p className="text-muted-foreground">Join an existing room or create a new one</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Room</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="private-room"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="private-room">Private Room</Label>
              </div>
              
              {isPrivate && (
                <div className="space-y-2">
                  <Label htmlFor="room-password">Password</Label>
                  <Input
                    id="room-password"
                    type="password"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    placeholder="Enter room password"
                    required
                  />
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Room"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <h3 className="text-xl font-semibold mb-2">No active rooms</h3>
          <p className="text-muted-foreground mb-6">Be the first to create a room!</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Room
          </Button>
        </motion.div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {rooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    {room.is_private && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Host: {room.profiles?.display_name || 'Unknown'}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={`${getDifficultyColor(room.difficulty)} text-white`}>
                      {room.difficulty}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{new Date(room.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleJoinRoom(room.id, room.is_private)}
                  >
                    {room.is_private ? "Join with Password" : "Join Room"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Join Private Room Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Room Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-password">Password</Label>
              <Input
                id="join-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
              />
            </div>
            <Button onClick={handleJoinPrivateRoom} className="w-full">
              Join Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomList;