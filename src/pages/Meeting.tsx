import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import { Mic, MicOff, Video, VideoOff, LogOut, Settings, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { nowInSec, SkyWayAuthToken, uuidV4 } from '@skyway-sdk/token';

const APP_ID = import.meta.env.VITE_SKYWAY_APP_ID;
const SECRET_KEY = import.meta.env.VITE_SKYWAY_SECRET_KEY || import.meta.env.VITE_SKYWAY_API_KEY;

export default function Meeting() {
  const { user, userName } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRoom = queryParams.get('room') || 'open-essex-room';
  
  const [roomName, setRoomName] = useState(initialRoom);
  const [joined, setJoined] = useState(false);
  const [, setLocalVideoTrack] = useState<LocalVideoStream | null>(null);
  const [, setLocalAudioTrack] = useState<LocalAudioStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ memberId: string, memberName: string, video?: RemoteVideoStream, audio?: RemoteAudioStream }[]>([]);
  const [activeRooms, setActiveRooms] = useState<{ room_name: string, display_name: string, member_count: number }[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<SkyWayRoom | null>(null);
  const memberRef = useRef<LocalRoomMember | null>(null);
  const contextRef = useRef<SkyWayContext | null>(null);
  const videoPubRef = useRef<RoomPublication<LocalVideoStream> | null>(null);
  const audioPubRef = useRef<RoomPublication<LocalAudioStream> | null>(null);

  // Fetch active rooms
  const fetchActiveRooms = async () => {
    try {
      const res = await fetch('/api/meeting-rooms');
      const data = await res.json();
      setActiveRooms(data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  useEffect(() => {
    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  // Room heartbeat
  useEffect(() => {
    if (joined && roomName) {
      const interval = setInterval(async () => {
        try {
          await fetch('/api/meeting-rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'heartbeat',
              room_name: roomName,
              display_name: roomName.startsWith('call_') ? 'Private Call' : roomName,
              member_count: remoteStreams.length + 1,
              created_by: user?.uid
            }),
          });
        } catch (err) {
          console.error('Room heartbeat failed:', err);
        }
      }, 30000); // Every 30s
      return () => clearInterval(interval);
    }
  }, [joined, roomName, remoteStreams.length]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  // Auto-join if room is in URL
  useEffect(() => {
    if (queryParams.has('room') && user && !joined && !isLoading) {
      joinRoom();
    }
  }, [user, location.search]);

  const joinRoom = async () => {
    if (!APP_ID || !SECRET_KEY) {
      toast.error('SkyWayの APP_ID または SECRET_KEY が設定されていません。(.envを確認してください)');
      return;
    }
    if (!roomName) {
      toast.error('Room name is required.');
      return;
    }

    setIsLoading(true);
    try {
      // トークンを生成
      const token = new SkyWayAuthToken({
        jti: uuidV4(),
        iat: nowInSec(),
        exp: nowInSec() + 60 * 60 * 24,
        scope: {
          app: {
            id: APP_ID,
            turn: true,
            actions: ['read'],
            channels: [
              {
                id: '*',
                name: '*',
                actions: ['write'],
                members: [
                  {
                    id: '*',
                    name: '*',
                    actions: ['write'],
                    publication: {
                      actions: ['write'],
                    },
                    subscription: {
                      actions: ['write'],
                    },
                  },
                ],
                sfuBots: [
                  {
                    actions: ['write'],
                    forwardings: [
                      {
                        actions: ['write'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      }).encode(SECRET_KEY);

      const context = await SkyWayContext.Create(token);
      contextRef.current = context;

      const room = await SkyWayRoom.FindOrCreate(context, {
        type: 'sfu', // 多人数の音声・ビデオ通話（Discord風）にはSFUが適しています
        name: roomName,
      });
      roomRef.current = room;

      const member = await room.join({
        name: userName || user?.email || 'Guest',
      });
      memberRef.current = member;

      // Prepare local streams
      const { video, audio } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
      setLocalVideoTrack(video);
      setLocalAudioTrack(audio);

      if (localVideoRef.current) {
        video.attach(localVideoRef.current);
      }

      videoPubRef.current = await member.publish(video);
      audioPubRef.current = await member.publish(audio);

      // Handle remote members and publications
      const subscribe = async (publication: RoomPublication) => {
        if (publication.publisher.id === member.id) return;

        const { stream } = await member.subscribe(publication.id);
        
        setRemoteStreams((prev) => {
          const existing = prev.find((s) => s.memberId === publication.publisher.id);
          const name = publication.publisher.name || 'Unknown';
          
          if (existing) {
            return prev.map((s) => {
              if (s.memberId === publication.publisher.id) {
                if (stream.contentType === 'video') return { ...s, video: stream as RemoteVideoStream };
                if (stream.contentType === 'audio') return { ...s, audio: stream as RemoteAudioStream };
              }
              return s;
            });
          } else {
            return [...prev, { 
              memberId: publication.publisher.id, 
              memberName: name,
              video: stream.contentType === 'video' ? stream as RemoteVideoStream : undefined,
              audio: stream.contentType === 'audio' ? stream as RemoteAudioStream : undefined
            }];
          }
        });
      };

      room.onStreamPublished.add(({ publication }) => subscribe(publication));
      room.publications.forEach(subscribe);

      room.onMemberLeft.add(({ member: leftMember }) => {
        setRemoteStreams((prev) => prev.filter((s) => s.memberId !== leftMember.id));
      });

      setJoined(true);
      toast.success(`${roomName} に入室しました`);

      // Initial heartbeat
      fetch('/api/meeting-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          room_name: roomName,
          display_name: roomName.startsWith('call_') ? 'Private Call' : roomName,
          member_count: 1,
          created_by: user?.uid
        }),
      }).catch(console.error);
    } catch (error: any) {
      console.error(error);
      toast.error('入室に失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const leaveRoom = async () => {
    if (roomName) {
      fetch('/api/meeting-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          room_name: roomName
        }),
      }).catch(console.error);
    }
    if (memberRef.current) {
      await memberRef.current.leave();
      memberRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.dispose();
      contextRef.current = null;
    }
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    videoPubRef.current = null;
    audioPubRef.current = null;
    setRemoteStreams([]);
    setJoined(false);
    toast.success('退出しました');
  };

  const toggleMic = async () => {
    if (audioPubRef.current) {
      if (isMicOn) {
        await audioPubRef.current.disable();
      } else {
        await audioPubRef.current.enable();
      }
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = async () => {
    if (videoPubRef.current) {
      if (isCamOn) {
        await videoPubRef.current.disable();
      } else {
        await videoPubRef.current.enable();
      }
      setIsCamOn(!isCamOn);
    }
  };

  return (
    <div className="page-container meeting-page">
      <div className="page-subtitle">
        <h1 className="gradient-text">SkyWay Meeting</h1>
        <p>ビデオ、音声、グループ通話</p>
      </div>

      {!joined ? (
        <div className="meeting-lobby">
          <div className="glass-panel join-card">
            <h3>ルームを作成または参加</h3>
            <div className="form-group">
              <label>ルーム名</label>
              <input 
                type="text" 
                className="input-field" 
                value={roomName} 
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name..."
              />
            </div>
            <button 
              className="btn btn-primary premium-button" 
              onClick={joinRoom}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              {isLoading ? '接続中...' : 'ルームに参加する'}
            </button>
          </div>

          <div className="active-rooms-section">
            <h3>アクティブなグループルーム</h3>
            {activeRooms.filter(r => !r.room_name.startsWith('call_')).length === 0 ? (
              <div className="glass-panel empty-rooms">
                <p>現在アクティブなグループルームはありません</p>
              </div>
            ) : (
              <div className="rooms-grid">
                {activeRooms.filter(r => !r.room_name.startsWith('call_')).map(room => (
                  <div key={room.room_name} className="glass-panel room-card">
                    <div className="room-card-info">
                      <h4>{room.display_name}</h4>
                      <div className="room-stats">
                        <Users size={16} />
                        <span>{room.member_count} 人が参加中</span>
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setRoomName(room.room_name);
                        // joinRoom will be called by useEffect if we change URL or we can call it directly
                        setTimeout(joinRoom, 100);
                      }}
                    >
                      参加
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="meeting-container">
          {/* ... existing meeting container ... */}
          <div className="meeting-grid">
            {/* Local Video */}
            <div className="video-card glass-panel local">
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`remote-video ${!isCamOn ? 'hidden' : ''}`}
              />
              {!isCamOn && (
                <div className="video-placeholder">
                  <div className="user-avatar-placeholder large">
                    {userName?.charAt(0).toUpperCase() || '?'}
                  </div>
                </div>
              )}
              <div className="video-info">
                <span className="member-name">You ({userName})</span>
                <div className="status-icons">
                  {!isMicOn && <MicOff size={16} className="icon-muted" />}
                </div>
              </div>
            </div>

            {/* Remote Videos */}
            {remoteStreams.map((remote) => (
              <RemoteVideo key={remote.memberId} remote={remote} />
            ))}
          </div>

          <div className="meeting-controls glass-panel">
            <button 
              className={`control-btn ${!isMicOn ? 'off' : ''}`} 
              onClick={toggleMic}
              title={isMicOn ? 'マイクをオフにする' : 'マイクをオンにする'}
            >
              {isMicOn ? <Mic /> : <MicOff />}
            </button>
            <button 
              className={`control-btn ${!isCamOn ? 'off' : ''}`} 
              onClick={toggleCam}
              title={isCamOn ? 'カメラをオフにする' : 'カメラをオンにする'}
            >
              {isCamOn ? <Video /> : <VideoOff />}
            </button>
            <button className="control-btn settings">
              <Settings />
            </button>
            <div className="spacer"></div>
            <button className="control-btn leave" onClick={leaveRoom}>
              <LogOut />
              <span>退出</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .meeting-lobby {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-top: 2rem;
        }
        .active-rooms-section h3 {
          margin-bottom: 1.5rem;
          text-align: left;
        }
        .rooms-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .room-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.2rem 1.5rem;
          text-align: left;
        }
        .room-card h4 {
          margin: 0 0 0.4rem;
          font-size: 1.1rem;
        }
        .room-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .empty-rooms {
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
        }
        .btn-sm {
          padding: 8px 20px;
          font-size: 0.9rem;
        }
        @media (max-width: 900px) {
          .meeting-lobby {
            grid-template-columns: 1fr;
          }
        }
        .meeting-page {
          max-width: 1200px;
        }
        .join-card {
          max-width: 400px;
          margin: 4rem auto;
          padding: 3rem;
          text-align: center;
        }
        .meeting-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          height: calc(100vh - 300px);
          min-height: 500px;
        }
        .meeting-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .video-card {
          position: relative;
          aspect-ratio: 16/9;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .video-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-avatar-placeholder.large {
          width: 80px;
          height: 80px;
          font-size: 2rem;
        }
        .video-info {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0, 0, 0, 0.5);
          padding: 4px 12px;
          border-radius: 20px;
          backdrop-filter: blur(4px);
        }
        .member-name {
          font-size: 0.9rem;
          color: white;
          font-weight: 600;
        }
        .status-icons {
          display: flex;
          gap: 8px;
        }
        .icon-muted {
          color: #ff4766;
        }
        .meeting-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem 2rem;
          border-radius: 100px;
        }
        .control-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .control-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
        .control-btn.off {
          background: #ff4766;
          box-shadow: 0 0 15px rgba(255, 71, 102, 0.4);
        }
        .control-btn.leave {
          width: auto;
          padding: 0 24px;
          border-radius: 100px;
          background: #ff4766;
          gap: 8px;
          font-weight: 600;
        }
        .control-btn.leave:hover {
          background: #ff2d51;
        }
        .hidden {
          display: none;
        }
        @media (max-width: 768px) {
          .meeting-grid {
            grid-template-columns: 1fr;
          }
          .meeting-controls {
            padding: 0.8rem 1rem;
            gap: 0.5rem;
          }
          .control-btn {
            width: 44px;
            height: 44px;
          }
          .control-btn.leave span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

function RemoteVideo({ remote }: { remote: { memberId: string, memberName: string, video?: RemoteVideoStream, audio?: RemoteAudioStream } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current && remote.video) {
      remote.video.attach(videoRef.current);
    }
  }, [remote.video]);

  useEffect(() => {
    if (audioRef.current && remote.audio) {
      remote.audio.attach(audioRef.current);
    }
  }, [remote.audio]);

  return (
    <div className="video-card glass-panel">
      {remote.video ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="remote-video"
        />
      ) : (
        <div className="video-placeholder">
          <div className="user-avatar-placeholder large">
            {remote.memberName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <audio ref={audioRef} autoPlay />
      <div className="video-info">
        <span className="member-name">{remote.memberName}</span>
        <div className="status-icons">
          {!remote.audio && <MicOff size={16} className="icon-muted" />}
        </div>
      </div>
    </div>
  );
}
