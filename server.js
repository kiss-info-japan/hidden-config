import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

// 📌 診断テストの進行API
app.post("/chat", async (req, res) => {
    try {
        const { userId, responses } = req.body;
        if (!userId || !responses) {
            return res.status(400).json({ error: "userIdとresponsesが必要です。" });
        }

        // 📌 AI に送るプロンプト（質問はクライアントが管理）
        const diagnosisPrompt = `
        以下の質問と回答を元に、ユーザーに最適な宗教を提案してください。

        【質問と回答】
        ${responses.map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.answer}`).join("\n")}

        【出力フォーマット】
        - **診断結果:** 「○○」
        - **診断理由:** ユーザーの回答から、なぜこの宗教が適切なのかを論理的に説明してください。
        `;

        const response = await fetch(MISTRAL_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${MISTRAL_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "mistral-medium",
                messages: [{ role: "user", content: diagnosisPrompt }],
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("🚨 Mistral API エラー:", data);
            throw new Error(data.error || "Mistral API error");
        }

        res.json({ reply: data.choices[0].message.content.trim() });
    } catch (error) {
        console.error("🚨 サーバーエラー:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 サーバーがポート ${PORT} で起動しました`);
});
