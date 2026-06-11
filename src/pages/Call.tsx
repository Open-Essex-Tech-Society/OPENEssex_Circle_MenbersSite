import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
  LocalVideoStream,
  LocalAudioStream,
  RemoteVideoStream,
  RemoteAudioStream,
} from '@skyway-sdk/room';
import type { RoomPublication, LocalRoomMember } from '@skyway-sdk/room';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { createSkyWayToken } from '../lib/skyway-token';

const APP_ID = import.meta.env.VITE_SKYWAY_APP_ID;
const SECRET_KEY = import.meta.env.VITE_SKYWAY_SECRET_KEY;

interface RemoteParticipant {
  memberName: string;
  video?: RemoteVideoStream;
  audio?: RemoteAudioStream;
}

export default function Call() {
  const { user, userName } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const roomName = new URLSearchParams(location.search).get('room');

  const [joined, setJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remote, setRemote] = useState<RemoteParticipant | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // DOM refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // SkyWay refs – never triggers re-renders
  const contextRef = useRef<SkyWayContext | null>(null);
  const roomRef = useRef<SkyWayRoom | null>(null);
  const memberRef = useRef<LocalRoomMember | null>(null);
  const videoPubRef = useRef<RoomPublication<LocalVideoStream> | null>(null);
  const audioPubRef = useRef<RoomPublication<LocalAudioStream> | null>(null);
  const localVideoTrackRef = useRef<LocalVideoStream | null>(null);
  const localAudioTrackRef = useRef<LocalAudioStream | null>(null);

  // Guard: prevent fast navigation race condition
  const isCleanedUpRef = useRef(false);

  // ---- Cleanup ----
  const cleanup = useCallback(async () => {
    if (isCleanedUpRef.current) return;
    isCleanedUpRef.current = true;

    try { await memberRef.current?.leave(); } catch (_) {}
    try { contextRef.current?.dispose(); } catch (_) {}
    memberRef.current = null;
    contextRef.current = null;
    roomRef.current = null;
    videoPubRef.current = null;
    audioPubRef.current = null;
    localVideoTrackRef.current = null;
    localAudioTrackRef.current = null;
  }, []);

  // ---- Hangup ----
  const handleHangup = useCallback(() => {
    cleanup();
    navigate('/members');
  }, [cleanup, navigate]);

  // ---- Attach remote stream to video/audio element when it arrives ----
  useEffect(() => {
    if (remote?.video && remoteVideoRef.current) {
      remote.video.attach(remoteVideoRef.current);
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remote?.video]);

  useEffect(() => {
    if (remote?.audio && remoteAudioRef.current) {
      remote.audio.attach(remoteAudioRef.current);
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remote?.audio]);

  // ---- Main join logic ----
  useEffect(() => {
    if (!user || !roomName) return;
    
    let isMounted = true;
    isCleanedUpRef.current = false;

    (async () => {
      setIsConnecting(true);

      if (!APP_ID || !SECRET_KEY) {
        if (!isMounted) return;
        toast.error('SkyWayの認証情報が .env に設定されていません');
        navigate('/members');
        return;
      }

      try {
        // 1. Auth token
        const token = createSkyWayToken(roomName);

        // 2. Context
        const ctx = await SkyWayContext.Create(token);
        if (!isMounted) return ctx.dispose();
        contextRef.current = ctx;

        // 3. Room (p2p for 1-on-1)
        const room = await SkyWayRoom.FindOrCreate(ctx, {
          type: 'p2p',
          name: roomName,
        });
        roomRef.current = room;

        // 4. Join
        const member = await room.join({
          name: userName || user.email || 'User',
        });
        if (!isMounted) return member.leave();
        memberRef.current = member;

        // 5. Local media
        let videoStream: LocalVideoStream | null = null;
        let audioStream: LocalAudioStream | null = null;

        try {
          const streams = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
          videoStream = streams.video;
          audioStream = streams.audio;
        } catch {
          try {
            audioStream = await SkyWayStreamFactory.createMicrophoneAudioStream();
            if (isMounted) toast('カメラへのアクセスが拒否されました。音声のみで参加します');
          } catch {
            if (isMounted) toast.error('マイクへのアクセスが拒否されました');
          }
        }

        if (videoStream) {
          localVideoTrackRef.current = videoStream;
          if (localVideoRef.current) {
            videoStream.attach(localVideoRef.current);
            localVideoRef.current.play().catch(() => {});
          }
          videoPubRef.current = await member.publish(videoStream);
          if (isMounted) setIsCamOn(true);
        } else {
          if (isMounted) setIsCamOn(false);
        }

        if (audioStream) {
          localAudioTrackRef.current = audioStream;
          audioPubRef.current = await member.publish(audioStream);
          if (isMounted) setIsMicOn(true);
        } else {
          if (isMounted) setIsMicOn(false);
        }

        // 6. Subscribe to remote publications
        const subscribe = async (pub: RoomPublication) => {
          if (pub.publisher.id === member.id) return;

          try {
            const { stream } = await member.subscribe(pub.id);
            if (!isMounted) return;
            setRemote((prev) => {
              const base: RemoteParticipant = prev ?? { memberName: pub.publisher.name || '相手' };
              if (stream.contentType === 'video') return { ...base, video: stream as RemoteVideoStream };
              if (stream.contentType === 'audio') return { ...base, audio: stream as RemoteAudioStream };
              return base;
            });
          } catch (e) {
            console.error('subscribe failed', e);
          }
        };

        // Subscribe to already-published streams
        for (const pub of room.publications) {
          await subscribe(pub);
        }

        // Subscribe to future streams
        room.onStreamPublished.add(({ publication }) => subscribe(publication));

        // Handle partner leaving
        room.onMemberLeft.add(({ member: left }) => {
          if (left.id !== member.id && isMounted) {
            toast('相手が退出しました');
            handleHangup();
          }
        });

        if (isMounted) {
          setJoined(true);
          setIsConnecting(false);
        }

      } catch (err: any) {
        console.error('Call join error:', err);
        if (!isMounted) return;
        const msg = err?.message || String(err);
        toast.error('接続失敗: ' + msg);
        await cleanup();
        navigate('/members');
      }
    })();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, roomName]);

  // ---- Controls ----
  const toggleMic = async () => {
    if (!audioPubRef.current) return;
    if (isMicOn) await audioPubRef.current.disable();
    else await audioPubRef.current.enable();
    setIsMicOn(v => !v);
  };

  const toggleCam = async () => {
    if (!videoPubRef.current) return;
    if (isCamOn) await videoPubRef.current.disable();
    else await videoPubRef.current.enable();
    setIsCamOn(v => !v);
  };

  // ---- Render ----
  return (
    <div className="one-on-one-call-container">
      {/* Remote area */}
      <div className="call-remote-area">
        {isConnecting && !joined ? (
          <div className="call-connecting">
            <div className="call-spinner" />
            <p>接続中...</p>
          </div>
        ) : remote?.video ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="call-remote-video" />
        ) : (
          <div className="call-remote-placeholder">
            <div className="call-big-avatar">
              {remote?.memberName ? remote.memberName.charAt(0).toUpperCase() : '…'}
            </div>
            <p className="call-waiting-text">
              {remote ? `${remote.memberName} と通話中（音声のみ）` : '相手の参加を待機中...'}
            </p>
            {!remote && (
              <p className="call-waiting-sub">相手が応答するとつながります</p>
            )}
          </div>
        )}
        <audio ref={remoteAudioRef} autoPlay />
      </div>

      {/* Local PIP */}
      <div className={`call-local-pip ${!joined ? 'hidden' : ''}`}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={`call-local-video ${!isCamOn ? 'hidden' : ''}`}
        />
        {!isCamOn && (
          <div className="call-local-no-cam">
            <span>{userName?.charAt(0).toUpperCase() || 'Y'}</span>
          </div>
        )}
        <div className="call-local-label">You</div>
      </div>

      {/* Controls */}
      <div className="call-controls-bar">
        <button
          className={`ccb ${isMicOn ? 'active' : 'muted'}`}
          onClick={toggleMic}
          title={isMicOn ? 'マイクをオフ' : 'マイクをオン'}
        >
          {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        <button
          className={`ccb ${isCamOn ? 'active' : 'muted'}`}
          onClick={toggleCam}
          title={isCamOn ? 'カメラをオフ' : 'カメラをオン'}
        >
          {isCamOn ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        <button className="ccb hangup" onClick={handleHangup} title="通話を終了">
          <PhoneOff size={24} />
        </button>
      </div>

      <style>{`
        * { box-sizing: border-box; }

        .one-on-one-call-container {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #0d0d0f;
          display: flex;
          flex-direction: column;
          font-family: 'Outfit', system-ui, sans-serif;
        }

        /* ── Remote area ─────────────────────── */
        .call-remote-area {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .call-remote-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .call-remote-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.2rem;
          text-align: center;
          padding: 2rem;
        }

        .call-big-avatar {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff4766 0%, #ff8e52 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3.5rem;
          font-weight: 700;
          color: white;
          box-shadow: 0 0 60px rgba(255, 71, 102, 0.35);
          animation: callPulse 2.5s ease-in-out infinite;
        }

        @keyframes callPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(255, 71, 102, 0.3); }
          50% { box-shadow: 0 0 80px rgba(255, 71, 102, 0.6); }
        }

        .call-waiting-text {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.3rem;
          font-weight: 600;
          margin: 0;
        }

        .call-waiting-sub {
          color: rgba(255, 255, 255, 0.45);
          font-size: 0.95rem;
          margin: 0;
        }

        /* ── Connecting spinner ───────────────── */
        .call-connecting {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1rem;
        }

        .call-spinner {
          width: 56px;
          height: 56px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top-color: #ff4766;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Local PIP ───────────────────────── */
        .call-local-pip {
          position: absolute;
          bottom: 110px;
          right: 20px;
          width: 160px;
          height: 210px;
          border-radius: 18px;
          overflow: hidden;
          background: #111;
          border: 2px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          z-index: 20;
          transition: opacity 0.3s;
        }

        .call-local-pip.hidden { opacity: 0; pointer-events: none; }

        .call-local-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .call-local-no-cam {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a2e;
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }

        .call-local-label {
          position: absolute;
          bottom: 8px;
          left: 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 8px;
          border-radius: 10px;
          backdrop-filter: blur(4px);
        }

        /* ── Controls bar ────────────────────── */
        .call-controls-bar {
          position: absolute;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 14px 28px;
          background: rgba(15, 10, 15, 0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          z-index: 100;
        }

        .ccb {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          outline: none;
          color: white;
        }

        .ccb.active {
          background: rgba(255, 255, 255, 0.14);
        }
        .ccb.active:hover {
          background: rgba(255, 255, 255, 0.22);
          transform: translateY(-4px) scale(1.05);
        }

        .ccb.muted {
          background: rgba(255, 255, 255, 0.92);
          color: #ff4766;
        }
        .ccb.muted:hover {
          background: white;
          transform: translateY(-4px) scale(1.05);
        }

        .ccb.hangup {
          background: #ff4766;
          width: 66px;
          height: 66px;
          box-shadow: 0 6px 20px rgba(255, 71, 102, 0.45);
        }
        .ccb.hangup:hover {
          background: #ff2347;
          transform: translateY(-4px) scale(1.08);
          box-shadow: 0 12px 30px rgba(255, 71, 102, 0.6);
        }

        .hidden { display: none !important; }

        @media (max-width: 680px) {
          .call-local-pip {
            bottom: 100px;
            right: 12px;
            width: 110px;
            height: 145px;
            border-radius: 12px;
          }
          .call-controls-bar {
            gap: 14px;
            padding: 12px 20px;
            bottom: 20px;
          }
          .ccb { width: 50px; height: 50px; }
          .ccb.hangup { width: 58px; height: 58px; }
          .call-big-avatar { width: 110px; height: 110px; font-size: 2.8rem; }
        }
      `}</style>
    </div>
  );
}
