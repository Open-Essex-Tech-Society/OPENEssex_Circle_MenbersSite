import React from 'react';

interface Props {
  isScanning: boolean;
}

const CyberScannerOverlay: React.FC<Props> = ({ isScanning }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-lg border-2 border-cyan-500/30">
      {/* Corner crosshairs */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400"></div>

      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      {/* Animated Scanning Line */}
      {isScanning && (
        <div className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_3px_rgba(34,211,238,0.7)] animate-scan-line"></div>
      )}

      {/* Targeting UI elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border border-cyan-500/40 border-dashed rounded-[30%] animate-pulse"></div>
      
      {/* HUD Text */}
      <div className="absolute top-4 left-4 text-cyan-400 text-xs font-mono tracking-widest opacity-70">
        SYS.FACE_AUTH_V1.0
      </div>
      <div className="absolute bottom-4 right-4 text-cyan-400 text-xs font-mono tracking-widest opacity-70">
        {isScanning ? 'SCANNING_IN_PROGRESS...' : 'AWAITING_INPUT...'}
      </div>
    </div>
  );
};

export default CyberScannerOverlay;
