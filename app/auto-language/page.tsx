"use client";

import { useState } from "react";
import JSZip from "jszip";

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

type LanguageKeywords = {
  mainKeyword: string;
  secondaryKeywords: string;
  lsiKeywords: string;
};

type LanguageData = Record<string, LanguageKeywords>;

type GenerationStatus = "idle" | "running" | "done" | "error";

type ImportSummary = {
  imported: string[];
  skipped: string[];
};

type GenerationResult = {
  languageCode: string;
  language: string;
  content: string;
  error?: string;
};

type KeywordCount = {
  keyword: string;
  count: number;
};

const LANGUAGES: Language[] = [
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" }
];

const LANGUAGE_NOTES: Record<string, string> = {
  es: "西班牙语：惯用短句、主动态，主语常省略，动词自带人称，排斥英文式长从句。",
  pt: "葡萄牙语：短句为主、柔和主动，主语常省略，少被动，不用英文式嵌套长句。",
  de: "德语：长句多、从句后置，动词居尾，名词化与被动远多于英文，结构严谨。",
  fr: "法语：偏爱复合句，书面偏被动，代词前置多，长短句分口语与书面。",
  it: "意大利语：轻快短句、主动态，主语常省略，少用被动，句式比英文紧凑。",
  ru: "俄语：语序自由，重心前置，少被动，靠变格衔接，不用英文式从句堆叠。",
  ja: "日语：主语常省略，谓语在句末，表达委婉间接，忌英文直白主动句式。",
  ko: "韩语：主语省略、谓词居尾，敬语严格，少被动，不照搬英文长句。",
  id: "印尼语：极简短句、主动为主，无变位，结构简单，拒绝复杂从句与被动。",
  ms: "马来语：简短句式，主动为主，结构清晰。",
  ar: "阿拉伯语：从右向左，修饰后置，长句多、名词化强，与英文结构差异大。",
  vi: "越南语：声调区分词义，句式偏简短。",
  th: "泰语：敬语分级，语序灵活多变。",
  pl: "波兰语：词形变位多，语法严谨。",
  nl: "荷兰语：德英混搭，句式衔接自然。",
  no: "挪威语：双书写形式，口语化表达多。",
  sv: "瑞典语：语调平缓，词汇近北欧同源。",
  da: "丹麦语：发音弱化，拼写与口语有差。",
  fi: "芬兰语：黏着构词，词缀繁复需留意。"
};

const LANGUAGE_ALIASES: Record<string, string[]> = {
  es: ["西语", "西班牙语", "spanish", "espanol", "español"],
  pt: ["葡语", "葡萄牙语", "portuguese", "portugues", "português"],
  de: ["德语", "德文", "german", "deutsch"],
  fr: ["法语", "法文", "french", "francais", "français"],
  it: ["意语", "意大利语", "italian", "italiano"],
  ru: ["俄语", "俄文", "russian", "русский"],
  ja: ["日语", "日文", "japanese", "日本語"],
  ko: ["韩语", "韩文", "korean", "한국어"],
  id: ["印尼语", "印度尼西亚语", "indonesian", "bahasa indonesia"],
  ms: ["马来语", "马来西亚语", "malay", "bahasa melayu"],
  ar: ["阿语", "阿拉伯语", "arabic", "العربية"],
  vi: ["越语", "越南语", "vietnamese", "tiếng việt", "tieng viet"],
  th: ["泰语", "thai", "ไทย"],
  pl: ["波兰语", "polish", "polski"],
  nl: ["荷兰语", "dutch", "nederlands"],
  no: ["挪威语", "norwegian", "norsk"],
  sv: ["瑞典语", "swedish", "svenska"],
  da: ["丹麦语", "danish", "dansk"],
  fi: ["芬兰语", "finnish", "suomi"]
};

const AVAILABLE_MODELS = [
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "grok-4.3",
  "claude-sonnet-5",
  "gpt-5.4",
  "gpt-5.5",
  "gpt-5.4-nano",
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "deepseek-v4-pro"
];

const PROVIDER_BASE_URL = "https://api.guijiapi.net/v1";
const CHAT_COMPLETIONS_URL = `${PROVIDER_BASE_URL}/chat/completions`;

