import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  X, 
  Check, 
  ArrowRight, 
  Clock, 
  AlertCircle,
  Layers,
  Send
} from 'lucide-react';
import { TaskPriority } from '../types.ts';

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedTaskResult {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  priority: TaskPriority;
  dotColor: 'red' | 'orange' | 'blue';
  tags: string[];
  dueDate: string | null;
  subtasks: string[];
}

export const VoiceTaskModal: React.FC<VoiceTaskModalProps> = ({ isOpen, onClose }) => {
  const { createTask } = useWorkspace();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedTaskResult | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError('Microphone access was denied. You can also type your task below.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setParsedResult(null);
      setError(null);
      // Auto start listening on open
      startListening();
    } else {
      stopListening();
    }
  }, [isOpen]);

  const startListening = () => {
    setError(null);
    setParsedResult(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // already started
      }
    } else {
      setError('Speech recognition is not supported in this browser. Please type your request below.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  };

  const handleParseWithGemini = async (textToParse: string) => {
    if (!textToParse.trim()) return;
    stopListening();
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceTranscript: textToParse.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'AI parsing failed');
      }

      setParsedResult(data.task);
    } catch (err: unknown) {
      console.error('Failed to parse with Gemini:', err);
      setError((err as Error).message || 'Unable to connect to Gemini AI. Check network or retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTask = () => {
    if (!parsedResult) return;

    createTask({
      title: parsedResult.title,
      description: `${parsedResult.description}\n\n[AI Assessment: ${parsedResult.difficulty.toUpperCase()} · ~${parsedResult.estimatedMinutes} mins]`,
      priority: parsedResult.priority,
      status: 'todo',
      urgency: parsedResult.dotColor === 'red',
      importance: parsedResult.dotColor === 'red' || parsedResult.dotColor === 'orange',
      tags: parsedResult.tags,
      dueDate: parsedResult.dueDate || null
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Android Bottom Sheet */}
      <div className="relative w-full max-w-lg bg-[#0E0E12] border-t sm:border border-[#1F1F28] rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 p-6 flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Android Sheet Grab Handle */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1A1A24]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white tracking-tight">
                AI Voice Task & Difficulty
              </h3>
              <p className="text-[11px] text-slate-400">
                Speak your task in everyday English · Gemini AI will understand
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Voice Recording & Audio Wave Indicator */}
        {!parsedResult && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            {/* Microphone Button with Pulsing Wave */}
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping scale-150" />
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 ${
                  isListening
                    ? 'bg-red-600 text-white ring-4 ring-red-500/30'
                    : 'bg-[#1C1C26] hover:bg-[#252532] text-slate-200 border border-[#2E2E3E]'
                }`}
              >
                {isListening ? (
                  <Mic className="w-8 h-8 animate-pulse text-white" />
                ) : (
                  <MicOff className="w-8 h-8 text-slate-400" />
                )}
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                {isListening ? 'Listening on Android mic...' : 'Tap microphone to speak'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                e.g. &ldquo;Finish the API endpoints by Thursday and review with Alex&rdquo;
              </p>
            </div>

            {/* Transcript Display / Input Field */}
            <div className="w-full text-left space-y-2 pt-2">
              <div className="p-3 bg-[#08080B] rounded-xl border border-[#1A1A22] min-h-[70px] text-xs text-slate-200">
                {transcript ? (
                  <span className="font-medium text-slate-100">{transcript}</span>
                ) : (
                  <span className="text-slate-500 italic">Your spoken words will appear here...</span>
                )}
              </div>

              {transcript && (
                <button
                  onClick={() => handleParseWithGemini(transcript)}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessing ? 'Gemini 3.8 Flash is analyzing...' : 'Analyze with Gemini AI'}</span>
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-300 text-left">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* AI Parsed Result View */}
        {parsedResult && (
          <div className="space-y-4 py-2 animate-in fade-in zoom-in-95 duration-150">
            {/* Task Card Preview */}
            <div className="p-4 bg-[#08080B] rounded-2xl border border-[#1F1F28] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-base font-bold text-white leading-snug">
                  {parsedResult.title}
                </h4>

                {/* Dot Badge */}
                <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-[#14141C] border border-[#272736]">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    parsedResult.dotColor === 'red' ? 'bg-red-500 shadow-xs shadow-red-500/50' : (
                      parsedResult.dotColor === 'orange' ? 'bg-orange-500 shadow-xs shadow-orange-500/50' : 'bg-blue-500 shadow-xs shadow-blue-500/50'
                    )
                  }`} />
                  <span className="text-[11px] font-semibold uppercase text-slate-300">
                    {parsedResult.dotColor}
                  </span>
                </div>
              </div>

              {parsedResult.description && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  {parsedResult.description}
                </p>
              )}

              {/* AI Difficulty Metric Pill */}
              <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-[#1A1A22] text-xs">
                <span className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 ${
                  parsedResult.difficulty === 'hard'
                    ? 'bg-red-950/60 text-red-300 border border-red-800/60'
                    : parsedResult.difficulty === 'medium'
                    ? 'bg-orange-950/60 text-orange-300 border border-orange-800/60'
                    : 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span className="capitalize">{parsedResult.difficulty} Difficulty</span>
                  <span className="font-mono tabular-nums">({parsedResult.estimatedMinutes}m)</span>
                </span>

                {parsedResult.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-[#14141C] text-slate-300 rounded text-[11px]">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Subtasks Generated by AI */}
              {parsedResult.subtasks.length > 0 && (
                <div className="pt-2 border-t border-[#1A1A22] space-y-1.5">
                  <p className="text-[11px] font-mono text-slate-400">
                    Auto-generated subtasks ({parsedResult.subtasks.length}):
                  </p>
                  <ul className="space-y-1">
                    {parsedResult.subtasks.map((sub, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span>{sub}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setParsedResult(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Record Again
              </button>

              <button
                type="button"
                onClick={handleSaveTask}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save to Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
