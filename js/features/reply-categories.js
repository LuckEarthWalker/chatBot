/**
 * reply-categories.js
 * Category-based reply selection for 智能回复 mode.
 *
 * Category assignments are stored in localStorage as { replyText → categoryId }.
 *
 * Public API (window.ReplyCategories):
 *   .CATEGORIES                     — ordered array of category definitions
 *   .getMap()                       — { text → categoryId } map
 *   .setCategory(text, catId|null)  — assign or clear a category
 *   .getCategoryForReply(text)      — returns categoryId or null
 *   .detectCategories(userMessage)  — returns array of matching category IDs
 *   .pickPool(replyPool, userMsg)   — returns the pool to pick from
 */
(function (window) {
    'use strict';

    var STORAGE_KEY = 'replyCategoryMap';

    var CATEGORIES = [
        { id: '抱怨', label: '抱怨', color: '#FF6B6B',
          keywords: ['好累','心情不好','烦','烦人','烦死了','想死','好烦','累死了','崩溃','难受','郁闷','气死','太烦了','受不了'] },
        { id: '开心', label: '开心', color: '#51CF66',
          keywords: ['嘿嘿','嘻嘻','开心','心情不错','好爽','好耶','太好了','太好啦','哈哈','好棒','太棒了','高兴','快乐','幸福','开森'] },
        { id: '查岗', label: '查岗', color: '#4DABF7',
          keywords: ['在干嘛','在干什么','在上班吗','在家吗','在上课吗','在外面吗','在忙吗','在哪','干嘛呢','做什么呢','忙吗','有空吗'] },
        { id: '表白', label: '表白', color: '#F783AC',
          keywords: ['想你','喜欢你','爱你','亲亲','抱抱','贴贴','么么','好喜欢','好爱你','爱死你了','想念'] },
        { id: '撒娇', label: '撒娇', color: '#DA77F2',
          keywords: ['好不好','你最好了','最好','最爱','拜托','求求你','哎哟','呜呜','不嘛','求你了','好嘛','嘛嘛'] },
        { id: '催促', label: '催促', color: '#FF922B',
          keywords: ['回我','理我','快快','快点','赶快','怎么不回','回一下','快回','还不回'] },
        { id: '询问', label: '询问', color: '#20C997',
          keywords: ['怎么样','如何','你觉得','如果','假如','怎么看','什么意思','为什么','是不是','对不对','好吗','可以吗','能不能'] },
    ];

    function getMap() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function saveMap(map) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch (e) {}
    }

    function setCategory(replyText, categoryId) {
        var map = getMap();
        if (!categoryId) { delete map[replyText]; }
        else { map[replyText] = categoryId; }
        saveMap(map);
    }

    function getCategoryForReply(replyText) {
        return getMap()[replyText] || null;
    }

    function detectCategories(userMessage) {
        if (!userMessage) return [];
        var matched = [];
        for (var i = 0; i < CATEGORIES.length; i++) {
            var cat = CATEGORIES[i];
            for (var j = 0; j < cat.keywords.length; j++) {
                if (userMessage.indexOf(cat.keywords[j]) !== -1) {
                    matched.push(cat.id);
                    break;
                }
            }
        }
        return matched;
    }

    function pickPool(replyPool, userMessage) {
        var map = getMap();
        var matchedCats = detectCategories(userMessage);

        if (matchedCats.length > 0) {
            var chosenCat = matchedCats[Math.floor(Math.random() * matchedCats.length)];
            var catPool = replyPool.filter(function(r) { return map[r] === chosenCat; });
            if (catPool.length > 0) return catPool;
        }

        // Fall back to untagged pool
        var untaggedPool = replyPool.filter(function(r) { return !map[r]; });
        if (untaggedPool.length > 0) return untaggedPool;

        // Final fallback: full pool
        return replyPool;
    }

    window.ReplyCategories = {
        CATEGORIES: CATEGORIES,
        getMap: getMap,
        setCategory: setCategory,
        getCategoryForReply: getCategoryForReply,
        detectCategories: detectCategories,
        pickPool: pickPool,
    };

})(window);