import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { 
  Download, 
  Upload, 
  Smartphone, 
  Sparkles, 
  Eye, 
  RefreshCw, 
  Check, 
  Copy, 
  ExternalLink,
  Layers,
  Calendar,
  X,
  Sliders,
  CheckCircle2,
  Terminal,
  Zap
} from 'lucide-react';

interface WallpaperStudioProps {
  onLaunchAmbient: (customBg: string | null) => void;
}

const PRESET_THEMES = [
  { id: 'oled_black', name: 'OLED Pure Black', bg: 'linear-gradient(180deg, #000000 0%, #08080C 50%, #000000 100%)' },
  { id: 'obsidian', name: 'Deep Obsidian', bg: 'linear-gradient(135deg, #05050A 0%, #0F121C 100%)' },
  { id: 'aurora', name: 'Android Forest', bg: 'linear-gradient(180deg, #01140E 0%, #022C22 50%, #000806 100%)' },
  { id: 'cyberpunk', name: 'Cyber Neon', bg: 'linear-gradient(180deg, #1A0724 0%, #0B0410 50%, #000000 100%)' },
];

export const WallpaperStudio: React.FC<WallpaperStudioProps> = ({ onLaunchAmbient }) => {
  const { tasks, roomId } = useWorkspace();

  // Android phone aspect ratios
  const [format, setFormat] = useState<'tall' | 'standard'>('tall'); // tall = 20:9 (1080x2400), standard = 19.5:9 (1080x2340)
  const [selectedPreset, setSelectedPreset] = useState<string>('oled_black');
  const [uploadedImage, setUploadedImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onedot_wallpaper_image');
    }
    return null;
  });
  const [dimOpacity, setDimOpacity] = useState<number>(50);
  const [blurAmount, setBlurAmount] = useState<number>(0);
  const [showYearProgress, setShowYearProgress] = useState<boolean>(true);
  const [showTasks, setShowTasks] = useState<boolean>(true);
  const [customGoal, setCustomGoal] = useState<string>('Focus deeply. Execute with precision.');
  
  const [showAutomationModal, setShowAutomationModal] = useState<boolean>(false);
  const [automationTab, setAutomationTab] = useState<'tasker' | 'macrodroid' | 'muzei'>('tasker');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Time and progress computations
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const isLeap = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || (now.getFullYear() % 400 === 0);
  const totalDays = isLeap ? 366 : 365;
  const yearPct = ((dayOfYear / totalDays) * 100).toFixed(1);

  const activeTasks = tasks.filter(t => t.status !== 'done').slice(0, 4);
  const recentCompletedTasks = tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 3);

  // Handle image upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedImage(result);
        localStorage.setItem('onedot_wallpaper_image', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearUploadedImage = () => {
    setUploadedImage(null);
    localStorage.removeItem('onedot_wallpaper_image');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate live dynamic SVG URL for Android automation
  const liveUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/wallpaper.svg?room=${roomId}&format=${format}&theme=${selectedPreset}`
    : '';

  const handleCopyLiveUrl = () => {
    navigator.clipboard.writeText(liveUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    });
  };

  // High-Resolution Android Canvas PNG Export (1080x2400 for 20:9 or 1080x2340 for 19.5:9)
  const handleDownloadPng = async () => {
    setIsExporting(true);

    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = format === 'tall' ? 2400 : 2340;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Background
    if (uploadedImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = uploadedImage;
      });

      // Cover scaling
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let drawW = width;
      let drawH = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        drawW = height * imgRatio;
        offsetX = (width - drawW) / 2;
      } else {
        drawH = width / imgRatio;
        offsetY = (height - drawH) / 2;
      }

      ctx.filter = `blur(${blurAmount * 2}px)`;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      ctx.filter = 'none';

      // OLED Scrim
      ctx.fillStyle = `rgba(0, 0, 0, ${dimOpacity / 100})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Draw selected OLED preset gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      if (selectedPreset === 'aurora') {
        grad.addColorStop(0, '#01140E');
        grad.addColorStop(0.5, '#022C22');
        grad.addColorStop(1, '#000806');
      } else if (selectedPreset === 'cyberpunk') {
        grad.addColorStop(0, '#1A0724');
        grad.addColorStop(0.5, '#0B0410');
        grad.addColorStop(1, '#000000');
      } else if (selectedPreset === 'obsidian') {
        grad.addColorStop(0, '#05050A');
        grad.addColorStop(0.5, '#0F121C');
        grad.addColorStop(1, '#020204');
      } else {
        // Pure black OLED
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.5, '#08080C');
        grad.addColorStop(1, '#000000');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Punch-hole camera safe zone clearance: start header below 280px
    const headerX = 90;
    const headerY = 380;

    // Time & Date
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Android Status Bar Mockup
    ctx.font = '600 24px monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText('5G · 100% · WI-FI', width - 260, 100);

    // Large Android Lock Screen Clock
    ctx.font = '800 170px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(timeStr, headerX, headerY);

    // Date
    ctx.font = '600 42px sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(dateStr, headerX, headerY + 70);

    // Goal / Intention
    if (customGoal) {
      ctx.font = '500 32px sans-serif';
      ctx.fillStyle = '#F97316'; // Orange beacon accent
      ctx.fillText(`“${customGoal}”`, headerX, headerY + 130);
    }

    // 3. Year Matrix with Red, Orange, and Blue dots
    if (showYearProgress) {
      const yearX = headerX;
      const yearY = headerY + 220;

      ctx.font = '700 26px monospace';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(`ONEDOT YEAR MATRIX (${yearPct}% · DAY ${dayOfYear}/${totalDays})`, yearX, yearY);

      const dotCols = 24;
      const dotSpacing = 38;
      const dotStartY = yearY + 40;
      const maxDots = 240;

      for (let i = 0; i < maxDots; i++) {
        const col = i % dotCols;
        const row = Math.floor(i / dotCols);
        const cx = yearX + col * dotSpacing;
        const cy = dotStartY + row * dotSpacing;

        ctx.beginPath();
        if (i === dayOfYear) {
          // Today: Vibrant Orange beacon
          ctx.arc(cx, cy, 9, 0, Math.PI * 2);
          ctx.fillStyle = '#F97316';
          ctx.fill();
        } else if (i < dayOfYear) {
          // Past days: subtle slate/blue dot
          ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = i % 5 === 0 ? '#3B82F6' : '#64748B';
          ctx.fill();
        } else {
          // Future: ring
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.strokeStyle = '#272733';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // 4. Android Tasks List (Red, Orange, Blue dots + Green light completed)
    if (showTasks) {
      const tasksX = headerX;
      let currentDrawY = headerY + 680;

      ctx.font = '700 28px sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(`TODAY'S ANDROID FOCUS (${activeTasks.length} OPEN)`, tasksX, currentDrawY);

      activeTasks.forEach((t, idx) => {
        const cardY = currentDrawY + 36 + idx * 135;
        const cardW = width - 180;
        const cardH = 110;

        // OLED dark card
        ctx.fillStyle = 'rgba(14, 14, 18, 0.85)';
        ctx.strokeStyle = '#1F1F28';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(tasksX, cardY, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();

        // Dot: Red (urgent/hard), Orange (high/medium), Blue (normal/easy)
        let dotColor = '#3B82F6';
        let glowColor = 'rgba(59, 130, 246, 0.4)';
        if (t.difficulty === 'hard' || t.priority === 'urgent') {
          dotColor = '#EF4444';
          glowColor = 'rgba(239, 68, 68, 0.8)';
        } else if (t.difficulty === 'medium' || t.priority === 'high') {
          dotColor = '#F97316';
          glowColor = 'rgba(249, 115, 22, 0.8)';
        }

        // Draw dot with subtle breathing glow
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(tasksX + 44, cardY + cardH / 2, 10, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.restore();

        // Title
        ctx.font = '600 32px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        const displayTitle = t.title.length > 34 ? t.title.slice(0, 34) + '...' : t.title;
        ctx.fillText(displayTitle, tasksX + 80, cardY + cardH / 2 + 10);
      });

      currentDrawY += 40 + activeTasks.length * 135;

      // Render Completed Tasks in GREEN LIGHT
      if (recentCompletedTasks.length > 0) {
        ctx.font = '700 24px sans-serif';
        ctx.fillStyle = '#10B981';
        ctx.fillText(`RECENT COMPLETED (${recentCompletedTasks.length} SHOWN · GREEN LIGHT)`, tasksX, currentDrawY + 20);

        recentCompletedTasks.forEach((cTask, cIdx) => {
          const cCardY = currentDrawY + 44 + cIdx * 105;
          const cCardW = width - 180;
          const cCardH = 88;

          // Dimmed OLED card
          ctx.fillStyle = 'rgba(9, 9, 13, 0.8)';
          ctx.strokeStyle = '#161622';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(tasksX, cCardY, cCardW, cCardH, 16);
          ctx.fill();
          ctx.stroke();

          // Glowing Green Light Dot (#10B981)
          ctx.save();
          ctx.shadowColor = 'rgba(16, 185, 129, 0.9)';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(tasksX + 40, cCardY + cCardH / 2, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#10B981';
          ctx.fill();

          // Checkmark glyph inside
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✓', tasksX + 40, cCardY + cCardH / 2 + 4.5);
          ctx.restore();

          // Dimmed line-through title
          ctx.textAlign = 'left';
          ctx.font = '500 26px sans-serif';
          ctx.fillStyle = '#64748B';
          const cTitle = cTask.title.length > 32 ? cTask.title.slice(0, 32) + '...' : cTask.title;
          ctx.fillText(cTitle, tasksX + 75, cCardY + cCardH / 2 + 8);

          // Draw strike-through line
          const textMetrics = ctx.measureText(cTitle);
          ctx.strokeStyle = '#64748B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tasksX + 75, cCardY + cCardH / 2);
          ctx.lineTo(tasksX + 75 + textMetrics.width, cCardY + cCardH / 2);
          ctx.stroke();

          // "DONE" tag
          ctx.font = '600 20px monospace';
          ctx.fillStyle = '#10B981';
          ctx.textAlign = 'right';
          ctx.fillText('DONE ✓', tasksX + cCardW - 24, cCardY + cCardH / 2 + 6);
          ctx.textAlign = 'left';
        });
      }
    }

    // 5. Android Gesture Bar Safe Zone at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.roundRect((width - 320) / 2, height - 40, 320, 10, 5);
    ctx.fill();

    // Trigger Download
    const link = document.createElement('a');
    link.download = `OneDot-Android-${format === 'tall' ? '20x9' : '19.5x9'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#1F1F28]">
        <div>
          <h2 className="text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
            <span>Android Everyday Wallpaper Studio</span>
            <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 py-0.5 px-2 rounded-full">
              Live Auto-Update (Tasker / MacroDroid)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate OLED pure-black lock screens tailored for Android devices. Updates instantly in real-time with your live Red, Orange, and Blue focus dots.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live Ambient Mode Opener */}
          <button
            onClick={() => onLaunchAmbient(uploadedImage)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-[#16161E] hover:bg-[#1F1F28] border border-[#272733] rounded-lg transition-colors whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>Launch Ambient Display</span>
          </button>

          {/* Setup OS Automation Modal */}
          <button
            onClick={() => setShowAutomationModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-orange-400 bg-orange-950/40 hover:bg-orange-900/40 border border-orange-800/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
            <span>Android Auto-Sync Setup</span>
          </button>

          {/* 1-Click PNG Download */}
          <button
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-xs transition-all whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Rendering...' : 'Download Android PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Layout: Controls on left, Live Android Mockup on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customization Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6 bg-[#0E0E12] p-6 rounded-2xl border border-[#1F1F28] shadow-xs">
          {/* Android Aspect Ratio Format Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Android Screen Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('tall')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  format === 'tall'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-[#1F1F28] bg-[#16161E] text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Modern 20:9 (1080×2400)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('standard')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  format === 'standard'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-[#1F1F28] bg-[#16161E] text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Classic 19.5:9 (1080×2340)</span>
              </button>
            </div>
          </div>

          {/* Dot Color Hierarchy Visual Guide */}
          <div className="p-3 bg-[#16161E] rounded-xl border border-[#272733] space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Active Dot Hierarchy
            </span>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="text-slate-300">Hard / Urgent</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                <span className="text-slate-300">Medium / Day Dot</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                <span className="text-slate-300">Easy / Normal</span>
              </span>
            </div>
          </div>

          {/* Everyday Wallpaper Image Source */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Everyday OLED Background
              </label>
              {uploadedImage && (
                <button
                  onClick={clearUploadedImage}
                  className="text-[11px] text-rose-400 hover:underline font-medium"
                >
                  Remove custom photo
                </button>
              )}
            </div>

            {/* Custom Photo Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                uploadedImage
                  ? 'border-orange-500/60 bg-orange-500/5'
                  : 'border-[#272733] hover:border-[#38384A] bg-[#16161E]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-200">
                {uploadedImage ? 'Custom image loaded (click to change)' : 'Upload everyday custom image'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supports JPG, PNG, WebP · Automatically adjusted for OLED power savings
              </p>
            </div>

            {/* Curated Aesthetic Themes (if not using custom photo) */}
            {!uploadedImage && (
              <div className="mt-3">
                <p className="text-[11px] font-medium text-slate-400 mb-1.5">
                  Or select pure OLED theme:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedPreset(theme.id)}
                      className={`p-2 rounded-lg text-left text-xs font-semibold flex items-center gap-2 border transition-all ${
                        selectedPreset === theme.id
                          ? 'border-orange-500 ring-1 ring-orange-500/40 text-white bg-[#1A1A24]'
                          : 'border-[#1F1F28] text-slate-400 hover:text-slate-200 bg-[#16161E]'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-slate-700"
                        style={{ background: theme.bg }}
                      />
                      <span className="truncate">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Visual Sliders: Dim Scrim & Blur */}
          <div className="space-y-4 pt-4 border-t border-[#1F1F28]">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>OLED Dim Scrim:</span>
                <span className="font-mono text-slate-400">{dimOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={dimOpacity}
                onChange={(e) => setDimOpacity(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#1F1F28] rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Background Blur:</span>
                <span className="font-mono text-slate-400">{blurAmount}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={blurAmount}
                onChange={(e) => setBlurAmount(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#1F1F28] rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-4 border-t border-[#1F1F28]">
            <label className="flex items-center justify-between p-2 rounded-lg bg-[#16161E] border border-[#272733] cursor-pointer">
              <span className="text-xs font-medium text-slate-300">Show OneDot Year Matrix</span>
              <input
                type="checkbox"
                checked={showYearProgress}
                onChange={(e) => setShowYearProgress(e.target.checked)}
                className="rounded accent-orange-500"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg bg-[#16161E] border border-[#272733] cursor-pointer">
              <span className="text-xs font-medium text-slate-300">Show Today's Focus Tasks</span>
              <input
                type="checkbox"
                checked={showTasks}
                onChange={(e) => setShowTasks(e.target.checked)}
                className="rounded accent-orange-500"
              />
            </label>
          </div>

          {/* Daily Intention / Quote Input */}
          <div className="pt-4 border-t border-[#1F1F28]">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Daily Intention / Focus Mantra
            </label>
            <input
              type="text"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="e.g. Focus deeply, execute cleanly."
              className="w-full text-xs px-3 py-2 bg-[#16161E] border border-[#272733] rounded-lg focus:outline-none focus:border-orange-500 text-slate-200"
            />
          </div>
        </div>

        {/* Right Column: Live Android Device Mockup (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="text-xs font-mono text-slate-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Android Live Preview ({format === 'tall' ? '20:9 · 1080×2400' : '19.5:9 · 1080×2340'})</span>
          </div>

          {/* Android Flagship Device Frame (Pure Black OLED with centered punch-hole camera) */}
          <div className="relative w-[340px] h-[720px] rounded-[44px] bg-black p-3 shadow-2xl border-4 border-[#1F1F28] flex flex-col overflow-hidden">
            {/* Centered Android Punch-hole Camera */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full border border-[#272733] z-30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#090D16] rounded-full" />
            </div>

            {/* Android Status Bar */}
            <div className="relative z-20 flex items-center justify-between px-4 pt-1 pb-1 text-[10px] font-mono text-slate-400 select-none">
              <span>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              <div className="flex items-center gap-2">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Wallpaper Screen Surface */}
            <div
              className="relative flex-1 rounded-[34px] overflow-hidden p-5 text-white flex flex-col justify-between select-none"
              style={{
                backgroundImage: uploadedImage
                  ? `linear-gradient(rgba(0, 0, 0, ${dimOpacity / 100}), rgba(0, 0, 0, ${dimOpacity / 100})), url(${uploadedImage})`
                  : PRESET_THEMES.find(p => p.id === selectedPreset)?.bg,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: `blur(${blurAmount > 0 ? `${blurAmount / 4}px` : '0px'})`
              }}
            >
              {/* Android Lock Screen Header */}
              <div className="pt-6 text-center space-y-1">
                <p className="text-[11px] font-medium text-slate-400">
                  {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-5xl font-mono font-extrabold tracking-tight text-white">
                  {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
                {customGoal && (
                  <p className="text-[11px] text-orange-400 italic pt-1">
                    “{customGoal}”
                  </p>
                )}
              </div>

              {/* Progress Dots Module (Red, Orange, Blue) */}
              {showYearProgress && (
                <div className="bg-[#0E0E12]/80 backdrop-blur-md p-3 rounded-xl border border-[#1F1F28] my-auto">
                  <div className="text-[10px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
                      <span>OneDot Year Progress</span>
                    </span>
                    <span className="text-orange-400">{yearPct}%</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {Array.from({ length: 60 }).map((_, i) => {
                      const isToday = i === Math.floor(parseFloat(yearPct) * 0.6);
                      const isPast = i < Math.floor(parseFloat(yearPct) * 0.6);
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isToday
                              ? 'bg-[#F97316] ring-1 ring-orange-400 scale-125'
                              : isPast
                              ? (i % 4 === 0 ? 'bg-[#3B82F6]' : 'bg-slate-300')
                              : 'border border-[#272733]'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tasks Section (Active + Green Light Completed) */}
              {showTasks && (
                <div className="space-y-2 pb-5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">Today's Focus Tasks</span>
                      <span className="text-slate-500 font-normal">{activeTasks.length} active</span>
                    </p>
                    {activeTasks.slice(0, 3).map((t) => {
                      const isUrgent = t.difficulty === 'hard' || t.priority === 'urgent';
                      const isHigh = t.difficulty === 'medium' || t.priority === 'high';

                      let dotClass = 'bg-[#3B82F6]';
                      if (isUrgent) {
                        dotClass = 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.85)] animate-pulse';
                      } else if (isHigh) {
                        dotClass = 'bg-[#F97316] shadow-[0_0_8px_rgba(249,115,22,0.85)] animate-pulse';
                      }

                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 p-1.5 bg-[#0E0E12]/85 backdrop-blur-md rounded-lg border border-[#1F1F28] text-[10px]"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                          <span className="truncate font-medium text-slate-200">{t.title}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Completed tasks in green light */}
                  {recentCompletedTasks.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-[#1F1F28]/60">
                      <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10B981]" />
                          <span>Recent Completed</span>
                        </span>
                        <span>Green Light</span>
                      </p>
                      {recentCompletedTasks.slice(0, 2).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-1.5 p-1.5 bg-[#08080C]/80 rounded-lg border border-[#161622] text-[10px]"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] flex items-center justify-center text-[7px] text-black font-bold shrink-0">
                              ✓
                            </span>
                            <span className="truncate text-slate-500 line-through">{c.title}</span>
                          </div>
                          <span className="text-[9px] font-mono text-emerald-400 font-semibold shrink-0">DONE</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Android Gesture Bar */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/50 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Updating Android Wallpaper Modal */}
      {showAutomationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setShowAutomationModal(false)}
          />

          <div className="relative bg-[#0E0E12] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#1F1F28] z-10 animate-in fade-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1F1F28]">
              <h3 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-400" />
                <span>Android Auto-Updating Wallpaper Setup</span>
              </h3>
              <button
                onClick={() => setShowAutomationModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-[#1F1F28] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <p className="text-slate-400 leading-relaxed">
                Connect your Android phone to automatically download and apply your live OneDot wallpaper throughout the day using standard Android automation engines.
              </p>

              {/* Dynamic Live URL Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Dynamic Real-Time Android Wallpaper Feed URL:
                </label>
                <div className="flex items-center gap-1.5 p-2.5 bg-[#16161E] rounded-lg border border-[#272733] font-mono text-[11px] text-slate-200 overflow-x-auto">
                  <span className="truncate flex-1 text-orange-300">{liveUrl}</span>
                  <button
                    onClick={handleCopyLiveUrl}
                    className="p-1 text-slate-300 hover:text-white font-sans font-medium px-2.5 py-1 bg-[#272733] hover:bg-[#38384A] border border-[#38384A] rounded shrink-0 shadow-xs flex items-center gap-1.5"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy Feed URL'}</span>
                  </button>
                </div>
              </div>

              {/* Engine Selector Tabs */}
              <div className="flex items-center gap-2 border-b border-[#1F1F28] pb-2">
                <button
                  onClick={() => setAutomationTab('tasker')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                    automationTab === 'tasker'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Option 1: Tasker (Recommended)
                </button>
                <button
                  onClick={() => setAutomationTab('macrodroid')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                    automationTab === 'macrodroid'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Option 2: MacroDroid
                </button>
                <button
                  onClick={() => setAutomationTab('muzei')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                    automationTab === 'muzei'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Option 3: Wallpaper Changer App
                </button>
              </div>

              {/* Step instructions */}
              {automationTab === 'tasker' && (
                <div className="p-3.5 bg-[#16161E] rounded-xl border border-[#272733] space-y-2">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span>Tasker Setup Workflow:</span>
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                    <li>Open <strong>Tasker</strong> on your Android phone and create a new <strong>Profile</strong> (e.g., <em>Time: Every 1 Hour</em> or <em>Display Unlocked</em>).</li>
                    <li>Add Action 1: <strong>Net → HTTP Request</strong>:
                      <ul className="list-disc pl-4 mt-0.5 text-slate-400">
                        <li>Method: <code>GET</code></li>
                        <li>URL: Paste the dynamic feed URL from above</li>
                        <li>File/Download: <code>Download/onedot_wallpaper.png</code></li>
                      </ul>
                    </li>
                    <li>Add Action 2: <strong>Display → Set Wallpaper</strong>:
                      <ul className="list-disc pl-4 mt-0.5 text-slate-400">
                        <li>Type: <code>Lockscreen</code> (or Both)</li>
                        <li>Image: <code>Download/onedot_wallpaper.png</code></li>
                      </ul>
                    </li>
                    <li>Save! Your Android lock screen now refreshes automatically with fresh OneDot tasks and dots!</li>
                  </ol>
                </div>
              )}

              {automationTab === 'macrodroid' && (
                <div className="p-3.5 bg-[#16161E] rounded-xl border border-[#272733] space-y-2">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-orange-400" />
                    <span>MacroDroid Setup Workflow:</span>
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                    <li>In <strong>MacroDroid</strong>, tap <em>Add Macro</em>.</li>
                    <li><strong>Trigger</strong>: <em>Regular Interval</em> (every 30 mins) or <em>Screen On</em>.</li>
                    <li><strong>Action 1</strong>: <em>HTTP Request</em> → URL: dynamic OneDot feed URL → save response to local storage.</li>
                    <li><strong>Action 2</strong>: <em>Set Wallpaper</em> → choose Lock Screen → select the downloaded image.</li>
                    <li>Turn on the macro!</li>
                  </ol>
                </div>
              )}

              {automationTab === 'muzei' && (
                <div className="p-3.5 bg-[#16161E] rounded-xl border border-[#272733] space-y-2">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Wallpaper Changer / Muzei:</span>
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                    <li>Install <strong>Wallpaper Changer</strong> from Google Play Store.</li>
                    <li>Enable <em>Change wallpaper on lock screen</em>.</li>
                    <li>Point the folder source to your Android download folder or use an automated webhook download.</li>
                  </ol>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-[#1F1F28]">
                <button
                  onClick={() => setShowAutomationModal(false)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
