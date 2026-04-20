import { Link } from 'react-router-dom';

interface NavbarProps {
  isLoggedIn: boolean;
  onLoginToggle: () => void;
}

export default function Navbar({ isLoggedIn, onLoginToggle }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/OpenEssex.png" 
            alt="Logo" 
            style={{ 
              height: '35px', 
              width: '35px', 
              borderRadius: '50%', 
              objectFit: 'cover', 
              objectPosition: 'center 15%',
              border: '2px solid var(--accent)'
            }} 
          />
          <span>Open Essex</span>
        </Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/documents">課題・資料</Link></li>
        <li><Link to="/guides">ガイド</Link></li>
        <li><Link to="/books">おすすめ本</Link></li>
        <li>
          <button onClick={onLoginToggle} className="login-button">
            {isLoggedIn ? 'ログアウト' : 'メンバーログイン'}
          </button>
        </li>
      </ul>
    </nav>
  );
}
