'use client';

import { useState, useRef } from 'react';
import { useLidarSocket } from '../hooks/useLidarSocket';
import { API_BASE, WS_URL } from '../lib/api';
import { StatusBar } from '../components/StatusBar';
import { ControlPanel } from '../components/ControlPanel';
import { DataPanel } from '../components/DataPanel';
import { LidarMap, LidarMapRef } from '../components/LidarMap';
import { EmailModal } from '../components/EmailModal';
import { SaveMapModal } from '../components/SaveMapModal';
import Link from 'next/link';

export default function Dashboard() {
  const mapRef = useRef<LidarMapRef>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);

  const { 
    status, 
    port, 
    baud, 
    points, 
    stats, 
    log,
    sendCommand,
    clearMap
  } = useLidarSocket(WS_URL);

  const handleSaveMap = () => {
    if (mapRef.current) {
      const dataUrl = mapRef.current.captureSnapshot();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `lidar-map-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  };

  const handleEmailMap = () => {
    if (mapRef.current) {
      const dataUrl = mapRef.current.captureSnapshot();
      setMapSnapshot(dataUrl);
      setIsEmailModalOpen(true);
    }
  };

  const openSaveModal = () => {
    if (mapRef.current) {
      const dataUrl = mapRef.current.captureSnapshot();
      setMapSnapshot(dataUrl);
      setIsSaveModalOpen(true);
    }
  };

  const handleSaveToDB = async (name: string, description: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/maps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          snapshot_base64: mapSnapshot,
          points: points
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Map saved successfully! Check the Saved Maps page.');
        setIsSaveModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save map.');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="status-bar">
        <div className="status-title">
          <span>LiDAR</span> Dashboard
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/saved" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 'bold' }}>
            View Saved Maps ➔
          </Link>
          <div className="status-indicator">
            <div className={`dot ${status}`}></div>
            {status === 'connected' ? `Connected (${port} @ ${baud})` : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </div>
        </div>
      </div>
      
      <div className="main-content">
        <div className="map-area">
          <LidarMap ref={mapRef} points={points} isScanning={status === 'connected' && stats.isScanning} />
          
          {status === 'disconnected' && (
            <div className="backend-offline-message">
              <h2>Backend Offline</h2>
              <p>The Python LiDAR backend is not running or unreachable.</p>
              <p>Please ensure your LiDAR is plugged in and start the server:</p>
              <code>python backend/server.py</code>
            </div>
          )}
        </div>

        <div className="sidebar">
          <ControlPanel 
            status={status} 
            isScanning={stats.isScanning}
            onCommand={sendCommand} 
            onSaveMap={handleSaveMap}
            onEmailMap={handleEmailMap}
            onClearMap={clearMap}
            onSaveToDB={openSaveModal}
          />
          <DataPanel stats={stats} log={log} />
        </div>
      </div>
      
      <EmailModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
        imageSrc={mapSnapshot} 
      />
      <SaveMapModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveToDB}
        imageSrc={mapSnapshot}
      />
    </div>
  );
}
