require('dotenv').config();
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid request format" });
    }

    const API_KEY = process.env.MISTRAL_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ error: "APIキーが設定されていません" });
    }

    try {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "mistral-medium",
                messages
            })
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error("🚨 Mistral API エラー:", error);
        return res.status(500).json({ error: "Mistral API エラー" });
    }
};
