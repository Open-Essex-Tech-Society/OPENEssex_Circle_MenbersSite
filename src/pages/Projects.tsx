import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthorBadge from '../components/AuthorBadge';

interface ProjectItem {
  id: number;
  title: string;
  description: string;
  author: string;
  status: string;
  created_at: string;
  likes?: number;
}

export default function Projects() {
  const { userName } = useAuth();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');

  const [editId, setEditId] = useState<number | null>(null);

  const fetchItems = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setItems(data as ProjectItem[]);
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
        const res = await fetch(`/api/projects/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ action: 'edit', title, description, status }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchItems();
        setEditId(null);
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          body: JSON.stringify({ title, description, author: userName, status }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchItems();
      }
      setTitle('');
      setDescription('');
      setStatus('planning');
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: ProjectItem) => {
    setEditId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setStatus(item.status);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この企画を削除してよろしいですか？')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const handleLike = async (id: number) => {
    const likedKey = `liked_project_${id}`;
    if (localStorage.getItem(likedKey)) return;

    setItems(prev => prev.map(item => item.id === id ? { ...item, likes: (item.likes || 0) + 1 } : item));
    localStorage.setItem(likedKey, 'true');

    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'like' }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  return (
    <div className="page-container projects-container">
      <h1>企画セクション</h1>
      <p className="page-subtitle">新規でやりたい企画を提案・共有しよう</p>

      <button onClick={() => {
        setShowForm(!showForm);
        if (editId) { setEditId(null); setTitle(''); setDescription(''); setStatus('planning'); }
      }} className="btn btn-primary" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : '新規企画を提案する'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form glass-panel">
          <div className="form-group row">
            <div className="auto-author-badge">提案者: {userName}</div>
            {editId && (
              <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
                <option value="planning">企画中 (Planning)</option>
                <option value="in-progress">進行中 (In Progress)</option>
                <option value="completed">完了 (Completed)</option>
              </select>
            )}
          </div>

          <input type="text" placeholder="企画のタイトル" value={title} onChange={e => setTitle(e.target.value)} required className="input-field" />

          <textarea placeholder="企画の詳細（目的、必要なもの、協力してほしいことなど）" value={description} onChange={e => setDescription(e.target.value)} rows={6} className="input-field" required />

          <button type="submit" disabled={isSubmitting} className="btn btn-submit">
            {isSubmitting ? '処理中...' : editId ? '変更を保存' : '企画を提案する'}
          </button>
        </form>
      )}

      <div className="timeline-feed">
        {items.length === 0 ? <p className="empty-state">まだ企画がありません。</p> : items.map(item => (
          <div key={item.id} className="timeline-card glass-panel">
            <div className="timeline-header">
              <span className={`tag tag-${item.status}`}>
                {item.status === 'planning' ? '企画中' : item.status === 'in-progress' ? '進行中' : '完了'}
              </span>
              <div style={{ marginLeft: 'auto' }}>
                <AuthorBadge author={item.author} date={item.created_at} />
              </div>
            </div>

            <h2 className="timeline-title">{item.title}</h2>
            <p className="timeline-desc">{item.description}</p>

            <div className="timeline-actions">
              <button className={`btn btn-like ${localStorage.getItem(`liked_project_${item.id}`) ? 'liked' : ''}`} onClick={() => handleLike(item.id)}>
                <span className="icon">👍</span> {item.likes || 0}
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
