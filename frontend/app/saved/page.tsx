'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapCard } from '../../components/MapCard';
import { API_BASE } from '../../lib/api';

export default function SavedMapsPage() {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/maps`)
      .then(res => res.json())
      .then(data => {
        setMaps(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="dashboard-container">
      <div className="status-bar">
        <div className="status-title">
          <span>LiDAR</span> Saved Maps Database
        </div>
        <div>
          <Link href="/" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 'bold' }}>
            ⬅ Back to Live Scanner
          </Link>
        </div>
      </div>
      
      <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
        <h1 style={{ marginBottom: '24px' }}>Saved Map Cards</h1>
        
        {loading ? (
          <p>Loading database...</p>
        ) : maps.length === 0 ? (
          <div className="stat-card" style={{ textAlign: 'center', padding: '48px' }}>
            <h2>No maps saved yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Go back to the Live Scanner and click "Save Map to DB" to create your first card!
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
              {maps.map((map: any) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} key={map.id}>
                  <MapCard map={map} />
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Delete this map?')) {
                        const res = await fetch(`${API_BASE}/api/maps/${map.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          setMaps(prev => prev.filter((m: any) => m.id !== map.id));
                        } else {
                          alert('Failed to delete map');
                        }
                      }
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'var(--accent-red)',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >Delete</button>
                </div>
              ))}

          </div>
        )}
      </div>
    </div>
  );
}
