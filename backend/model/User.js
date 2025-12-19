import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // 預留遊戲存檔空間
  gameProgress: {
    affectionLevel: { type: Number, default: 0 },
    lastChatTimestamp: { type: Date },
    unlockedGifts: [String],
  },
});

export const User = mongoose.model("User", userSchema);
