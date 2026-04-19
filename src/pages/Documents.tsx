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

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => setDocuments(data as Document[]));
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
      // Refresh list
      const updatedRes = await fetch('/api/documents');
      const updatedData = await updatedRes.json();
      setDocuments(updatedData as Document[]);
    }
  };

  return (
    <div className="page-container">
      <h1>Documents</h1>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Cancel' : 'Post Document'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="post-form">
          <input 
            type="text" 
            placeholder="Title" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
          <input 
            type="text" 
            placeholder="Author" 
            value={author} 
            onChange={e => setAuthor(e.target.value)} 
            required 
          />
          <textarea 
            placeholder="Content" 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            required 
          />
          <button type="submit">Submit</button>
        </form>
      )}

      <div className="list-container">
        {documents.map(doc => (
          <div key={doc.id} className="card">
            <h2>{doc.title}</h2>
            <p className="meta">By {doc.author} on {new Date(doc.created_at).toLocaleDateString()}</p>
            <p className="content">{doc.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
