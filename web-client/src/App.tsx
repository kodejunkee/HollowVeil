import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function App() {
  const { session, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/" element={session ? <Home /> : <Navigate to="/login" replace />} />
          <Route path="/lobby/:roomId" element={session ? <Lobby /> : <Navigate to="/login" replace />} />
          <Route path="/game/:roomId" element={session ? <Game /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
