import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  link: string;
  created_at: string;
  likes?: number;
}

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  const fetchBooks = async () => {
    const res = await fetch('/api/books');
    const data = await res.json();
    setBooks(data as Book[]);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editId) {
        const res = await fetch(`/api/books/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ action: 'edit', title, description }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchBooks();
        setEditId(null);
      } else {
        const res = await fetch('/api/books', {
          method: 'POST',
          body: JSON.stringify({ title, author, description, link }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchBooks();
      }
      setTitle('');
      setAuthor('');
      setDescription('');
      setLink('');
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (book: Book) => {
    setEditId(book.id);
    setTitle(book.title);
    setAuthor(book.author); // Author/Link 編集不可仕様とするか、今回はシンプルに全てセット
    setDescription(book.description);
    setLink(book.link);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このおすすめ本を削除してよろしいですか？')) return;
    await fetch(`/api/books/${id}`, { method: 'DELETE' });
    fetchBooks();
  };

  const handleLike = async (id: number) => {
    await fetch(`/api/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'like' }),
      headers: { 'Content-Type': 'application/json' }
    });
    fetchBooks();
  };

  return (
    <div className="page-container">
      <h1>おすすめ本</h1>
      <p className="page-subtitle">おすすめの本</p>

      <button onClick={() => {
        setShowForm(!showForm);
        if (editId) { setEditId(null); setTitle(''); setAuthor(''); setDescription(''); setLink(''); }
      }} className="btn btn-primary" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : '本を推薦する'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form glass-panel">
          <input type="text" placeholder="本のタイトル" value={title} onChange={e => setTitle(e.target.value)} required className="input-field" />
          {!editId && <input type="text" placeholder="著者" value={author} onChange={e => setAuthor(e.target.value)} required className="input-field" />}
          <textarea placeholder="推薦理由・説明（Markdown対応）" value={description} onChange={e => setDescription(e.target.value)} required rows={8} className="input-field" />
          {!editId && <input type="url" placeholder="関連リンク (URL)" value={link} onChange={e => setLink(e.target.value)} className="input-field" />}
          <p style={{ fontSize: '0.8rem', margin: '-0.5rem 0 1rem', color: 'var(--text-muted)' }}>※Markdown記法が使えます</p>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? '処理中...' : editId ? '変更を保存' : '推薦を投稿する'}
          </button>
        </form>
      )}

      <div className="list-container">
        {books.length === 0 ? <p>推薦された本はまだありません。</p> : books.map(book => (
          <div key={book.id} className="card glass-panel">
            <h2>{book.title}</h2>
            <p className="meta">著者: {book.author}</p>
            <div className="content" style={{ padding: '1rem 0', marginBottom: '1rem' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{book.description}</ReactMarkdown>
            </div>

            {book.link && (
              <a href={book.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', fontSize: '0.9rem', padding: '0.6rem 1.2rem', marginBottom: '1rem' }}>
                詳細を見る 🔗
              </a>
            )}

            <div className="timeline-actions">
              <button className="btn btn-like" onClick={() => handleLike(book.id)}>
                <span className="icon">♥</span> {book.likes || 0}
              </button>
              <div className="spacer"></div>
              <button className="btn btn-edit" onClick={() => handleEdit(book)}>編集</button>
              <button className="btn btn-delete" onClick={() => handleDelete(book.id)}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
