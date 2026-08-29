import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { LogOut, Plus, Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, session, signOut } = useAuthStore();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const SERVER_URL = import.meta.env.VITE_API_URL || 'https://hollowveil-api.onrender.com';

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms?token=${session?.access_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_private: true })
      });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      navigate(`/room/${data.room_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode) return;
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/join?token=${session?.access_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode.toUpperCase() })
      });
      if (!res.ok) throw new Error('Room not found or full');
      const data = await res.json();
      navigate(`/room/${data.room_id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between py-6 border-b">
        <h1 className="text-2xl font-bold tracking-tight">Hollow Town</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 py-12 grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create a Game</CardTitle>
            <CardDescription>Start a new game as the host.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" onClick={handleCreateRoom} disabled={loading}>
              Create Room
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Join a Game</CardTitle>
            <CardDescription>Enter a room code to join an existing game.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <Input
                placeholder="Room Code (e.g. XXXXXX)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-center uppercase"
              />
              <Button type="submit" disabled={loading || roomCode.length < 6}>
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
