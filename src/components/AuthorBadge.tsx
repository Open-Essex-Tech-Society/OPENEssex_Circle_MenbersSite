import { useState, useEffect } from 'react';

// Shared global cache to minimize D1 reads across components
let globalProfiles: { [name: string]: string } | null = null;
let fetchingPromise: Promise<void> | null = null;

export default function AuthorBadge({ author, date }: { author: string, date?: string }) {
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!author) return;
    
    if (globalProfiles) {
      setAvatar(globalProfiles[author] || null);
      return;
    }

    if (!fetchingPromise) {
      fetchingPromise = fetch('/api/profiles')
        .then(res => res.json())
        .then((data: any[]) => {
          const map: { [name: string]: string } = {};
          data.forEach(p => {
             if (p.display_name && p.avatar_url) map[p.display_name] = p.avatar_url;
          });
          globalProfiles = map;
        })
        .catch(err => console.error("Failed to fetch profiles for badges:", err));
    }

    fetchingPromise.then(() => {
      if (globalProfiles) setAvatar(globalProfiles[author] || null);
    });
  }, [author]);

  return (
    <div className="author-badge-container">
      {avatar ? (
        <img src={avatar} alt={author} className="author-badge-img" />
      ) : (
        <div className="author-badge-placeholder">
          {(author || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <div className="author-badge-info">
        <span className="author-badge-name">{author}</span>
        {date && <span className="author-badge-date">{new Date(date).toLocaleDateString('ja-JP')}</span>}
      </div>
    </div>
  );
}
