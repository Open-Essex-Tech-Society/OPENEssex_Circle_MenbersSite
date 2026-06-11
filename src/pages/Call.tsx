import { useEffect, useRef, useState } from 'react';
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
import { nowInSec, SkyWayAuthToken, uuidV4 } from '@skyway-sdk/token';

const APP_ID = import.meta.env.VITE_SKYWAY_APP_ID;
const SECRET_KEY = import.meta.env.VITE_SKYWAY_SECRET_KEY || import.meta.env.VITE_SKYWAY_API_KEY;

export default function Call() {
  const { user, userName } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const roomName = queryParams.get('room');
  
  const [joined, setJoined] = useState(false);
  const [, setLocalVideoTrack] = useState<LocalVideoStream | null>(null);
  const [, setLocalAudioTrack] = useState<LocalAudioStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<{ memberName: string, video?: RemoteVideoStream, audio?: RemoteAudioStream } | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const isJoiningRef = useRef(false);

  const roomRef = useRef<SkyWayRoom | null>(null);
  const memberRef = useRef<LocalRoomMember | null>(null);
  const contextRef = useRef<SkyWayContext | null>(null);
  const videoPubRef = useRef<RoomPublication<LocalVideoStream> | null>(null);
  const audioPubRef = useRef<RoomPublication<LocalAudioStream> | null>(null);

  useEffect(() => {
    if (!roomName) {
      toast.error('無効な通話リンクです');
      navigate('/members');
      return;
    }
    if (user && !joined) {
      joinCall();
    }
    return () => {
      endCall();
    };
  }, [user, roomName]);

  const joinCall = async () => {
    if (isJoiningRef.current) return;
    isJoiningRef.current = true;

    if (!APP_ID || !SECRET_KEY) {
      toast.error('認証情報が設定されていません(.env)');
      return;
    }

    try {
      const token = new SkyWayAuthToken({
        jti: uuidV4(),
        iat: nowInSec(),
        exp: nowInSec() + 60 * 60 * 24,
        scope: {
          app: {
            id: APP_ID, turn: true, actions: ['read'],
            channels: [{
              id: '*', name: '*', actions: ['write'],
              members: [{ id: '*', name: '*', actions: ['write'], publication: { actions: ['write'] }, subscription: { actions: ['write'] } }],
              sfuBots: [{ actions: ['write'], forwardings: [{ actions: ['write'] }] }],
            }],
          },
        },
      }).encode(SECRET_KEY);

      const context = await SkyWayContext.Create(token);
      contextRef.current = context;

      const room = await SkyWayRoom.FindOrCreate(context, { type: 'sfu', name: roomName! });
      roomRef.current = room;

      const member = await room.join({ name: userName || user?.email || 'User' });
      memberRef.current = member;

      let video: LocalVideoStream | null = null;
      let audio: LocalAudioStream | null = null;
      
      try {
        const stream = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
        video = stream.video;
        audio = stream.audio;
      } catch (err) {
        console.warn('Camera/Mic permission failed. Trying Audio only...', err);
        try {
          audio = await SkyWayStreamFactory.createMicrophoneAudioStream();
        } catch (e) {
          console.warn('Microphone permission failed.', e);
        }
      }

      if (video) {
        setLocalVideoTrack(video);
        if (localVideoRef.current) video.attach(localVideoRef.current);
        videoPubRef.current = await member.publish(video);
        setIsCamOn(true);
      } else {
        setIsCamOn(false);
      }

      if (audio) {
        setLocalAudioTrack(audio);
        audioPubRef.current = await member.publish(audio);
        setIsMicOn(true);
      } else {
        setIsMicOn(false);
      }

      const subscribe = async (publication: RoomPublication) => {
        if (publication.publisher.id === member.id) return;
        const { stream } = await member.subscribe(publication.id);
        
        setRemoteStream((prev) => {
          const newState = prev ? { ...prev } : { memberName: publication.publisher.name || 'Unknown' };
          if (stream.contentType === 'video') newState.video = stream as RemoteVideoStream;
          if (stream.contentType === 'audio') newState.audio = stream as RemoteAudioStream;
          return newState;
        });
      };

      room.onStreamPublished.add(({ publication }) => subscribe(publication));
      room.publications.forEach(subscribe);

      room.onMemberLeft.add(() => {
        toast('相手が退出しました。通話を終了します');
        handleHangup();
      });

      setJoined(true);
    } catch (err: any) {
      console.error(err);
      toast.error('通話の接続に失敗しました');
      navigate('/members');
    } finally {
      isJoiningRef.current = false;
    }
  };

  const endCall = async () => {
    if (memberRef.current) {
      await memberRef.current.leave();
      memberRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.dispose();
      contextRef.current = null;
    }
    videoPubRef.current = null;
    audioPubRef.current = null;
  };

  const handleHangup = () => {
    endCall();
    navigate('/members');
  };

  const toggleMic = async () => {
    if (audioPubRef.current) {
      if (isMicOn) await audioPubRef.current.disable();
      else await audioPubRef.current.enable();
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = async () => {
    if (videoPubRef.current) {
      if (isCamOn) await videoPubRef.current.disable();
      else await videoPubRef.current.enable();
      setIsCamOn(!isCamOn);
    }
  };

  // When remote stream changes, attach
  useEffect(() => {
    if (remoteStream?.video && remoteVideoRef.current) {
      remoteStream.video.attach(remoteVideoRef.current);
    }
    if (remoteStream?.audio && remoteAudioRef.current) {
      remoteStream.audio.attach(remoteAudioRef.current);
    }
  }, [remoteStream, remoteStream?.video, remoteStream?.audio]);

  return (
    <div className="one-on-one-call-container">
      {/* Remote Video (Full Screen Base) */}
      <div className="call-remote-area">
        {remoteStream?.video ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="call-remote-video" />
        ) : (
          <div className="call-remote-placeholder">
            <div className="call-avatar-placeholder">
              {remoteStream?.memberName ? remoteStream.memberName.charAt(0).toUpperCase() : '…'}
            </div>
            {remoteStream ? <p>{remoteStream.memberName}と通話中 (音声)</p> : <p>相手の参加を待機しています...</p>}
          </div>
        )}
        <audio ref={remoteAudioRef} autoPlay />
      </div>

      {/* Local Video (PIP) */}
      <div className="call-local-area">
        <video ref={localVideoRef} autoPlay muted playsInline className={`call-local-video ${!isCamOn ? 'hidden' : ''}`} />
        {!isCamOn && (
           <div className="call-local-placeholder">
             <div className="call-avatar-placeholder small"> You </div>
           </div>
        )}
      </div>

      {/* Controls Overlay */}
      <div className="call-controls-overlay glass-panel">
        <button className={`call-control-btn ${!isMicOn ? 'off' : ''}`} onClick={toggleMic}>
          {isMicOn ? <Mic size={24}/> : <MicOff size={24}/>}
        </button>
        <button className={`call-control-btn ${!isCamOn ? 'off' : ''}`} onClick={toggleCam}>
          {isCamOn ? <Video size={24}/> : <VideoOff size={24}/>}
        </button>
        <div style={{ width: '20px' }}></div>
        <button className="call-control-btn hangup" onClick={handleHangup}>
          <PhoneOff size={28}/>
        </button>
      </div>

      <style>{`
        .one-on-one-call-container {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
        }

        .call-remote-area {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }

        .call-remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .call-remote-placeholder {
          text-align: center;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .call-remote-placeholder p {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .call-avatar-placeholder {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff4766 0%, #ff8e52 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: bold;
        }

        .call-local-area {
          position: absolute;
          bottom: 120px;
          right: 20px;
          width: 180px;
          aspect-ratio: 9/16;
          max-height: 300px;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.1);
          z-index: 10;
        }

        .call-local-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* Mirror local video */
        }

        .call-local-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111;
        }

        .call-avatar-placeholder.small {
          width: 70px;
          height: 70px;
          font-size: 1.2rem;
        }

        .call-controls-overlay {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          padding: 1rem 2rem;
          border-radius: 100px;
          z-index: 100;
          backdrop-filter: blur(20px);
          background: rgba(30, 8, 12, 0.6);
        }

        .call-control-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .call-control-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-5px);
        }

        .call-control-btn.off {
          background: rgba(255, 255, 255, 0.9);
          color: #ff4766;
        }

        .call-control-btn.hangup {
          background: #ff4766;
          transform: scale(1.1);
        }

        .call-control-btn.hangup:hover {
          background: #ff2d51;
          transform: scale(1.1) translateY(-5px);
          box-shadow: 0 10px 30px rgba(255, 71, 102, 0.5);
        }

        .hidden {
          display: none;
        }

        @media (max-width: 768px) {
          .call-local-area {
            bottom: 110px;
            right: 15px;
            width: 120px;
            max-height: 200px;
          }
          .call-controls-overlay {
            width: 90%;
            max-width: 350px;
            justify-content: space-around;
            padding: 0.8rem 1rem;
          }
          .call-control-btn {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </div>
  );
}
