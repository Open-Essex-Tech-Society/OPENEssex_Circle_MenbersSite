import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Phone, PhoneOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CallNotification {
  id: number;
  caller_uid: string;
  caller_name: string;
  room_name: string;
  status: string;
}

export default function IncomingCallOverlay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<CallNotification | null>(null);

  // Poll for incoming calls
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (incomingCall) return; // Already showing a call

      try {
        const res = await fetch(`/api/calls?target_uid=${user.uid}`);
        const data = await res.json();
        if (data && data.length > 0) {
          setIncomingCall(data[0]);
          // Optional: Play sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
          audio.play().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to poll for calls:', err);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [user, incomingCall]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          call_id: incomingCall.id,
          status: 'accepted'
        }),
      });
      const room = incomingCall.room_name;
      setIncomingCall(null);
      navigate(`/meeting?room=${room}`);
    } catch (err) {
      toast.error('応答に失敗しました');
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          call_id: incomingCall.id,
          status: 'rejected'
        }),
      });
      setIncomingCall(null);
    } catch (err) {
      setIncomingCall(null);
    }
  };

  if (!incomingCall) return null;

  return (
    <div className="call-overlay">
      <div className="call-card glass-panel animate-in fade-in zoom-in">
        <div className="call-avatar-container">
          <div className="call-avatar-placeholder">
            {incomingCall.caller_name.charAt(0).toUpperCase()}
          </div>
          <div className="ringing-animation"></div>
        </div>
        
        <h2 className="call-title">着信中</h2>
        <p className="caller-name">{incomingCall.caller_name}</p>
        
        <div className="call-actions">
          <button className="call-btn-circle decline" onClick={handleDecline} title="拒否">
            <PhoneOff size={24} />
          </button>
          <button className="call-btn-circle accept" onClick={handleAccept} title="応答">
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
