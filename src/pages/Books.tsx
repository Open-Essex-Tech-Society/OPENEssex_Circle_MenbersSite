import { useState, useEffect } from 'react';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  link: string;
}

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => setBooks(data as Book[]));
  }, []);

  return (
    <div className="page-container">
      <h1>Recommended Books</h1>
      <div className="list-container">
        {books.length === 0 ? <p>No recommendations yet.</p> : books.map(book => (
          <div key={book.id} className="card">
            <h2>{book.title}</h2>
            <p className="meta">By {book.author}</p>
            <p className="content">{book.description}</p>
            {book.link && <a href={book.link} target="_blank" rel="noopener noreferrer">Buy/Read More</a>}
          </div>
        ))}
      </div>
    </div>
  );
}
