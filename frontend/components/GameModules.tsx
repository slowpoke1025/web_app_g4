import React, { useState } from 'react';
import { DATE_OPTIONS, OUTFIT_OPTIONS } from '../constants';
import { DatePlanSelection, GiftOption } from '../types';
import * as Gemini from '../services/geminiService';

/* --- DATE PLAN MODULE (35%) --- */

interface DatePlanProps {
  onConfirm: (selection: DatePlanSelection) => void;
}

export const DatePlanModule: React.FC<DatePlanProps> = ({ onConfirm }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selection, setSelection] = useState<DatePlanSelection>({ morning: '', afternoon: '', evening: '' });

  const handleSelect = (value: string) => {
    if (step === 1) setSelection(p => ({ ...p, morning: value }));
    if (step === 2) setSelection(p => ({ ...p, afternoon: value }));
    if (step === 3) setSelection(p => ({ ...p, evening: value }));
  };

  const nextStep = () => {
    if (step < 3) setStep(s => (s + 1) as any);
    else onConfirm(selection);
  };

  const currentOptions = step === 1 ? DATE_OPTIONS.morning : step === 2 ? DATE_OPTIONS.afternoon : DATE_OPTIONS.evening;
  const currentTitle = step === 1 ? "早晨行程" : step === 2 ? "午後時光" : "夜晚安排";
  const currentSubtitle = step === 1 ? "美好的約會從哪裡開始？" : step === 2 ? "下午要去哪裡走走？" : "如何結束這完美的一天？";
  
  const currentVal = step === 1 ? selection.morning : step === 2 ? selection.afternoon : selection.evening;

  return (
    <div className="glass-card p-8 rounded-3xl max-w-lg w-full mx-4 shadow-2xl animate-slide-up">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-600">
            約會行程規劃
          </h2>
          <span className="text-sm font-bold text-rose-400 bg-rose-50 px-3 py-1 rounded-full">Step {step}/3</span>
      </div>
      
      <p className="text-gray-600 mb-1 font-medium">{currentTitle}</p>
      <p className="text-gray-400 text-sm mb-6">{currentSubtitle}</p>
      
      <div className="space-y-3 mb-8">
        {currentOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.label)}
            className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex justify-between items-center text-left group
              ${currentVal === opt.label 
                ? 'border-rose-500 bg-rose-50 shadow-md transform scale-[1.02]' 
                : 'border-transparent bg-white hover:border-rose-200 hover:shadow-sm'}`}
          >
            <span className={`font-bold transition-colors ${currentVal === opt.label ? 'text-rose-700' : 'text-gray-700'}`}>
                {opt.label}
            </span>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full group-hover:bg-white transition-colors">
                {opt.type}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={nextStep}
        disabled={!currentVal}
        className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-rose-500/30 disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all duration-200"
      >
        {step === 3 ? '確認行程' : '下一步'}
      </button>
    </div>
  );
};

/* --- OUTFIT MODULE (65%) --- */

interface OutfitModuleProps {
  gender: string;
  onConfirm: (description: string) => void;
}

export const OutfitModule: React.FC<OutfitModuleProps> = ({ gender, onConfirm }) => {
  const [top, setTop] = useState(OUTFIT_OPTIONS.tops[0].id);
  const [bottom, setBottom] = useState(OUTFIT_OPTIONS.bottoms[0].id);
  const [head, setHead] = useState(OUTFIT_OPTIONS.head[0].id);
  const [body, setBody] = useState(OUTFIT_OPTIONS.body[0].id);
  const [hand, setHand] = useState(OUTFIT_OPTIONS.hand[0].id);
  
  const [showPreview, setShowPreview] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const getOptName = (list: any[], id: string) => list.find(x => x.id === id)?.name || '';

  const getFullDescription = () => {
    return `
      Gender: ${gender}, 
      Top: ${getOptName(OUTFIT_OPTIONS.tops, top)}, 
      Bottom: ${getOptName(OUTFIT_OPTIONS.bottoms, bottom)}, 
      Headwear: ${getOptName(OUTFIT_OPTIONS.head, head)}, 
      Accessory: ${getOptName(OUTFIT_OPTIONS.body, body)}, 
      Hand: ${getOptName(OUTFIT_OPTIONS.hand, hand)}
    `;
  }

  const handlePreview = async () => {
    setShowPreview(true);
    setLoading(true);
    
    const desc = getFullDescription();
    const url = await Gemini.generateOutfitImage(desc, gender);
    setImageUrl(url);
    setLoading(false);
  };

  const handleBack = () => {
    setShowPreview(false);
    setImageUrl(null);
  };

  const handleFinalConfirm = () => {
      onConfirm(getFullDescription());
  }

  if (showPreview) {
    return (
      <div className="glass-card p-6 rounded-3xl shadow-2xl max-w-sm w-full mx-4 text-center animate-fade-in">
        <h3 className="text-xl font-bold text-gray-800 mb-1">穿搭預覽</h3>
        <p className="text-xs text-gray-500 mb-4">這身打扮... 對方會喜歡嗎？</p>
        
        <div className="w-full aspect-[3/4] bg-gray-100 rounded-2xl mb-5 flex items-center justify-center overflow-hidden relative shadow-inner">
          {loading ? (
             <div className="flex flex-col items-center gap-3">
                 <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-sm font-medium text-rose-500 animate-pulse">正在試穿中...</p>
             </div>
          ) : (
             imageUrl && <img src={imageUrl} alt="Outfit" className="w-full h-full object-cover animate-fade-in" />
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={handleBack} className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition">重新搭配</button>
          <button onClick={handleFinalConfirm} disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 hover:shadow-rose-500/30 transition">確認穿搭</button>
        </div>
      </div>
    );
  }

  const Section = ({ title, options, val, setVal }: any) => (
    <div className="mb-5">
      <label className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 block px-1">{title}</label>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {options.map((opt: any) => (
          <button
            key={opt.id}
            onClick={() => setVal(opt.id)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap border-2 transition-all duration-200 snap-center
              ${val === opt.id 
                ? 'bg-rose-500 border-rose-500 text-white font-bold shadow-md' 
                : 'bg-white border-gray-100 text-gray-600 hover:border-rose-200'}`}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="glass-card p-6 rounded-3xl shadow-2xl max-w-md w-full mx-4 h-[85vh] flex flex-col animate-slide-up">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">今日穿搭 OOTD</h2>
      <p className="text-gray-500 mb-6 text-sm">展現你的品味，給對方一個深刻的印象。</p>

      <div className="flex-1 overflow-y-auto pr-2">
        <Section title="上衣 Top" options={OUTFIT_OPTIONS.tops} val={top} setVal={setTop} />
        <Section title="下著 Bottom" options={OUTFIT_OPTIONS.bottoms} val={bottom} setVal={setBottom} />
        <Section title="頭部 Headwear" options={OUTFIT_OPTIONS.head} val={head} setVal={setHead} />
        <Section title="配件 Accessories" options={OUTFIT_OPTIONS.body} val={body} setVal={setBody} />
        <Section title="手部 Hand" options={OUTFIT_OPTIONS.hand} val={hand} setVal={setHand} />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button onClick={handlePreview} className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:shadow-rose-500/30 hover:scale-[1.01] transition-all">
            前往鏡子前 (預覽)
        </button>
      </div>
    </div>
  );
};

