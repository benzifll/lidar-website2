import React from 'react';
import Link from 'next/link';
import { API_BASE } from '../lib/api';

interface MapCardProps {
  map: any;
}

export function MapCard({ map }: MapCardProps) {
  return (
    <Link href={`/saved/${map.id}`} style={{ textDecoration: 'none' }}>
      <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.2s', height: '100%' }}>
        {map.snapshot_url ? (
          <img 
            src={`${API_BASE}${map.snapshot_url}`} 
            alt={map.name} 
            style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} 
          />
        ) : (
          <div style={{ width: '100%', height: '200px', backgroundColor: '#1a1d24', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            No Preview
          </div>
        )}
        <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>{map.name}</h3>
        {map.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {map.description}
          </p>
        )}
        <div style={{ color: 'var(--accent-blue)', fontSize: '0.75rem' }}>
          {new Date(map.created_at).toLocaleString()}
        </div>
      </div>
    </Link>
  );
}
