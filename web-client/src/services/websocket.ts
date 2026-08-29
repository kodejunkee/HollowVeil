import { useGameStore } from '../stores/gameStore';

export class GameWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private url = '';
  private token = '';
  private roomId = '';

  public onMessage: ((data: any) => void) | null = null;
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;

  private pingInterval: any = null;

  connect(serverUrl: string, roomId: string, authToken: string) {
    this.url = serverUrl;
    this.roomId = roomId;
    this.token = authToken;
    this.maxReconnectAttempts = 5; // Reset on intentional connect

    const baseWsUrl = serverUrl.replace(/^http/, 'ws');
    const wsUrl = `${baseWsUrl}/ws/${roomId}?token=${authToken}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      useGameStore.getState().setWsStatus('connected');
      if (this.onConnect) this.onConnect();
      
      // Start heartbeat
      this.pingInterval = setInterval(() => {
        this.send('ping');
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return; // Ignore pong responses
        if (this.onMessage) this.onMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (this.pingInterval) clearInterval(this.pingInterval);
      if (this.onDisconnect) this.onDisconnect();
      this.attemptReconnect();
    };

    this.ws.onerror = (e) => {
      console.error('WebSocket error:', e);
    };
  }

  send(type: string, payload: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    } else {
      console.warn('Cannot send message, WebSocket is not open');
    }
  }

  disconnect() {
    this.maxReconnectAttempts = 0; // Prevent auto-reconnect
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useGameStore.getState().setWsStatus('disconnected');
  }

  private attemptReconnect() {
    if (this.maxReconnectAttempts === 0) {
      console.log('Intentional disconnect, skipping reconnect.');
      return;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      useGameStore.getState().setWsStatus('reconnecting');
      const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      console.log(`Attempting reconnect in ${backoffTime}ms...`);
      setTimeout(() => {
        if (this.maxReconnectAttempts > 0) {
          this.connect(this.url, this.roomId, this.token);
        }
      }, backoffTime);
    } else {
      console.error('Max reconnect attempts reached');
    }
  }
}

export const wsClient = new GameWebSocket();
