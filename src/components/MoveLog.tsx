import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, User } from 'lucide-react';

const MoveLog = () => {
  const { moves } = useGameStore();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const movesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new moves arrive
    movesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves]);

  const formatMoveDescription = (move: any) => {
    const playerName = move.profiles?.display_name || 'Unknown Player';
    const position = `(${move.row + 1}, ${move.col + 1})`;
    return `${playerName} placed ${move.value} at ${position}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">Move Log</h3>
        <p className="text-sm text-muted-foreground">{moves.length} moves</p>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {moves.map((move, index) => (
              <motion.div
                key={move.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-card border"
              >
                <div className={`flex-shrink-0 p-1 rounded-full ${
                  move.is_valid 
                    ? 'bg-green-100 dark:bg-green-900/20' 
                    : 'bg-red-100 dark:bg-red-900/20'
                }`}>
                  {move.is_valid ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {move.profiles?.display_name || 'Unknown Player'}
                    </span>
                    <Badge variant={move.is_valid ? 'default' : 'destructive'} className="text-xs">
                      {move.is_valid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    Placed <span className="font-mono font-bold">{move.value}</span> at{' '}
                    <span className="font-mono">({move.row + 1}, {move.col + 1})</span>
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(move.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={movesEndRef} />
        </div>
        
        {moves.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No moves yet</p>
            <p className="text-sm">Start playing to see moves here</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MoveLog;