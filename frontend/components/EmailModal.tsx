'use client';

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { API_BASE } from '../lib/api';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
}

export function EmailModal({ isOpen, onClose, imageSrc }: EmailModalProps) {
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPassword, setSenderPassword] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('LiDAR Map Report');
  const [message, setMessage] = useState('Here is the latest LiDAR map snapshot.');
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageSrc) {
      setStatusMsg({ text: 'Error: No map image provided.', isError: true });
      return;
    }

    setIsSending(true);
    setStatusMsg(null);

    try {
      const response = await fetch(`${API_BASE}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: toEmail,
          subject,
          message,
          image_base64: imageSrc,
          sender_email: senderEmail,
          sender_password: senderPassword
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStatusMsg({ text: 'Email sent successfully!', isError: false });
        setTimeout(() => {
          onClose();
          setStatusMsg(null);
        }, 2000);
      } else {
        setStatusMsg({ text: `Failed: ${data.error}`, isError: true });
      }
    } catch (error: any) {
      setStatusMsg({ text: `Error connecting to backend: ${error.message}`, isError: true });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Send LiDAR Report</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form" style={{ padding: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="form-group">
            <label>Your Email (Sender):</label>
            <input 
              type="email" 
              required 
              value={senderEmail} 
              onChange={e => setSenderEmail(e.target.value)} 
              placeholder="you@gmail.com"
            />
          </div>
          
          <div className="form-group">
            <label>App Password (e.g. Gmail App Password):</label>
            <input 
              type="password" 
              required 
              value={senderPassword} 
              onChange={e => setSenderPassword(e.target.value)} 
              placeholder="16-character app password"
            />
          </div>

          <div style={{ margin: '16px 0', borderBottom: '1px solid var(--border-color)' }}></div>

          <div className="form-group">
            <label>To Email (Recipient):</label>
            <input 
              type="email" 
              required 
              value={toEmail} 
              onChange={e => setToEmail(e.target.value)} 
              placeholder="recipient@example.com"
            />
          </div>
          
          <div className="form-group">
            <label>Subject:</label>
            <input 
              type="text" 
              required 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Custom Header / Message:</label>
            <textarea 
              rows={4} 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Attachment Preview:</label>
            {imageSrc ? (
              <img src={imageSrc} alt="Map Preview" className="map-preview" />
            ) : (
              <div className="map-preview empty">No map captured</div>
            )}
          </div>

          {statusMsg && (
            <div className={`status-msg ${statusMsg.isError ? 'error' : 'success'}`}>
              {statusMsg.text}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSending || !imageSrc}>
              <Send size={16} />
              {isSending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
