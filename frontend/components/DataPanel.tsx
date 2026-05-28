'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LidarStats } from '../hooks/useLidarSocket';

interface DataPanelProps {
  stats: LidarStats;
  log: string[];
}

export function DataPanel({ stats, log }: DataPanelProps) {
  const [logOpen, setLogOpen] = useState(true);

  return (
    <>
      <div className="panel-section">
        <h3 className="section-title">Live Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Points / Sec</div>
            <div className="stat-value">{stats.pointsPerSecond.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rotation Speed</div>
            <div className="stat-value">{stats.rpm} <span>RPM</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Max Distance</div>
            <div className="stat-value">{(stats.maxDistance / 1000).toFixed(2)} <span>m</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Min Distance</div>
            <div className="stat-value">{(stats.minDistance / 1000).toFixed(2)} <span>m</span></div>
          </div>
        </div>
      </div>

      <div className="panel-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 className="section-title">System Log</h3>
        
        <div className="data-log" style={{ flex: logOpen ? 1 : 'none', display: 'flex', flexDirection: 'column' }}>
          <div className="log-header" onClick={() => setLogOpen(!logOpen)}>
            Last 10 Events
            {logOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          
          {logOpen && (
            <div className="log-content">
              {log.length === 0 && <div className="log-entry">No data yet...</div>}
              {log.map((entry, i) => (
                <div key={i} className="log-entry">
                  <span style={{ color: '#00BFFF' }}>[{new Date().toLocaleTimeString()}]</span> {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
