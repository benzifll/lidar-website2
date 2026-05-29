'use client';

import { Play, Square, RefreshCw, Save, Mail, Trash2 } from 'lucide-react';
import { ConnectionStatus } from '../hooks/useLidarSocket';

interface ControlPanelProps {
  status: ConnectionStatus;
  isScanning: boolean;
  onCommand: (cmd: 'start' | 'stop' | 'reset') => void;
  onSaveMap: () => void;
  onEmailMap: () => void;
  onClearMap: () => void;
  onSaveToDB?: () => void;
}

export function ControlPanel({ status, isScanning, onCommand, onSaveMap, onEmailMap, onClearMap, onSaveToDB }: ControlPanelProps) {
  const disabled = status !== 'connected';

  return (
    <div className="panel-section">
      <h3 className="section-title">Controls</h3>
      <div className="control-grid">
        <button 
          className="btn btn-primary" 
          disabled={disabled || isScanning}
          onClick={() => onCommand('start')}
        >
          <Play size={16} />
          Start Scan
        </button>
        
        <button 
          className="btn btn-danger" 
          disabled={disabled || !isScanning}
          onClick={() => onCommand('stop')}
        >
          <Square size={16} />
          Stop Scan
        </button>
        
        <button 
          className="btn btn-secondary" 
          disabled={disabled}
          onClick={() => onCommand('reset')}
        >
          <RefreshCw size={16} />
          Reset Sensor
        </button>
        
        <button 
          className="btn btn-secondary" 
          disabled={disabled}
          onClick={onClearMap}
        >
          <Trash2 size={16} />
          Clear Map
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={onSaveMap}
        >
          <Save size={16} />
          Save Image
        </button>

        {onSaveToDB && (
          <button 
            className="btn btn-secondary" 
            onClick={onSaveToDB}
          >
            <Save size={16} />
            Save Map to DB
          </button>
        )}
        
        <button 
          className="btn btn-secondary" 
          onClick={onEmailMap}
        >
          <Mail size={16} />
          Email Report
        </button>
      </div>
    </div>
  );
}
