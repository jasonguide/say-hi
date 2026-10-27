import { db } from "../db.js";
import { enTopics, enTopicWords, enTopicSentences } from "./en.js";
import { yueTopics, yueTopicWords, yueTopicSentences } from "./yue.js";

const getTopic = db.prepare("SELECT id FROM topics WHERE slug=?");
const hasWord = db.prepare("SELECT id FROM words WHERE lang=? AND text=?");
const hasSent = db.prepare("SELECT id FROM sentences WHERE lang=? AND text=?");
const linkW = db.prepare("INSERT OR IGNORE INTO word_topic VALUES (?,?)");
const linkS = db.prepare("INSERT OR IGNORE INTO sentence_topic VALUES (?,?)");

let loaded = false;

export function loadSeed() {
  if (loaded) return;
  let t = 0, w = 0, s = 0;

  const ingest = (topics, topicWords, topicSentences) => {
    for (const tp of topics) {
      db.prepare(`INSERT OR IGNORE INTO topics (lang, slug, title, title_native, description, icon, sort_order) VALUES (?,?,?,?,?,?,?)`)
        .run(tp.lang, tp.slug, tp.title, tp.title_native, tp.description, tp.icon, tp.sort_order);
      const tid = getTopic.get(tp.slug).id;
      t++;
      for (const [text, phonetic, meaning, level] of topicWords[tp.slug] || []) {
        let row = hasWord.get(tp.lang, text);
        if (!row) {
          const info = db.prepare(`INSERT INTO words (lang, text, phonetic, meaning, level) VALUES (?,?,?,?,?)`).run(tp.lang, text, phonetic, meaning, level || 1);
          row = { id: Number(info.lastInsertRowid) };
          w++;
        }
        linkW.run(row.id, tid);
      }
      for (const [text, phonetic, translation] of topicSentences[tp.slug] || []) {
        let row = hasSent.get(tp.lang, text);
        if (!row) {
          const info = db.prepare(`INSERT INTO sentences (lang, text, phonetic, translation) VALUES (?,?,?,?)`).run(tp.lang, text, phonetic, translation);
          row = { id: Number(info.lastInsertRowid) };
          s++;
        }
        linkS.run(row.id, tid);
      }
    }
  };

  ingest(enTopics, enTopicWords, enTopicSentences);
  ingest(yueTopics, yueTopicWords, yueTopicSentences);

  loaded = true;
  console.log(`seed: 校验 ${t} 主题 / 新增 ${w} 词 / 新增 ${s} 句`);
}
