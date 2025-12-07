import React from 'react';
import { Player } from '../types';
import { BOARD_SIZE } from '../constants';
import { Circle, Star } from 'lucide-react'; // Using icons for visual flair if needed, but CSS is better for stones

interface BoardProps {
  grid: Player[][];
  onCellClick: (row: number, col: number) => void;
  winningLine: { row: number, col: number }[] | null;
  lastMove: { row: number, col: number } | null;
  disabled: boolean;
}

const Board: React.FC<BoardProps> = ({ grid, onCellClick, winningLine, lastMove, disabled }) => {
  return (
    <div 
      className="relative bg-wood-200 shadow-2xl rounded-sm p-1 sm:p-4 select-none"
      style={{
        width: '100%',
        maxWidth: '600px',
        aspectRatio: '1/1',
      }}
    >
      {/* The Grid Container */}
      <div 
        className="w-full h-full relative border-2 border-wood-400 bg-wood-200"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
        }}
      >
        {/* Draw internal grid lines using a pseudo-element or separate absolute div could work, 
            but rendering cells with borders is easier for interactions. 
            However, Gomoku stones sit ON intersections. 
            We will render grid lines separately and place clickable zones on top.
        */}
        
        {/* Grid Lines Layer */}
        <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: BOARD_SIZE }).map((_, i) => (
                <React.Fragment key={i}>
                    {/* Horizontal Line */}
                    <div 
                        className="absolute bg-wood-400"
                        style={{
                            left: `${100 / (BOARD_SIZE * 2)}%`,
                            right: `${100 / (BOARD_SIZE * 2)}%`,
                            top: `${(i * 100) / BOARD_SIZE + (100 / (BOARD_SIZE * 2))}%`,
                            height: '1px',
                        }} 
                    />
                    {/* Vertical Line */}
                    <div 
                        className="absolute bg-wood-400"
                        style={{
                            top: `${100 / (BOARD_SIZE * 2)}%`,
                            bottom: `${100 / (BOARD_SIZE * 2)}%`,
                            left: `${(i * 100) / BOARD_SIZE + (100 / (BOARD_SIZE * 2))}%`,
                            width: '1px',
                        }} 
                    />
                </React.Fragment>
            ))}
            
            {/* 5 star points (Hoshi) for 15x15 */}
            {[3, 7, 11].map(r => [3, 7, 11].map(c => (
                 <div 
                 key={`dot-${r}-${c}`}
                 className="absolute bg-wood-400 rounded-full w-1.5 h-1.5 sm:w-2 sm:h-2 transform -translate-x-1/2 -translate-y-1/2"
                 style={{
                     left: `${(c * 100) / BOARD_SIZE + (100 / (BOARD_SIZE * 2))}%`,
                     top: `${(r * 100) / BOARD_SIZE + (100 / (BOARD_SIZE * 2))}%`,
                 }}
             />
            )))}
        </div>

        {/* Interactive Cell Layer */}
        {grid.map((row, r) => (
          row.map((cellState, c) => {
            const isLastMove = lastMove?.row === r && lastMove?.col === c;
            const isWinningPiece = winningLine?.some(pos => pos.row === r && pos.col === c);

            return (
              <div
                key={`${r}-${c}`}
                className="relative z-10 flex items-center justify-center cursor-pointer"
                onClick={() => !disabled && onCellClick(r, c)}
              >
                {/* Transparent hit area is essentially the whole cell */}
                
                {/* Stone Rendering */}
                {cellState !== Player.None && (
                  <div 
                    className={`
                      w-[85%] h-[85%] rounded-full shadow-md transition-all duration-200 transform scale-95
                      ${cellState === Player.Black 
                        ? 'bg-gradient-to-br from-gray-700 to-black' 
                        : 'bg-gradient-to-br from-white to-gray-300'
                      }
                      ${isLastMove ? 'ring-2 ring-red-500 scale-100' : ''}
                      ${isWinningPiece ? 'ring-4 ring-green-500 animate-pulse' : ''}
                    `}
                  >
                    {/* Highlight for Black stones to make them look spherical */}
                    {cellState === Player.Black && (
                        <div className="absolute top-1/4 left-1/4 w-1/4 h-1/4 bg-gradient-to-br from-gray-600 to-transparent rounded-full opacity-50" />
                    )}
                  </div>
                )}
                
                {/* Last move marker if empty (shouldn't happen but safe guard) */}
                {cellState === Player.None && disabled && <div className="hidden" />}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};

export default Board;
