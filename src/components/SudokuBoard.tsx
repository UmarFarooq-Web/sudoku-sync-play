import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SudokuGrid } from '@/utils/sudoku';

interface SudokuBoardProps {
  puzzle: SudokuGrid;
  currentBoard: SudokuGrid;
  solution: SudokuGrid;
  onCellChange: (row: number, col: number, value: number | null) => void;
  disabled?: boolean;
}

const SudokuBoard = ({ puzzle, currentBoard, solution, onCellChange, disabled = false }: SudokuBoardProps) => {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleCellClick = (row: number, col: number) => {
    if (disabled) return;
    setSelectedCell({ row, col });
    setInputValue(currentBoard[row][col]?.toString() || '');
  };

  const handleInputChange = (value: string) => {
    if (disabled) return;
    
    const numValue = parseInt(value);
    if (value === '' || (numValue >= 1 && numValue <= 9)) {
      setInputValue(value);
      if (selectedCell) {
        onCellChange(selectedCell.row, selectedCell.col, value === '' ? null : numValue);
      }
    }
  };

  const getCellStyle = (row: number, col: number) => {
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isPuzzleCell = puzzle[row][col] !== null;
    const currentValue = currentBoard[row][col];
    const isCorrect = currentValue !== null && solution[row][col] === currentValue;
    const isIncorrect = currentValue !== null && solution[row][col] !== currentValue;

    return cn(
      'w-full h-full flex items-center justify-center text-lg font-medium border border-border transition-all duration-200',
      'hover:bg-muted/50 cursor-pointer',
      {
        'bg-primary/10 border-primary': isSelected,
        'bg-muted/30': isPuzzleCell,
        'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300': isCorrect && !isPuzzleCell,
        'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300': isIncorrect,
        'border-r-2 border-r-border': col === 2 || col === 5,
        'border-b-2 border-b-border': row === 2 || row === 5,
        'cursor-not-allowed opacity-50': disabled
      }
    );
  };

  return (
    <div className="grid grid-cols-9 gap-0 w-full max-w-lg mx-auto aspect-square border-2 border-border rounded-lg overflow-hidden">
      {Array.from({ length: 9 }, (_, row) =>
        Array.from({ length: 9 }, (_, col) => (
          <motion.div
            key={`${row}-${col}`}
            className={getCellStyle(row, col)}
            onClick={() => handleCellClick(row, col)}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
          >
            {selectedCell?.row === row && selectedCell?.col === col ? (
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={() => setSelectedCell(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setSelectedCell(null);
                  }
                }}
                className="w-full h-full text-center bg-transparent outline-none text-lg font-medium"
                maxLength={1}
                autoFocus
              />
            ) : (
              <span>{currentBoard[row][col] || ''}</span>
            )}
          </motion.div>
        ))
      )}
    </div>
  );
};

export default SudokuBoard;