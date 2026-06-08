import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  ClipboardPaste,
  Volume2,
  Activity,
  Languages,
  RotateCcw,
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Sentence {
  en: string;
  zh: string;
}

interface Analysis {
  sentence: string;
  breakdown: string;
  grammarPoints: string[];
}

interface Vocabulary {
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
}

interface AnalysisResult {
  sentences: Sentence[];
  analysis: Analysis[];
  vocabulary: Vocabulary[];
}

type TabType = "translation" | "analysis" | "vocabulary";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("translation");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImageBlob = (blob: Blob) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(blob);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageBlob(file);
  };

  // 主动读取剪贴板里的图片（点击「粘贴图片」卡片时触发）
  const pasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          loadImageBlob(await item.getType(imageType));
          return;
        }
      }
      setError("剪贴板里没有图片，请先复制一张图片，或直接按 Ctrl/⌘ + V 粘贴");
    } catch {
      setError("无法读取剪贴板，请直接按 Ctrl/⌘ + V 粘贴图片");
    }
  };

  // 全局监听 Ctrl/⌘ + V，在上传页随手粘贴即可识别剪贴板里的图片
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (image || result) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            loadImageBlob(file);
            e.preventDefault();
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [image, result]);

  const processImage = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1];

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data, mimeType }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "图片分析失败");
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-editorial-bg font-sans text-editorial-text-main">
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-editorial-border z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-editorial-accent p-2 rounded-lg shadow-sm">
              <Languages className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-serif font-bold text-xl tracking-wide uppercase">
              Linguist <span className="font-light">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {result && (
              <div className="hidden sm:block text-xs text-editorial-text-muted font-medium uppercase tracking-widest">
                OCR Processing Complete
              </div>
            )}
            {result && (
              <button 
                onClick={reset}
                className="bg-editorial-accent text-white px-5 py-2 rounded-full font-medium text-xs uppercase tracking-widest hover:bg-[#3D4D40] transition-all shadow-sm"
              >
                重新拍摄
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-28 pb-32 px-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-xl mx-auto space-y-10"
            >
              <div className="text-center space-y-3 py-12">
                <h2 className="text-4xl font-serif font-bold tracking-tight">逐句对照学习</h2>
                <p className="text-editorial-text-muted text-lg font-light">拍摄一张英语文本，AI 将为您深度剖析</p>
              </div>

              {!image ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[4/3] bg-white border border-editorial-border rounded-[32px] flex flex-col items-center justify-center gap-6 hover:border-editorial-accent hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-editorial-accent/0 group-hover:bg-editorial-accent/[0.02] transition-colors" />
                      <div className="w-20 h-20 bg-editorial-bg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <Camera className="w-10 h-10 text-editorial-accent" />
                      </div>
                      <div className="text-center">
                        <span className="block font-semibold text-lg text-editorial-text-main">上传照片</span>
                        <span className="text-xs text-editorial-text-muted uppercase tracking-[0.2em] mt-1">Capture or Select</span>
                      </div>
                    </button>
                    <button
                      onClick={pasteFromClipboard}
                      className="aspect-[4/3] bg-white border border-editorial-border rounded-[32px] flex flex-col items-center justify-center gap-6 hover:border-editorial-accent hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-editorial-accent/0 group-hover:bg-editorial-accent/[0.02] transition-colors" />
                      <div className="w-20 h-20 bg-editorial-bg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <ClipboardPaste className="w-10 h-10 text-editorial-accent" />
                      </div>
                      <div className="text-center">
                        <span className="block font-semibold text-lg text-editorial-text-main">粘贴图片</span>
                        <span className="text-xs text-editorial-text-muted uppercase tracking-[0.2em] mt-1">Paste from Clipboard</span>
                      </div>
                    </button>
                  </div>
                  <p className="text-center text-xs text-editorial-text-muted">
                    复制截图后直接按 <span className="font-medium">Ctrl / ⌘ + V</span> 即可粘贴
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="relative aspect-video rounded-[32px] overflow-hidden bg-black border border-editorial-border shadow-2xl">
                    <img src={image} alt="preview" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => setImage(null)}
                      className="absolute top-6 right-6 bg-white/20 backdrop-blur-xl text-white p-3 rounded-full hover:bg-white/40 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={processImage}
                    disabled={loading}
                    className="w-full bg-editorial-accent text-white py-5 rounded-2xl font-bold text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#3D4D40] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>正在处理文本...</span>
                      </>
                    ) : (
                      <span>开始深度解析</span>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-start h-[calc(100vh-12rem)]">
              {/* Left Column: Translation & Tabs */}
              <div className="flex-1 w-full space-y-6 h-full flex flex-col min-w-0">
                {/* Tab Navigation */}
                <div className="flex bg-editorial-border/30 p-1.5 rounded-2xl border border-editorial-border">
                  {(["translation", "analysis", "vocabulary"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        activeTab === tab 
                          ? "bg-white shadow-md text-editorial-text-main border border-editorial-border/50" 
                          : "text-editorial-text-muted hover:text-editorial-text-main"
                      }`}
                    >
                      <span>
                        {tab === "translation" ? "逐句对照" : tab === "analysis" ? "难句解析" : "专业词汇"}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                  <div>
                    <AnimatePresence mode="wait">
                      {activeTab === "translation" && (
                        <motion.div 
                          key="sentences"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="divide-y divide-editorial-border"
                        >
                          {result.sentences.map((s, i) => (
                            <div key={i} className="p-8 hover:bg-editorial-bg/50 transition-colors group relative">
                              <div className="space-y-4">
                                <div className="flex justify-between items-start gap-6">
                                  <p className="text-xl leading-relaxed font-serif text-editorial-text-main">
                                    {s.en}
                                  </p>
                                  <button 
                                    onClick={() => speak(s.en)}
                                    className="p-2.5 bg-editorial-bg rounded-full text-editorial-accent hover:bg-editorial-accent hover:text-white transition-all shadow-sm"
                                  >
                                    <Volume2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-editorial-text-muted leading-relaxed font-light">
                                  {s.zh}
                                </p>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {activeTab === "analysis" && (
                        <motion.div 
                          key="analysis"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="p-8 space-y-8"
                        >
                          {result.analysis.map((a, i) => (
                            <div key={i} className="space-y-5 border-b border-editorial-border pb-8 last:border-0">
                              <div className="bg-editorial-bg p-6 rounded-2xl border-l-[6px] border-editorial-accent">
                                <p className="font-serif italic text-lg leading-relaxed">"{a.sentence}"</p>
                              </div>
                              <div className="space-y-3">
                                <h4 className="font-bold text-xs uppercase tracking-widest text-editorial-text-muted flex items-center gap-2">
                                  <Activity className="w-3.5 h-3.5" /> 结构剖析 / Breakdown
                                </h4>
                                <p className="text-editorial-text-main leading-relaxed">{a.breakdown}</p>
                              </div>
                              {a.grammarPoints && (
                                <div className="flex flex-wrap gap-2">
                                  {a.grammarPoints.map((gp, j) => (
                                    <span key={j} className="bg-editorial-accent/10 border border-editorial-accent/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-editorial-accent">
                                      {gp}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {activeTab === "vocabulary" && (
                        <motion.div 
                          key="vocabulary"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="p-8 space-y-2"
                        >
                          {result.vocabulary.map((v, i) => (
                            <div key={i} className="group py-4 border-b border-dotted border-editorial-border flex items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-lg font-bold text-editorial-text-main group-hover:text-editorial-accent transition-colors">{v.word}</h3>
                                  <span className="text-editorial-text-muted font-serif italic text-xs">{v.phonetic}</span>
                                </div>
                                <p className="text-sm text-editorial-text-muted italic">{v.example}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-editorial-accent font-medium text-sm">{v.meaning}</span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Right Column: Mini Preview (Always visible on large screens) */}
              <div className="hidden lg:flex w-72 h-full flex-col gap-6">
                <div className="bg-white rounded-[24px] border border-editorial-border p-5 space-y-4 shadow-sm h-full flex flex-col">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-editorial-text-muted border-b border-editorial-border pb-3">
                    Scan Summary
                  </div>
                  <div className="relative rounded-xl overflow-hidden bg-black shrink-0 aspect-[3/4]">
                    <img src={image!} alt="original scan" className="w-full h-full object-cover opacity-60 grayscale" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-[10px] font-bold text-white uppercase tracking-[0.3em] bg-black/40 px-3 py-1.5 backdrop-blur-md rounded-full border border-white/20">
                        Analyzing...
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-editorial-text-muted uppercase tracking-widest">Sentences</div>
                      <div className="text-2xl font-serif">{result.sentences.length}</div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-editorial-text-muted uppercase tracking-widest">Vocabulary</div>
                      <div className="text-2xl font-serif">{result.vocabulary.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {error && (
        <div className="fixed bottom-8 left-4 right-4 max-w-md mx-auto bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 shadow-lg z-[100]">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 text-red-400 hover:text-red-600">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E3DF;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D5D3CF;
        }
      `}</style>
    </div>
  );
}
