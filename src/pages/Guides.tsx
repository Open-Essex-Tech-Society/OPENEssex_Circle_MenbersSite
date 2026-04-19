import { useState, useEffect } from 'react';

interface Guide {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function Guides() {
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    fetch('/api/guides')
      .then(res => res.json())
      .then(data => setGuides(data as Guide[]));
  }, []);

  return (
    <div className="page-container">
      <h1>Guides</h1>
      <div className="list-container">
        {guides.length === 0 ? <p>No guides yet.</p> : guides.map(guide => (
          <div key={guide.id} className="card">
            <h2>{guide.title}</h2>
            <p className="meta">Posted on {new Date(guide.created_at).toLocaleDateString()}</p>
            <p className="content">{guide.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
