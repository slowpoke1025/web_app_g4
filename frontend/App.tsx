import React, { useState, useEffect, useRef } from "react";
import {
  UserProfile,
  Character,
  GameSession,
  Message,
  GameStage,
  EventTrigger,
  CharacterAttributes,
  DatePlanSelection,
  GiftOption,
} from "./types";
import { TAG_OPTIONS } from "./constants";
import * as Gemini from "./services/geminiService";
import {
  DatePlanModule,
  OutfitModule,
  GiftModule,
} from "./components/GameModules";

// --- Storage Keys ---
const STORAGE_KEYS = {
  USER: "lovesim_user",
  SESSIONS: "lovesim_sessions",
};

// --- Icons ---
const HeartIcon = ({
  filled,
  className,
}: {
  filled?: boolean;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5"
  >
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

const ExitIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-6 h-6"
  >
    <path
      fillRule="evenodd"
      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
      clipRule="evenodd"
    />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
    />
  </svg>
);

const getRandomName = (gender: string) => {
  const maleNames = ["冠宇", "承恩", "柏翰", "子軒", "宇翔"];
  const femaleNames = [
    "雅婷",
    "怡君",
    "雅雯",
    "心怡",
    "詩涵",
    "佳穎",
    "芷萱",
    "品妤",
    "思妤",
  ];
  const otherNames = ["小安", "小樂", "天天", "阿凱", "小魚"];

  let names = otherNames;
  if (gender === "男性") names = maleNames;
  if (gender === "女性") names = femaleNames;

  return names[Math.floor(Math.random() * names.length)];
};

// --- APP COMPONENT ---

// 添加 API 模式指示器組件
const APIModeIndicator = () => {
  const mode = Gemini.getAPIMode();
  const backendUrl = Gemini.getBackendURL();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    if (mode === "backend") {
      // 檢查後端健康狀態
      fetch(`${backendUrl}/health`)
        .then((res) => res.json())
        .then(() => setIsBackendHealthy(true))
        .catch(() => setIsBackendHealthy(false));
    }
  }, [mode, backendUrl]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`
        px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md
        ${
          mode === "frontend"
            ? "bg-blue-500/90 text-white"
            : isBackendHealthy
            ? "bg-green-500/90 text-white"
            : "bg-red-500/90 text-white animate-pulse"
        }
      `}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              mode === "frontend"
                ? "bg-blue-200"
                : isBackendHealthy
                ? "bg-green-200 animate-pulse"
                : "bg-red-200"
            }`}
          ></div>
          <span>
            {mode === "frontend" && "前端模式"}
            {mode === "backend" && isBackendHealthy === true && "後端模式"}
            {mode === "backend" && isBackendHealthy === false && "後端離線"}
            {mode === "backend" && isBackendHealthy === null && "檢查中..."}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // Global State (Persistent)
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [sessions, setSessions] = useState<GameSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stage, setStage] = useState<GameStage>(() => {
    // If user is already logged in (in localStorage), skip to dashboard
    return localStorage.getItem(STORAGE_KEYS.USER)
      ? GameStage.DASHBOARD
      : GameStage.LOGIN;
  });

  // Login State
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [profileForm, setProfileForm] = useState<UserProfile>({
    nickname: "",
    birthdate: "",
    gender: "女性",
    interests: "",
  });

  // Game State
  const [character, setCharacter] = useState<Character | null>(null);
  const [charForm, setCharForm] = useState<CharacterAttributes>({
    gender: "女性",
    ageRange: "25-30 歲",
    personality: "開朗",
    interests: "看電影",
    occupation: "上班族",
    customPrompt: "",
    avatarUrl: "",
  });
  const [isGeneratingChar, setIsGeneratingChar] = useState(false);
  const [isGeneratingGifts, setIsGeneratingGifts] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");

  // Interaction State
  const [messages, setMessages] = useState<Message[]>([]);
  const [affection, setAffection] = useState(0);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeSession, setActiveSession] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<
    "neutral" | "happy" | "angry" | "sad"
  >("neutral");

  // Event Triggers
  const [activeEvent, setActiveEvent] = useState<EventTrigger>(
    EventTrigger.NONE
  );
  const [completedEvents, setCompletedEvents] = useState<EventTrigger[]>([]);
  const [eventFeedback, setEventFeedback] = useState<string | null>(null);
  const [giftOptions, setGiftOptions] = useState<GiftOption[]>([]);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [isProcessingEvent, setIsProcessingEvent] = useState(false);

  // Viewing History
  const [viewingSession, setViewingSession] = useState<GameSession | null>(
    null
  );

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Persistence Effects
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  // Scroll Effect
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Game Logic Effects
  useEffect(() => {
    if (stage !== GameStage.GAME_LOOP) return;

    if (affection <= 0 && messages.length > 2) {
      setCurrentEmotion("sad");
      setTimeout(() => handleGameOver(false), 2000);
      return;
    }

    if (activeEvent !== EventTrigger.NONE) return;

    if (
      affection >= 99 &&
      !messages.some((m) => m.text.includes("[系統] 禮物事件"))
    ) {
      triggerEvent(EventTrigger.GIFT_99);
    } else if (
      affection >= 65 &&
      !completedEvents.includes(EventTrigger.OUTFIT_65)
    ) {
      triggerEvent(EventTrigger.OUTFIT_65);
    } else if (
      affection >= 35 &&
      !completedEvents.includes(EventTrigger.DATE_PLAN_35)
    ) {
      triggerEvent(EventTrigger.DATE_PLAN_35);
    }
  }, [affection, stage, completedEvents]);

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username && loginForm.password) {
      setStage(GameStage.PROFILE_SETUP);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setStage(GameStage.LOGIN);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser(profileForm);
    setStage(GameStage.DASHBOARD);
  };

  const confirmNewGame = () => {
    setMessages([]);
    setAffection(10);
    setCharacter(null);
    setActiveEvent(EventTrigger.NONE);
    setCompletedEvents([]);
    setActiveSession(false);
    setShowOverwriteModal(false);
    setCurrentEmotion("neutral");
    setStage(GameStage.CHAR_SETUP);
  };

  const handleStartClick = () => {
    if (activeSession) {
      setShowOverwriteModal(true);
    } else {
      confirmNewGame();
    }
  };

  const handleCharSetupSubmit = async () => {
    setIsGeneratingChar(true);
    const avatarUrl = await Gemini.generateRealisticAvatar(
      charForm.gender,
      charForm.personality,
      charForm.occupation
    );
    const persona = Gemini.generateCharacterPersona(charForm);
    const randomName = getRandomName(charForm.gender);

    const newChar: Character = {
      ...charForm,
      avatarUrl,
      name: randomName,
      systemInstruction: persona,
    };

    setCharacter(newChar);
    setIsGeneratingChar(false);
    setStage(GameStage.GAME_LOOP);
    setActiveSession(true);

    setIsTyping(true);
    setTimeout(() => {
      addMessage(
        "ai",
        `嗨 ${user?.nickname}！很高興認識你。聽說你喜歡${user.interests}？`
      );
      setIsTyping(false);
    }, 1500);
  };

  const addMessage = (
    sender: "user" | "ai" | "system",
    text: string,
    affectionChange?: number,
    reason?: string
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender,
        text,
        timestamp: Date.now(),
        affectionChange,
        reason,
      },
    ]);
  };

  const updateEmotion = (change: number) => {
    if (change >= 3) {
      setCurrentEmotion("happy");
    } else if (change <= -2) {
      setCurrentEmotion("angry");
    } else if (change < 0) {
      setCurrentEmotion("sad");
    } else {
      setCurrentEmotion("neutral");
    }

    setTimeout(() => {
      if (affection > 0) setCurrentEmotion("neutral");
    }, 3000);
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !character) return;

    const userText = inputMsg;
    setInputMsg("");
    addMessage("user", userText);
    setIsTyping(true);

    const result = await Gemini.chatWithCharacter(
      character,
      messages,
      userText
    );

    setIsTyping(false);
    addMessage("ai", result.text, result.affectionChange, result.reason);
    setAffection((prev) =>
      Math.min(100, Math.max(0, prev + result.affectionChange))
    );
    updateEmotion(result.affectionChange);
  };

  const triggerEvent = async (event: EventTrigger) => {
    setActiveEvent(event);
    if (event === EventTrigger.GIFT_99 && character) {
      setIsGeneratingGifts(true);
      setLoadingProgress("正在分析對話...");
      setGiftOptions([]); // Clear old options
      try {
        const gifts = await Gemini.generateGiftOptions(
          character,
          messages,
          (msg) => setLoadingProgress(msg)
        );
        setGiftOptions(gifts);
      } catch (e) {
        console.error("Failed to generate gifts", e);
      } finally {
        setIsGeneratingGifts(false);
      }
    }
  };

  // --- Event Resolutions ---

  const handleDateConfirm = async (selection: DatePlanSelection) => {
    if (!character) return;

    setIsProcessingEvent(true);
    const result = await Gemini.evaluateDatePlan(character, selection);
    setIsProcessingEvent(false);

    setEventFeedback(result.feedback);
    setCompletedEvents((prev) => [...prev, EventTrigger.DATE_PLAN_35]);

    setTimeout(() => {
      const scoreChange = result.scoreBonus;
      setAffection((prev) => Math.min(100, Math.max(0, prev + scoreChange)));
      updateEmotion(scoreChange);

      const sign = scoreChange > 0 ? "+" : "";
      addMessage(
        "system",
        `約會事件完成: ${
          result.satisfaction === "happy"
            ? "大成功"
            : result.satisfaction === "sad"
            ? "失敗"
            : "普通"
        }。 好感度: ${sign}${scoreChange}%`
      );
      addMessage("ai", result.feedback, scoreChange, "約會評價");

      setActiveEvent(EventTrigger.NONE);
      setEventFeedback(null);
    }, 5000);
  };

  const handleOutfitConfirm = async (description: string) => {
    if (!character) return;

    setIsProcessingEvent(true);
    const result = await Gemini.evaluateOutfit(character, description);
    setIsProcessingEvent(false);

    setEventFeedback(result.feedback);
    setCompletedEvents((prev) => [...prev, EventTrigger.OUTFIT_65]);

    setTimeout(() => {
      const scoreChange = result.scoreBonus;
      setAffection((prev) => Math.min(100, Math.max(0, prev + scoreChange)));
      updateEmotion(scoreChange);

      const sign = scoreChange > 0 ? "+" : "";
      addMessage("system", `穿搭事件完成。 好感度: ${sign}${scoreChange}%`);
      addMessage("ai", result.feedback, scoreChange, "穿搭評價");

      setActiveEvent(EventTrigger.NONE);
      setEventFeedback(null);
    }, 5000);
  };

  const handleGiftSelect = (gift: GiftOption) => {
    if (gift.isLiked) {
      setAffection(100);
      setCurrentEmotion("happy");
      handleGameOver(true);
    } else {
      setAffection(75);
      setActiveEvent(EventTrigger.NONE);
      setCurrentEmotion("angry");
      addMessage("system", "禮物被拒絕！好感度下降至 75%。");
      addMessage(
        "ai",
        `呃... 這東西 (${gift.name})？ 謝謝，但其實我不是很喜歡...`,
        -24,
        "送錯禮物"
      );
    }
  };

  const handleGameOver = (win: boolean) => {
    setStage(win ? GameStage.GAME_OVER_WIN : GameStage.GAME_OVER_LOSS);
    setActiveSession(false);

    if (user && character) {
      const session: GameSession = {
        id: Date.now().toString(),
        startTime: messages[0]?.timestamp || Date.now(),
        user,
        character,
        messages,
        affection,
        isFinished: true,
        result: win ? "win" : "loss",
      };
      setSessions((prev) => [session, ...prev]);
      // sessions effect will save to localStorage
    }
  };

  const handleHistoryView = (session: GameSession) => {
    setViewingSession(session);
    setStage(GameStage.HISTORY_VIEW);
  };

  // --- RENDER HELPERS ---

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="glass-card p-10 rounded-3xl w-full max-w-md border-t-4 border-rose-400/50">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-600 mb-8 text-center tracking-tight">
          練愛模擬器
        </h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
              Username
            </label>
            <input
              type="text"
              required
              className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-all placeholder:text-gray-300"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-all placeholder:text-gray-300"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
            />
          </div>
          <button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-300 text-lg">
            登入 / 註冊
          </button>
        </form>
      </div>
    </div>
  );

  const renderProfileSetup = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="glass-card p-10 rounded-3xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          建立你的檔案
        </h2>
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 ml-1">
              暱稱
            </label>
            <input
              type="text"
              required
              className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-300 outline-none"
              value={profileForm.nickname}
              onChange={(e) =>
                setProfileForm({ ...profileForm, nickname: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 ml-1">
              性別
            </label>
            <select
              className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-300 outline-none appearance-none"
              value={profileForm.gender}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  gender: e.target.value as any,
                })
              }
            >
              <option>男性</option>
              <option>女性</option>
              <option>其他</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 ml-1">
              興趣
            </label>
            <input
              type="text"
              placeholder="例如：爬山, 動漫, 美食"
              required
              className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-300 outline-none"
              value={profileForm.interests}
              onChange={(e) =>
                setProfileForm({ ...profileForm, interests: e.target.value })
              }
            />
          </div>
          <button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-500/30 hover:scale-[1.02] transition-all mt-4">
            開始旅程 &rarr;
          </button>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="flex flex-col items-center min-h-screen p-6 animate-fade-in">
      <div className="w-full max-w-5xl">
        <header className="flex justify-between items-center mb-12 glass px-6 py-4 rounded-full shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">
            Hi, <span className="text-rose-500">{user?.nickname}</span>
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-rose-500 font-medium px-4 py-2 hover:bg-rose-50 rounded-full transition"
          >
            登出
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-10 rounded-3xl flex flex-col items-center text-center hover:translate-y-[-5px] transition-all duration-300 group">
            <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-200 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
              <HeartIcon
                filled
                className="w-12 h-12 text-rose-500 drop-shadow-md"
              />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-gray-800">練愛模擬</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {activeSession
                ? "你有一場進行中的約會，準備好繼續了嗎？"
                : "創造一位理想伴侶，展開一場屬於你的浪漫故事。"}
            </p>
            <div className="space-y-4 w-full mt-auto">
              {activeSession && (
                <button
                  onClick={() => setStage(GameStage.GAME_LOOP)}
                  className="w-full px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.02] transition-all"
                >
                  繼續聊天
                </button>
              )}
              <button
                onClick={handleStartClick}
                className={`w-full px-8 py-4 rounded-2xl font-bold transition-all ${
                  activeSession
                    ? "bg-white border-2 border-rose-400 text-rose-500 hover:bg-rose-50"
                    : "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30 hover:scale-[1.02]"
                }`}
              >
                {activeSession ? "重新開始" : "開始新練愛"}
              </button>
            </div>
          </div>

          <div className="glass-card p-10 rounded-3xl flex flex-col items-center text-center hover:translate-y-[-5px] transition-all duration-300 group">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
              <svg
                className="w-10 h-10 text-indigo-400 drop-shadow-md"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-gray-800">回憶錄</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              重溫那些心動時刻，或是檢討哪裡出了差錯。
            </p>

            <div className="w-full max-h-[200px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {sessions.length === 0 && (
                <p className="text-sm text-gray-400 italic py-4">
                  目前還沒有練愛紀錄。
                </p>
              )}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleHistoryView(s)}
                  className="w-full text-left p-4 rounded-2xl hover:bg-white bg-white/50 border border-gray-100 shadow-sm hover:shadow-md transition-all flex justify-between items-center group/item"
                >
                  <div>
                    <span className="block font-bold text-gray-700">
                      {s.character.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(s.startTime).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      s.result === "win"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {s.result === "win" ? "❤️ 攻略成功" : "💔 失敗"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              重新開始？
            </h3>
            <p className="text-gray-500 mb-8">
              目前的練愛進度將會遺失，確定要展開新的戀情嗎？
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowOverwriteModal(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={confirmNewGame}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg hover:bg-rose-600 transition"
              >
                確定重來
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCharSetup = () => (
    <div className="flex flex-col items-center min-h-screen p-6 animate-fade-in">
      <div className="w-full max-w-3xl glass-card rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-2">設計你的理想對象</h2>
          <p className="opacity-90 font-medium">
            客製化對方的外貌與個性，AI 將為你生成專屬對象。
          </p>
        </div>
        <div className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { l: "對象性別", k: "gender", o: TAG_OPTIONS.gender },
              { l: "年齡區間", k: "ageRange", o: TAG_OPTIONS.age },
              { l: "職業", k: "occupation", o: TAG_OPTIONS.occupation },
              { l: "個性", k: "personality", o: TAG_OPTIONS.personality },
              { l: "主要興趣", k: "interests", o: TAG_OPTIONS.interests },
            ].map((field: any) => (
              <div key={field.k}>
                <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">
                  {field.l}
                </label>
                <div className="relative">
                  <select
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-300 outline-none appearance-none font-medium text-gray-700"
                    value={(charForm as any)[field.k]}
                    onChange={(e) =>
                      setCharForm({ ...charForm, [field.k]: e.target.value })
                    }
                  >
                    {field.o.map((opt: string) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">
              額外設定 (Prompt)
            </label>
            <textarea
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-300 outline-none h-24 resize-none placeholder:text-gray-400"
              placeholder="例如：他/她來自鄉下，非常喜歡吃辣，有時候會說些冷笑話..."
              value={charForm.customPrompt}
              onChange={(e) =>
                setCharForm({ ...charForm, customPrompt: e.target.value })
              }
            />
          </div>

          <button
            onClick={handleCharSetupSubmit}
            disabled={isGeneratingChar}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-3"
          >
            {isGeneratingChar ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                正在召喚對象中...
              </>
            ) : (
              "生成對象並開始聊天"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderChat = (isHistory = false) => {
    const currentMessages = isHistory
      ? viewingSession?.messages || []
      : messages;
    const currentAffection = isHistory
      ? viewingSession?.affection || 0
      : affection;
    const currentChar = isHistory ? viewingSession?.character : character;
    const avatarUrl =
      currentChar?.avatarUrl || "https://picsum.photos/id/64/200/200";

    let emotionClass = "";
    if (!isHistory) {
      if (currentEmotion === "happy") emotionClass = "emotion-happy";
      else if (currentEmotion === "angry") emotionClass = "emotion-angry";
      else if (currentEmotion === "sad") emotionClass = "emotion-sad";
    }

    return (
      <div className="flex flex-col h-screen overflow-hidden relative">
        {/* Chat Header */}
        <div className="glass px-6 py-4 flex items-center gap-5 shadow-sm z-20">
          {isHistory ? (
            <button
              onClick={() => setStage(GameStage.DASHBOARD)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
            >
              <ArrowLeftIcon />
            </button>
          ) : (
            <button
              onClick={() => setStage(GameStage.DASHBOARD)}
              className="p-2 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition"
              title="離開"
            >
              <ExitIcon />
            </button>
          )}

          <div className="relative group cursor-pointer">
            <img
              src={avatarUrl}
              className={`w-14 h-14 rounded-full border-[3px] border-white shadow-md object-cover transition-all duration-300 ${emotionClass}`}
              alt="Avatar"
            />
            {!isHistory && currentEmotion !== "neutral" && (
              <div className="absolute -bottom-1 -right-1 text-2xl animate-bounce drop-shadow-md">
                {currentEmotion === "happy" && "🥰"}
                {currentEmotion === "angry" && "💢"}
                {currentEmotion === "sad" && "😭"}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-lg leading-tight">
              {currentChar?.name}
            </h3>
            <p className="text-xs font-medium text-gray-500">
              {currentChar?.personality} • {currentChar?.occupation}
            </p>
          </div>

          {/* Affection Meter */}
          <div className="w-1/3 max-w-[160px] flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-rose-600 font-bold mb-1">
              <HeartIcon filled className="w-5 h-5 drop-shadow-sm" />
              <span className="text-lg tabular-nums">{currentAffection}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200/50 rounded-full overflow-hidden shadow-inner backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all duration-700 ease-out"
                style={{ width: `${currentAffection}%` }}
              />
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-transparent">
          {currentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              } animate-slide-up`}
            >
              {msg.sender === "system" ? (
                <div className="w-full text-center my-4">
                  <span className="bg-gray-800/60 backdrop-blur-md text-white text-xs px-4 py-1.5 rounded-full shadow-sm tracking-wide">
                    {msg.text}
                  </span>
                </div>
              ) : (
                <div
                  className={`max-w-[85%] md:max-w-[70%] p-4 shadow-sm relative text-sm md:text-base leading-relaxed
                            ${
                              msg.sender === "user"
                                ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-2xl rounded-tr-none shadow-rose-200"
                                : "bg-white/90 backdrop-blur-sm text-gray-800 rounded-2xl rounded-tl-none border border-white shadow-gray-200"
                            }`}
                >
                  <p>{msg.text}</p>

                  {isHistory &&
                    msg.sender === "ai" &&
                    msg.affectionChange !== 0 &&
                    msg.affectionChange !== undefined && (
                      <div
                        className={`absolute -bottom-6 left-0 text-xs font-bold px-2 py-0.5 rounded ${
                          msg.affectionChange > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {msg.affectionChange > 0 ? "+" : ""}
                        {msg.affectionChange} ({msg.reason})
                      </div>
                    )}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white/80 backdrop-blur-sm px-5 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        {!isHistory && (
          <div className="p-4 bg-transparent z-20">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="glass p-2 rounded-[2rem] flex gap-2 shadow-lg ring-1 ring-white/50"
            >
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={
                  activeEvent !== EventTrigger.NONE
                    ? "⚠️ 等待事件完成..."
                    : "說點什麼..."
                }
                disabled={activeEvent !== EventTrigger.NONE || isTyping}
                className="flex-1 bg-transparent px-5 py-3 outline-none text-gray-700 placeholder:text-gray-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={
                  activeEvent !== EventTrigger.NONE ||
                  isTyping ||
                  !inputMsg.trim()
                }
                className="bg-rose-500 text-white p-3.5 rounded-full hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 transition shadow-md hover:scale-105 active:scale-95"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  const renderModal = () => {
    if (
      activeEvent === EventTrigger.NONE &&
      !eventFeedback &&
      !isProcessingEvent
    )
      return null;

    // Loading Overlay
    if (isProcessingEvent) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-6">
          <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center animate-slide-up shadow-2xl flex flex-col items-center justify-center min-h-[200px]">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-rose-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-20 h-20 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {activeEvent === EventTrigger.OUTFIT_65
                ? "正在評價穿搭..."
                : "正在規劃行程..."}
            </h3>
            <p className="text-gray-500 text-sm">請稍候，對方正在思考中...</p>
          </div>
        </div>
      );
    }

    // Feedback Overlay
    if (eventFeedback) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-6">
          <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center animate-slide-up shadow-2xl">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">對方的想法</h3>
            <p className="text-gray-600 text-lg italic leading-relaxed">
              "{eventFeedback}"
            </p>
            <div className="mt-6 h-1 w-20 bg-rose-200 mx-auto rounded-full"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
        {activeEvent === EventTrigger.DATE_PLAN_35 && (
          <DatePlanModule onConfirm={handleDateConfirm} />
        )}
        {activeEvent === EventTrigger.OUTFIT_65 && (
          <OutfitModule
            gender={user?.gender || "女性"}
            onConfirm={handleOutfitConfirm}
          />
        )}
        {activeEvent === EventTrigger.GIFT_99 && (
          <GiftModule
            gifts={giftOptions}
            onSelect={handleGiftSelect}
            isLoading={isGeneratingGifts}
            loadingText={loadingProgress}
          />
        )}
      </div>
    );
  };

  const renderGameOver = (win: boolean) => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center animate-fade-in overflow-hidden">
      {/* Background blobs */}
      <div
        className={`absolute top-0 left-0 w-full h-full opacity-20 ${
          win
            ? "bg-gradient-to-br from-rose-500 to-purple-800"
            : "bg-gradient-to-b from-gray-800 to-black"
        }`}
      ></div>

      <div className="relative z-10 max-w-lg w-full">
        <h1
          className={`text-6xl font-bold mb-8 tracking-tight ${
            win
              ? "text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-pink-300 drop-shadow-lg"
              : "text-gray-400"
          }`}
        >
          {win ? "攻略成功!" : "攻略失敗..."}
        </h1>

        <div className="relative w-64 h-64 mx-auto mb-10">
          <div
            className={`absolute inset-0 rounded-full blur-2xl opacity-50 ${
              win ? "bg-rose-500 animate-pulse" : "bg-gray-600"
            }`}
          ></div>
          <img
            src={character?.avatarUrl || "https://picsum.photos/id/237/300/300"}
            className={`relative w-full h-full rounded-full border-8 object-cover shadow-2xl ${
              win ? "border-rose-500" : "border-gray-700 grayscale blur-[2px]"
            }`}
            alt="Result"
          />
          <div
            className={`absolute -bottom-4 right-4 text-6xl drop-shadow-lg animate-bounce`}
          >
            {win ? "💖" : "💔"}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 mb-8">
          <p className="text-xl font-medium leading-relaxed">
            {win
              ? `${character?.name} 被你的真誠打動了，這段關係將會是美好的開始。`
              : `${character?.name} 似乎對你沒有心動的感覺，也許下一個人會更好。`}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setStage(GameStage.DASHBOARD)}
            className="px-8 py-3 border-2 border-white/30 rounded-full hover:bg-white hover:text-gray-900 transition font-bold backdrop-blur-sm"
          >
            回主選單
          </button>
          <button
            onClick={confirmNewGame}
            className={`px-8 py-3 rounded-full font-bold shadow-lg transition transform hover:scale-105 ${
              win
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          >
            再試一次
          </button>
        </div>
      </div>
    </div>
  );

  // --- Main Switch ---

  return (
    <>
      <APIModeIndicator />
      {stage === GameStage.LOGIN && renderLogin()}
      {stage === GameStage.PROFILE_SETUP && renderProfileSetup()}
      {stage === GameStage.DASHBOARD && renderDashboard()}
      {stage === GameStage.CHAR_SETUP && renderCharSetup()}
      {stage === GameStage.GAME_LOOP && (
        <>
          {renderChat(false)}
          {renderModal()}
        </>
      )}
      {stage === GameStage.HISTORY_VIEW && renderChat(true)}
      {stage === GameStage.GAME_OVER_WIN && renderGameOver(true)}
      {stage === GameStage.GAME_OVER_LOSS && renderGameOver(false)}
    </>
  );
}
