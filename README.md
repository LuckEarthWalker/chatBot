# chatBot — Customizable Companion Chat

A browser-based companion chat app where each user writes their own library of replies and the app chooses the most fitting one for each message. Everything runs on the client, and all data stays in the user's own browser. No account or server is required.

## Overview

This project extends the open-source [milk](https://github.com/aielin17/milk) companion chat app. The original app gives users a chat interface with a customizable reply library. This fork adds a **context-aware reply engine**: instead of picking a random reply, it reads the user's message and picks the reply that best fits its keywords, sentiment, and intent.

## Features

### Added in this fork

- **Smart reply engine (English and Chinese).** Scores each saved reply against the user's latest message and picks from the best-matching group.
  - Detects the message language from the share of CJK characters.
  - Tokenizes the message and removes stopwords, with a separate stopword list for each language.
  - Extracts keywords and classifies the message's sentiment as positive, negative, or neutral.
  - Scores every saved reply on keyword overlap and sentiment match, then picks at random among the top scorers so conversations don't feel scripted.
  - Falls back to a fully random choice when nothing matches, and can be turned on or off as an experimental setting.
- **Category-based replies.** Users can tag replies with an intent category, such as complaining, happy, checking in, affection, pleading, asking for a reply, or asking a question. The app detects the category of each incoming message and draws from the matching group of replies.
- **Dice and random-number tool**, available from the chat menu.
- **Reliability fixes**, including a fix for restoring backups from JSON caused by events firing in the wrong order.

### Inherited from the base project

- A custom reply library with favorites and batch editing
- Appearance customization: themes, avatars, backgrounds, chat bubbles, fonts, and custom CSS
- Group chat, simulated calls, letters, daily greetings, and anniversary reminders
- Chat statistics, a calendar view, and a trash folder for recovering deleted items
- Full data backup and restore

## How the reply engine works

```
user message
   │
   ├─► language detection (CJK ratio)
   ├─► tokenize → remove stopwords → keywords
   └─► sentiment (positive / negative / neutral)
           │
           ▼
score every saved reply on keyword overlap + sentiment match
           │
           ▼
random pick from the top-scoring group  ──(no match)──►  random pick from all replies
```

The engine lives in `js/features/smart-reply.js` and has one public entry point:

```js
const reply = window.SmartReply.pick(replyPool, lastUserMessage);
```

Category routing is in `js/features/reply-categories.js`. It narrows the pool of candidate replies before the scoring step.

## Tech stack

- **Front end:** plain JavaScript, HTML and CSS, with no framework or build step
- **Storage:** `localStorage` and IndexedDB through [localForage](https://github.com/localForage/localForage)
- **Hosting:** any static file host

## Project structure

```
index.html                 App shell and UI markup
css/styles.css             Styles
js/
  app.js, core.js          App start-up and the main chat loop
  state.js, data.js        App state and saving data
  config.js, utils.js      Settings and shared helpers
  listeners.js             Event wiring
  onboarding.js            First-run setup
  games.js                 Statistics, fortune, and other small tools
  features/
    smart-reply.js         Keyword and sentiment reply matching (added in this fork)
    reply-categories.js    Category-based reply routing (added in this fork)
    reply-library.js       Reply library management
    theme-editor.js        Appearance customization
    group-chat.js, call.js, envelope.js, mood.js
```

## Running locally

No build step is needed. Serve the folder with any static file server:

```bash
git clone https://github.com/LuckEarthWalker/chatBot.git
cd chatBot
python3 -m http.server 8000
# open http://localhost:8000
```

## Privacy

Everything runs on the client. Messages, replies, and settings are stored only in the user's browser and are never sent to a server. Users can export a JSON backup and import it on another device.

## Credits

Built on [aielin17/milk](https://github.com/aielin17/milk). The smart reply engine, category routing, and the other changes listed under "Added in this fork" were written for this project.
