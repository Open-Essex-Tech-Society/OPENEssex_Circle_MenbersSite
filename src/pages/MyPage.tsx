import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileForm {
  display_name: string;
  avatar_url: string;
  bio: string;
  role: string;
  skills: string;
  linkedin_url: string;
  github_url: string;
  website_url: string;
}

export default function MyPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileForm>({
    display_name: '',
    avatar_url: '',
    bio: '',
    role: 'Member',
    skills: '',
    linkedin_url: '',
    github_url: '',
    website_url: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/profiles/${user.uid}`)
      .then(res => {
        if (!res.ok) {
          // Profile doesn't exist yet, pre-fill from Firebase user
          setForm(prev => ({
            ...prev,
            display_name: user.displayName || user.email?.split('@')[0] || '',
            avatar_url: user.photoURL || '',
          }));
          setIsNew(true);
          setIsLoading(false);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setForm({
            display_name: data.display_name || '',
            avatar_url: data.avatar_url || '',
            bio: data.bio || '',
            role: data.role || 'Member',
            skills: data.skills || '',
            linkedin_url: data.linkedin_url || '',
            github_url: data.github_url || '',
            website_url: data.website_url || '',
          });
          setIsLoading(false);
        }
      })
      .catch(() => setIsLoading(false));
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          ...form,
        }),
      });

      if (res.ok) {
        setMessage('プロフィールを保存しました！');
        setIsNew(false);
      } else {
        setMessage('保存に失敗しました。');
      }
    } catch {
      setMessage('エラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return <div className="page-container"><p>ログインしてください。</p></div>;
  }

  if (isLoading) {
    return <div className="page-container"><p>読み込み中...</p></div>;
  }

  return (
    <div className="page-container mypage-container">
      <h1>マイページ</h1>
      <p className="page-subtitle">プロフィールを編集して公開しよう</p>

      {isNew && (
        <div className="mypage-welcome glass-panel">
          <h3>👋 ようこそ！</h3>
          <p>プロフィールを設定して、メンバー一覧に表示されるようにしましょう。</p>
        </div>
      )}

      {message && (
        <div className={`mypage-message ${message.includes('失敗') || message.includes('エラー') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="mypage-form">
        <div className="mypage-section glass-panel">
          <h3>基本情報</h3>

          <div className="mypage-avatar-editor">
            <div className="mypage-avatar-preview">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="profile-avatar-large" />
              ) : (
                <div className="profile-avatar-large-placeholder">
                  {form.display_name.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="mypage-avatar-input">
              <label>アイコン画像</label>
              <div className="avatar-upload-area">
                <label htmlFor="avatar-file" className="btn outline-btn avatar-file-btn">
                  📁 ファイルから選択
                </label>
                <input
                  id="avatar-file"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 500 * 1024) {
                      alert('画像サイズは500KB以下にしてください。');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      // Resize image to save space
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxSize = 200;
                        let w = img.width, h = img.height;
                        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
                        else { w = (w / h) * maxSize; h = maxSize; }
                        canvas.width = w;
                        canvas.height = h;
                        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                        const dataUrl = canvas.toDataURL('image/webp', 0.8);
                        updateField('avatar_url', dataUrl);
                      };
                      img.src = reader.result as string;
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              <p className="field-hint">または画像URLを直接入力：</p>
              <input
                type="text"
                placeholder="https://example.com/avatar.png"
                value={form.avatar_url.startsWith('data:') ? '' : form.avatar_url}
                onChange={e => updateField('avatar_url', e.target.value)}
                className="input-field"
              />
              {form.avatar_url && (
                <button
                  type="button"
                  className="btn btn-delete"
                  style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                  onClick={() => updateField('avatar_url', '')}
                >
                  アイコンを削除
                </button>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>表示名 *</label>
              <input
                type="text"
                value={form.display_name}
                onChange={e => updateField('display_name', e.target.value)}
                required
                className="input-field"
                placeholder="あなたの名前"
              />
            </div>
            <div className="form-group">
              <label>役割</label>
              <input
                type="text"
                value={form.role}
                onChange={e => updateField('role', e.target.value)}
                className="input-field"
                placeholder="例: エンジニア, デザイナー, PM"
              />
            </div>
          </div>
        </div>

        <div className="mypage-section glass-panel">
          <h3>自己紹介</h3>
          <div className="form-group">
            <label>バイオ</label>
            <textarea
              value={form.bio}
              onChange={e => updateField('bio', e.target.value)}
              className="input-field"
              rows={4}
              placeholder="自己紹介を書いてください..."
            />
          </div>

          <div className="form-group">
            <label>スキル・関心分野</label>
            <input
              type="text"
              value={form.skills}
              onChange={e => updateField('skills', e.target.value)}
              className="input-field"
              placeholder="カンマ区切り: React, Python, デザイン, マーケティング"
            />
            <p className="field-hint">カンマ (,) で区切って入力してください</p>
          </div>
        </div>

        <div className="mypage-section glass-panel">
          <h3>外部リンク</h3>
          <div className="form-group">
            <label>LinkedIn</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={e => updateField('linkedin_url', e.target.value)}
              className="input-field"
              placeholder="https://linkedin.com/in/yourname"
            />
          </div>
          <div className="form-group">
            <label>GitHub</label>
            <input
              type="url"
              value={form.github_url}
              onChange={e => updateField('github_url', e.target.value)}
              className="input-field"
              placeholder="https://github.com/yourname"
            />
          </div>
          <div className="form-group">
            <label>ウェブサイト</label>
            <input
              type="url"
              value={form.website_url}
              onChange={e => updateField('website_url', e.target.value)}
              className="input-field"
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="btn btn-primary mypage-save-btn">
          {isSaving ? '保存中...' : isNew ? 'プロフィールを作成' : 'プロフィールを更新'}
        </button>
      </form>
    </div>
  );
}
