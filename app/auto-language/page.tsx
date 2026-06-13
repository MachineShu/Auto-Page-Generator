"use client";

import { useState } from "react";

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

type GenerationResult = {
  language: string;
  content: string;
  error?: string;
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

const AVAILABLE_MODELS = [
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

1.保持字数跟原文尽量一致，保持字数差距不超过 50-100 词。

2.不同语种的 metadata 不一致。
title 和 description都要命中对应的核心关键词至少 1 次，且命中1-2 个次要关键词。
title 字数 50-55字符；description 字数 150-155 字符，命中核心关键词和1-5个次要关键词。

3.SEO 关键词出现次数规则：
每个语种的*核心关键词*要全文占比 [ 2.2% ]，最低出现 [ 35 次 ]，但是严禁超过 [ 40 ]次。你可以尽量将10多个词出现前 FAQ 前面几个部分中（比如 tilte、description 、usecase 中），将剩下的词（25-40 个词）尽可能多得塞到 FAQ 部分中。
hero title 、features title、benefits title、cta title 或 cta description 必须命中核心关键词各 1 次；
次要关键词出现 [ 2-4 ] 次，LSI 关键词要出现 [ 1-3 ] 次。每个词都要出现至少一次。
需要将次要关键词、LSI 关键词自然融入正文中。切记不要生硬表达。

4.
严禁：语法错误、句式断裂残缺、同质化重复表达。严禁跟英文混杂，要符合地道的当地语种的表达。
不要省略文案，特别是 faq 的大段文本不要随意省略。

这是词群：
- 核心关键词：${languageData.mainKeyword}
- 次要关键词：${languageData.secondaryKeywords}
- LSI 关键词：${languageData.lsiKeywords}

你要翻译的语言是：${languageName}

这是被翻译的语种原文：
${originalText}`;
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
  const [tempKeywords, setTempKeywords] = useState<LanguageKeywords>({
    mainKeyword: "",
    secondaryKeywords: "",
    lsiKeywords: ""
  });

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-5.4");
  const [originalText, setOriginalText] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<string>("");

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

  function saveKeywords() {
    if (selectedLanguage) {
      setLanguageData((prev) => ({
        ...prev,
        [selectedLanguage]: { ...tempKeywords }
      }));
    }
    closeDialog();
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

    for (const languageCode of languagesToGenerate) {
      const language = LANGUAGES.find((l) => l.code === languageCode);
      if (!language) continue;

      setCurrentLanguage(language.name);

      try {
        const prompt = buildPrompt(
          languageData[languageCode],
          language.name,
          LANGUAGE_NOTES[languageCode] || "",
          originalText
        );

        const content = await generateContent(apiKey, model, prompt);

        setResults((prev) => [
          ...prev,
          {
            language: language.name,
            content
          }
        ]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "生成失败";
        setResults((prev) => [
          ...prev,
          {
            language: language.name,
            content: "",
            error: errorMessage
          }
        ]);
      }
    }

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
            >
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
                  {m}
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
        </div>
      </section>

      {results.length > 0 && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>生成结果</h2>
              <p>已完成 {results.length} 个语言的内容优化。</p>
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
