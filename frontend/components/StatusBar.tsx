'use client';

import { Radar } from 'lucide-react';
import { ConnectionStatus } from '../hooks/useLidarSocket';

interface StatusBarProps {
  status: ConnectionStatus;
  port: string;
  baud: number;
}

export function StatusBar({ status, port, baud }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-title">
        <Radar size={24} color="#00BFFF" />
        LiDAR <span>Dashboard</span>
      </div>
      
      <div className="status-indicator">
        <div className={`dot ${status}`} />
        {status === 'connected' && `Connected: ${port} @ ${baud} baud`}
        {status === 'connecting' && 'Connecting...'}
        {status === 'disconnected' && 'Disconnected'}
      </div>
    </div>
  );
}
