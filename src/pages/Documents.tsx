import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Document {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  likes?: number;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');

  const [editId, setEditId] = useState<number | null>(null);

  const fetchDocuments = async () => {
    const res = await fetch('/api/documents');
    const data = await res.json();
    setDocuments(data as Document[]);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editId) {
        const res = await fetch(`/api/documents/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ action: 'edit', title, content }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchDocuments();
        setEditId(null);
      } else {
        const res = await fetch('/api/documents', {
          method: 'POST',
          body: JSON.stringify({ title, content, author }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchDocuments();
      }
      setTitle('');
      setContent('');
      if (!editId) setAuthor('');
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (doc: Document) => {
    setEditId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
    setAuthor(doc.author);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この投稿を削除してよろしいですか？')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    fetchDocuments();
  };

  const handleLike = async (id: number) => {
    await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'like' }),
      headers: { 'Content-Type': 'application/json' }
    });
    fetchDocuments();
  };

  return (
    <div className="page-container">
      <h1>課題・資料</h1>
      <p className="page-subtitle">課題や公開資料の共有</p>

      <button onClick={() => {
        setShowForm(!showForm);
        if (editId) { setEditId(null); setTitle(''); setContent(''); setAuthor(''); }
      }} className="btn btn-primary" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : '新規投稿'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form glass-panel">
          <div className="form-group row">
            <input type="text" placeholder="タイトル" value={title} onChange={e => setTitle(e.target.value)} required className="input-field" />
            {!editId && <input type="text" placeholder="投稿者名" value={author} onChange={e => setAuthor(e.target.value)} required className="input-field" />}
          </div>
          <textarea placeholder="内容・説明（Markdown対応）" value={content} onChange={e => setContent(e.target.value)} required rows={10} className="input-field" />
          <p style={{ fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>※Markdown記法（# 見出し, * リスト, **太字** など）が使えます</p>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? '処理中...' : editId ? '変更を保存' : '投稿する'}
          </button>
        </form>
      )}

      <div className="list-container">
        {documents.length === 0 ? <p>投稿はまだありません。</p> : documents.map(doc => (
          <div key={doc.id} className="card glass-panel">
            <h2>{doc.title}</h2>
            <p className="meta">
              {doc.author} · {new Date(doc.created_at).toLocaleDateString('ja-JP')}
            </p>
            <div className="content" style={{ padding: '1rem 0' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
            </div>

            <div className="timeline-actions">
              <button className="btn btn-like" onClick={() => handleLike(doc.id)}>
                <span className="icon">♥</span> {doc.likes || 0}
              </button>
              <div className="spacer"></div>
              <button className="btn btn-edit" onClick={() => handleEdit(doc)}>編集</button>
              <button className="btn btn-delete" onClick={() => handleDelete(doc.id)}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
