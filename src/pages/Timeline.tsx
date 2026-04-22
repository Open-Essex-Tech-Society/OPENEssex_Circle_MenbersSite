import { useState, useEffect } from 'react';

interface TimelineItem {
  id: number;
  type: string;
  url: string;
  title: string;
  description: string;
  author: string;
  created_at: string;
  likes?: number;
}

export default function Timeline() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState('youtube');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');

  const [editId, setEditId] = useState<number | null>(null);

  const fetchItems = async () => {
    const res = await fetch('/api/timeline');
    const data = await res.json();
    setItems(data as TimelineItem[]);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editId) {
        const res = await fetch(`/api/timeline/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ action: 'edit', title, description, url }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchItems();
        setEditId(null);
      } else {
        const res = await fetch('/api/timeline', {
          method: 'POST',
          body: JSON.stringify({ type, url, title, description, author }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchItems();
      }
      setType('youtube');
      setUrl('');
      setTitle('');
      setDescription('');
      if (!editId) setAuthor('');
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: TimelineItem) => {
    setEditId(item.id);
    setType(item.type);
    setUrl(item.url);
    setTitle(item.title);
    setDescription(item.description);
    setAuthor(item.author);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この投稿を削除してよろしいですか？')) return;
    await fetch(`/api/timeline/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const handleLike = async (id: number) => {
    const likedKey = `liked_timeline_${id}`;
    if (localStorage.getItem(likedKey)) return;

    setItems(prev => prev.map(item => item.id === id ? { ...item, likes: (item.likes || 0) + 1 } : item));
    localStorage.setItem(likedKey, 'true');

    await fetch(`/api/timeline/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'like' }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="page-container timeline-container">
      <h1>タイムライン</h1>
      <p className="page-subtitle">YouTubeの動画やニュースを共有</p>

      <button onClick={() => {
        setShowForm(!showForm);
        if (editId) { setEditId(null); setUrl(''); setTitle(''); setDescription(''); setAuthor(''); setType('youtube'); }
      }} className="btn btn-primary" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : '新規共有'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form glass-panel">
          <div className="form-group row">
            <select value={type} onChange={e => setType(e.target.value)} disabled={!!editId} className="input-field">
              <option value="youtube">YouTube動画</option>
              <option value="news">ニュース記事</option>
              <option value="other">その他リンク</option>
            </select>
            {!editId && <input type="text" placeholder="投稿者名" value={author} onChange={e => setAuthor(e.target.value)} required className="input-field" />}
          </div>

          <input type="url" placeholder="URL (例: https://youtube.com/... or https://...)" value={url} onChange={e => setUrl(e.target.value)} required className="input-field" />
          <input type="text" placeholder="タイトル" value={title} onChange={e => setTitle(e.target.value)} required className="input-field" />

          <textarea placeholder="説明やコメント" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="input-field" />

          <button type="submit" disabled={isSubmitting} className="btn btn-submit">
            {isSubmitting ? '処理中...' : editId ? '変更を保存' : '共有する'}
          </button>
        </form>
      )}

      <div className="timeline-feed">
        {items.length === 0 ? <p className="empty-state">まだ投稿がありません。</p> : items.map(item => (
          <div key={item.id} className="timeline-card glass-panel">
            <div className="timeline-header">
              <span className={`tag tag-${item.type}`}>{item.type === 'youtube' ? 'YouTube' : item.type === 'news' ? 'News' : 'Link'}</span>
              <span className="author-date">{item.author} · {new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
            </div>

            <h2 className="timeline-title">{item.title}</h2>
            {item.description && <p className="timeline-desc">{item.description}</p>}

            {item.type === 'youtube' && extractYoutubeId(item.url) ? (
              <div className="video-container">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYoutubeId(item.url)}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={item.title}
                ></iframe>
              </div>
            ) : (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="link-preview">
                🔗 {item.url}
              </a>
            )}

            <div className="timeline-actions">
              <button className={`btn btn-like ${localStorage.getItem(`liked_timeline_${item.id}`) ? 'liked' : ''}`} onClick={() => handleLike(item.id)}>
                <span className="icon">♥</span> {item.likes || 0}
              </button>
              <div className="spacer"></div>
              <button className="btn btn-edit" onClick={() => handleEdit(item)}>編集</button>
              <button className="btn btn-delete" onClick={() => handleDelete(item.id)}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
