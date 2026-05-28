import React, { useState } from 'react';

interface SaveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  imageSrc: string | null;
}

export function SaveMapModal({ isOpen, onClose, onSave, imageSrc }: SaveMapModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Save Map to Database</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-form">
          {imageSrc && (
            <div className="form-group">
              <label>Map Preview</label>
              <img src={imageSrc} alt="Preview" className="map-preview" />
            </div>
          )}
          
          <div className="form-group">
            <label>Map Name</label>
            <input 
              type="text" 
              placeholder="e.g. Living Room Scan 1" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea 
              placeholder="Notes about this scan..." 
              rows={3} 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
          
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose} style={{ gridColumn: "auto" }}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={() => onSave(name, description)}
              disabled={!name.trim()}
            >
              Save Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
