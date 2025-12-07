import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Share2, RefreshCw, Smartphone, Users, Globe, Copy, Info, KeyRound, BrainCircuit, Sparkles, Bot } from 'lucide-react';
import Board from './components/Board';
import { Player, BoardState, GameMode, Difficulty } from './types';
import { createEmptyGrid, checkWin, serializeBoard, deserializeBoard } from './services/gameLogic';
import { getBestMove } from './services/geminiService';
import { BOARD_SIZE } from './constants';

function App() {
  // Game State
  const [boardState, setBoardState] = useState<BoardState>({
    grid: createEmptyGrid(),
    currentPlayer: Player.Black,
    winner: null,
    history: [],
    winningLine: null,
  });
  
  // Settings & Modes
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.Local);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  
  // Load API Key from local storage
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);

    // Check URL hash for shared game state
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decodedGrid = deserializeBoard(hash);
        // Determine player turn based on piece count
        const blackCount = decodedGrid.flat().filter(c => c === Player.Black).length;
        const whiteCount = decodedGrid.flat().filter(c => c === Player.White).length;
        const nextPlayer = blackCount > whiteCount ? Player.White : Player.Black;

        setBoardState({
          grid: decodedGrid,
          currentPlayer: nextPlayer,
          winner: null,
          history: [], // History lost in simple URL sharing
          winningLine: null
        });
        setGameMode(GameMode.Remote);
      } catch (e) {
        console.error("Failed to load board from URL", e);
      }
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const resetGame = () => {
    setBoardState({
      grid: createEmptyGrid(),
      currentPlayer: Player.Black,
      winner: null,
      history: [],
      winningLine: null
    });
    // Clear hash
    window.history.pushState(null, '', window.location.pathname);
  };

  const handleCellClick = async (row: number, col: number) => {
    // Basic validation
    if (boardState.winner || boardState.grid[row][col] !== Player.None || isThinking) return;
    
    // In remote mode, you play your move, then must share
    // We strictly enforce turns? No, let's keep it flexible for "Local" feel unless explicitly AI.

    const newGrid = boardState.grid.map(r => [...r]);
    newGrid[row][col] = boardState.currentPlayer;

    const winningLine = checkWin(newGrid, row, col, boardState.currentPlayer);
    
    const newHistory = [...boardState.history, { row, col, player: boardState.currentPlayer }];

    setBoardState(prev => ({
      ...prev,
      grid: newGrid,
      currentPlayer: prev.currentPlayer === Player.Black ? Player.White : Player.Black,
      winner: winningLine ? prev.currentPlayer : null,
      winningLine: winningLine,
      history: newHistory
    }));

    // Logic for AI Turn
    if (!winningLine && gameMode === GameMode.AI && boardState.currentPlayer === Player.Black) {
      // It was Black's turn (User), now it's White's turn (AI)
      setIsThinking(true);
      // Small delay for UX so it doesn't feel instant
      const delay = difficulty === Difficulty.Hard ? 100 : 600; 
      
      setTimeout(async () => {
        // We need to pass the *latest* grid state, which is newGrid
        const aiMove = await getBestMove(apiKey, newGrid, Player.White, difficulty);
        makeAIMove(newGrid, aiMove);
      }, delay);
    }
  };

  const makeAIMove = (currentGrid: Player[][], move: { row: number, col: number }) => {
    const newGrid = currentGrid.map(r => [...r]);
    newGrid[move.row][move.col] = Player.White;

    const winningLine = checkWin(newGrid, move.row, move.col, Player.White);
    const newHistory = [...boardState.history, { row: move.row, col: move.col, player: Player.White }]; // Note: history logic here is simplified

    setBoardState(prev => ({
      ...prev,
      grid: newGrid,
      currentPlayer: Player.Black,
      winner: winningLine ? Player.White : null,
      winningLine: winningLine,
      history: newHistory
    }));
    setIsThinking(false);
  };

  const generateShareLink = () => {
    const serialized = serializeBoard(boardState.grid);
    const url = `${window.location.origin}${window.location.pathname}#${serialized}`;
    return url;
  };

  const copyToClipboard = () => {
    const url = generateShareLink();
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback('已复制链接！发送给好友即可继续对战');
      setTimeout(() => setCopyFeedback(''), 3000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-stone-100 text-stone-800 font-sans">
      
      {/* Header */}
      <header className="w-full bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
          <div className="w-3 h-3 bg-black rounded-full"></div>
          <div className="w-3 h-3 bg-stone-300 border border-stone-400 rounded-full -ml-1"></div>
          Zen Gomoku
        </h1>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full hover:bg-stone-100 text-stone-600 transition"
        >
          <Settings size={24} />
        </button>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <KeyRound size={20} /> Settings
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Google Gemini API Key</label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => saveApiKey(e.target.value)}
                placeholder="Enter your API Key for AI mode"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Required for "Hard" (Gemini) AI difficulty. The key is stored locally in your browser.
              </p>
            </div>

            <button 
              onClick={() => setShowSettings(false)}
              className="w-full bg-stone-800 text-white py-2 rounded-lg font-medium hover:bg-stone-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl p-4 flex flex-col items-center gap-6">
        
        {/* Game Status / Mode Select */}
        <div className="w-full flex flex-col items-center gap-4">
          
          <div className="flex bg-white p-1 rounded-lg shadow-sm w-full max-w-lg overflow-x-auto">
            <button 
              onClick={() => { setGameMode(GameMode.Local); resetGame(); }}
              className={`flex-1 min-w-[100px] px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${gameMode === GameMode.Local ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Users size={16} /> <span className="whitespace-nowrap">本地双人</span>
            </button>
            <button 
              onClick={() => { setGameMode(GameMode.AI); resetGame(); }}
              className={`flex-1 min-w-[100px] px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${gameMode === GameMode.AI ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Smartphone size={16} /> <span className="whitespace-nowrap">人机对战</span>
            </button>
            <button 
              onClick={() => { setGameMode(GameMode.Remote); resetGame(); }}
              className={`flex-1 min-w-[100px] px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${gameMode === GameMode.Remote ? 'bg-amber-100 text-amber-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Globe size={16} /> <span className="whitespace-nowrap">远程好友</span>
            </button>
          </div>
          
          {/* AI Difficulty Selector (Only visible in AI mode) */}
          {gameMode === GameMode.AI && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
               <button
                 onClick={() => setDifficulty(Difficulty.Easy)}
                 className={`px-3 py-1 rounded-full text-xs font-medium border transition flex items-center gap-1 ${difficulty === Difficulty.Easy ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
               >
                 <Bot size={12} /> Easy
               </button>
               <button
                 onClick={() => setDifficulty(Difficulty.Medium)}
                 className={`px-3 py-1 rounded-full text-xs font-medium border transition flex items-center gap-1 ${difficulty === Difficulty.Medium ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
               >
                 <BrainCircuit size={12} /> Medium
               </button>
               <button
                 onClick={() => setDifficulty(Difficulty.Hard)}
                 className={`px-3 py-1 rounded-full text-xs font-medium border transition flex items-center gap-1 ${difficulty === Difficulty.Hard ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                 title={!apiKey ? "Requires API Key in settings" : "Powered by Gemini"}
               >
                 <Sparkles size={12} /> Hard {(!apiKey) && '(No Key)'}
               </button>
            </div>
          )}

          <div className="flex items-center gap-4">
             <div className="text-lg font-semibold flex items-center gap-2">
                {boardState.winner ? (
                    <span className="text-green-600 flex items-center gap-2 animate-bounce">
                        🎉 {boardState.winner === Player.Black ? '黑子' : '白子'} 获胜!
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        当前回合: 
                        <span className={`flex items-center gap-1 font-bold ${boardState.currentPlayer === Player.Black ? 'text-black' : 'text-gray-500'}`}>
                           {boardState.currentPlayer === Player.Black ? <div className="w-3 h-3 rounded-full bg-black"/> : <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-400"/>}
                           {boardState.currentPlayer === Player.Black ? '黑子' : '白子'}
                        </span>
                        {isThinking && <span className="text-amber-600 text-sm animate-pulse">(思考中...)</span>}
                    </span>
                )}
             </div>
          </div>
        </div>

        {/* Board Area */}
        <Board 
          grid={boardState.grid} 
          onCellClick={handleCellClick}
          winningLine={boardState.winningLine}
          lastMove={boardState.history.length > 0 ? boardState.history[boardState.history.length - 1] : null}
          disabled={!!boardState.winner || isThinking}
        />

        {/* Action Buttons */}
        <div className="flex gap-4 w-full max-w-[600px] justify-center">
            <button 
                onClick={resetGame}
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-amber-700 transition"
            >
                <div className="p-3 bg-white rounded-full shadow-md border border-gray-100 hover:scale-105 transition-transform">
                    <RefreshCw size={24} />
                </div>
                <span className="text-xs font-medium">重置</span>
            </button>

            {gameMode === GameMode.Remote && (
                 <button 
                    onClick={() => setShowShareModal(true)}
                    className="flex flex-col items-center gap-1 text-gray-600 hover:text-green-600 transition"
                >
                    <div className="p-3 bg-white rounded-full shadow-md border border-gray-100 hover:scale-105 transition-transform">
                        <Share2 size={24} />
                    </div>
                    <span className="text-xs font-medium">邀请/分享</span>
                </button>
            )}
        </div>

        {/* Remote Play Instructions / Share Modal */}
        {(showShareModal || (gameMode === GameMode.Remote && boardState.history.length > 0 && !boardState.winner)) && (
            <div className="w-full max-w-[600px] bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start gap-3">
                    <Info className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                    <div className="flex-1">
                        <h3 className="font-bold text-blue-800 text-sm mb-1">远程对战模式</h3>
                        <p className="text-xs text-blue-700 mb-3">
                            由于没有服务器，我们使用"链接传递"的方式。你下棋后，点击复制链接，发送给微信/QQ好友。好友打开链接即可看到你的棋局并继续下棋。
                        </p>
                        <button 
                            onClick={copyToClipboard}
                            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition w-full justify-center"
                        >
                            <Copy size={16} /> 复制当前棋局链接发给好友
                        </button>
                        {copyFeedback && (
                            <p className="text-center text-green-600 text-xs font-bold mt-2">{copyFeedback}</p>
                        )}
                    </div>
                    <button onClick={() => setShowShareModal(false)} className="text-blue-400 hover:text-blue-600">×</button>
                </div>
            </div>
        )}

      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-stone-400 text-xs">
         <p>Clean. Ad-free. Zen.</p>
      </footer>
    </div>
  );
}

export default App;