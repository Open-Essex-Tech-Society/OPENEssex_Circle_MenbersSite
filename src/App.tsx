import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Documents from './pages/Documents';
import Guides from './pages/Guides';
import Books from './pages/Books';
import './App.css';

function App() {
  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/books" element={<Books />} />
        </Routes>
      </main>
      <div className="ticks"></div>
      <section id="spacer"></section>
    </Router>
  );
}

export default App;
