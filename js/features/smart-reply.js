/**
 * smart-reply.js
 * Adds keyword + sentiment awareness to the reply pool selection.
 *
 * Usage (called from core.js):
 *   const replyText = window.SmartReply.pick(replyPool, lastUserMessage);
 *   // returns a string from replyPool, or null if pool is empty
 *
 * Logic:
 *   1. Extract keywords + sentiment from the last user message
 *   2. Score every card in replyPool against those signals
 *   3. Pick randomly from the best-scoring tier, falling back to full random
 */

(function (window) {
    'use strict';

    // ─── Stopwords ────────────────────────────────────────────────────────────
    // Common words that carry no topical signal.
    const STOPWORDS = new Set([
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

    // ─── Sentiment word lists ─────────────────────────────────────────────────
    const SENTIMENT = {
        happy: [
            'happy','glad','great','love','wonderful','amazing','awesome',
            'good','nice','yay','excited','joy','joyful','fantastic',
            'blessed','grateful','thankful','perfect','beautiful','fun',
            'laugh','laughing','lol','haha','hehe','cute','sweet',
            'yep','sure','definitely','absolutely','of course','miss',
            'missed','hugs','hug','kiss','kisses','heart','hearts',
            '❤','💕','😊','😄','😍','🥰','😂','🎉','✨','💖',
        ],
        sad: [
            'sad','unhappy','upset','cry','crying','tears','miss','missed',
            'lonely','alone','heartbroken','hurt','pain','sorry','depressed',
            'down','bad','terrible','awful','horrible','worst','hate',
            'tired','exhausted','lost','confused','worried','anxious',
            '😢','😭','💔','😔','😞','😟','🥺',
        ],
        angry: [
            'angry','mad','annoyed','frustrated','irritated','furious',
            'hate','stupid','idiot','dumb','ridiculous','seriously',
            'unbelievable','ugh','argh','wtf','damn','hell','whatever',
            'fed up','sick of','done with','can\'t stand',
            '😤','😠','😡','🤬','💢',
        ],
        nervous: [
            'nervous','anxious','scared','afraid','worried','stress',
            'stressed','panic','terrified','fear','uncertain','unsure',
            'doubt','hesitate','hope','hopefully','maybe','perhaps',
            '😰','😨','😧','🤔','😬',
        ],
        bored: [
            'bored','boring','meh','whatever','idc','nothing','idle',
            'nothing to do','so bored','dead','slow','dull','blah',
        ],
    };

    // Pre-build reverse lookup: word → sentiment label
    const WORD_TO_SENTIMENT = {};
    for (const [label, words] of Object.entries(SENTIMENT)) {
        for (const w of words) {
            WORD_TO_SENTIMENT[w] = label;
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Tokenise a string into lowercase meaningful tokens.
     * Keeps emoji characters as single tokens.
     */
    function tokenise(text) {
        if (!text) return [];
        // Split on whitespace / punctuation but keep emoji
        return text
            .toLowerCase()
            .split(/[\s.,!?;:()\[\]{}"'…\-–—\/\\]+/)
            .map(t => t.trim())
            .filter(t => t.length > 1 || /\p{Emoji}/u.test(t));
    }

    /**
     * Extract keyword tokens (stopwords removed).
     */
    function extractKeywords(text) {
        return tokenise(text).filter(t => !STOPWORDS.has(t));
    }

    /**
     * Detect the dominant sentiment in a piece of text.
     * Returns the sentiment label with the most hits, or null.
     */
    function detectSentiment(text) {
        const tokens = tokenise(text);
        const counts = {};
        for (const t of tokens) {
            const label = WORD_TO_SENTIMENT[t];
            if (label) counts[label] = (counts[label] || 0) + 1;
        }
        const entries = Object.entries(counts);
        if (!entries.length) return null;
        return entries.sort((a, b) => b[1] - a[1])[0][0];
    }

    /**
     * Score a reply card against a set of user keywords and a sentiment label.
     * Returns:
     *   2 = keyword AND sentiment match
     *   1 = keyword match only
     *   0 = no match
     */
    function scoreCard(cardText, userKeywords, userSentiment) {
        if (!cardText) return 0;
        const cardTokens = new Set(tokenise(cardText));
        const cardKeywords = new Set([...cardTokens].filter(t => !STOPWORDS.has(t)));
        const cardSentiment = detectSentiment(cardText);

        const keywordHit = userKeywords.some(k => cardKeywords.has(k));
        const sentimentHit = userSentiment && cardSentiment === userSentiment;

        if (keywordHit && sentimentHit) return 2;
        if (keywordHit) return 1;
        return 0;
    }

    /**
     * Pick a random item from an array.
     */
    function randomFrom(arr) {
        if (!arr || !arr.length) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Main entry point.
     *
     * @param {string[]} pool         - The already-filtered reply pool
     * @param {string}   userMessage  - The last message the user sent
     * @returns {string|null}         - A chosen reply string, or null if pool empty
     */
    function pick(pool, userMessage) {
        if (!pool || !pool.length) return null;

        // No user message → pure random
        if (!userMessage || !userMessage.trim()) return randomFrom(pool);

        const userKeywords = extractKeywords(userMessage);
        const userSentiment = detectSentiment(userMessage);

        // Score every card
        const scored = pool.map(card => ({
            card,
            score: scoreCard(card, userKeywords, userSentiment),
        }));

        // Tier 2: keyword + sentiment match
        const tier2 = scored.filter(x => x.score === 2).map(x => x.card);
        if (tier2.length) return randomFrom(tier2);

        // Tier 1: keyword match only
        const tier1 = scored.filter(x => x.score === 1).map(x => x.card);
        if (tier1.length) return randomFrom(tier1);

        // Tier 0: no match → full random fallback
        return randomFrom(pool);
    }

    /**
     * Exposed for debugging / testing in the browser console:
     *   SmartReply.debug("i'm so tired today")
     */
    function debug(userMessage, pool) {
        const fallbackPool = pool || (window.customReplies || []);
        const userKeywords = extractKeywords(userMessage);
        const userSentiment = detectSentiment(userMessage);
        console.group('[SmartReply] debug');
        console.log('Input       :', userMessage);
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

    window.SmartReply = { pick, debug, extractKeywords, detectSentiment };

})(window);