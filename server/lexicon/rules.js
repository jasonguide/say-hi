/* 规则库：14 条，3 级。mock 数据，后续可扩展。
   id / level / title / pattern / summary / examples / exceptions */

export const RULES = [
  { id: "basic", level: 1, title: "基础辅音", pattern: "b  d  f  h  k  l  m  n  p  t  v  z",
    summary: "大多数辅音字母读出来就是字母名里的那个音。先不用记，只留意例外。",
    examples: [
      { word: "big", ipa: "bɪɡ", highlight: ["b"] },
      { word: "dog", ipa: "dɒɡ", highlight: ["d"] },
      { word: "ten", ipa: "ten", highlight: ["t"] },
      { word: "leg", ipa: "leɡ", highlight: ["l"] }
    ],
    exceptions: ["例外在后面几条：c、g 的软读，s 夹在元音之间读 /z/，x 读 /ks/。"] },

  { id: "closed", level: 1, title: "闭音节：元音读短音", pattern: "元音 + 辅音收尾",
    summary: "一个元音字母后面跟着辅音结尾，读短音：a→æ、e→e、i→ɪ、o→ɒ、u→ʌ。",
    examples: [
      { word: "cat", ipa: "kæt", highlight: ["a"] },
      { word: "bed", ipa: "bed", highlight: ["e"] },
      { word: "sit", ipa: "sɪt", highlight: ["i"] },
      { word: "hot", ipa: "hɒt", highlight: ["o"] },
      { word: "cup", ipa: "kʌp", highlight: ["u"] }
    ],
    exceptions: ["put /pʊt/ 里的 u 读 /ʊ/。", "y 在词中间当 i 用：gym /dʒɪm/。"] },

  { id: "magic-e", level: 1, title: "魔法 e：元音读字母名", pattern: "元音 + 辅音 + e",
    summary: "词尾的 e 不发音，但让前面的元音读它的字母名：a→eɪ、i→aɪ、o→əʊ、u→juː。",
    examples: [
      { word: "make", ipa: "meɪk", highlight: ["a", "e"] },
      { word: "bike", ipa: "baɪk", highlight: ["i", "e"] },
      { word: "home", ipa: "həʊm", highlight: ["o", "e"] }
    ],
    exceptions: ["have /hæv/、give /ɡɪv/、come /kʌm/ 不遵守这条。", "e 只能越过一个辅音：hoping /ˈhəʊpɪŋ/ 与 hopping /ˈhɒpɪŋ/ 的差别就在 p 是一个还是两个。"] },

  { id: "digraph", level: 1, title: "辅音组合：两个字母一个音", pattern: "th  sh  ch  ph  ng  wh",
    summary: "常见的两字母组合要整体读，不要拆开。",
    examples: [
      { word: "ship", ipa: "ʃɪp", highlight: ["sh"] },
      { word: "phone", ipa: "fəʊn", highlight: ["ph"] },
      { word: "think", ipa: "θɪŋk", highlight: ["th"] }
    ],
    exceptions: ["ch 在希腊词源的词里读 /k/：chemistry /ˈkemɪstri/、school /skuːl/。", "th 在 the、this、that 这类功能词里读 /ð/，在实词里多读 /θ/。"] },

  { id: "rcontrol", level: 1, title: "r 控制元音", pattern: "ar  or  er  ir  ur",
    summary: "元音后面跟 r，读音被 r 改变：ar→ɑː、or→ɔː、er/ir/ur→ɜː。英音里 r 后面没有元音时，r 不发音。",
    examples: [
      { word: "car", ipa: "kɑː", highlight: ["ar"] },
      { word: "bird", ipa: "bɜːd", highlight: ["ir"] },
      { word: "turn", ipa: "tɜːn", highlight: ["ur"] }
    ],
    exceptions: ["r 后面接元音时要发音：red、very、carry。", "不重读的 -er、-or 读 /ə/：transformer 的结尾。"] },

  { id: "team", level: 1, title: "元音组合", pattern: "ee  ea  oo  ai  oa  ow  oy",
    summary: "两个元音字母常常合成一个音。",
    examples: [
      { word: "see", ipa: "siː", highlight: ["ee"] },
      { word: "rain", ipa: "reɪn", highlight: ["ai"] },
      { word: "food", ipa: "fuːd", highlight: ["oo"] },
      { word: "boat", ipa: "bəʊt", highlight: ["oa"] }
    ],
    exceptions: ["book /bʊk/、good /ɡʊd/ 里的 oo 读短音 /ʊ/。", "bread /bred/、great /ɡreɪt/ 里的 ea 不读 /iː/。", "ow 也可读 /əʊ/：slow、know。"] },

  { id: "open", level: 2, title: "开音节：元音读字母名", pattern: "元音在音节末尾",
    summary: "音节末尾没有辅音收住，元音读字母名。难点是先把词切成音节。",
    examples: [
      { word: "data", ipa: "ˈdeɪtə", highlight: ["a"] },
      { word: "open", ipa: "ˈəʊpən", highlight: ["o"] },
      { word: "table", ipa: "ˈteɪbl", highlight: ["a"] }
    ],
    exceptions: ["cab·in /ˈkæbɪn/ 的第一音节被 b 收住，是闭音节；ca·ble /ˈkeɪbl/ 的 a 在音节末尾，是开音节。", "不重读的开音节常弱化成 /ə/。"] },

  { id: "soft", level: 2, title: "c 和 g 的软读与硬读", pattern: "ce  ci  cy  ge  gi  gy",
    summary: "c、g 后面接 e、i、y 时读软音：c→s、g→dʒ。接其他字母读硬音：c→k、g→ɡ。",
    examples: [
      { word: "city", ipa: "ˈsɪti", highlight: ["c"] },
      { word: "gym", ipa: "dʒɪm", highlight: ["g"] },
      { word: "age", ipa: "eɪdʒ", highlight: ["g"] }
    ],
    exceptions: ["get /ɡet/、give /ɡɪv/、girl /ɡɜːl/ 虽然后面是 e、i，g 仍读硬音。", "词尾的 -ge 常读 /dʒ/：age、page。"] },

  { id: "suffix", level: 2, title: "固定词尾", pattern: "-tion  -sion  -ture  -ous  -ing",
    summary: "这些词尾读法固定，重音通常落在它前面一个音节。",
    examples: [
      { word: "nation", ipa: "ˈneɪʃn", highlight: ["tion"] },
      { word: "vision", ipa: "ˈvɪʒn", highlight: ["sion"] },
      { word: "picture", ipa: "ˈpɪktʃə", highlight: ["ture"] },
      { word: "famous", ipa: "ˈfeɪməs", highlight: ["ous"] }
    ],
    exceptions: ["question /ˈkwestʃən/ 里 -tion 前面有 s，读 /tʃən/。", "-sion 跟在辅音后读 /ʃn/：tension /ˈtenʃn/。"] },

  { id: "quirk", level: 2, title: "字母的特殊读法", pattern: "x  qu  s  y",
    summary: "有几个字母的读法和字母名差别很大。",
    examples: [
      { word: "sex", ipa: "seks", highlight: ["x"] },
      { word: "quick", ipa: "kwɪk", highlight: ["qu"] },
      { word: "rose", ipa: "rəʊz", highlight: ["s"] },
      { word: "happy", ipa: "ˈhæpi", highlight: ["y"] }
    ],
    exceptions: ["ex- 后面接元音时，x 读 /ɡz/：exam /ɪɡˈzæm/。", "s 在词首读 /s/，在两个元音之间常读 /z/：rose、easy。", "y 在词尾读 /i/ 或 /aɪ/，在词中当 i 用。"] },

  { id: "silent", level: 2, title: "不发音的字母", pattern: "kn  wr  mb  gn  igh",
    summary: "有些组合里一个字母不发音：kn 读 /n/，wr 读 /r/，词尾 mb 的 b 不发音，gn 的 g 不发音，igh 读 /aɪ/。",
    examples: [
      { word: "knight", ipa: "naɪt", highlight: ["kn", "igh"] },
      { word: "write", ipa: "raɪt", highlight: ["wr"] },
      { word: "sign", ipa: "saɪn", highlight: ["gn"] }
    ],
    exceptions: ["gh 有时读 /f/：laugh /lɑːf/、enough /ɪˈnʌf/。"] },

  { id: "schwa", level: 3, title: "弱读 /ə/：不重读的元音", pattern: "不重读的音节",
    summary: "没有重音的音节，元音大多弱化成 /ə/。猜多音节词时，先找出重读音节，其余音节先默认读 /ə/。",
    examples: [
      { word: "computer", ipa: "kəmˈpjuːtə", highlight: ["o", "er"] },
      { word: "vector", ipa: "ˈvektə", highlight: ["or"] },
      { word: "transformer", ipa: "trænsˈfɔːmə", highlight: ["er"] }
    ],
    exceptions: ["前缀 re-、de- 常读 /rɪ/、/dɪ/：reply /rɪˈplaɪ/、decide /dɪˈsaɪd/。", "词尾 -ed 常读 /ɪd/：wanted /ˈwɒntɪd/。"] },

  { id: "stress", level: 3, title: "重音在哪里", pattern: "音节与重音",
    summary: "先把词切成音节再定重音。两音节的名词多重读第一个；-tion、-logy、-graphy 前面一个音节重读；-eer 结尾的词重读结尾。",
    examples: [
      { word: "table", ipa: "ˈteɪbl", highlight: ["ta"] },
      { word: "computer", ipa: "kəmˈpjuːtə", highlight: ["pu"] },
      { word: "engineer", ipa: "ˌendʒɪˈnɪə", highlight: ["eer"] }
    ],
    exceptions: ["同一个词词性不同，重音也不同：record 名词 /ˈrekɔːd/，动词 /rɪˈkɔːd/。", "规律有例外。遇到新词先按规律猜，再查证。"] },

  { id: "gb-bath", level: 3, title: "英音特色：bath 类词的 a", pattern: "a + th / ss / st / sk / nce",
    summary: "英音里 a 在 th、ss、st、sk、nce 前常读 /ɑː/，美音读 /æ/。",
    examples: [
      { word: "bath", ipa: "bɑːθ", highlight: ["a"] },
      { word: "last", ipa: "lɑːst", highlight: ["a"] },
      { word: "ask", ipa: "ɑːsk", highlight: ["a"] }
    ],
    exceptions: ["cat、man、back 里的 a 仍读 /æ/。", "mass /mæs/、classic /ˈklæslk/、trans- 里的 a 也读 /æ/。"] }
];

export const RULE_INDEX = new Map(RULES.map((r) => [r.id, r]));
export const RULE_TITLE = (id) => (RULE_INDEX.get(id) || { title: id }).title;

export function rulesByLevel(level) {
  return level ? RULES.filter((r) => r.level === Number(level)) : RULES;
}
