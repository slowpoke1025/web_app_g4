// services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { Character, CharacterAttributes, GiftOption, Message } from "../types";

// ============ 配置區 ============
const API_MODE = process.env.VITE_API_MODE || "frontend"; // 'frontend' or 'backend'
const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:3001";

// Frontend mode only
const apiKey = process.env.VITE_GEMINI_API_KEY || "";
const ai = API_MODE === "frontend" ? new GoogleGenAI({ apiKey }) : null;
const MODEL_NAME = "gemini-2.5-flash";
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

// ============ Helper Functions ============

/**
 * Generates the system instruction for the AI character based on user inputs.
 */
export const generateCharacterPersona = (
  attrs: CharacterAttributes
): string => {
  return `
    你是一個戀愛模擬遊戲中的角色。請全程使用繁體中文（台灣用語）進行角色扮演。
    你的設定如下：
    - 性別: ${attrs.gender}
    - 年齡區間: ${attrs.ageRange}
    - 個性: ${attrs.personality}
    - 興趣: ${attrs.interests}
    - 職業: ${attrs.occupation}
    - 額外設定: ${attrs.customPrompt}
    指令：
    1. 隨時保持角色設定，不要跳脫角色 (Break character)。
    2. 自然地回應使用者的訊息。
    3. 如果對話冷場，請根據你的興趣主動提問。
    4. 你內心有一個「好感度計量表」，你會根據使用者的訊息來評價。
    5. 回覆請簡潔（通常在 3 句話以內），除非你在說故事。
    6. 請用繁體中文回答。
  `;
};

// ============ Backend API Calls ============

