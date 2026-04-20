import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Guide {
  id: number;
  title: string;
  content: string;
  created_at: string;
  likes?: number;
}

export default function Guides() {
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
          body: JSON.stringify({ title, content }),
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
    await fetch(`/api/guides/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'like' }),
      headers: { 'Content-Type': 'application/json' }
    });
    fetchGuides();
  };

  return (
    <div className="page-container">
      <h1>ガイド</h1>
      <button onClick={() => {
        setShowForm(!showForm);
        if (editId) { setEditId(null); setTitle(''); setContent(''); }
      }} className="login-button" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : 'ガイドを投稿する'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form">
          <input type="text" placeholder="ガイドのタイトル" value={title} onChange={e => setTitle(e.target.value)} required />
          <textarea placeholder="ガイドの内容（Markdown対応）" value={content} onChange={e => setContent(e.target.value)} required rows={15} />
          <p style={{ fontSize: '0.8rem', marginTop: '-0.5rem' }}>※Markdown記法（# 見出し, * リスト, **太字** など）が使えます</p>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '処理中...' : editId ? '変更を保存' : 'ガイドを投稿する'}
          </button>
        </form>
      )}

      <div className="list-container">
        {guides.length === 0 ? <p>ガイドはまだありません。</p> : guides.map(guide => (
          <div key={guide.id} className="card">
            <h2>{guide.title}</h2>
            <p className="meta">投稿日: {new Date(guide.created_at).toLocaleDateString('ja-JP')}</p>
            <div className="content" style={{ padding: '1rem 0' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide.content}</ReactMarkdown>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem' }}>
              <button className="login-button" onClick={() => handleLike(guide.id)} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', background: 'var(--brand-red)' }}>
                ♥ いいね ({guide.likes || 0})
              </button>
              <div style={{ flex: 1 }}></div>
              <button className="login-button" onClick={() => handleEdit(guide)} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', background: '#555' }}>編集</button>
              <button className="login-button" onClick={() => handleDelete(guide.id)} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', background: '#dc3545' }}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
