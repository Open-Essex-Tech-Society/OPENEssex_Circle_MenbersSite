import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Shield } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!auth) {
    return (
      <div className="page-container login-page">
        <div className="login-card glass-panel">
          <h1>認証サービス未設定</h1>
          <p>Firebaseの設定が完了していないため、ログイン機能は利用できません。</p>
        </div>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithPopup(auth!, googleProvider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Googleログインに失敗しました。');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (password.length < 6) {
          setError('パスワードは6文字以上にしてください。');
          setIsSubmitting(false);
          return;
        }
        const credential = await createUserWithEmailAndPassword(auth!, email, password);
        if (displayName && credential.user) {
          await updateProfile(credential.user, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth!, email, password);
      }
      navigate('/');
    } catch (err: any) {
      const code = err.code;
      if (code === 'auth/user-not-found') {
        setError('このメールアドレスは登録されていません。');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('メールアドレスまたはパスワードが間違っています。');
      } else if (code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に登録されています。');
      } else if (code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません。');
      } else if (code === 'auth/weak-password') {
        setError('パスワードが弱すぎます。6文字以上にしてください。');
      } else {
        setError(err.message || '認証に失敗しました。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container login-page">
      <div className="login-card glass-panel">
        <div className="login-header">
          <img src="/OpenEssex.png" alt="Open Essex" className="login-logo" />
          <h1 className="gradient-text">{isRegister ? '新規登録' : 'ログイン'}</h1>
          <p className="login-subtitle">
            {isRegister
              ? 'アカウントを作成してOpen Essexに参加しよう'
              : 'Open Essexメンバー限定サイトへようこそ'}
          </p>
        </div>

        {error && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <button onClick={handleGoogleLogin} className="btn google-btn" type="button">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Googleでログイン
        </button>

        {!isRegister && (
          <Link to="/face-auth" className="btn outline-btn" style={{ width: '100%', marginTop: '1rem', color: '#22d3ee', borderColor: '#22d3ee' }}>
            <Shield size={20} style={{ marginRight: '8px' }} />
            顔認証でログイン
          </Link>
        )}

        <div className="login-divider">
          <span>または</span>
        </div>

        <form onSubmit={handleEmailSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="displayName">表示名</label>
              <input
                id="displayName"
                type="text"
                placeholder="ニックネーム"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-field"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="6文字以上"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary login-submit">
            {isSubmitting ? '処理中...' : isRegister ? 'アカウント作成' : 'ログイン'}
          </button>
        </form>

        <div className="login-switch">
          {isRegister ? (
            <p>
              既にアカウントをお持ちですか？{' '}
              <button onClick={() => { setIsRegister(false); setError(''); }} className="link-btn">
                ログインはこちら
              </button>
            </p>
          ) : (
            <p>
              アカウントをお持ちでない方は{' '}
              <button onClick={() => { setIsRegister(true); setError(''); }} className="link-btn">
                新規登録
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
