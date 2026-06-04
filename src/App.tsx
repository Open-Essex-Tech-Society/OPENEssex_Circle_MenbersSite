import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Documents from './pages/Documents';
import Guides from './pages/Guides';
import Books from './pages/Books';
import Timeline from './pages/Timeline';
import Projects from './pages/Projects';
import Login from './pages/Login';
import Members from './pages/Members';
import Profile from './pages/Profile';
import MyPage from './pages/MyPage';
import FaceScanner from './pages/FaceScanner';
import Calendar from './pages/Calendar';
import './App.css';

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error("Rendering error:", error);
    return <div>表示エラーが発生しました。</div>;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  // If Firebase is not configured (dev/local mode), bypass auth and show the page
  const isAuthDisabled = !auth;
  if (isAuthDisabled) return <>{children}</>;
  if (isLoading) return <div className="page-container"><p>認証状態を確認中...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/face-auth" element={<ProtectedRoute><FaceScanner /></ProtectedRoute>} />
      <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
      <Route path="/profile/:uid" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/guides" element={<ProtectedRoute><Guides /></ProtectedRoute>} />
      <Route path="/books" element={<ProtectedRoute><Books /></ProtectedRoute>} />
      <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
    </Routes>
  );
}

function AppContent() {
  return (
    <Router>
      <Navbar />
      <main>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </main>
      <Footer />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
