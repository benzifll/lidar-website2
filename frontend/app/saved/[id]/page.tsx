'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LidarMap } from '../../../components/LidarMap';
import { ArtefactModal } from '../../../components/ArtefactModal';
import { API_BASE } from '../../../lib/api';

export default function MapDetailsPage({ params }: { params: { id: string } }) {
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickPos, setClickPos] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/maps/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setMapData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id]);

  const handleMapClick = (x: number, y: number) => {
    setClickPos({ x, y });
    setIsModalOpen(true);
  };

  const handleSaveArtefact = async (header: string, description: string, file: File) => {
    if (!clickPos) return;
    
    const formData = new FormData();
    formData.append('header', header);
    formData.append('description', description);
    formData.append('x_pos', clickPos.x.toString());
    formData.append('y_pos', clickPos.y.toString());
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/maps/${params.id}/artefacts`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        // Reload map data to get the new artefact
        const freshRes = await fetch(`${API_BASE}/api/maps/${params.id}`);
        const freshData = await freshRes.json();
        setMapData(freshData);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save artefact');
    }
  };

  if (loading) return <div style={{ padding: '32px' }}>Loading map details...</div>;
  if (!mapData) return <div style={{ padding: '32px' }}>Map not found</div>;

  return (
    <div className="dashboard-container">
      <div className="status-bar">
        <div className="status-title">
          <span>LiDAR</span> Map Viewer: {mapData.name}
        </div>
        <div>
          <Link href="/saved" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 'bold' }}>
            ⬅ Back to Gallery
          </Link>
        </div>
      </div>
      
      <div className="main-content">
        <div className="map-area" style={{ flex: 2 }}>
          <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '4px' }}>Interactive Map</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Click anywhere on the map to place an Artefact.</p>
          </div>
          <LidarMap 
            points={mapData.points} 
            isScanning={false} 
            interactive={true}
            artefacts={mapData.artefacts}
            onMapClick={handleMapClick}
          />
        </div>

        <div className="sidebar" style={{ width: '400px', padding: '24px', overflowY: 'auto' }}>
          <h2>{mapData.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.875rem' }}>
            {new Date(mapData.created_at).toLocaleString()}
          </p>
          
          {mapData.description && (
            <div className="stat-card" style={{ marginBottom: '24px' }}>
              <p>{mapData.description}</p>
            </div>
          )}
          
          <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Artefacts ({mapData.artefacts?.length || 0})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mapData.artefacts?.map((art: any) => (
              <div key={art.id} className="stat-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
                <h4 style={{ marginBottom: '4px' }}>{art.header}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Location: X: {art.x_pos.toFixed(0)}, Y: {art.y_pos.toFixed(0)}
                </p>
                
                {art.media_type === 'video' ? (
                  <video src={`${API_BASE}${art.media_url}`} controls style={{ width: '100%', borderRadius: '4px' }} />
                ) : (
                  <img src={`${API_BASE}${art.media_url}`} style={{ width: '100%', borderRadius: '4px' }} alt={art.header} />
                )}
                {/* Delete artefact button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm('Delete this artefact?')) {
                      const res = await fetch(`${API_BASE}/api/artefacts/${art.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        // Refresh map data
                        const freshRes = await fetch(`${API_BASE}/api/maps/${params.id}`);
                        const freshData = await freshRes.json();
                        setMapData(freshData);
                      } else {
                        alert('Failed to delete artefact');
                      }
                    }
                  }}
                  style={{
                    marginTop: '8px',
                    background: 'var(--accent-red)',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >Delete Artefact</button>
                
                {art.description && (
                  <p style={{ fontSize: '0.875rem', marginTop: '12px' }}>{art.description}</p>
                )}
              </div>
            ))}
            
            {(!mapData.artefacts || mapData.artefacts.length === 0) && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                No artefacts added yet. Click on the map to add one!
              </p>
            )}
          </div>
        </div>
      </div>

      <ArtefactModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveArtefact}
        xPos={clickPos?.x || 0}
        yPos={clickPos?.y || 0}
      />
    </div>
  );
}
