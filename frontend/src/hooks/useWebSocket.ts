import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (url: string) => {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setLastMessage(message);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected. Retrying in 3s...');
      setTimeout(() => {
        // Simple reconnect logic
      }, 3000);
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  return { lastMessage };
};