/* --- GIFT MODULE (99%) --- */

interface GiftModuleProps {
  gifts: GiftOption[];
  onSelect: (gift: GiftOption) => void;
  isLoading?: boolean;
  loadingText?: string;
}

export const GiftModule: React.FC<GiftModuleProps> = ({ gifts, onSelect, isLoading, loadingText }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    const gift = gifts.find(g => g.id === selectedId);
    if (gift) onSelect(gift);
  };

  if (isLoading) {
    return (
        <div className="glass-card p-8 rounded-3xl shadow-2xl max-w-5xl w-full mx-4 animate-slide-up flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-rose-100 rounded-full"></div>
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-700 animate-pulse mb-2">正在為你挑選禮物...</h3>
            <p className="text-gray-400 text-sm animate-pulse">{loadingText || "AI 正在精心生成禮物預覽圖..."}</p>
        </div>
    )
  }

  return (
    <div className="glass-card p-8 rounded-3xl shadow-2xl max-w-5xl w-full mx-4 animate-slide-up flex flex-col max-h-[90vh]">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-600 mb-2">最後的告白時刻</h2>
        <p className="text-gray-500">這份禮物代表了你的心意，請慎重選擇。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 overflow-y-auto p-6">
        {gifts.map(gift => (
          <div 
            key={gift.id}
            onClick={() => setSelectedId(gift.id)}
            className={`cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 transform group relative
              ${selectedId === gift.id 
                ? 'ring-4 ring-rose-400 ring-offset-4 shadow-xl scale-[1.02]' 
                : 'hover:shadow-lg hover:-translate-y-1 bg-white border border-gray-100'}`}
          >
            <div className="h-48 overflow-hidden relative bg-gray-50">
                 <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                 <img src={gift.imageUrl} alt={gift.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            </div>
            <div className="p-5 bg-white">
              <h4 className="font-bold text-lg mb-2 text-gray-800">{gift.name}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{gift.description}</p>
            </div>
            
            {selectedId === gift.id && (
                <div className="absolute top-3 right-3 bg-rose-500 text-white rounded-full p-1 shadow-lg z-20 animate-bounce">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-auto">
        <button
          onClick={handleConfirm}
          disabled={!selectedId}
          className="px-16 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-full font-bold text-xl shadow-xl hover:shadow-rose-500/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300"
        >
          告白並送出
        </button>
      </div>
    </div>
  );
};