const callBackendAPI = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Backend API call failed (${endpoint}):`, error);
    throw error;
  }
};

// ============ Avatar Generation ============

export async function generateRealisticAvatar(
  gender: string,
  personality: string,
  occupation: string
): Promise<string> {
  if (API_MODE === "backend") {
    try {
      const result = await callBackendAPI("avatar/generate", {
        gender,
        personality,
        occupation,
      });
      return result.avatarUrl;
    } catch (error) {
      return "https://picsum.photos/id/64/400/400";
    }
  }

  // Frontend mode
  const prompt = `
    A high-quality, photorealistic close-up portrait of a real person.
    Gender: ${gender}.
    Age: Young adult / Adult.
    Personality vibe: ${personality}.
    Occupation hint: ${occupation}.
    Asian Taiwanese
    Style: Professional photography, studio lighting, sharp focus, facing camera directly, neutral background.
    Do NOT generate cartoons, anime, or drawings. It must look like a real photo of a person.
  `;

  try {
    const response = await ai!.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: prompt }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return "https://picsum.photos/id/64/400/400";
  } catch (error) {
    console.error("Avatar Gen Error:", error);
    return "https://picsum.photos/id/64/400/400";
  }
}

// ============ Chat ============

export async function chatWithCharacter(
  character: Character,
  history: Message[],
  userMessage: string
): Promise<{ text: string; affectionChange: number; reason: string }> {
  if (API_MODE === "backend") {
    try {
      return await callBackendAPI("chat", {
        character,
        history,
        userMessage,
      });
    } catch (error) {
      return {
        text: "我有點頭暈... (連線錯誤)",
        affectionChange: 0,
        reason: "Backend Error",
      };
    }
  }

  // Frontend mode
  const conversationContext = history
    .slice(-10)
    .map((m) => `${m.sender}: ${m.text}`)
    .join("\n");
  const prompt = `
    目前的對話紀錄：
    ${conversationContext}
    
    使用者: ${userMessage}
    任務：
    1. 根據你的個性 (${character.personality}) 和興趣 (${character.interests}) 分析使用者的訊息。
    2. 決定「好感度變化分數」 (整數，範圍 -10 到 +10)。
       - 加分: 稱讚、共同興趣、幽默、體貼。
       - 扣分: 無禮、無聊、禁忌話題、尷尬、敷衍。
    3. 生成角色回應 (繁體中文)。
    請只輸出 JSON 格式。
  `;

  try {
    const response = await ai!.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: character.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            affectionChange: { type: Type.INTEGER },
            reason: { type: Type.STRING },
          },
          required: ["reply", "affectionChange", "reason"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return {
      text: data.reply || "...",
      affectionChange: data.affectionChange || 0,
      reason: data.reason || "無原因",
    };
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return {
      text: "我有點頭暈... (AI 錯誤)",
      affectionChange: 0,
      reason: "Error",
    };
  }
}

// ============ Date Plan Evaluation ============

export async function evaluateDatePlan(
  character: Character,
  choices: { morning: string; afternoon: string; evening: string }
): Promise<{
  feedback: string;
  scoreBonus: number;
  satisfaction: "happy" | "neutral" | "sad";
}> {
  if (API_MODE === "backend") {
    try {
      return await callBackendAPI("date/evaluate", { character, choices });
    } catch (error) {
      return {
        feedback: "這次約會... 挺特別的。",
        scoreBonus: 0,
        satisfaction: "neutral",
      };
    }
  }

  // Frontend mode
  const prompt = `
    使用者為你安排了一整天的約會行程。
    早上: ${choices.morning}
    下午: ${choices.afternoon}
    晚上: ${choices.evening}
    請根據你的個性 (${character.personality}) 和興趣 (${character.interests}) 嚴格評價這次約會。
    有些選項是非常糟糕的（例如去墓地、放鳥、髒亂的環境），遇到這些選項請務必給予負分。
    
    回傳 JSON:
    - feedback: 一段約 50-80 字的約會心得 (繁體中文)，如果很不滿意請直接表達生氣或失望。
    - satisfaction: "happy" (很滿意), "neutral" (普通), "sad" (不滿意/生氣)。
    - scoreBonus: 
      - 如果行程完美符合喜好: +5 到 +10
      - 如果行程普通: +1 到 +4
      - 如果行程包含糟糕選項或不符合喜好: -5 到 -10 (請不要客氣，該扣分就扣分)
  `;

  try {
    const response = await ai!.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: character.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            satisfaction: {
              type: Type.STRING,
              enum: ["happy", "neutral", "sad"],
            },
            scoreBonus: { type: Type.INTEGER },
          },
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {
      feedback: "這次約會... 挺特別的。",
      scoreBonus: 0,
      satisfaction: "neutral",
    };
  }
}

// ============ Outfit Image Generation ============

export async function generateOutfitImage(
  description: string,
  gender: string
): Promise<string> {
  if (API_MODE === "backend") {
    try {
      const result = await callBackendAPI("outfit/image", {
        description,
        gender,
      });
      return result.imageUrl;
    } catch (error) {
      return "https://picsum.photos/400/600";
    }
  }

  // Frontend mode
  const prompt = `
    Full body fashion photography of a person wearing: ${description}.
    The person should be facing forward and taiwanese looking.
    casual, neutral studio background.
    Focus on the clothes.
  `;

  try {
    const response = await ai!.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: prompt }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return "https://picsum.photos/400/600";
  } catch (error) {
    console.error("Image Gen Error:", error);
    return "https://picsum.photos/400/600";
  }
}

// ============ Outfit Evaluation ============

export async function evaluateOutfit(
  character: Character,
  outfitDescription: string
): Promise<{
  feedback: string;
  scoreBonus: number;
  satisfaction: "happy" | "neutral" | "sad";
}> {
  if (API_MODE === "backend") {
    try {
      return await callBackendAPI("outfit/evaluate", {
        character,
        outfitDescription,
      });
    } catch (error) {
      return {
        feedback: "嗯... 這穿搭挺有創意的。",
        scoreBonus: 0,
        satisfaction: "neutral",
      };
    }
  }

  // Frontend mode
  const prompt = `
    使用者為了和你的約會，穿搭了以下服裝：
    ${outfitDescription}
    你的喜好：
    - 個性: ${character.personality}
    - 興趣: ${character.interests}
    - 職業: ${character.occupation}
    請評價這套衣服是否得體、是否符合你的審美觀。
    注意：如果使用者穿著怪異（如小丑假髮、睡衣、泳衣、指虎），請務必給予強烈的負評和扣分。
    
    回傳 JSON:
    - feedback: 一段約 30-50 字的評價 (繁體中文)，如果是怪異穿搭請表現出驚嚇或嫌棄。
    - satisfaction: "happy" (好看), "neutral" (普通), "sad" (難看/怪異)。
    - scoreBonus:
      - 非常好看/符合喜好: +5 到 +10
      - 普通: +0 到 +3
      - 怪異/隨便/糟糕: -5 到 -10
  `;

  try {
    const response = await ai!.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: character.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            satisfaction: {
              type: Type.STRING,
              enum: ["happy", "neutral", "sad"],
            },
            scoreBonus: { type: Type.INTEGER },
          },
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {
      feedback: "嗯... 這穿搭挺有創意的。",
      scoreBonus: 0,
      satisfaction: "neutral",
    };
  }
}

// ============ Gift Image Generation ============

export async function generateGiftImage(description: string): Promise<string> {
  if (API_MODE === "backend") {
    try {
      const result = await callBackendAPI("gift/image", { description });
      return result.imageUrl;
    } catch (error) {
      return "https://picsum.photos/200";
    }
  }

  // Frontend mode
  const prompt = `
    A high-quality product photography of ${description}.
    Style: Minimalist, studio lighting, white or neutral background, photorealistic.
    The object should be centered.
    Do NOT generate text or labels in the image.
  `;

  try {
    const response = await ai!.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: prompt }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return "https://picsum.photos/200";
  } catch (error) {
    console.error("Gift Image Gen Error:", error);
    return "https://picsum.photos/200";
  }
}

// ============ Gift Options Generation ============

export async function generateGiftOptions(
  character: Character,
  history: Message[],
  onProgress?: (msg: string) => void
): Promise<GiftOption[]> {
  if (API_MODE === "backend") {
    try {
      if (onProgress) onProgress("正在分析對方的喜好...");
      const result = await callBackendAPI("gift/options", {
        character,
        history,
      });
      if (onProgress) onProgress("禮物準備完成！");
      return result.gifts;
    } catch (error) {
      if (onProgress) onProgress("發生錯誤，使用備用方案...");
      return [
        {
          id: "g1",
          name: "神秘禮物",
          description: "連線失敗，這是一個神秘禮物。",
          isLiked: true,
          imageUrl: "https://picsum.photos/200",
        },
        {
          id: "g2",
          name: "鮮花",
          description: "經典的選擇。",
          isLiked: true,
          imageUrl: "https://picsum.photos/201",
        },
        {
          id: "g3",
          name: "石頭",
          description: "就是一顆石頭。",
          isLiked: false,
          imageUrl: "https://picsum.photos/202",
        },
      ];
    }
  }

  // Frontend mode
  const context = history
    .slice(-20)
    .map((m) => m.text)
    .join(" ");

  if (onProgress) onProgress("正在分析對方的喜好...");

  const prompt = `
    根據我們的對話紀錄和我的個性，建議 3 個告白禮物選項。
    
    規則：
    1. 第一個禮物：我會「非常喜歡」的完美禮物。
    2. 第二個禮物：稍微普通一點，但我還是會接受的禮物。
    3. 第三個禮物：我會「討厭」或覺得「莫名其妙」的地雷禮物（例如：不雅物品、沒有聊過或是顯然不適合我的東西）。
    
    回傳包含 3 個物件的 JSON 陣列 (繁體中文)。
    imageUrl 欄位請提供一個英文描述詞 (Prompt)，用來生成這個禮物的圖片。描述需具體（例如包含顏色、材質）。
    isLiked 欄位：喜歡/普通為 true, 討厭為 false。
  `;

  try {
    const response = await ai!.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: character.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              isLiked: { type: Type.BOOLEAN },
              imageUrl: {
                type: Type.STRING,
                description: "用來生成圖片的英文 Prompt",
              },
            },
          },
        },
      },
    });

    if (onProgress) onProgress("正在生成禮物清單...");
    const rawItems = JSON.parse(response.text || "[]");

    let completedCount = 0;
    const total = rawItems.length;
    if (onProgress) onProgress(`正在繪製禮物圖片 (0/${total})...`);

    const gifts = await Promise.all(
      rawItems.map(async (item: any, index: number) => {
        const imageBase64 = await generateGiftImage(item.imageUrl || item.name);
        completedCount++;
        if (onProgress)
          onProgress(`正在繪製禮物圖片 (${completedCount}/${total})...`);

        return {
          id: `gift-${index}`,
          name: item.name,
          description: item.description,
          isLiked: item.isLiked,
          imageUrl: imageBase64,
        };
      })
    );

    return gifts;
  } catch (e) {
    console.error(e);
    if (onProgress) onProgress("發生錯誤，使用備用方案...");

    return [
      {
        id: "g1",
        name: "神秘禮物",
        description: "AI 似乎累了，這是一個神秘禮物。",
        isLiked: true,
        imageUrl: "https://picsum.photos/200",
      },
      {
        id: "g2",
        name: "鮮花",
        description: "經典的選擇。",
        isLiked: true,
        imageUrl: "https://picsum.photos/201",
      },
      {
        id: "g3",
        name: "石頭",
        description: "就是一顆石頭。",
        isLiked: false,
        imageUrl: "https://picsum.photos/202",
      },
    ];
  }
}

// ============ Export API Mode Info ============
export const getAPIMode = () => API_MODE;
export const getBackendURL = () => BACKEND_URL;
