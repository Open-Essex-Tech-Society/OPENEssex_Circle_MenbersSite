import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const { user, userName, userAvatar } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth <= 768) {
        if (window.scrollY > 50) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <nav className={`navbar glass-panel ${!isVisible ? 'navbar-hidden' : ''}`}>
      <div className="navbar-brand">
        <Link to="/">
          <img
            src="/OpenEssex.png"
            alt="Logo"
            className="navbar-logo"
          />
          <span>Open Essex</span>
        </Link>
      </div>
      <div className="navbar-scroll-area">
        <ul className="navbar-links">
          <li><Link to="/timeline">タイムライン</Link></li>
          <li><Link to="/documents">課題・資料</Link></li>
          <li><Link to="/projects">企画</Link></li>
          <li><Link to="/calendar">カレンダー</Link></li>
          <li><Link to="/guides">ガイド</Link></li>
          <li><Link to="/books">おすすめ本</Link></li>
          <li><Link to="/members">メンバー</Link></li>
          <li><Link to="/face-auth" style={{color: '#22d3ee', fontWeight: 'bold'}}>顔認証 (New!)</Link></li>
        </ul>
      </div>
      <div className="navbar-auth">
        {user ? (
          <div className="user-profile">
            <Link to="/mypage" className="user-avatar-link">
              {userAvatar ? (
                <img src={userAvatar} alt="User" />
              ) : (
                <div className="user-avatar-mini">{(userName || '?').charAt(0).toUpperCase()}</div>
              )}
            </Link>
            <button onClick={handleLogout} className="btn outline-btn">
              ログアウト
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary">
            ログイン
          </Link>
        )}
      </div>
    </nav>
  );
}
