import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img src="/OpenEssex.png" alt="Open Essex Logo" className="brand-logo" />
        </div>
        <div>
          <h1>Open Essex へようこそ</h1>
          <p>ナレッジ共有とコミュニティの成長のための限定プラットフォーム。</p>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <h2>メンバー限定セクション</h2>
          <p>限定コンテンツを探索しましょう</p>
          <ul className="member-nav-links">
            <li><Link to="/documents" className="link-button">課題・資料ポータル</Link></li>
            <li><Link to="/guides" className="link-button">エキスパートガイド</Link></li>
            <li><Link to="/books" className="link-button">おすすめ本</Link></li>
          </ul>
        </div>
      </section>
    </>
  );
}
