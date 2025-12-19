// server.js
import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./route/auth.js";

dotenv.config();

// --- MongoDB 連線 ---
mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => console.log("🍃 MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/api/auth", authRoutes);

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = "gemini-2.5-flash";
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

// Helper function to generate character persona
const generateCharacterPersona = (attrs) => {
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

// API Routes

// 1. Generate Avatar
app.post("/api/avatar/generate", async (req, res) => {
  try {
    const { gender, personality, occupation } = req.body;

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

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: { parts: [{ text: prompt }] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({
          avatarUrl: `data:image/png;base64,${part.inlineData.data}`,
        });
      }
    }

    res.json({ avatarUrl: "https://picsum.photos/id/64/400/400" });
  } catch (error) {
    console.error("Avatar generation error:", error);
    res.status(500).json({
      error: "Failed to generate avatar",
      avatarUrl: "https://picsum.photos/id/64/400/400",
    });
  }
});

// 2. Chat with Character
app.post("/api/chat", async (req, res) => {
  try {
    const { character, history, userMessage } = req.body;

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

    const response = await ai.models.generateContent({
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
    res.json({
      text: data.reply || "...",
      affectionChange: data.affectionChange || 0,
      reason: data.reason || "無原因",
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      text: "我有點頭暈... (AI 錯誤)",
      affectionChange: 0,
      reason: "Error",
    });
  }
});

// 3. Evaluate Date Plan
app.post("/api/date/evaluate", async (req, res) => {
  try {
    const { character, choices } = req.body;

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

    const response = await ai.models.generateContent({
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

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error) {
    console.error("Date evaluation error:", error);
    res.json({
      feedback: "這次約會... 挺特別的。",
      scoreBonus: 0,
      satisfaction: "neutral",
    });
  }
});

// 4. Generate Outfit Image
app.post("/api/outfit/image", async (req, res) => {
  try {
    const { description, gender } = req.body;

    const prompt = `
      Full body fashion photography of a person wearing: ${description}.
      The person should be facing forward and taiwanese looking.
      casual, neutral studio background.
      Focus on the clothes.
    `;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: { parts: [{ text: prompt }] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({
          imageUrl: `data:image/png;base64,${part.inlineData.data}`,
        });
      }
    }

    res.json({ imageUrl: "https://picsum.photos/400/600" });
  } catch (error) {
    console.error("Outfit image error:", error);
    res.json({ imageUrl: "https://picsum.photos/400/600" });
  }
});

// 5. Evaluate Outfit
app.post("/api/outfit/evaluate", async (req, res) => {
  try {
    const { character, outfitDescription } = req.body;

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

    const response = await ai.models.generateContent({
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

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error) {
    console.error("Outfit evaluation error:", error);
    res.json({
      feedback: "嗯... 這穿搭挺有創意的。",
      scoreBonus: 0,
      satisfaction: "neutral",
    });
  }
});

// 6. Generate Gift Image
app.post("/api/gift/image", async (req, res) => {
  try {
    const { description } = req.body;

    const prompt = `
      A high-quality product photography of ${description}.
      Style: Minimalist, studio lighting, white or neutral background, photorealistic.
      The object should be centered.
      Do NOT generate text or labels in the image.
    `;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: { parts: [{ text: prompt }] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({
          imageUrl: `data:image/png;base64,${part.inlineData.data}`,
        });
      }
    }

    res.json({ imageUrl: "https://picsum.photos/200" });
  } catch (error) {
    console.error("Gift image error:", error);
    res.json({ imageUrl: "https://picsum.photos/200" });
  }
});

// 7. Generate Gift Options
app.post("/api/gift/options", async (req, res) => {
  try {
    const { character, history } = req.body;
    const context = history
      .slice(-20)
      .map((m) => m.text)
      .join(" ");

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

    const response = await ai.models.generateContent({
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
              imageUrl: { type: Type.STRING },
            },
          },
        },
      },
    });

    const rawItems = JSON.parse(response.text || "[]");

    // Generate images for each gift
    const gifts = await Promise.all(
      rawItems.map(async (item, index) => {
        const imagePrompt = `
        A high-quality product photography of ${item.imageUrl || item.name}.
        Style: Minimalist, studio lighting, white or neutral background, photorealistic.
        The object should be centered.
        Do NOT generate text or labels in the image.
      `;

        try {
          const imgResponse = await ai.models.generateContent({
            model: IMAGE_MODEL_NAME,
            contents: { parts: [{ text: imagePrompt }] },
          });

          for (const part of imgResponse.candidates?.[0]?.content?.parts ||
            []) {
            if (part.inlineData) {
              return {
                id: `gift-${index}`,
                name: item.name,
                description: item.description,
                isLiked: item.isLiked,
                imageUrl: `data:image/png;base64,${part.inlineData.data}`,
              };
            }
          }
        } catch (err) {
          console.error("Gift image generation failed:", err);
        }

        return {
          id: `gift-${index}`,
          name: item.name,
          description: item.description,
          isLiked: item.isLiked,
          imageUrl: `https://picsum.photos/20${index}`,
        };
      })
    );

    res.json({ gifts });
  } catch (error) {
    console.error("Gift options error:", error);
    res.json({
      gifts: [
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
      ],
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", mode: "backend" });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API Mode: Backend`);
});