function buildPrompt(languageData: LanguageKeywords, languageName: string, languageNote: string, originalText: string): string {
  return `下面需要你在我给你的被翻译的小语种文件上继续 seo 文案上的优化，就根据该语种的核心词和次要关键词，要求：
0.语言表达符合母语阅读习惯，不要像生硬的机器翻译。严禁极度重复，机械堆砌；多用短句。不要直译。用词适当口语化，要地道。营销文案要本土化。
不同语种特点注意事项：
${languageNote}

1.保持字数跟原文尽量一致，保持字数差距不超过 80-150 词。

2.不同语种的 metadata 不一致。
title 和 description都要命中对应的核心关键词至少 1 次，且命中1-2 个次要关键词。
title 字数 50-55字符；description 字数 150-155 字符，命中核心关键词和1-5个次要关键词。

3.SEO 关键词出现次数规则：
每个语种的*核心关键词*要全文占比 [ 2% ]，最低出现 [ 32 次 ]，但是严禁超过 [ 37 ]次。你可以尽量将10多个词出现前 FAQ 前面几个部分中（比如 tilte、description 、usecase 中），将剩下的词（25-40 个词）尽可能多得塞到 FAQ 部分中。
hero title 、features title、benefits title、cta title 或 cta description 必须命中核心关键词各 1 次；
次要关键词出现 [ 5-8 ] 次，LSI 关键词要出现 [ 1-3 ] 次。每个词都要出现至少一次。
需要将次要关键词、LSI 关键词自然融入正文中。切记不要生硬表达。

4.
严禁：语法错误、句式断裂残缺、同质化重复表达。严禁跟英文混杂，要符合地道的当地语种的表达。
不要省略文案，特别是 faq 的大段文本不要随意省略。
不要输出 <h1> <h2> <h3> 等标题标签。

这是词群：
- 核心关键词：${languageData.mainKeyword}
- 次要关键词：${languageData.secondaryKeywords}
- LSI 关键词：${languageData.lsiKeywords}

你要翻译的语言是：${languageName}

这是被翻译的语种原文：
${originalText}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitKeywords(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,，;；、\n]+/)
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    )
  );
}

function countKeywordOccurrences(content: string, keyword: string): number {
  if (!keyword) return 0;
  return content.match(new RegExp(escapeRegExp(keyword), "giu"))?.length ?? 0;
}

function normalizeImportText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u3000/g, " ")
    .replace(/[；;]/g, ",")
    .trim();
}

function createLanguageMatcher(): RegExp {
  const aliases = Object.values(LANGUAGE_ALIASES)
    .flat()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  return new RegExp(
    `(?:^|\\n)\\s*(?:\\d+\\s*[.、)）:-]?\\s*)?(${aliases.join("|")})(?=\\s|[:：]|\\n|$)`,
    "gi"
  );
}

function getLanguageCode(rawName: string): string | null {
  const normalizedName = rawName.trim().toLowerCase();

  for (const [code, aliases] of Object.entries(LANGUAGE_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === normalizedName)) {
      return code;
    }
  }

  return null;
}

function extractKeywordField(block: string, labels: string[]): string {
  const labelPattern = labels.map(escapeRegExp).join("|");
  const nextLabelPattern = [
    "核心词",
    "核心关键词",
    "主词",
    "主关键词",
    "main keyword",
    "primary keyword",
    "次要词",
    "次要关键词",
    "secondary keywords",
    "secondary keyword",
    "lsi",
    "lsi 关键词",
    "lsi关键词",
    "LSI 关键词"
  ]
    .map(escapeRegExp)
    .join("|");

  const match = block.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:${labelPattern})\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextLabelPattern})\\s*[:：]|$)`,
      "i"
    )
  );

  return normalizeImportText(match?.[1] || "");
}

function parseSmartImport(rawText: string): {
  data: LanguageData;
  summary: ImportSummary;
} {
  const text = normalizeImportText(rawText);
  const matcher = createLanguageMatcher();
  const matches = Array.from(text.matchAll(matcher));
  const data: LanguageData = {};
  const skipped: string[] = [];

  matches.forEach((match, index) => {
    const languageName = match[1];
    const languageCode = getLanguageCode(languageName);
    if (!languageCode) return;

    const start = match.index || 0;
    const nextStart = matches[index + 1]?.index ?? text.length;
    const block = text.slice(start, nextStart);
    const keywords = {
      mainKeyword: extractKeywordField(block, [
        "核心词",
        "核心关键词",
        "主词",
        "主关键词",
        "main keyword",
        "primary keyword"
      ]),
      secondaryKeywords: extractKeywordField(block, [
        "次要词",
        "次要关键词",
        "secondary keyword",
        "secondary keywords"
      ]),
      lsiKeywords: extractKeywordField(block, [
        "LSI 关键词",
        "LSI关键词",
        "lsi keywords",
        "lsi keyword",
        "lsi"
      ])
    };

    if (
      keywords.mainKeyword &&
      keywords.secondaryKeywords &&
      keywords.lsiKeywords
    ) {
      data[languageCode] = keywords;
    } else {
      skipped.push(languageName);
    }
  });

  const imported = Object.keys(data)
    .map((code) => LANGUAGES.find((language) => language.code === code)?.name)
    .filter((name): name is string => Boolean(name));

  return { data, summary: { imported, skipped } };
}

