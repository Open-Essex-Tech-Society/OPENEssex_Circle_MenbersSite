import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img src="/OpenEssex.png" alt="Open Essex Logo" className="brand-logo shadow-effect" />
        </div>
        <div className="hero-text-container">
          <h1 className="gradient-text">Open Essex メンバー限定サイト</h1>
          <p className="subtitle">知識共有とコミュニティの成長のためのプラットフォーム。</p>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="features-section">
        <div className="section-header" style={{ marginBottom: '3rem' }}>
          <h2>提供コンテンツ</h2>
          <p>目的に合わせて各セクションをご活用ください</p>
        </div>

        <div className="features-grid">
          <Link to="/timeline" className="feature-card glass-panel highlight-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">📰</span>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">最新情報・タイムライン</h3>
              <p className="feature-desc">最新情報の取得、おすすめYouTube動画・ニュースの共有</p>
              <span className="feature-action">今すぐ見る →</span>
            </div>
          </Link>

          <Link to="/documents" className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">📁</span>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">課題・資料ポータル</h3>
              <p className="feature-desc">課題や、公開用の資料をまとめた専用ポータル</p>
              <span className="feature-action">アクセス →</span>
            </div>
          </Link>

          <Link to="/projects" className="feature-card glass-panel highlight-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">💡</span>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">企画セクション</h3>
              <p className="feature-desc">新しい企画の提案・共有</p>
              <span className="feature-action">提案する →</span>
            </div>
          </Link>

          <Link to="/guides" className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">🧭</span>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">エキスパートガイド</h3>
              <p className="feature-desc">技術的な解説などのガイド表</p>
              <span className="feature-action">アクセス →</span>
            </div>
          </Link>

          <Link to="/books" className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">📚</span>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">おすすめ本</h3>
              <p className="feature-desc">おすすめ本を紹介・レビュー。</p>
              <span className="feature-action">アクセス →</span>
            </div>
          </Link>

          <Link to="/members" className="feature-card glass-panel highlight-card">
            <div className="feature-icon-wrapper">
              <span className="feature-icon">👥</span>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">メンバー一覧</h3>
              <p className="feature-desc">Open Essexのメンバー一覧</p>
              <span className="feature-action">見てみる →</span>
            </div>
          </Link>
        </div>
      </section>
    </>
  );
}
