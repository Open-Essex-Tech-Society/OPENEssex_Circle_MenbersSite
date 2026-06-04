import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="fat-footer">
      <div className="fat-footer-inner">
        <div className="footer-column">
          <h3>Links</h3>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/timeline">最新情報・タイムライン</Link>
            </li>
            <li>
              <Link to="/documents">課題・資料ポータル</Link>
            </li>
            <li>
              <Link to="/projects">企画セクション</Link>
            </li>
            <li>
              <Link to="/guides">エキスパートガイド</Link>
            </li>
            <li>
              <Link to="/books">おすすめ本</Link>
            </li>
            <li>
              <Link to="/members">メンバー一覧</Link>
            </li>
            <li>
              <Link to="/mypage">マイページ</Link>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Development</h3>
          <ul>
            <li>
              <a
                href="https://github.com/Open-Essex-Tech-Society/OPENEssex_Circle_MenbersSite"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Repository
              </a>
            </li>
            <li>
              <a href="#">Bug Tracker</a>
            </li>
            <li>
              <a href="#">System Status</a>
            </li>
            <li>
              <a href="#">Open Essex Docs</a>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Community & Policies</h3>
          <ul>
            <li>
              <a href="https://discord.gg/scKC5rqM">Discord Server</a>
            </li>
            <li>
              <a href="#">Support Forum</a>
            </li>
            <li>
              <a href="#">Privacy Policy</a>
            </li>
            <li>
              <a href="#">Cookie Policy</a>
            </li>
          </ul>
        </div>
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: "3rem",
          paddingTop: "1rem",
          borderTop: "1px solid #333",
          color: "#666",
          fontSize: "0.9rem",
        }}
      >
        © {new Date().getFullYear()} Open Essex. All rights reserved.
      </div>
    </footer>
  );
}
