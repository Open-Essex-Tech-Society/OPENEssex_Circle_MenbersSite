import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Open Essex</Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/documents">Documents</Link></li>
        <li><Link to="/guides">Guides</Link></li>
        <li><Link to="/books">Books</Link></li>
      </ul>
    </nav>
  );
}
