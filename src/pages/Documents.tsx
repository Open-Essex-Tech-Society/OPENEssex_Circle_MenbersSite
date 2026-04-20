import { useState, useEffect } from 'react';

interface Document {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');

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
    const res = await fetch('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title, content, author }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      setTitle('');
      setContent('');
      setAuthor('');
      setShowForm(false);
      fetchDocuments();
    }
  };

  return (
    <div className="page-container">
      <h1>課題・資料</h1>
      <button onClick={() => setShowForm(!showForm)} className="login-button" style={{ marginBottom: '2rem' }}>
        {showForm ? 'キャンセル' : '新規投稿'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form">
          <input 
            type="text" 
            placeholder="タイトル" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="投稿者名" 
            value={author} 
            onChange={e => setAuthor(e.target.value)} 
            required 
          />
          <textarea 
            placeholder="内容・説明" 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            required 
            rows={5}
          />
          <button type="submit">投稿する</button>
        </form>
      )}

      <div className="list-container">
        {documents.length === 0 ? <p>投稿はまだありません。</p> : documents.map(doc => (
          <div key={doc.id} className="card">
            <h2>{doc.title}</h2>
            <p className="meta">{doc.author} · {new Date(doc.created_at).toLocaleDateString('ja-JP')}</p>
            <div className="content" style={{ whiteSpace: 'pre-wrap' }}>{doc.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
