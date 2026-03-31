/**
 * smart-reply.js
 * Adds keyword + sentiment awareness to the reply pool selection.
 * Supports both English and Chinese (Simplified & Traditional).
 *
 * Usage (called from core.js):
 *   const replyText = window.SmartReply.pick(replyPool, lastUserMessage);
 *
 * Logic:
 *   1. Extract keywords + sentiment from the last user message
 *   2. Score every card in replyPool against those signals
 *   3. Pick randomly from the best-scoring tier, falling back to full random
 */

(function (window) {
    'use strict';

    // ─── Language detection ───────────────────────────────────────────────────
    function isChinese(text) {
        if (!text) return false;
        const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
        return cjkCount / text.length > 0.2;
    }

    // ─── English stopwords ────────────────────────────────────────────────────
    const STOPWORDS_EN = new Set([
        'the','a','an','is','are','was','were','be','been','being',
        'have','has','had','do','does','did','will','would','could','should',
        'may','might','must','shall','can','need','dare','ought','used',
        'i','me','my','myself','we','our','ours','ourselves',
        'you','your','yours','yourself','yourselves',
        'he','him','his','himself','she','her','hers','herself',
        'it','its','itself','they','them','their','theirs','themselves',
        'what','which','who','whom','this','that','these','those',
        'am','at','by','for','in','of','on','to','up','as','or','and',
        'but','if','so','yet','both','either','neither','not','no',
        'just','about','above','after','before','between','into',
        'through','during','with','without','than','then','when',
        'where','why','how','all','any','each','few','more','most',
        'other','some','such','only','own','same','too','very',
        'also','here','there','well','even','still','back','way',
        'get','got','go','went','come','came','know','think','want',
        'like','make','see','look','really','okay','ok','yes','yeah',
        'no','nah','oh','ah','um','uh','wow','hey','hi','hello',
        'lol','haha','omg','btw','tbh','imo','idk','ngl',
    ]);

    // ─── Chinese stopwords ────────────────────────────────────────────────────
    const STOPWORDS_ZH = new Set([
        '的','了','是','在','我','有','和','就','不','人','都','一',
        '上','也','很','到','说','要','去','你','会','着','没有',
        '看','好','自己','这','那','里','来','对','我们','他','她','它',
        '过','把','被','让','给','从','与','及','或','但',
        '因为','所以','如果','虽然','但是','然后','这个','那个','什么',
        '怎么','为什么','哪','哪里','谁','吗','呢','啊','哦','嗯','哈',
        '哈哈','嘻嘻','呀','哇','喔','唉','哎','诶','哎呀','这样','那样',
        '可以','应该','需要','想','能','会','做','用','让','被','把',
        '已经','还是','只是','只有','而且','并且','不过','其实','其他',
        '所有','每个','有些','一些','这些','那些','这里','那里',
        '现在','以前','之后','之前','今天','明天','昨天','时候','时间',
        '一下','一点','一些','有点','有些','非常','特别','真的','确实',
    ]);

    // ─── Sentiment word lists (English + Chinese) ─────────────────────────────
    const SENTIMENT = {
        happy: {
            en: [
                'happy','glad','great','love','wonderful','amazing','awesome',
                'good','nice','yay','excited','joy','joyful','fantastic',
                'blessed','grateful','thankful','perfect','beautiful','fun',
                'laugh','laughing','lol','haha','hehe','cute','sweet',
                'yep','sure','definitely','absolutely','miss','missed',
                'hugs','hug','kiss','kisses','heart','hearts',
                '❤','💕','😊','😄','😍','🥰','😂','🎉','✨','💖',
            ],
            zh: [
                '开心','高兴','快乐','幸福','好棒','棒','太好了','哈哈',
                '嘻嘻','爱','爱你','想你','好想','喜欢','超喜欢','好爱',
                '开朗','温柔','美好','太棒了','赞','好耶','耶','嗯嗯',
                '好的','当然','没问题','么么','抱抱','亲亲','宝贝','乖',
                '甜','甜甜','可爱','好可爱','谢谢','感谢','感动','幸运',
                '满足','治愈','舒服','放松','期待','惊喜','好期待',
            ],
        },
        sad: {
            en: [
                'sad','unhappy','upset','cry','crying','tears','miss','missed',
                'lonely','alone','heartbroken','hurt','pain','sorry','depressed',
                'down','bad','terrible','awful','horrible','worst','hate',
                'tired','exhausted','lost','confused','worried','anxious',
                '😢','😭','💔','😔','😞','😟','🥺',
            ],
            zh: [
                '难过','伤心','哭','哭了','泪','泪目','委屈','心疼','痛',
                '好痛','受伤','孤独','寂寞','孤单','一个人','失落','沮丧',
                '抑郁','低落','不开心','心情不好','难受','好难受','很难受',
                '好累','累了','累死了','好烦','烦死了','崩溃','心碎','绝望',
                '消极','负能量','不想','算了','放弃','怎么办','无语','呜呜',
                '呜','唉','哎','好惨','惨了','可怜','心塞','扎心',
            ],
        },
        angry: {
            en: [
                'angry','mad','annoyed','frustrated','irritated','furious',
                'hate','stupid','idiot','dumb','ridiculous','seriously',
                'unbelievable','ugh','argh','wtf','damn','hell','whatever',
                'fed up','sick of','done with',
                '😤','😠','😡','🤬','💢',
            ],
            zh: [
                '生气','愤怒','火大','烦死了','气死我了','气死了','讨厌',
                '好烦','讨厌死了','受不了','忍不了',
                '无语','太无语了','服了','服了你了','蠢','笨','傻',
                '真的假的','不是吧','什么玩意','搞什么','别烦我',
                '有完没完','够了','不想管','随便',
            ],
        },
        nervous: {
            en: [
                'nervous','anxious','scared','afraid','worried','stress',
                'stressed','panic','terrified','fear','uncertain','unsure',
                'doubt','hesitate','hope','hopefully','maybe','perhaps',
                '😰','😨','😧','🤔','😬',
            ],
            zh: [
                '紧张','焦虑','害怕','担心','担忧','恐慌','慌','慌了',
                '好怕','怕怕','不安','不确定','迷茫','纠结','纠结死了',
                '怎么办','咋办','没把握','没信心','忐忑','犹豫',
                '希望','但愿','也许','可能','大概','万一',
            ],
        },
        bored: {
            en: [
                'bored','boring','meh','whatever','idc','nothing','idle',
                'nothing to do','so bored','dead','slow','dull','blah',
            ],
            zh: [
                '好无聊','无聊','闷','闷死了','没意思','没劲','发呆',
                '闲着','没事做','好无趣','无趣','不知道做什么',
                '发愣','愣着','空虚','无所谓',
            ],
        },
    };

    // Pre-build reverse lookup: word → sentiment label
    const WORD_TO_SENTIMENT = {};
    for (const [label, langs] of Object.entries(SENTIMENT)) {
        for (const words of Object.values(langs)) {
            for (const w of words) {
                WORD_TO_SENTIMENT[w] = label;
            }
        }
    }

    // ─── Tokenisers ───────────────────────────────────────────────────────────

    function tokeniseEN(text) {
        if (!text) return [];
        return text
            .toLowerCase()
            .split(/[\s.,!?;:()\[\]{}"'\u2026\-\u2013\u2014\/\\]+/)
            .map(t => t.trim())
            .filter(t => t.length > 1 || /\p{Emoji}/u.test(t));
    }

    /**
     * Chinese tokeniser: generates 1–4-char n-grams from CJK runs.
     * No external segmenter needed — phrase matching via substring works well
     * for short chat messages.
     */
    function tokeniseZH(text) {
        if (!text) return [];
        const tokens = new Set();

        // Emoji
        const emojiMatches = text.match(/\p{Emoji}/gu) || [];
        emojiMatches.forEach(e => tokens.add(e));

        // CJK n-grams (1–4 chars)
        const runs = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]+/g) || [];
        for (const run of runs) {
            for (let len = 1; len <= 4; len++) {
                for (let i = 0; i <= run.length - len; i++) {
                    tokens.add(run.slice(i, i + len));
                }
            }
        }

        // Any Latin words embedded in Chinese text (e.g. "omg好烦")
        const latinRuns = text.toLowerCase().match(/[a-z]{2,}/g) || [];
        latinRuns.forEach(w => tokens.add(w));

        return [...tokens];
    }

    function tokenise(text) {
        if (!text) return [];
        return isChinese(text) ? tokeniseZH(text) : tokeniseEN(text);
    }

    function extractKeywords(text) {
        const tokens = tokenise(text);
        const stopwords = isChinese(text) ? STOPWORDS_ZH : STOPWORDS_EN;
        return tokens.filter(t => !stopwords.has(t));
    }

    /**
     * Detect dominant sentiment. For Chinese, phrase-level matching is weighted
     * by phrase length (longer = more specific = more signal).
     */
    function detectSentiment(text) {
        if (!text) return null;
        const counts = {};

        if (isChinese(text)) {
            for (const [label, langs] of Object.entries(SENTIMENT)) {
                for (const phrase of (langs.zh || [])) {
                    if (phrase.length > 1 && text.includes(phrase)) {
                        counts[label] = (counts[label] || 0) + phrase.length;
                    }
                }
            }
            // Single char / emoji fallback
            for (const token of tokeniseZH(text)) {
                if (WORD_TO_SENTIMENT[token]) {
                    counts[WORD_TO_SENTIMENT[token]] = (counts[WORD_TO_SENTIMENT[token]] || 0) + 1;
                }
            }
        } else {
            for (const token of tokeniseEN(text)) {
                const label = WORD_TO_SENTIMENT[token];
                if (label) counts[label] = (counts[label] || 0) + 1;
            }
        }

        const entries = Object.entries(counts);
        if (!entries.length) return null;
        return entries.sort((a, b) => b[1] - a[1])[0][0];
    }

    /**
     * Score a reply card against user keywords and sentiment.
     *   2 = keyword AND sentiment match
     *   1 = keyword match only
     *   0 = no match
     */
    function scoreCard(cardText, userKeywords, userSentiment) {
        if (!cardText) return 0;

        let keywordHit = false;
        if (isChinese(cardText)) {
            // For Chinese cards, use substring search (works across n-gram boundaries)
            keywordHit = userKeywords.some(kw => kw.length >= 1 && cardText.includes(kw));
        } else {
            const cardTokens = new Set(tokeniseEN(cardText));
            keywordHit = userKeywords.some(k => cardTokens.has(k));
        }

        const cardSentiment = detectSentiment(cardText);
        const sentimentHit = userSentiment && cardSentiment === userSentiment;

        if (keywordHit && sentimentHit) return 2;
        if (keywordHit) return 1;
        return 0;
    }

    function randomFrom(arr) {
        if (!arr || !arr.length) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    function pick(pool, userMessage) {
        if (!pool || !pool.length) return null;
        if (!userMessage || !userMessage.trim()) return randomFrom(pool);

        const userKeywords = extractKeywords(userMessage);
        const userSentiment = detectSentiment(userMessage);

        const scored = pool.map(card => ({
            card,
            score: scoreCard(card, userKeywords, userSentiment),
        }));

        const tier2 = scored.filter(x => x.score === 2).map(x => x.card);
        if (tier2.length) return randomFrom(tier2);

        const tier1 = scored.filter(x => x.score === 1).map(x => x.card);
        if (tier1.length) return randomFrom(tier1);

        return randomFrom(pool);
    }

    /**
     * Debug from browser console:
     *   SmartReply.debug("我今天好累啊")
     *   SmartReply.debug("i'm so tired today")
     */
    function debug(userMessage, pool) {
        const fallbackPool = pool || (window.customReplies || []);
        const userKeywords = extractKeywords(userMessage);
        const userSentiment = detectSentiment(userMessage);
        console.group('[SmartReply] debug');
        console.log('Input       :', userMessage);
        console.log('Language    :', isChinese(userMessage) ? 'Chinese' : 'English');
        console.log('Keywords    :', userKeywords);
        console.log('Sentiment   :', userSentiment);
        const scored = fallbackPool.map(card => ({
            card,
            score: scoreCard(card, userKeywords, userSentiment),
            cardSentiment: detectSentiment(card),
        })).sort((a, b) => b.score - a.score);
        console.table(scored);
        console.log('→ Would pick:', pick(fallbackPool, userMessage));
        console.groupEnd();
    }

    window.SmartReply = { pick, debug, extractKeywords, detectSentiment, isChinese };

})(window);