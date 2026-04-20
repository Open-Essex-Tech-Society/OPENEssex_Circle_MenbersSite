import { useState, useEffect } from 'react';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  link: string;
  created_at: string;
}

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

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
    const res = await fetch('/api/books', {
      method: 'POST',
      body: JSON.stringify({ title, author, description, link }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      setTitle('');
      setAuthor('');
      setDescription('');
      setLink('');
      setShowForm(false);
      fetchBooks();
    }
  };

  return (
    <div className="page-container">
      <h1>おすすめ本</h1>
      <button onClick={() => setShowForm(!showForm)} className="login-button" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : '本を推薦する'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form">
          <input 
            type="text" 
            placeholder="本のタイトル" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="著者" 
            value={author} 
            onChange={e => setAuthor(e.target.value)} 
            required 
          />
          <textarea 
            placeholder="推薦理由・説明" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            required 
            rows={5}
          />
          <input 
            type="url" 
            placeholder="関連リンク (URL)" 
            value={link} 
            onChange={e => setLink(e.target.value)} 
          />
          <button type="submit">推薦を投稿する</button>
        </form>
      )}

      <div className="list-container">
        {books.length === 0 ? <p>推薦された本はまだありません。</p> : books.map(book => (
          <div key={book.id} className="card">
            <h2>{book.title}</h2>
            <p className="meta">著者: {book.author}</p>
            <div className="content" style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{book.description}</div>
            {book.link && (
              <a href={book.link} target="_blank" rel="noopener noreferrer" className="link-button" style={{ display: 'inline-block', fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                詳細を見る
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
