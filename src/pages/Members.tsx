import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Video, PhoneOff, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface MemberProfile {
  uid: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  role: string;
  skills: string;
  created_at: string;
  last_seen?: string;
}

const isOnline = (lastSeen?: string) => {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen).getTime();
  const now = new Date().getTime();
  return now - lastSeenDate < 5 * 60 * 1000; // 5 minutes
};

const getRoleWeight = (role: string) => {
  if (!role) return 8;
  const r = role.toUpperCase();
  if (r.includes("CEO")) return 1;
  if (r.includes("CTO")) return 2;
  if (r.includes("CFO")) return 3;
  if (r.includes("CSO")) return 4;
  if (r.includes("Independent Engineer for Lovers")) return 5;
  if (r.includes("CMO")) return 6;
  if (role !== "Member" && role !== "メンバー") return 7;
  return 8;
};

const isExecutive = (role: string) => {
  if (!role) return false;
  return /CEO|CTO|CFO|CSO|COO|CMO/i.test(role);
};

export default function Members() {
  const { user, userName } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [ringingCallId, setRingingCallId] = useState<number | null>(null);
  const [ringingTargetName, setRingingTargetName] = useState("");

  const startCall = async (e: React.MouseEvent, target: MemberProfile) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    
    const roomName = `call_${[user.uid, target.uid].sort().join("_")}`;
    setRingingTargetName(target.display_name);

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          caller_uid: user.uid,
          caller_name: userName || 'User',
          target_uid: target.uid,
          room_name: roomName
        }),
      });
      const data = await res.json();
      setRingingCallId(data.id);
    } catch (err) {
      toast.error('通話の開始に失敗しました');
    }
  };

  const cancelCall = async () => {
    if (ringingCallId) {
      fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          call_id: ringingCallId
        }),
      }).catch(console.error);
    }
    setRingingCallId(null);
    setRingingTargetName("");
  };

  // Poll for call status when ringing
  useEffect(() => {
    if (!ringingCallId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls?caller_uid=${user?.uid}`);
        const data = await res.json();
        if (data && data.length > 0) {
          const call = data[0];
          if (call.id === ringingCallId) {
            if (call.status === 'accepted') {
              setRingingCallId(null);
              navigate(`/meeting?room=${call.room_name}`);
            } else if (call.status === 'rejected') {
              toast.error(`${ringingTargetName} さんに拒否されました`);
              setRingingCallId(null);
              setRingingTargetName("");
            }
          }
        }
      } catch (err) {
        console.error('Failed to poll call status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [ringingCallId, user, ringingTargetName]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCTO, setIsCTO] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/profiles?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Data is not an array");
      }
      const sorted = (data as MemberProfile[]).sort((a, b) => {
        const wA = getRoleWeight(a.role);
        const wB = getRoleWeight(b.role);
        if (wA !== wB) return wA - wB;
        
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
      setMembers(sorted);
      setIsLoading(false);

      if (user) {
        const currentMember = sorted.find((m) => m.uid === user.uid);
        if (
          currentMember &&
          currentMember.role &&
          currentMember.role.toUpperCase().includes("CTO")
        ) {
          setIsCTO(true);
        }
      }
    } catch (err) {
      console.error("fetchMembers failed:", err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const handleUpdateMember = async (targetUid: string) => {
    if (!user || (!newRole.trim() && !newAvatarUrl.trim())) return;
    setAdminMessage("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_uid: user.uid,
          action: "update_member",
          target_uid: targetUid,
          new_role: newRole.trim(),
          new_avatar_url: newAvatarUrl.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage("✅ メンバー情報を更新しました");
        setEditingMemberId(null);
        setNewRole("");
        setNewAvatarUrl("");
        await fetchMembers();
      } else {
        setAdminMessage(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setAdminMessage(`❌ エラー: ${err.message}`);
    }
  };

  const handleDeleteMember = async (targetUid: string, name: string) => {
    if (!user) return;
    if (!confirm(`${name} を本当に削除しますか？この操作は取り消せません。`))
      return;
    setAdminMessage("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_uid: user.uid,
          action: "delete_member",
          target_uid: targetUid,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage(`✅ ${name} を削除しました`);
        await fetchMembers();
      } else {
        setAdminMessage(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setAdminMessage(`❌ エラー: ${err.message}`);
    }
  };

  return (
    <div className="page-container">
      <h1>Members</h1>
      <p className="page-subtitle">メンバー数（{members.length}人）</p>

      {isCTO && (
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className="btn btn-primary"
          style={{ marginBottom: "1.5rem" }}
        >
          {showAdmin ? "管理モードを終了" : "🔧 管理モード"}
        </button>
      )}

      {adminMessage && (
        <div
          className={`mypage-message ${adminMessage.includes("❌") ? "error" : "success"}`}
          style={{ marginBottom: "1rem" }}
        >
          {adminMessage}
        </div>
      )}

      {isLoading ? (
        <p style={{ textAlign: "center" }}>読み込み中...</p>
      ) : members.length === 0 ? (
        <p className="empty-state">まだメンバーが登録されていません。</p>
      ) : (
        <div className="members-list">
          {members.map((member) => (
            <Link
              to={`/profile/${member.uid}`}
              key={member.uid}
              className="member-row glass-panel"
            >
              <div className="member-row-bg"></div>
              <div className="member-row-content">
                <div className="member-row-avatar">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                      className="member-row-img"
                    />
                  ) : (
                    <div className="member-row-placeholder">
                      {member.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`status-indicator ${isOnline(member.last_seen) ? 'online' : 'offline'}`}></div>
                </div>
                <div className="member-row-info">
                  <div className="member-row-top">
                    <h3 className="member-row-name">{member.display_name}</h3>
                    <span
                      className={`member-role ${isExecutive(member.role) ? "role-executive" : ""}`}
                    >
                      {member.role}
                    </span>
                  </div>
                  {member.bio && (
                    <p className="member-row-bio">
                      {member.bio.length > 100
                        ? member.bio.slice(0, 100) + "..."
                        : member.bio}
                    </p>
                  )}
                </div>
                {member.skills && (
                  <div className="member-row-skills">
                    {member.skills
                      .split(",")
                      .filter((s: string) => s.trim())
                      .map((skill: string, i: number) => (
                        <span key={i} className="skill-tag">
                          {skill.trim()}
                        </span>
                      ))}
                  </div>
                )}
                {user && member.uid !== user.uid && (
                  <button
                    onClick={(e) => startCall(e, member)}
                    className="call-btn"
                    title="1-on-1通話を開始"
                  >
                    <Video size={18} />
                    <span>Call</span>
                  </button>
                )}
                <span className="member-row-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Ringing Overlay for Caller */}
      {ringingCallId && (
        <div className="call-overlay">
          <div className="call-card glass-panel animate-in fade-in zoom-in">
            <div className="call-avatar-container">
              <div className="call-avatar-placeholder">
                {ringingTargetName.charAt(0).toUpperCase()}
              </div>
              <div className="ringing-animation outgoing"></div>
            </div>
            
            <h2 className="call-title">呼び出し中</h2>
            <p className="caller-name">{ringingTargetName}</p>
            
            <div className="call-actions">
              <button className="call-btn-circle decline" onClick={cancelCall} title="キャンセル">
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTO Admin Panel - separate section below the member list */}
      {showAdmin && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>🔧 メンバー管理</h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
          >
            {members
              .filter((m) => m.uid !== user?.uid)
              .map((member) => (
                <div
                  key={member.uid}
                  className="glass-panel"
                  style={{
                    padding: "1rem 1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem",
                      flex: 1,
                      minWidth: "200px",
                    }}
                  >
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt=""
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "var(--brand-gradient)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                        }}
                      >
                        {member.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <strong>{member.display_name}</strong>
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {member.role}
                      </span>
                    </div>
                  </div>

                  {editingMemberId === member.uid ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <input
                        type="text"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="新しい役職"
                        className="input-field"
                        style={{
                          marginBottom: 0,
                          padding: "6px 12px",
                          fontSize: "0.85rem",
                          width: "300px",
                        }}
                      />
                      <input
                        type="text"
                        value={newAvatarUrl}
                        onChange={(e) => setNewAvatarUrl(e.target.value)}
                        placeholder="新しいアイコン画像URL"
                        className="input-field"
                        style={{
                          marginBottom: 0,
                          padding: "6px 12px",
                          fontSize: "0.85rem",
                          width: "300px",
                        }}
                      />
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleUpdateMember(member.uid);
                          }}
                        >
                          保存
                        </button>
                        <button
                          className="btn outline-btn"
                          style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                          onClick={() => {
                            setEditingMemberId(null);
                            setNewRole("");
                            setNewAvatarUrl("");
                          }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-edit"
                        style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                        onClick={() => {
                          setEditingMemberId(member.uid);
                          setNewRole(member.role);
                          setNewAvatarUrl(member.avatar_url || "");
                        }}
                      >
                        🏷️ 編集
                      </button>
                      <button
                        className="btn btn-delete"
                        style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                        onClick={() =>
                          handleDeleteMember(member.uid, member.display_name)
                        }
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
