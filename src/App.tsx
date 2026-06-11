import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CallProvider, useCall } from './contexts/CallContext';
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
import Meeting from './pages/Meeting';
import Call from './pages/Call';
import IncomingCallOverlay from './components/IncomingCallOverlay';
import { PhoneOff } from 'lucide-react';
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
      <Route path="/meeting" element={<ProtectedRoute><Meeting /></ProtectedRoute>} />
      <Route path="/call" element={<ProtectedRoute><Call /></ProtectedRoute>} />
    </Routes>
  );
}

function AppContent() {
  const { ringingCallId, ringingTargetName, cancelCall } = useCall();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <IncomingCallOverlay />
      
      {/* Global Ringing Overlay for Caller */}
      {ringingCallId && (
        <div className="call-overlay">
          <div className="call-card glass-panel animate-in fade-in zoom-in">
            <div className="call-avatar-container">
              <div className="call-avatar-placeholder">
                {ringingTargetName.charAt(0).toUpperCase()}
              </div>
              <div className="ringing-animation outgoing"></div>
            </div>
            
            <h2 className="call-title">呼び出し中</h2>
            <p className="caller-name">{ringingTargetName}</p>
            
            <div className="call-actions">
              <button className="call-btn-circle decline" onClick={cancelCall} title="キャンセル">
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={{ flex: 1 }}>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CallProvider>
          <AppContent />
        </CallProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
