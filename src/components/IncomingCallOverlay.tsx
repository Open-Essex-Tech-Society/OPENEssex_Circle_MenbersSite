import { useEffect, useRef, useState } from 'react';
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
  const isRespondingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const uid = user.uid;

    const poll = async () => {
      // Don't poll while we're processing a response
      if (isRespondingRef.current) return;
      // Don't poll if already showing a call
      if (incomingCall) return;

      try {
        const res = await fetch(`/api/calls?target_uid=${uid}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setIncomingCall(data[0]);
        }
      } catch (err) {
        console.error('Incoming call poll error:', err);
      }
    };

    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // deliberately only run when user changes, not on incomingCall change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleAccept = async () => {
    if (!incomingCall || isRespondingRef.current) return;
    isRespondingRef.current = true;

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          call_id: incomingCall.id,
          status: 'accepted',
        }),
      });

      if (!res.ok) throw new Error('応答の送信に失敗しました');

      const room = incomingCall.room_name;
      setIncomingCall(null);
      navigate(`/call?room=${room}`);
    } catch (err: any) {
      toast.error('応答に失敗しました: ' + err.message);
      isRespondingRef.current = false;
    }
  };

  const handleDecline = async () => {
    if (!incomingCall || isRespondingRef.current) return;
    isRespondingRef.current = true;
    const callId = incomingCall.id;
    setIncomingCall(null);

    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          call_id: callId,
          status: 'rejected',
        }),
      });
    } catch (err) {
      console.error('Decline failed:', err);
    } finally {
      isRespondingRef.current = false;
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
          <div className="ringing-animation" />
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
