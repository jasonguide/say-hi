/* 词条数据（mock，后续可换成 CMUdict / Britfone 离线词表）
   格式：word | ipaGb | ipaUs(可 null) | 中文释义 | 主题slug | 重音音节下标 | 字母块
   字母块：音节之间用 ^ 分隔，块之间用空格；每块 letters|sound|rule|kind
   kind 省略时按 sound 是否为空推断：有音=辅音 c，无音=不发音 s。
   重音下标 -1 表示单音节词不标。 */

export const WORDS_RAW = [
  // ── 拼读演示词 ──
  ["transformer", "trænsˈfɔːmə", "trænsˈfɔːrmər", "变压器；转换器", "phonics", 1,
   "tr|tr|basic|c a|æ|closed|v ns|ns|basic|c ^ f|f|basic|c or|ɔː|rcontrol|v m|m|basic|c ^ er|ə|schwa|v"],
  ["age", "eɪdʒ", "eɪdʒ", "年龄", "phonics", -1,
   "a|eɪ|magic-e|v g|dʒ|soft|c e||magic-e|s"],
  ["sex", "seks", "seks", "性别", "phonics", -1,
   "s|s|basic|c e|e|closed|v x|ks|quirk|c"],
  ["phone", "fəʊn", "fəʊn", "电话", "phonics", -1,
   "ph|f|digraph|c o|əʊ|magic-e|v n|n|basic|c e||magic-e|s"],
  ["knight", "naɪt", "naɪt", "骑士", "phonics", -1,
   "kn|n|silent|c igh|aɪ|silent|v t|t|basic|c"],
  ["computer", "kəmˈpjuːtə", "kəmˈpjuːtər", "电脑", "phonics", 1,
   "c|k|soft|c o|ə|schwa|v m|m|basic|c ^ p|p|basic|c u|juː|open|v ^ t|t|basic|c er|ə|schwa|v"],
  ["data", "ˈdeɪtə", "ˈdeɪtə", "数据", "phonics", 0,
   "d|d|basic|c a|eɪ|open|v ^ t|t|basic|c a|ə|schwa|v"],
  ["nation", "ˈneɪʃn", "ˈneɪʃn", "国家；民族", "phonics", 0,
   "n|n|basic|c a|eɪ|open|v ^ tion|ʃn|suffix|c"],
  ["gym", "dʒɪm", "dʒɪm", "健身房", "phonics", -1,
   "g|dʒ|soft|c y|ɪ|closed|v m|m|basic|c"],
  ["bath", "bɑːθ", "bæθ", "洗澡", "phonics", -1,
   "b|b|basic|c a|ɑː|gb-bath|v th|θ|digraph|c"],
  ["bird", "bɜːd", "bɜːrd", "鸟", "phonics", -1,
   "b|b|basic|c ir|ɜː|rcontrol|v d|d|basic|c"],
  ["ship", "ʃɪp", "ʃɪp", "船", "phonics", -1,
   "sh|ʃ|digraph|c i|ɪ|closed|v p|p|basic|c"],
  ["school", "skuːl", "skuːl", "学校", "phonics", -1,
   "sch|sk|digraph|c oo|uː|team|v l|l|basic|c"],
  ["picture", "ˈpɪktʃə", "ˈpɪktʃər", "图片", "phonics", 0,
   "p|p|basic|c i|ɪ|closed|v c|k|soft|c ^ ture|tʃə|suffix|c"],
  ["make", "meɪk", "meɪk", "做；制作", "phonics", -1,
   "m|m|basic|c a|eɪ|magic-e|v k|k|basic|c e||magic-e|s"],
  ["bike", "baɪk", "baɪk", "自行车", "phonics", -1,
   "b|b|basic|c i|aɪ|magic-e|v k|k|basic|c e||magic-e|s"],
  ["cat", "kæt", "kæt", "猫", "en-animals", -1,
   "c|k|basic|c a|æ|closed|v t|t|basic|c"],
  ["bed", "bed", "bed", "床", "en-daily", -1,
   "b|b|basic|c e|e|closed|v d|d|basic|c"],
  ["sit", "sɪt", "sɪt", "坐", "en-daily", -1,
   "s|s|basic|c i|ɪ|closed|v t|t|basic|c"],
  ["hot", "hɒt", "hɑːt", "热的", "en-weather", -1,
   "h|h|basic|c o|ɒ|closed|v t|t|basic|c"],
  ["cup", "kʌp", "kʌp", "杯子", "en-food", -1,
   "c|k|basic|c u|ʌ|closed|v p|p|basic|c"],
  ["car", "kɑː", "kɑːr", "汽车", "en-travel", -1,
   "c|k|basic|c ar|ɑː|rcontrol|v"],
  ["turn", "tɜːn", "tɜːrn", "转弯", "en-travel", -1,
   "t|t|basic|c ur|ɜː|rcontrol|v n|n|basic|c"],
  ["see", "siː", "siː", "看见", "en-daily", -1,
   "s|s|basic|c ee|iː|team|v"],
  ["rain", "reɪn", "reɪn", "雨", "en-weather", -1,
   "r|r|basic|c ai|eɪ|team|v n|n|basic|c"],
  ["boat", "bəʊt", "boʊt", "船", "en-travel", -1,
   "b|b|basic|c oa|əʊ|team|v t|t|basic|c"],
  ["city", "ˈsɪti", "ˈsɪti", "城市", "en-travel", 0,
   "c|s|soft|c i|ɪ|closed|v ^ t|t|basic|c y|i|quirk|v"],
  ["give", "ɡɪv", "ɡɪv", "给", "en-daily", -1,
   "g|ɡ|soft|c i|ɪ|closed|v v|v|basic|c e||magic-e|s"],
  ["girl", "ɡɜːl", "ɡɜːrl", "女孩", "en-family", -1,
   "g|ɡ|soft|c ir|ɜː|rcontrol|v l|l|basic|c"],
  ["page", "peɪdʒ", "peɪdʒ", "页", "en-daily", -1,
   "p|p|basic|c a|eɪ|magic-e|v g|dʒ|soft|c e||magic-e|s"],
  ["vision", "ˈvɪʒn", "ˈvɪʒn", "视力；愿景", "en-health", 0,
   "v|v|basic|c i|ɪ|closed|v ^ sion|ʒn|suffix|c"],
  ["famous", "ˈfeɪməs", "ˈfeɪməs", "著名的", "en-work", 0,
   "f|f|basic|c a|eɪ|open|v ^ mous|məs|suffix|c"],
  ["quick", "kwɪk", "kwɪk", "快的", "en-daily", -1,
   "qu|kw|quirk|c i|ɪ|closed|v ck|k|digraph|c"],
  ["rose", "rəʊz", "roʊz", "玫瑰", "en-animals", -1,
   "r|r|basic|c o|əʊ|magic-e|v s|z|quirk|c e||magic-e|s"],
  ["write", "raɪt", "raɪt", "写", "en-work", -1,
   "wr|r|silent|c i|aɪ|magic-e|v t|t|basic|c e||magic-e|s"],
  ["sign", "saɪn", "saɪn", "标志；签名", "en-travel", -1,
   "s|s|basic|c i|aɪ|magic-e|v gn|n|silent|c"],
  ["night", "naɪt", "naɪt", "夜晚", "en-weather", -1,
   "n|n|basic|c igh|aɪ|silent|v t|t|basic|c"],
  ["table", "ˈteɪbl", "ˈteɪbl", "桌子", "en-food", 0,
   "t|t|basic|c a|eɪ|open|v ^ ble|bl|basic|c"],
  ["vector", "ˈvektə", "ˈvektər", "向量", "phonics", 0,
   "v|v|basic|c e|e|closed|v c|k|soft|c ^ t|t|basic|c or|ə|schwa|v"],
  ["decide", "dɪˈsaɪd", "dɪˈsaɪd", "决定", "en-feelings", 1,
   "d|d|basic|c e|ɪ|schwa|v ^ c|s|soft|c i|aɪ|magic-e|v d|d|basic|c e||magic-e|s"],
  ["reply", "rɪˈplaɪ", "rɪˈplaɪ", "回复", "en-work", 1,
   "r|r|basic|c e|ɪ|schwa|v ^ p|p|basic|c l|l|basic|c y|aɪ|quirk|v"],
  ["technology", "tekˈnɒlədʒi", "tekˈnɑːlədʒi", "技术", "en-work", 1,
   "t|t|basic|c e|e|closed|v c|k|soft|c ^ n|n|basic|c o|ɒ|closed|v ^ l|ə|schwa|v o|ɒ|open|v ^ g|dʒ|soft|c y|i|quirk|v"],
  ["engineer", "ˌendʒɪˈnɪə", "ˌendʒɪˈnɪr", "工程师", "en-work", 2,
   "e|e|closed|v n|n|basic|c ^ g|dʒ|soft|c i|ɪ|closed|v ^ n|n|basic|c eer|ɪə|team|v"],
  ["information", "ˌɪnfəˈmeɪʃn", "ˌɪnfərˈmeɪʃn", "信息", "en-work", 2,
   "i|ɪ|closed|v n|n|basic|c ^ f|f|basic|c o|ə|schwa|v ^ m|m|basic|c a|eɪ|open|v ^ tion|ʃn|suffix|c"],

  // ── 场景主题词（复用现有词库释义） ──
  ["food", "fuːd", "fuːd", "食物", "en-food", -1, "f|f|basic|c oo|uː|team|v d|d|basic|c"],
  ["eat", "iːt", "iːt", "吃", "en-food", -1, "ea|iː|team|v t|t|basic|c"],
  ["drink", "drɪŋk", "drɪŋk", "喝；饮料", "en-food", -1, "d|d|basic|c r|r|basic|c i|ɪ|closed|v nk|ŋk|basic|c"],
  ["delicious", "dɪˈlɪʃəs", "dɪˈlɪʃəs", "好吃的", "en-food", 1,
   "d|d|basic|c e|ɪ|schwa|v ^ l|l|basic|c i|ɪ|closed|v ^ c|ʃ|soft|c ious|əs|suffix|v"],
  ["coffee", "ˈkɒfi", "ˈkɔːfi", "咖啡", "en-food", 0,
   "c|k|basic|c o|ɒ|closed|v ^ ff|f|basic|c ee|i|team|v"],
  ["spicy", "ˈspaɪsi", "ˈspaɪsi", "辣的", "en-food", 0,
   "s|s|basic|c p|p|basic|c i|aɪ|open|v ^ c|s|soft|c y|i|quirk|v"],
  ["bill", "bɪl", "bɪl", "账单", "en-food", -1, "b|b|basic|c i|ɪ|closed|v ll|l|basic|c"],
  ["hello", "həˈləʊ", "həˈloʊ", "你好", "en-greetings", 1,
   "h|h|basic|c e|ə|schwa|v ^ ll|l|basic|c o|əʊ|open|v"],
  ["morning", "ˈmɔːnɪŋ", "ˈmɔːrnɪŋ", "早上", "en-greetings", 0,
   "m|m|basic|c or|ɔː|rcontrol|v ^ n|n|basic|c ing|ɪŋ|suffix|c"],
  ["thanks", "θæŋks", "θæŋks", "谢谢", "en-greetings", -1,
   "th|θ|digraph|c a|æ|closed|v nks|ŋks|basic|c"],
  ["please", "pliːz", "pliːz", "请", "en-greetings", -1,
   "p|p|basic|c l|l|basic|c ea|iː|team|v s|z|quirk|c e||magic-e|s"],
  ["sorry", "ˈsɒri", "ˈsɑːri", "对不起", "en-greetings", 0,
   "s|s|basic|c o|ɒ|closed|v ^ rr|r|basic|c y|i|quirk|v"],
  ["number", "ˈnʌmbə", "ˈnʌmbər", "数字", "en-numbers", 0,
   "n|n|basic|c u|ʌ|closed|v ^ m|m|basic|c b||basic|s ^ er|ə|schwa|v"],
  ["time", "taɪm", "taɪm", "时间", "en-numbers", -1,
   "t|t|basic|c i|aɪ|magic-e|v m|m|basic|c e||magic-e|s"],
  ["money", "ˈmʌni", "ˈmʌni", "钱", "en-money", 0,
   "m|m|basic|c o|ʌ|closed|v ^ n|n|basic|c ey|i|team|v"],
  ["cheap", "tʃiːp", "tʃiːp", "便宜的", "en-money", -1,
   "ch|tʃ|digraph|c ea|iː|team|v p|p|basic|c"],
  ["weather", "ˈweðə", "ˈweðər", "天气", "en-weather", 0,
   "w|w|basic|c ea|e|closed|v ^ th|ð|digraph|c er|ə|schwa|v"],
  ["cold", "kəʊld", "koʊld", "冷的", "en-weather", -1,
   "c|k|basic|c o|əʊ|open|v ld|ld|basic|c"],
  ["family", "ˈfæməli", "ˈfæməli", "家庭", "en-family", 0,
   "f|f|basic|c a|æ|closed|v ^ m|m|basic|c i|ə|schwa|v ^ l|basic|l|c y|i|quirk|v"],
  ["apple", "ˈæpl", "ˈæpl", "苹果", "en-fruit", 0,
   "a|æ|closed|v ^ pp|p|basic|c le|l|basic|c"],
  ["animal", "ˈænɪml", "ˈænɪml", "动物", "en-animals", 0,
   "a|æ|closed|v ^ n|n|basic|c i|ɪ|closed|v ^ mal|ml|basic|c"],
  ["happy", "ˈhæpi", "ˈhæpi", "开心的", "en-feelings", 0,
   "h|h|basic|c a|æ|closed|v ^ pp|p|basic|c y|i|quirk|v"],
  ["tired", "ˈtaɪəd", "ˈtaɪərd", "累的", "en-feelings", 0,
   "t|t|basic|c i|aɪ|open|v ^ red|əd|suffix|c"],
  ["doctor", "ˈdɒktə", "ˈdɑːktər", "医生", "en-health", 0,
   "d|d|basic|c o|ɒ|closed|v c|k|soft|c ^ t|t|basic|c or|ə|schwa|v"],
  ["hotel", "həʊˈtel", "hoʊˈtel", "旅馆", "en-travel", 1,
   "h|h|basic|c o|əʊ|open|v ^ t|t|basic|c e|e|closed|v l|l|basic|c"],
  ["airport", "ˈeəpɔːt", "ˈerpɔːrt", "机场", "en-travel", 0,
   "air|eə|team|v ^ p|p|basic|c or|ɔː|rcontrol|v t|t|basic|c"],
  ["ticket", "ˈtɪkɪt", "ˈtɪkɪt", "票", "en-travel", 0,
   "t|t|basic|c i|ɪ|closed|v ^ ck|k|digraph|c e|ɪ|schwa|v t|t|basic|c"],
  ["shopping", "ˈʃɒpɪŋ", "ˈʃɑːpɪŋ", "购物", "en-shopping", 0,
   "sh|ʃ|digraph|c o|ɒ|closed|v ^ pp|p|basic|c ing|ɪŋ|suffix|c"],
  ["price", "praɪs", "praɪs", "价格", "en-shopping", -1,
   "p|p|basic|c r|r|basic|c i|aɪ|magic-e|v c|s|soft|c e||magic-e|s"],
  ["size", "saɪz", "saɪz", "尺码", "en-shopping", -1,
   "s|s|basic|c i|aɪ|magic-e|v z|z|basic|c e||magic-e|s"],
  ["work", "wɜːk", "wɜːrk", "工作", "en-work", -1,
   "w|w|basic|c or|ɜː|rcontrol|v k|k|basic|c"],
  ["meeting", "ˈmiːtɪŋ", "ˈmiːtɪŋ", "会议", "en-work", 0,
   "m|m|basic|c ee|iː|team|v ^ t|t|basic|c ing|ɪŋ|suffix|c"],
  ["water", "ˈwɔːtə", "ˈwɔːtər", "水", "en-food", 0,
   "w|w|basic|c a|ɔː|closed|v ^ t|t|basic|c er|ə|schwa|v"],
  ["tea", "tiː", "tiː", "茶", "en-food", -1, "t|t|basic|c ea|iː|team|v"],
  ["rice", "raɪs", "raɪs", "米饭", "en-food", -1,
   "r|r|basic|c i|aɪ|magic-e|v c|s|soft|c e||magic-e|s"],
  ["fruit", "fruːt", "fruːt", "水果", "en-fruit", -1,
   "f|f|basic|c r|r|basic|c ui|uː|team|v t|t|basic|c"],
  ["market", "ˈmɑːkɪt", "ˈmɑːrkɪt", "市场", "en-shopping", 0,
   "m|m|basic|c ar|ɑː|rcontrol|v ^ k|k|basic|c e|ɪ|schwa|v t|t|basic|c"],
  ["open", "ˈəʊpən", "ˈoʊpən", "打开", "en-daily", 0,
   "o|əʊ|open|v ^ p|p|basic|c e|ə|schwa|v n|n|basic|c"],
  ["close", "kləʊz", "kloʊz", "关上", "en-daily", -1,
   "c|k|basic|c l|l|basic|c o|əʊ|magic-e|v s|z|quirk|c e||magic-e|s"],
  ["early", "ˈɜːli", "ˈɜːrli", "早的", "en-numbers", 0,
   "ear|ɜː|rcontrol|v ^ l|l|basic|c y|i|quirk|v"],
  ["later", "ˈleɪtə", "ˈleɪtər", "稍后", "en-numbers", 0,
   "l|l|basic|c a|eɪ|open|v ^ t|t|basic|c er|ə|schwa|v"]
];

