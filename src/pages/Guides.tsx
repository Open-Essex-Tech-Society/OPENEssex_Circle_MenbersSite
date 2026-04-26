import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AuthorBadge from '../components/AuthorBadge';

interface Guide {
  id: number;
  title: string;
  content: string;
  poster?: string;
  created_at: string;
  likes?: number;
}

export default function Guides() {
  const { userName } = useAuth();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  const fetchGuides = async () => {
    const res = await fetch('/api/guides');
    const data = await res.json();
    setGuides(data as Guide[]);
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editId) {
        const res = await fetch(`/api/guides/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ action: 'edit', title, content }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchGuides();
        setEditId(null);
      } else {
        const res = await fetch('/api/guides', {
          method: 'POST',
          body: JSON.stringify({ title, content, poster: userName }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchGuides();
      }
      setTitle('');
      setContent('');
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (guide: Guide) => {
    setEditId(guide.id);
    setTitle(guide.title);
    setContent(guide.content);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このガイドを削除してよろしいですか？')) return;
    await fetch(`/api/guides/${id}`, { method: 'DELETE' });
    fetchGuides();
  };

  const handleLike = async (id: number) => {
    const likedKey = `liked_guides_${id}`;
    if (localStorage.getItem(likedKey)) return;

    setGuides(prev => prev.map(guide => guide.id === id ? { ...guide, likes: (guide.likes || 0) + 1 } : guide));
    localStorage.setItem(likedKey, 'true');

    await fetch(`/api/guides/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'like' }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  return (
    <div className="page-container">
      <h1>ガイド</h1>
      <p className="page-subtitle">技術・知識共有</p>

      <button onClick={() => {
        setShowForm(!showForm);
        if (editId) { setEditId(null); setTitle(''); setContent(''); }
      }} className="btn btn-primary" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : 'ガイドを投稿する'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form glass-panel">
          <div className="auto-author-badge" style={{ marginBottom: '1rem' }}>投稿者: {userName}</div>
          <input type="text" placeholder="ガイドのタイトル" value={title} onChange={e => setTitle(e.target.value)} required className="input-field" />
          <textarea placeholder="ガイドの内容（Markdown対応）" value={content} onChange={e => setContent(e.target.value)} required rows={15} className="input-field" />
          <p style={{ fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>※Markdown記法（# 見出し, * リスト, **太字** など）が使えます</p>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? '処理中...' : editId ? '変更を保存' : 'ガイドを投稿する'}
          </button>
        </form>
      )}

      <div className="list-container">
        {guides.length === 0 ? <p>ガイドはまだありません。</p> : guides.map(guide => (
          <div key={guide.id} className="card glass-panel">
            <h2>{guide.title}</h2>
            <div className="meta" style={{ marginBottom: '1rem' }}>
              <AuthorBadge author={guide.poster || ''} date={guide.created_at} />
            </div>
            <div className="content" style={{ padding: '1rem 0' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide.content}</ReactMarkdown>
            </div>

            <div className="timeline-actions">
              <button className={`btn btn-like ${localStorage.getItem(`liked_guides_${guide.id}`) ? 'liked' : ''}`} onClick={() => handleLike(guide.id)}>
                <span className="icon">♥</span> {guide.likes || 0}
              </button>
              {(!guide.poster || userName === guide.poster) && (
                <>
                  <div className="spacer"></div>
                  <button className="btn btn-edit" onClick={() => handleEdit(guide)}>編集</button>
                  <button className="btn btn-delete" onClick={() => handleDelete(guide.id)}>削除</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
