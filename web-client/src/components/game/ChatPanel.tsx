import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { wsClient } from '../../services/websocket';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Send } from 'lucide-react';

export function ChatPanel() {
  const { chatMessages, phase, isAlive } = useGameStore();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    wsClient.send('chat_message', { text: text.trim() });
    setText('');
  };

  const canChat = isAlive && (phase === 'DISCUSSION' || phase === 'LOBBY');

  return (
    <div className="flex flex-col h-full bg-card/50 rounded-lg border">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-4">No messages yet...</p>
        ) : (
          chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.is_ghost ? 'opacity-70' : ''}`}>
              <span className="text-xs font-semibold text-primary">{msg.sender_name} {msg.is_ghost && '(Ghost)'}</span>
              <span className="text-sm px-3 py-1.5 bg-secondary rounded-lg w-max max-w-[90%] break-words">
                {msg.text}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSend} className="p-3 border-t bg-background flex gap-2">
        <Input 
          placeholder={canChat ? "Type a message..." : "You cannot chat right now"} 
          value={text} 
          onChange={(e) => setText(e.target.value)}
          disabled={!canChat}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!canChat || !text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
