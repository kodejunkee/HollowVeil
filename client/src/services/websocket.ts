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

  connect(serverUrl: string, roomId: string, authToken: string) {
    this.url = serverUrl;
    this.roomId = roomId;
    this.token = authToken;

    const baseWsUrl = serverUrl.replace(/^http/, 'ws');
    const wsUrl = `${baseWsUrl}/ws/${roomId}?token=${authToken}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      if (this.onConnect) this.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessage) this.onMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
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
