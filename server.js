

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_API_KEY) {
    console.error("🚨 MISTRAL_API_KEY が設定されていません！.env ファイルを確認してください。");
    process.exit(1);
}

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

// 📌 ユーザーごとの診断データを保存
const userSessions = {};

// 📌 診断テスト開始API
app.post('/start-diagnosis', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "userId が必要です。" });
    }

    try {
        // AIに診断用の質問を生成させる
        const questionPrompt = `
        宗教観を診断するための質問を15個考えてください。
        - 自由回答形式の質問にすること。
        - 日本語で、不自然な言い回しにならないようにする。
        - 信仰、価値観、運命、神、死後の世界、魂などに関する知識がなく、価値観が決まり切っていないユーザーであっても、自らの価値観を改めて考えながら判断できるような質問にする。
        
        例:  
1. あなたにとって「心が落ち着く瞬間」はどんなときですか？  
2. 何か大きな困難に直面したとき、どんなふうに乗り越えようとしますか？  
3. 何かを「正しい」「間違っている」と判断するとき、どんな基準を大切にしていますか？  
4. 「目に見えないもの」に影響されることはあると思いますか？それはどんなものですか？  
5. もし、今とは違う文化や時代に生まれていたら、あなたの価値観はどう変わると思いますか？  
6. あなたが「これは絶対に守りたい」と思うルールや考え方は何ですか？  
7. 誰かに助けてもらった経験があれば、それはどんな状況でしたか？  
8. 逆に、誰かを助けた経験があれば、それはどんな状況でしたか？  
9. 「運がいい」「運が悪い」と感じるのはどんなときですか？  
10. 自分が大事にしている習慣や儀式のようなものはありますか？それはどんなものですか？
        `;

        const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistral-medium',
                messages: [{ role: 'user', content: questionPrompt }]
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("🚨 Mistral API エラー:", data);
            throw new Error(data.error || 'Mistral API error');
        }

        // 質問リストを取得
        const questions = data.choices[0].message.content
            .split('\n')
            .map(q => q.replace(/^\d+\.\s*/, '').trim())
            .filter(q => q.length > 0);

        if (questions.length < 15) {
            return res.status(500).json({ error: "質問の生成に失敗しました。" });
        }

        // ユーザーのセッションを作成
        userSessions[userId] = { questions, answers: [] };

        // 最初の質問を送信
        res.json({ reply: `Hidden Config\n\n多くの日本人は無宗教とされるが、実際には文化や社会的影響によって無意識のうちに信念が形成されている。\n\nそして、その信念はPCの隠し設定（Hidden Config）のように、私たちの言動に知らず知らずのうちに作用し続ける。\n\nこのサイトでは、AIが生成した15の質問に答えることで、あなたに最適な宗教が提案される。\n\nその結果に違和感を覚えたなら、\n\nそれは無自覚の信念があなたの思考を支配していることに気づく瞬間であり、\n\n同時に、あなたの中にすでに宗教が存在していることに気づく瞬間でもある。\n\n\n\n診断を開始\n${questions[0]}` });

    } catch (error) {
        console.error("🚨 サーバーエラー:", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 診断テストの進行API
app.post('/chat', async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ error: "userIdとmessageが必要です。" });
        }

        // 診断セッションがない場合
        if (!userSessions[userId]) {
            return res.status(400).json({ error: "診断がまだ開始されていません。" });
        }

        const session = userSessions[userId];
        session.answers.push(message);

        // 次の質問を送る
        const nextQuestionIndex = session.answers.length;
        if (nextQuestionIndex < session.questions.length) {
            res.json({
                reply: `${nextQuestionIndex + 1}番目の質問:\n${session.questions[nextQuestionIndex]}`
            });
        } else {
            // 📌 診断ロジック（Mistral AI に依頼）
            const diagnosisPrompt = `
            以下の質問と回答に基づき、ユーザーの行動原理を支える「Hidden Config」を解析し、最適な「Installed Religion」を表示してください。

            【診断ルール】
            - 以下のリストから最も適したものを1つ選択してください。
        【リスト】
- "イスラム教", "ヒンドゥー教", "仏教", "シク教", "ユダヤ教", "道教", "バハーイ教", "神道", "ゾロアスター教", "シャーマニズム", "サタニズム", "クリスチャン・サイエンス", "ムスリム・シーア派", "ムスリム・スンニ派", "モルモン教", "アフリカ伝統宗教", "カバラ", "ヴィシュヌ教", "ジャイナ教", "ローマカトリック", "プロテスタント", "アングリカン教", "ニコラウス主義", "メソポタミア宗教", "エジプト神殿信仰", "アステカ宗教", "インカ宗教", "ノルディック宗教", "シュメール宗教", "アニミズム", "ヘブライ宗教", "タオイ", "ナバホ教", "ケルト宗教", "バーニズム", "ザラスシュトラ教", "インディアン宗教", "チベット仏教", "スピリチュアリズム", "サンテリア", "ヴードゥー", "オリシャ信仰", "ウィッカ"  

            質問と回答:
            ${session.questions.map((q, i) => `Q: ${q}\nA: ${session.answers[i]}`).join('\n')}

            【出力フォーマット】
            - **診断結果:** 「Installed Religion: ○○」
            - **診断レポート:**
              - ○○がどのような信念体系であるかを日本語で簡潔に説明してください。
              - なぜユーザーのHidden Configに適合するのかを論理的に説明してください。
              - その宗教の歴史的背景および社会文化的影響を簡潔に提示してください。
            - **ユーザーの行動傾向分析:**
              - 回答内容から導き出せるユーザーの行動原理、思想的傾向を記述してください。
              - 「信仰」「秩序」「自由」「合理」「霊性」などの軸で分類し、どの特性が強いか示してください。
            `;

            const diagnosisResponse = await fetch(MISTRAL_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'mistral-medium',
                    messages: [{ role: 'user', content: diagnosisPrompt }]
                })
            });

            const diagnosisData = await diagnosisResponse.json();
            if (!diagnosisResponse.ok) {
                console.error("🚨 診断APIエラー:", diagnosisData);
                throw new Error(diagnosisData.error || 'Mistral API error');
            }

            // 📌 診断結果を取得
            const diagnosisResult = diagnosisData.choices[0].message.content.trim();

            // 診断結果をユーザーに送信
            res.json({
                reply: `診断が完了しました！\n\n${diagnosisResult}`
            });

            // 診断結果を保存（任意）
            session.diagnosis = diagnosisResult;
        }
    } catch (error) {
        console.error("🚨 エラー:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 サーバーがポート ${PORT} で起動しました`);
});
