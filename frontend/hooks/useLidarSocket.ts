import { useState, useEffect, useRef, useCallback } from 'react';

export type LidarPoint = {
  angle: number;
  distance: number;
  quality: number;
};

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export type LidarStats = {
  isScanning: boolean;
  maxDistance: number;
  minDistance: number;
  pointsPerSecond: number;
  rpm: number;
};

export function useLidarSocket(url: string) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [port, setPort] = useState<string>('Unknown');
  const [baud, setBaud] = useState<number>(115200);
  const [points, setPoints] = useState<LidarPoint[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [stats, setStats] = useState<LidarStats>({
    isScanning: false,
    maxDistance: 0,
    minDistance: 0,
    pointsPerSecond: 0,
    rpm: 0
  });

  const ws = useRef<WebSocket | null>(null);
  const pointsBuffer = useRef<LidarPoint[]>([]);
  const pointCounter = useRef<number>(0);
  const maxDistRef = useRef<number>(0);
  const minDistRef = useRef<number>(9999);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure points per second — runs independently
  useEffect(() => {
    const interval = setInterval(() => {
      const pps = pointCounter.current;
      pointCounter.current = 0;
      setStats(s => ({
        ...s,
        pointsPerSecond: pps,
        rpm: pps > 0 ? Math.round((pps / 200) * 60) : 0,
        maxDistance: maxDistRef.current,
        minDistance: minDistRef.current === 9999 ? 0 : minDistRef.current,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const appendLog = useCallback((msg: string) => {
    setLog(prev => [msg, ...prev].slice(0, 10));
  }, []);

  // Stable connect function — no dependencies that change with data
  const connect = useCallback(() => {
    // Don't double-connect
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    appendLog('Connecting to ' + url + '...');

    try {
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        appendLog('WebSocket connected');
      };

      socket.onclose = () => {
        // Only react if this is still the current socket
        if (ws.current !== socket) return;
        ws.current = null;
        setStatus('disconnected');
        setStats(s => ({ ...s, isScanning: false }));
        appendLog('Disconnected. Retrying in 3s...');
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        // onclose will fire after onerror — let it handle reconnect
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'status') {
            if (data.port) setPort(data.port);
            if (data.baud) setBaud(data.baud);
            if (data.connected !== undefined) {
              appendLog(`Hardware: ${data.connected ? '🟢 Connected' : '🔴 Disconnected'} — ${data.port || ''}`);
            }
            // Track scanning state driven by ESP32 events
            if (data.scanning !== undefined) {
              setStats(s => ({ ...s, isScanning: data.scanning }));
              // Clear BOTH the React state AND the ref buffer when a fresh scan begins
              if (data.scanning === true) {
                pointsBuffer.current = [];
                maxDistRef.current = 0;
                minDistRef.current = 9999;
                setPoints([]);
              }
            }
          }
          else if (data.type === 'scan') {
            if (!data.points || !Array.isArray(data.points)) return;

            const newPoints = data.points as LidarPoint[];
            pointCounter.current += newPoints.length;

            newPoints.forEach(p => {
              if (p.distance > maxDistRef.current) maxDistRef.current = p.distance;
              if (p.distance > 0 && p.distance < minDistRef.current) minDistRef.current = p.distance;
            });

            // Accumulate all points for this scan — buffer was cleared at SCAN_START
            pointsBuffer.current = [...pointsBuffer.current, ...newPoints];
            setPoints([...pointsBuffer.current]);
            setStats(s => ({ ...s, isScanning: true }));
          }
          else if (data.type === 'error') {
            appendLog(`⚠️ ${data.message}`);
          }
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      };
    } catch (e) {
      setStatus('disconnected');
      appendLog('Failed to create WebSocket. Retrying in 3s...');
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  // url and appendLog are stable — safe to include
  }, [url, appendLog]);

  // Connect once on mount, clean up on unmount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnect on intentional close
        ws.current.close();
      }
    };
  }, [connect]);

  const sendCommand = useCallback((cmd: 'start' | 'stop' | 'reset') => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ command: cmd }));
      appendLog(`→ Command: ${cmd}`);
      if (cmd === 'stop' || cmd === 'reset') {
        setStats(s => ({ ...s, isScanning: false }));
      }
    } else {
      appendLog('Cannot send command — not connected.');
    }
  }, [appendLog]);

  const clearMap = useCallback(() => {
    setPoints([]);
    pointsBuffer.current = [];
    appendLog('Map cleared');
  }, [appendLog]);

  return { status, port, baud, points, stats, log, sendCommand, clearMap };
}
