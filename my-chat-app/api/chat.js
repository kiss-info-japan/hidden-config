export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
    if (!MISTRAL_API_KEY) {
        return res.status(500).json({ error: "APIキーが設定されていません" });
    }

    const { message } = req.body; // ユーザーの入力メッセージ

    try {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MISTRAL_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "mistral-medium",
                messages: [{ role: "user", content: message }]
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Mistral API error");
        }

        res.status(200).json({ reply: data.choices[0].message.content.trim() });

    } catch (error) {
        console.error("🚨 APIエラー:", error);
        res.status(500).json({ error: error.message });
    }
}
