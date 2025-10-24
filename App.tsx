import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Settings } from './components/icons';
import { NPCS, GRID_SIZE, TILE_SIZE } from './constants';
import type { NPC, PlayerPosition, Direction, ConversationMessage, ChatSessions, Weather, TimeOfDay } from './types';
import { createChatSession, sendMessage } from './services/geminiService';

const IS_API_CONFIGURED = !!process.env.API_KEY;

/**
 * A component that renders visual effects for the current weather and time of day.
 * @param {object} props - The component's props.
 * @param {Weather} props.weather - The current weather.
 * @param {TimeOfDay} props.timeOfDay - The current time of day.
 * @returns {JSX.Element} - The rendered WeatherEffects component.
 */
const WeatherEffects = ({ weather, timeOfDay }: { weather: Weather, timeOfDay: TimeOfDay }) => {
  const rainDrops = weather === 'rainy' ? Array.from({ length: 50 }).map((_, i) => (
    <div key={i} className="raindrop" style={{ 
      left: `${Math.random() * 100}%`,
      animationDuration: `${0.5 + Math.random() * 0.5}s`,
      animationDelay: `${Math.random() * 5}s`,
     }} />
  )) : null;

  const snowflakes = weather === 'snowy' ? Array.from({ length: 50 }).map((_, i) => (
    <div key={i} className="snowflake" style={{ 
      left: `${Math.random() * 100}%`,
      animationDuration: `${2 + Math.random() * 3}s`,
      animationDelay: `${Math.random() * 5}s`,
     }} />
  )) : null;

  return (
    <>
      {timeOfDay === 'night' && <div className="absolute inset-0 bg-blue-900 bg-opacity-40 pointer-events-none z-10" />}
      {weather === 'rainy' && <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">{rainDrops}</div>}
      {weather === 'snowy' && <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">{snowflakes}</div>}
    </>
  );
};

/**
 * A control panel for changing the weather and time of day.
 * @param {object} props - The component's props.
 * @param {Weather} props.weather - The current weather.
 * @param {TimeOfDay} props.timeOfDay - The current time of day.
 * @param {function} props.setWeather - A function to set the weather.
 * @param {function} props.setTimeOfDay - A function to set the time of day.
 * @param {boolean} props.isDebugMode - A boolean indicating whether debug mode is enabled.
 * @param {function} props.setIsDebugMode - A function to set the debug mode.
 * @param {function} props.onClose - A function to close the control panel.
 * @returns {JSX.Element} - The rendered WeatherControlPanel component.
 */
const WeatherControlPanel = ({
  weather, timeOfDay, setWeather, setTimeOfDay, isDebugMode, setIsDebugMode, onClose
}: {
  weather: Weather;
  timeOfDay: TimeOfDay;
  setWeather: (w: Weather) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  isDebugMode: boolean;
  setIsDebugMode: (d: boolean) => void;
  onClose: () => void;
}) => {
  return (
     <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 font-press-start">
      <div className="bg-[#e0f8d0] border-4 border-[#081820] p-4 text-[#081820] w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">World Controls</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#88c070] rounded-sm"><X size={20}/></button>
        </div>
        
        <div className="mb-6">
          <h4 className="font-bold mb-2">Time of Day</h4>
          <div className="flex gap-2">
            <button onClick={() => setTimeOfDay('day')} disabled={timeOfDay === 'day'} className="flex-1 p-2 border-2 border-[#081820] disabled:bg-[#346856] disabled:text-white bg-[#88c070] hover:bg-white">Day</button>
            <button onClick={() => setTimeOfDay('night')} disabled={timeOfDay === 'night'} className="flex-1 p-2 border-2 border-[#081820] disabled:bg-[#346856] disabled:text-white bg-[#88c070] hover:bg-white">Night</button>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-bold mb-2">Weather</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setWeather('sunny')} disabled={weather === 'sunny'} className="flex-1 p-2 border-2 border-[#081820] disabled:bg-[#346856] disabled:text-white bg-[#88c070] hover:bg-white">Sunny</button>
            <button onClick={() => setWeather('rainy')} disabled={weather === 'rainy'} className="flex-1 p-2 border-2 border-[#081820] disabled:bg-[#346856] disabled:text-white bg-[#88c070] hover:bg-white">Rainy</button>
            <button onClick={() => setWeather('snowy')} disabled={weather === 'snowy'} className="flex-1 p-2 border-2 border-[#081820] disabled:bg-[#346856] disabled:text-white bg-[#88c070] hover:bg-white">Snowy</button>
          </div>
        </div>

        <div className="border-t-2 border-[#346856] pt-4 mt-4">
           <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={isDebugMode}
                onChange={(e) => setIsDebugMode(e.target.checked)}
                className="w-5 h-5 accent-[#346856]"
              />
              <span>Debug Mode: Show Tool Calls</span>
            </label>
        </div>

      </div>
    </div>
  )
}

/**
 * The main application component.
 * @returns {JSX.Element} The rendered App component.
 */
const App = () => {
  const [playerPos, setPlayerPos] = useState<PlayerPosition>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('down');
  const keysPressed = useRef<Record<string, boolean>>({});

  const [gameStarted, setGameStarted] = useState(false);
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameMessage, setGameMessage] = useState('Use WASD to move!');
  
  const [chatSessions, setChatSessions] = useState<ChatSessions>(new Map());
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const [weather, setWeather] = useState<Weather>('sunny');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [showControls, setShowControls] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);


  /**
   * Starts a conversation with an NPC.
   * @param {NPC} npc - The NPC to start a conversation with.
   */
  const startConversation = useCallback((npc: NPC) => {
    if (!chatSessions.has(npc.id)) {
      const newChat = createChatSession(npc.systemPrompt);
      setChatSessions(prev => new Map(prev).set(npc.id, newChat));
    }
    setSelectedNPC(npc);
    setConversationHistory([]);
  }, [chatSessions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
      if (key === 'enter' && selectedNPC && userInput) {
        e.preventDefault();
        handleSendMessage();
      }
       if (key === 'escape') {
        setSelectedNPC(null);
        setShowControls(false);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNPC, userInput, startConversation]);

  useEffect(() => {
    if (!gameStarted) return;
    
    const moveInterval = setInterval(() => {
      setPlayerPos(prevPos => {
        let { x, y } = prevPos;
        let newDirection = direction;
        
        if (keysPressed.current['w'] || keysPressed.current['arrowup']) { y = Math.max(0, y - 1); newDirection = 'up'; }
        else if (keysPressed.current['s'] || keysPressed.current['arrowdown']) { y = Math.min(GRID_SIZE - 1, y + 1); newDirection = 'down'; }
        else if (keysPressed.current['a'] || keysPressed.current['arrowleft']) { x = Math.max(0, x - 1); newDirection = 'left'; }
        else if (keysPressed.current['d'] || keysPressed.current['arrowright']) { x = Math.min(GRID_SIZE - 1, x + 1); newDirection = 'right'; }
        
        setDirection(newDirection);
        return { x, y };
      });
    }, 120);

    return () => clearInterval(moveInterval);
  }, [gameStarted, direction]);

  useEffect(() => {
     if (!gameStarted) return;

      const nearbyNPC = NPCS.find(
        npc => Math.abs(npc.x - playerPos.x) <= 1 && Math.abs(npc.y - playerPos.y) <= 1
      );

      if (nearbyNPC) {
        setGameMessage(`Press SPACE to talk to ${nearbyNPC.name}`);
        if (keysPressed.current[' ']) {
          startConversation(nearbyNPC);
          keysPressed.current[' '] = false; 
        }
      } else {
        setGameMessage('Use WASD to move. Explore!');
      }
  }, [playerPos, gameStarted, startConversation]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, isLoading]);

  /**
   * Sends a message to the current NPC.
   */
  const handleSendMessage = async () => {
    if (!userInput.trim() || !selectedNPC || !IS_API_CONFIGURED) return;

    const newHistory: ConversationMessage[] = [...conversationHistory, { role: 'user', content: userInput }];
    setConversationHistory(newHistory);
    const currentInput = userInput;
    setUserInput('');
    setIsLoading(true);

    const chat = chatSessions.get(selectedNPC.id);
    if (!chat) {
        setIsLoading(false);
        setConversationHistory([...newHistory, {role: 'model', content: "Error: Could not find chat session."}]);
        return;
    }

    const aiResponse = await sendMessage(chat, currentInput, weather, timeOfDay);
    setConversationHistory(prev => [...prev, { role: 'model', content: aiResponse.text, toolCalls: aiResponse.toolCalls }]);
    setIsLoading(false);
  };
  
  if (!gameStarted) {
    return (
      <div className="w-full h-screen bg-[#081820] flex items-center justify-center p-4 font-press-start text-[#e0f8d0]">
        <div className="bg-[#346856] border-4 border-[#081820] p-8 max-w-lg w-full text-center shadow-2xl">
          <h1 className="text-3xl mb-4 text-white">Pokémon</h1>
          <h2 className="text-2xl mb-8">AI Adventure</h2>
          <p className="text-sm mb-8 text-[#e0f8d0]">Explore the world and have conversations with its inhabitants, powered by Gemini.</p>
          <button
            onClick={() => setGameStarted(true)}
            className="bg-[#88c070] text-[#081820] font-bold py-4 px-6 border-2 border-[#081820] hover:bg-[#e0f8d0] transition-colors duration-200"
          >
            Start Game
          </button>
           {!IS_API_CONFIGURED && (
            <p className="text-xs text-yellow-300 mt-6 bg-red-900 p-2 border border-yellow-300">
              Warning: API_KEY not found. NPCs will not respond.
            </p>
          )}
        </div>
      </div>
    );
  }

  const spriteMap: Record<Direction, string> = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };

  return (
    <div className="w-full h-screen flex items-center justify-center p-2 sm:p-4 font-press-start text-xs">
      {showControls && <WeatherControlPanel 
        weather={weather} 
        timeOfDay={timeOfDay} 
        setWeather={setWeather} 
        setTimeOfDay={setTimeOfDay} 
        isDebugMode={isDebugMode}
        setIsDebugMode={setIsDebugMode}
        onClose={() => setShowControls(false)} 
      />}
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl">
        <div className="flex-shrink-0 flex flex-col gap-2">
          <div
            className="border-4 border-[#081820] bg-[#88c070]"
            style={{
              width: GRID_SIZE * TILE_SIZE,
              height: GRID_SIZE * TILE_SIZE,
              position: 'relative',
              imageRendering: 'pixelated',
              boxShadow: 'inset 0 0 0 5px #346856'
            }}
          >
            <WeatherEffects weather={weather} timeOfDay={timeOfDay} />
            {NPCS.map(npc => (
              <div
                key={npc.id}
                style={{
                  position: 'absolute', left: npc.x * TILE_SIZE, top: npc.y * TILE_SIZE,
                  width: TILE_SIZE, height: TILE_SIZE, fontSize: `${TILE_SIZE * 0.7}px`
                }}
                className="flex items-center justify-center cursor-pointer transition-transform hover:scale-110 z-20"
                onClick={() => startConversation(npc)}
              >
                {npc.sprite}
              </div>
            ))}
            <div
              style={{
                position: 'absolute', left: playerPos.x * TILE_SIZE, top: playerPos.y * TILE_SIZE,
                width: TILE_SIZE, height: TILE_SIZE, fontSize: `${TILE_SIZE * 0.6}px`
              }}
              className="flex items-center justify-center transition-all duration-100 ease-linear z-20"
            >
              {spriteMap[direction]}
            </div>
             <button 
              onClick={() => setShowControls(true)}
              className="absolute top-2 right-2 bg-[#e0f8d0] p-2 border-2 border-[#081820] hover:bg-white z-30"
              aria-label="Open weather and time controls"
            >
              <Settings size={20} />
            </button>
          </div>
          <div className="bg-[#e0f8d0] border-2 border-[#081820] p-3 text-center text-[#081820]">
            {gameMessage}
          </div>
          <div className="bg-[#e0f8d0] border-2 border-[#081820] p-2 text-center text-[#346856] hidden sm:block">
            WASD: Move | SPACE: Talk | ESC: Close
          </div>
        </div>
        <div className="bg-[#e0f8d0] border-4 border-[#081820] flex flex-col flex-grow w-full lg:w-auto h-[32rem] lg:h-auto">
          {selectedNPC ? (
            <>
              <div className="bg-[#346856] border-b-4 border-[#081820] p-3 flex items-center justify-between text-[#e0f8d0]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedNPC.sprite}</span>
                  <h2 className="font-bold">{selectedNPC.name}</h2>
                </div>
                <button onClick={() => setSelectedNPC(null)} className="p-1 hover:bg-[#88c070] rounded-sm"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-[#c0e0b0] space-y-4">
                {conversationHistory.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 max-w-[85%] border-2 border-[#081820] ${msg.role === 'user' ? 'bg-blue-300 text-black' : 'bg-white text-black'}`}>
                      {msg.content}
                    </div>
                     {isDebugMode && msg.role === 'model' && msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mt-1 max-w-[85%] text-[10px] text-purple-900 bg-purple-200 p-2 border-2 border-purple-400 border-dashed">
                          <p className="font-bold mb-1">🛠️ Tool Calls:</p>
                          <ul className="pl-1">
                            {msg.toolCalls.map((call, index) => (
                              <li key={index}>
                                &bull; Called <code>{call.name}()</code> &rarr; returned "<strong>{call.result}</strong>"
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 bg-white text-black border-2 border-[#081820]">
                      ...
                    </div>
                  </div>
                )}
                <div ref={conversationEndRef} />
              </div>
              <div className="border-t-4 border-[#081820] p-3 bg-[#346856]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={IS_API_CONFIGURED ? "Say something..." : "API not configured"}
                    className="flex-1 p-2 text-black border-2 border-[#081820] focus:outline-none focus:ring-2 focus:ring-[#88c070]"
                    disabled={isLoading || !IS_API_CONFIGURED}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !userInput.trim() || !IS_API_CONFIGURED}
                    className="bg-[#88c070] text-[#081820] p-2 border-2 border-[#081820] hover:bg-[#e0f8d0] disabled:bg-gray-400 disabled:text-gray-700"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-[#346856]">
              <Settings size={48} className="mb-4" />
              <p className="font-bold mb-4 text-[#081820]">Talk to an NPC!</p>
              <p className="max-w-xs">Move close to a character and press SPACE or click them to start a conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
