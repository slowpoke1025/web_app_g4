import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../model/User.js";

const router = express.Router();

// 註冊與登入一體化 API
router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "帳號密碼不能為空" });
    }

    // 1. 尋找使用者
    let user = await User.findOne({ username });
    let isNewUser = false;

    if (!user) {
      // 2. 無則註冊
      isNewUser = true;
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        username,
        password: hashedPassword,
      });
      await user.save();
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "密碼錯誤" });
      }
    }

    // 4. 產生 JWT Token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: isNewUser ? "註冊成功並登入" : "登入成功",
      token,
      user: {
        id: user._id,
        username: user.username,
        gameProgress: user.gameProgress,
      },
    });
  } catch (error) {
    console.error("Auth Route Error:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

export default router;