async function generateContent(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "你是一个擅长多语言 SEO 优化和本地化的专家，能够根据不同语种的特点进行专业的内容优化。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("API 返回内容为空，无法继续生成。");
  }

  return content.trim();
}

export default function AutoLanguagePage() {
  const [languageData, setLanguageData] = useState<LanguageData>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [smartImportOpen, setSmartImportOpen] = useState(false);
  const [smartImportText, setSmartImportText] = useState("");
  const [smartImportSummary, setSmartImportSummary] =
    useState<ImportSummary | null>(null);
  const [tempKeywords, setTempKeywords] = useState<LanguageKeywords>({
    mainKeyword: "",
    secondaryKeywords: "",
    lsiKeywords: ""
  });

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-3.5-flash");
  const [originalText, setOriginalText] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<string>("");
  const [keywordDensityOpen, setKeywordDensityOpen] = useState(false);

  function openDialog(languageCode: string) {
    setSelectedLanguage(languageCode);
    setTempKeywords(
      languageData[languageCode] || {
        mainKeyword: "",
        secondaryKeywords: "",
        lsiKeywords: ""
      }
    );
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setSelectedLanguage(null);
  }

  function closeSmartImportDialog() {
    setSmartImportOpen(false);
    setSmartImportSummary(null);
  }

  function saveKeywords() {
    if (selectedLanguage) {
      setLanguageData((prev) => ({
        ...prev,
        [selectedLanguage]: { ...tempKeywords }
      }));
    }
    closeDialog();
  }

  function confirmSmartImport() {
    if (!smartImportText.trim()) {
      alert("请先粘贴多语言关键词内容");
      return;
    }

    const { data, summary } = parseSmartImport(smartImportText);

    if (summary.imported.length === 0) {
      setSmartImportSummary(summary);
      alert("没有识别到可导入的完整语种，请检查语言名称和三类关键词字段。");
      return;
    }

    setLanguageData((prev) => ({
      ...prev,
      ...data
    }));
    setSmartImportSummary(summary);
    setSmartImportText("");
  }

  function hasKeywords(languageCode: string): boolean {
    const data = languageData[languageCode];
    return Boolean(
      data &&
        data.mainKeyword.trim() &&
        data.secondaryKeywords.trim() &&
        data.lsiKeywords.trim()
    );
  }

  async function handleGenerate() {
    if (!apiKey.trim()) {
      alert("请输入 API Key");
      return;
    }

    if (!model.trim()) {
      alert("请选择模型");
      return;
    }

    if (!originalText.trim()) {
      alert("请输入原文");
      return;
    }

    const languagesToGenerate = Object.keys(languageData).filter((code) =>
      hasKeywords(code)
    );

    if (languagesToGenerate.length === 0) {
      alert("请至少为一个语言输入关键词");
      return;
    }

    setStatus("running");
    setResults([]);

    // 并发处理所有语言（最大并发数20）
    const promises = languagesToGenerate.map(async (languageCode) => {
      const language = LANGUAGES.find((l) => l.code === languageCode);
      if (!language) return null;

      try {
        const prompt = buildPrompt(
          languageData[languageCode],
          language.name,
          LANGUAGE_NOTES[languageCode] || "",
          originalText
        );

        const content = await generateContent(apiKey, model, prompt);

        return {
          languageCode,
          language: language.name,
          content
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "生成失败";
        return {
          languageCode,
          language: language.name,
          content: "",
          error: errorMessage
        };
      }
    });

    const results = await Promise.allSettled(promises);

    const finalResults = results
      .map((result) => result.status === "fulfilled" ? result.value : null)
      .filter((result): result is GenerationResult => result !== null);

    setResults(finalResults);
    setStatus("done");
    setCurrentLanguage("");
  }

  async function copyResult(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      alert("已复制到剪贴板");
    } catch {
      alert("复制失败，请手动复制");
    }
  }

  function downloadResult(language: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${language}_optimized.txt`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function downloadAllResults() {
    const successfulResults = results.filter((result) => !result.error);
    if (successfulResults.length === 0) return;

    const zip = new JSZip();
    successfulResults.forEach((result) => {
      zip.file(`${result.language}_optimized.txt`, result.content);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "all_optimized_languages.zip";
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  function getKeywordCounts(result: GenerationResult): {
    main: KeywordCount[];
    secondary: KeywordCount[];
  } {
    const keywords = languageData[result.languageCode];
    if (!keywords) return { main: [], secondary: [] };

    const toCounts = (values: string[]) =>
      values.map((keyword) => ({
        keyword,
        count: countKeywordOccurrences(result.content, keyword)
      }));

    return {
      main: toCounts(splitKeywords(keywords.mainKeyword)),
      secondary: toCounts(splitKeywords(keywords.secondaryKeywords))
    };
  }

  function clearAll() {
    if (confirm("确定要清空所有语言配置和原文内容吗？")) {
      setLanguageData({});
      setOriginalText("");
    }
  }

  function clearCurrentLanguage() {
    setTempKeywords({
      mainKeyword: "",
      secondaryKeywords: "",
      lsiKeywords: ""
    });
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div>
          <p className="page-kicker">Multi-Language SEO</p>
          <h1>Auto Language Optimizer</h1>
          <p className="hero-copy">
            为多个语种自动优化 SEO 内容。支持 19 种语言，每种语言独立配置关键词，批量生成优化后的内容。
          </p>
        </div>
        <div className="status-card">
          <span className={`status-pill status-${status}`}>
            {status === "running" ? `生成中 - ${currentLanguage}` : status}
          </span>
          <p>支持语言：{LANGUAGES.length} 种</p>
          <p>已配置：{Object.keys(languageData).filter(hasKeywords).length} 种</p>
          <p>API 接口：{CHAT_COMPLETIONS_URL}</p>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: "20px" }}>
        <div className="section-head">
          <div>
            <h2>语言配置区</h2>
            <p>点击语言按钮配置该语言的关键词。已配置的语言会高亮显示。</p>
          </div>
          <button
            type="button"
            className="smart-import-button"
            onClick={() => setSmartImportOpen(true)}
          >
            智能导入
          </button>
        </div>

        <div className="language-grid">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              className={
                hasKeywords(language.code)
                  ? "language-button language-button-active"
                  : "language-button"
              }
              onClick={() => openDialog(language.code)}
              style={{ position: "relative" }}
            >
              {hasKeywords(language.code) && (
                <span
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "var(--primary)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}
                >
                  ✓
                </span>
              )}
              <span className="language-name">{language.name}</span>
              <span className="language-native">{language.nativeName}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: "20px" }}>
        <div className="section-head">
          <div>
            <h2>API 配置</h2>
            <p>配置 API 密钥、模型和原文内容。</p>
          </div>
        </div>

        <div className="field-grid">
          <label className="field field-full">
            <span>API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入你的 API Key"
            />
          </label>

          <label className="field">
            <span>模型名称</span>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {AVAILABLE_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m === "gemini-3.5-flash" ? `${m}（推荐）` : m}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>接口文档</span>
            <a
              href="https://5vm8vsh4qz.apifox.cn/"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--primary)", textDecoration: "underline" }}
            >
              查看硅基 API 文档
            </a>
          </div>

          <label className="field field-full">
            <span>原文内容</span>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="输入需要翻译优化的原文..."
              rows={8}
            />
          </label>
        </div>

        <div className="button-row">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === "running"}
          >
            {status === "running" ? "生成中..." : "开始生成"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={clearAll}
            title="清空所有配置"
          >
            🗑️ 清空
          </button>
        </div>
      </section>

      {results.length > 0 && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>生成结果</h2>
              <p>已完成 {results.length} 个语言的内容优化。</p>
            </div>
            <div className="inline-actions result-summary-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setKeywordDensityOpen(true)}
              >
                关键词密度
              </button>
              <button type="button" onClick={downloadAllResults}>
                下载全部 ZIP
              </button>
            </div>
          </div>

          <div className="results-list">
            {results.map((result, index) => (
              <div key={index} className="result-block">
                <div className="block-head">
                  <h3>{result.language}</h3>
                  <div className="inline-actions">
                    {!result.error && (
                      <>
                        <button
                          type="button"
                          className="ghost small"
                          onClick={() => copyResult(result.content)}
                        >
                          复制
                        </button>
                        <button
                          type="button"
                          className="ghost small"
                          onClick={() =>
                            downloadResult(result.language, result.content)
                          }
                        >
                          下载
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {result.error ? (
                  <p className="error-text" style={{ padding: "18px" }}>
                    {result.error}
                  </p>
                ) : (
                  <pre>{result.content}</pre>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {keywordDensityOpen && (
        <div
          className="dialog-overlay"
          onClick={() => setKeywordDensityOpen(false)}
        >
          <div
            className="dialog-content keyword-density-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-header">
              <h2>关键词次数</h2>
              <button
                type="button"
                className="dialog-close"
                onClick={() => setKeywordDensityOpen(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <div className="dialog-body keyword-density-body">
              {results.filter((result) => !result.error).map((result) => {
                const counts = getKeywordCounts(result);
                return (
                  <section key={result.languageCode} className="keyword-language-group">
                    <h3>{result.language}</h3>
                    <div className="keyword-count-section">
                      <h4>主词</h4>
                      {counts.main.map((item) => (
                        <div key={item.keyword} className="keyword-count-row">
                          <span>{item.keyword}</span>
                          <strong>{item.count} 次</strong>
                        </div>
                      ))}
                    </div>
                    <div className="keyword-count-section">
                      <h4>次要词</h4>
                      {counts.secondary.map((item) => (
                        <div key={item.keyword} className="keyword-count-row">
                          <span>{item.keyword}</span>
                          <strong>{item.count} 次</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {smartImportOpen && (
        <div className="dialog-overlay" onClick={closeSmartImportDialog}>
          <div
            className="dialog-content smart-import-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header">
              <h2>智能导入</h2>
              <button
                type="button"
                className="dialog-close"
                onClick={closeSmartImportDialog}
              >
                ✕
              </button>
            </div>

            <div className="dialog-body">
              <label className="field">
                <span>粘贴多语言关键词</span>
                <textarea
                  value={smartImportText}
                  onChange={(e) => {
                    setSmartImportText(e.target.value);
                    setSmartImportSummary(null);
                  }}
                  placeholder={`例如：
1.西班牙语
核心词：...
次要词：...
LSI 关键词：...

4.俄语
核心词：...
次要词：...
LSI 关键词：...`}
                  rows={14}
                />
              </label>

              {smartImportSummary && (
                <div className="smart-import-summary">
                  <p>
                    已导入：{" "}
                    {smartImportSummary.imported.length > 0
                      ? smartImportSummary.imported.join("、")
                      : "无"}
                  </p>
                  {smartImportSummary.skipped.length > 0 && (
                    <p>
                      未导入：{smartImportSummary.skipped.join("、")}，请检查是否缺少核心词、次要词或 LSI 关键词。
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="ghost"
                onClick={closeSmartImportDialog}
              >
                取消
              </button>
              <button type="button" onClick={confirmSmartImport}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogOpen && selectedLanguage && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>
                配置关键词 -{" "}
                {LANGUAGES.find((l) => l.code === selectedLanguage)?.name}
              </h2>
              <button
                type="button"
                className="dialog-close"
                onClick={closeDialog}
              >
                ✕
              </button>
            </div>

            <div className="dialog-body">
              <label className="field">
                <span>主关键词（核心词）</span>
                <input
                  type="text"
                  value={tempKeywords.mainKeyword}
                  onChange={(e) =>
                    setTempKeywords((prev) => ({
                      ...prev,
                      mainKeyword: e.target.value
                    }))
                  }
                  placeholder="例如: beste stofzuiger"
                />
              </label>

              <label className="field">
                <span>次要关键词</span>
                <textarea
                  value={tempKeywords.secondaryKeywords}
                  onChange={(e) =>
                    setTempKeywords((prev) => ({
                      ...prev,
                      secondaryKeywords: e.target.value
                    }))
                  }
                  placeholder="多个关键词用逗号或换行分隔"
                  rows={4}
                />
              </label>

              <label className="field">
                <span>LSI 关键词</span>
                <textarea
                  value={tempKeywords.lsiKeywords}
                  onChange={(e) =>
                    setTempKeywords((prev) => ({
                      ...prev,
                      lsiKeywords: e.target.value
                    }))
                  }
                  placeholder="多个关键词用逗号或换行分隔"
                  rows={4}
                />
              </label>

              <div className="language-note">
                <strong>语种特点：</strong>
                <p>{LANGUAGE_NOTES[selectedLanguage]}</p>
              </div>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="ghost"
                onClick={clearCurrentLanguage}
                title="清空当前语种的关键词"
              >
                🗑️
              </button>
              <button type="button" className="ghost" onClick={closeDialog}>
                取消
              </button>
              <button type="button" onClick={saveKeywords}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
