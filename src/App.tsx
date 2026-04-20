import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Documents from './pages/Documents';
import Guides from './pages/Guides';
import Books from './pages/Books';
import './App.css';

function ProtectedRoute({ children, isLoggedIn }: { children: React.ReactNode, isLoggedIn: boolean }) {
  if (!isLoggedIn) {
    return (
      <div className="page-container" style={{ textAlign: 'center' }}>
        <h2>メンバー限定コンテンツ</h2>
        <p>このセクションにアクセスするにはログインが必要です。</p>
      </div>
    );
  }
  return <>{children}</>;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Router>
      <Navbar isLoggedIn={isLoggedIn} onLoginToggle={() => setIsLoggedIn(!isLoggedIn)} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/documents" 
            element={<ProtectedRoute isLoggedIn={isLoggedIn}><Documents /></ProtectedRoute>} 
          />
          <Route 
            path="/guides" 
            element={<ProtectedRoute isLoggedIn={isLoggedIn}><Guides /></ProtectedRoute>} 
          />
          <Route 
            path="/books" 
            element={<ProtectedRoute isLoggedIn={isLoggedIn}><Books /></ProtectedRoute>} 
          />
        </Routes>
      </main>
      <div className="ticks"></div>
      <section id="spacer"></section>
    </Router>
  );
}

export default App;
