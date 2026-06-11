import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface CallContextType {
  ringingCallId: number | null;
  ringingTargetName: string;
  startCall: (targetUid: string, targetName: string) => Promise<void>;
  cancelCall: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, userName } = useAuth();
  const navigate = useNavigate();
  const [ringingCallId, setRingingCallId] = useState<number | null>(null);
  const [ringingTargetName, setRingingTargetName] = useState("");

  const startCall = async (targetUid: string, targetName: string) => {
    if (!user) return;
    const roomName = `call_${[user.uid, targetUid].sort().join("_")}`;
    setRingingTargetName(targetName);

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          caller_uid: user.uid,
          caller_name: userName || 'User',
          target_uid: targetUid,
          room_name: roomName
        }),
      });
      const data = await res.json();
      if (res.ok && data && data.id) {
        setRingingCallId(data.id);
      } else {
        throw new Error(data.error || 'Failed to start call');
      }
    } catch (err: any) {
      toast.error(`通話の開始に失敗しました: ${err.message}`);
    }
  };

  const cancelCall = async () => {
    if (ringingCallId) {
      fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', call_id: ringingCallId }),
      }).catch(console.error);
    }
    setRingingCallId(null);
    setRingingTargetName("");
  };

  // Poll for outgoing call status
  useEffect(() => {
    if (!ringingCallId || !user) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls?caller_uid=${user.uid}`);
        const data = await res.json();
        const currentCall = data.find((c: any) => c.id === ringingCallId);
        
        if (currentCall) {
          if (currentCall.status === 'accepted') {
            clearInterval(interval);
            setRingingCallId(null);
            navigate(`/call?room=${currentCall.room_name}`);
          } else if (currentCall.status === 'rejected') {
            clearInterval(interval);
            toast.error(`${ringingTargetName} さんに拒否されました`);
            setRingingCallId(null);
            setRingingTargetName("");
          }
        }
      } catch (err) {
        console.error('Poll failed:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [ringingCallId, user, ringingTargetName, navigate]);

  return (
    <CallContext.Provider value={{ ringingCallId, ringingTargetName, startCall, cancelCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
}