/* 解析 DSL → 结构化词条 */
function parseBlocks(spec) {
  const blocks = [];
  spec.split("^").forEach((sylText, sylIdx) => {
    sylText.trim().split(/\s+/).filter(Boolean).forEach((tok) => {
      const p = tok.split("|");
      const letters = p[0];
      const sound = p[1] || "";
      const ruleId = p[2] || "basic";
      let kind = p[3];
      if (!kind) kind = sound ? "c" : "s";
      blocks.push({ letters, sound, ruleId, kind, syl: sylIdx });
    });
  });
  return blocks;
}

export const LEXICON = WORDS_RAW.map((r) => {
  const blocks = parseBlocks(r[6]);
  const syllables = [];
  blocks.forEach((b) => { syllables[b.syl] = (syllables[b.syl] || "") + b.letters; });
  return {
    word: r[0],
    ipaGb: r[1],
    ipaUs: r[2],
    meaning: r[3],
    topic: r[4] === "phonics" ? null : r[4],
    stress: r[5],
    syllables,
    blocks
  };
});

export const WORD_INDEX = new Map(LEXICON.map((w) => [w.word, w]));

export function lookup(raw) {
  const w = String(raw || "").trim().toLowerCase();
  if (!/^[a-z]{1,32}$/.test(w)) return null;
  return WORD_INDEX.get(w) || null;
}

export function search(q, limit) {
  const s = String(q || "").trim().toLowerCase();
  const n = Math.max(1, Math.min(50, Number(limit) || 20));
  if (!s) return LEXICON.slice(0, n);
  const starts = [], contains = [];
  for (const w of LEXICON) {
    if (w.word.startsWith(s)) starts.push(w);
    else if (w.word.includes(s)) contains.push(w);
  }
  return starts.concat(contains).slice(0, n);
}
