import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
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
  const [ringingTargetName, setRingingTargetName] = useState('');

  // Use a ref to track the interval so it's stable across renders
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringingCallIdRef = useRef<number | null>(null);
  const ringingTargetNameRef = useRef('');

  // Keep refs in sync with state
  useEffect(() => { ringingCallIdRef.current = ringingCallId; }, [ringingCallId]);
  useEffect(() => { ringingTargetNameRef.current = ringingTargetName; }, [ringingTargetName]);

  const startCall = async (targetUid: string, targetName: string) => {
    if (!user) return;
    const roomName = `call_${[user.uid, targetUid].sort().join('_')}`;
    setRingingTargetName(targetName);

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          caller_uid: user.uid,
          caller_name: userName || user.displayName || 'User',
          target_uid: targetUid,
          room_name: roomName,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.id) {
        setRingingCallId(data.id);
      } else {
        throw new Error(data.error || '通話の開始に失敗しました');
      }
    } catch (err: any) {
      toast.error(`通話の開始に失敗しました: ${err.message}`);
      setRingingTargetName('');
    }
  };

  const cancelCall = async () => {
    const callId = ringingCallIdRef.current;
    if (callId) {
      fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', call_id: callId }),
      }).catch(console.error);
    }
    setRingingCallId(null);
    setRingingTargetName('');
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Poll for outgoing call status
  useEffect(() => {
    if (!ringingCallId || !user) return;

    const uid = user.uid;

    const poll = async () => {
      try {
        const res = await fetch(`/api/calls?caller_uid=${uid}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const currentCallId = ringingCallIdRef.current;
        const currentCall = data.find((c: any) => c.id === currentCallId);

        if (!currentCall) return;

        if (currentCall.status === 'accepted') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setRingingCallId(null);
          navigate(`/call?room=${currentCall.room_name}`);
        } else if (currentCall.status === 'rejected') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          toast.error(`${ringingTargetNameRef.current} さんに拒否されました`);
          setRingingCallId(null);
          setRingingTargetName('');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    // Poll immediately then every 2 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [ringingCallId, user?.uid, navigate]);

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
