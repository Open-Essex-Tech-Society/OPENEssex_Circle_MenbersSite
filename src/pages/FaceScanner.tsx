import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import CyberScannerOverlay from '../components/CyberScannerOverlay';
import toast, { Toaster } from 'react-hot-toast';
import { ScanFace, UserPlus, LogIn, ChevronRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:8000'; // Make sure the FastAPI backend is running here

const FaceScanner: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const { user } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [isScanning, setIsScanning] = useState(false);
  const [username, setUsername] = useState(user?.uid || '');
  const navigate = useNavigate();

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    return imageSrc;
  }, [webcamRef]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      toast.error('Please enter a User ID');
      return;
    }
    
    const imageBase64 = capture();
    if (!imageBase64) {
      toast.error('Failed to access webcam. Please ensure permissions are granted.');
      return;
    }

    setIsScanning(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name: username, image_base64: imageBase64 })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Registration successful!');
        setMode('login');
      } else {
        toast.error(data.detail || 'Registration failed');
      }
    } catch (error) {
      toast.error('Failed to connect to the Face Auth Service');
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogin = async () => {
    const imageBase64 = capture();
    if (!imageBase64) {
      toast.error('Failed to access webcam. Please ensure permissions are granted.');
      return;
    }

    setIsScanning(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64 })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Welcome back, ${data.user.name}! (Confidence: ${data.confidence}%)`, {
          icon: '🔓',
          duration: 4000,
        });
        // Normally, you would save the token or user state here
        setTimeout(() => navigate('/'), 2000); 
      } else {
        toast.error(data.detail || 'Face not recognized');
      }
    } catch (error) {
      toast.error('Failed to connect to the Face Auth Service');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center py-12 px-4 relative overflow-hidden font-sans">
      <Toaster 
        toastOptions={{
          className: 'bg-slate-900 text-cyan-400 border border-cyan-500/30 font-mono shadow-[0_0_15px_rgba(34,211,238,0.2)]',
          success: { iconTheme: { primary: '#22d3ee', secondary: '#0f172a' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#0f172a' } }
        }} 
      />
      
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.8),rgba(15,23,42,0.8)),linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:100%_100%,40px_40px,40px_40px] pointer-events-none"></div>
      
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Left Side: Scanner UI */}
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6">
            <ScanFace className="w-8 h-8 text-cyan-400 animate-pulse" />
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
              Secure_Access
            </h1>
          </div>

          <div className="relative w-full max-w-md aspect-[4/3] bg-slate-900 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.15)] p-2 backdrop-blur-sm border border-slate-800">
            <div className="relative w-full h-full overflow-hidden rounded-lg bg-black">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                className="w-full h-full object-cover"
              />
              <CyberScannerOverlay isScanning={isScanning} />
            </div>
            
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
            <div className="absolute -top-4 -left-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
          </div>

          <div className="mt-6 text-sm text-slate-400 flex items-start gap-2 bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 backdrop-blur-md max-w-md">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p>Ensure your face is clearly visible, well-lit, and centered in the frame for accurate authentication.</p>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="w-full md:w-80 flex flex-col justify-center">
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden group">
            
            {/* Tab Navigation */}
            <div className="flex mb-8 border-b border-slate-800 relative">
              <button 
                onClick={() => setMode('login')}
                className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${mode === 'login' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Face Login
              </button>
              <button 
                onClick={() => setMode('register')}
                className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${mode === 'register' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Register
              </button>
              {/* Active Tab Indicator */}
              <div 
                className={`absolute bottom-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-300 ease-out`}
                style={{ width: '50%', left: mode === 'login' ? '0%' : '50%' }}
              ></div>
            </div>

            {mode === 'login' ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-slate-400">Position your face in the scanner and click authenticate to access your account.</p>
                <button
                  onClick={handleLogin}
                  disabled={isScanning}
                  className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold tracking-wide uppercase shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                >
                  <LogIn className="w-5 h-5" />
                  {isScanning ? 'Verifying...' : 'Authenticate'}
                  <ChevronRight className="w-4 h-4 opacity-0 -ml-4 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="block text-xs font-mono text-cyan-400 mb-1.5 uppercase tracking-wider">User ID</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                    placeholder="Enter existing User ID"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">Enter your existing User ID to link your Face ID.</p>
                </div>
                <button
                  type="submit"
                  disabled={isScanning}
                  className="w-full py-4 px-6 mt-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 hover:border-cyan-500 rounded-lg font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-5 h-5" />
                  {isScanning ? 'Extracting ID...' : 'Register Face ID'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceScanner;
