import { useState, useEffect } from 'react';

interface Guide {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function Guides() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

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
    const res = await fetch('/api/guides', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      setTitle('');
      setContent('');
      setShowForm(false);
      fetchGuides();
    }
  };

  return (
    <div className="page-container">
      <h1>ガイド</h1>
      <button onClick={() => setShowForm(!showForm)} className="login-button" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : 'ガイドを投稿する'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form">
          <input 
            type="text" 
            placeholder="ガイドのタイトル" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          <textarea 
            placeholder="ガイドの内容" 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            required 
            rows={10}
          />
          <button type="submit">ガイドを投稿する</button>
        </form>
      )}

      <div className="list-container">
        {guides.length === 0 ? <p>ガイドはまだありません。</p> : guides.map(guide => (
          <div key={guide.id} className="card">
            <h2>{guide.title}</h2>
            <p className="meta">投稿日: {new Date(guide.created_at).toLocaleDateString('ja-JP')}</p>
            <div className="content" style={{ whiteSpace: 'pre-wrap' }}>{guide.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
