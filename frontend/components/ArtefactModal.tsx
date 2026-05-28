import React, { useState, useRef } from 'react';

interface ArtefactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (header: string, description: string, file: File) => void;
  xPos: number;
  yPos: number;
}

export function ArtefactModal({ isOpen, onClose, onSave, xPos, yPos }: ArtefactModalProps) {
  const [header, setHeader] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (header && file) {
      onSave(header, description, file);
      // Reset
      setHeader('');
      setDescription('');
      setFile(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Artefact at ({xPos.toFixed(0)}, {yPos.toFixed(0)})</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-form">
          <div className="form-group">
            <label>Title / Header *</label>
            <input 
              type="text" 
              placeholder="What did you find here?" 
              value={header} 
              onChange={e => setHeader(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea 
              placeholder="Notes about this artefact..." 
              rows={3} 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Media (Image or Video) *</label>
            <input 
              type="file" 
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={e => e.target.files && setFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <button 
              className="btn btn-secondary" 
              style={{ gridColumn: 'auto' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? file.name : "Select File"}
            </button>
          </div>
          
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose} style={{ gridColumn: "auto" }}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={!header.trim() || !file}
            >
              Add Artefact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
