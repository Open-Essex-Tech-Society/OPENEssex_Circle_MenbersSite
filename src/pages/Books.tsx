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
      <button onClick={() => {
        setShowForm(!showForm);
        if (editId) { setEditId(null); setTitle(''); setAuthor(''); setDescription(''); setLink(''); }
      }} className="login-button" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : '本を推薦する'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form">
          <input type="text" placeholder="本のタイトル" value={title} onChange={e => setTitle(e.target.value)} required />
          {!editId && <input type="text" placeholder="著者" value={author} onChange={e => setAuthor(e.target.value)} required />}
          <textarea placeholder="推薦理由・説明（Markdown対応）" value={description} onChange={e => setDescription(e.target.value)} required rows={8} />
          {!editId && <input type="url" placeholder="関連リンク (URL)" value={link} onChange={e => setLink(e.target.value)} />}
          <p style={{ fontSize: '0.8rem', margin: '-0.5rem 0' }}>※Markdown記法が使えます</p>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '処理中...' : editId ? '変更を保存' : '推薦を投稿する'}
          </button>
        </form>
      )}

      <div className="list-container">
        {books.length === 0 ? <p>推薦された本はまだありません。</p> : books.map(book => (
          <div key={book.id} className="card">
            <h2>{book.title}</h2>
            <p className="meta">著者: {book.author}</p>
            <div className="content" style={{ padding: '1rem 0', marginBottom: '1rem' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{book.description}</ReactMarkdown>
            </div>
            
            {book.link && (
              <a href={book.link} target="_blank" rel="noopener noreferrer" className="link-button" style={{ display: 'inline-block', fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                詳細を見る
              </a>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem' }}>
              <button className="login-button" onClick={() => handleLike(book.id)} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', background: 'var(--brand-red)' }}>
                ♥ いいね ({book.likes || 0})
              </button>
              <div style={{ flex: 1 }}></div>
              <button className="login-button" onClick={() => handleEdit(book)} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', background: '#555' }}>編集</button>
              <button className="login-button" onClick={() => handleDelete(book.id)} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', background: '#dc3545' }}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
