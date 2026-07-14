"use client";

import { type ChangeEvent, type DragEvent, useEffect, useState } from "react";
import { read, utils } from "xlsx";

type GenerationStep = "titleMeta" | "outline" | "article";
type Phase = "idle" | "running" | "done" | "error";
type ModelLoadState = "idle" | "loading" | "done" | "error";
type CopyState = "idle" | "copied";

type FormState = {
  apiKey: string;
  model: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  lsiKeywords: string;
  targetWords: string;
  heroInfo: string;
  benefitInfo: string;
  howItWorksInfo: string;
  useCaseInfo: string;
  faqInfo: string;
  extraInfo: string;
};

type WorkflowResult = {
  titleMetaMarkdown: string;
  titleCandidates: string[];
  selectedTitle: string;
  outlineMarkdown: string;
  articleMarkdown: string;
  updatedAt: string | null;
};

type ModuleUIState = {
  inputOpen: boolean;
  outputOpen: boolean;
};

type WorkflowModuleState = {
  id: string;
  folderName: string | null;
  form: FormState;
  result: WorkflowResult;
  availableModels: string[];
  phase: Phase;
  currentStep: GenerationStep;
  modelLoadState: ModelLoadState;
  modelMessage: string;
  error: string;
  lastPolledAt: string | null;
  copyState: CopyState;
  ui: ModuleUIState;
};

type PersistedModuleState = {
  id: string;
  folderName: string | null;
  form: FormState;
  result: WorkflowResult;
  availableModels: string[];
  currentStep: GenerationStep;
  ui: ModuleUIState;
};

type StoredState = {
  modules?: PersistedModuleState[];
};

type ImportFieldKey =
  | "primaryKeyword"
  | "targetWords"
  | "secondaryKeywords"
  | "lsiKeywords"
  | "heroInfo"
  | "benefitInfo"
  | "howItWorksInfo"
  | "useCaseInfo"
  | "faqInfo"
  | "extraInfo";

type ImportedFormRow = Pick<FormState, ImportFieldKey>;

type CompletionResponse = {
  content: string;
  raw: unknown;
  requestBody: Record<string, unknown>;
};

type MidResultPayload = {
  action: string;
  folderName: null | string;
  moduleId: string;
  moduleIndex: number;
  requestBody?: Record<string, unknown>;
  responseJson?: unknown;
  responseText?: string;
  snapshot: unknown;
  error?: string;
};

const STORAGE_KEY = "auto-page-generator-modules-v1";
const API_KEY_STORAGE_KEY = "auto-page-generator-api-key";
const API_KEY_COOKIE_NAME = "auto_page_generator_api_key";
const POLL_INTERVAL = 15000;
const MAX_MODULES = 10;
const MAX_IMPORT_ROWS = 10;
const LOCAL_SAVE_PORT = 3188;
const PROVIDER_DOCS_URL = "https://5vm8vsh4qz.apifox.cn/";
const PROVIDER_BASE_URL = "https://api.guijiapi.net/v1";
const CHAT_COMPLETIONS_URL = `${PROVIDER_BASE_URL}/chat/completions`;
const MODELS_URL = `${PROVIDER_BASE_URL}/models`;

const BUILTIN_MODELS = [
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "grok-4.3",
  "claude-sonnet-5",
  "gemini-3.5-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite",
  "gpt-5.4-mini",
  "gpt-5.4",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "deepseek-v4-flash",
  "deepseek-v4-pro"
] as const;

const INITIAL_FORM: FormState = {
  apiKey: "",
  model: "gpt-5.6-sol",
  primaryKeyword: "",
  secondaryKeywords: "",
  lsiKeywords: "",
  targetWords: "",
  heroInfo: "",
  benefitInfo: "",
  howItWorksInfo: "",
  useCaseInfo: "",
  faqInfo: "",
  extraInfo: ""
};

const INITIAL_RESULT: WorkflowResult = {
  titleMetaMarkdown: "",
  titleCandidates: [],
  selectedTitle: "",
  outlineMarkdown: "",
  articleMarkdown: "",
  updatedAt: null
};

const IMPORT_FORM_KEYS: ImportFieldKey[] = [
  "primaryKeyword",
  "targetWords",
  "secondaryKeywords",
  "lsiKeywords",
  "heroInfo",
  "benefitInfo",
  "howItWorksInfo",
  "useCaseInfo",
  "faqInfo",
  "extraInfo"
];

const IMPORT_HEADER_ALIASES: Record<string, ImportFieldKey> = {
  "主关键词": "primaryKeyword",
  "核心关键词": "primaryKeyword",
  "primarykeyword": "primaryKeyword",
  "mainkeyword": "primaryKeyword",
  "corekeyword": "primaryKeyword",
  "指定字数": "targetWords",
  "目标字数": "targetWords",
  "字数": "targetWords",
  "targetwords": "targetWords",
  "wordcount": "targetWords",
  "words": "targetWords",
  "次要关键词": "secondaryKeywords",
  "相关关键词": "secondaryKeywords",
  "secondarykeywords": "secondaryKeywords",
  "secondarykeyword": "secondaryKeywords",
  "relatedkeywords": "secondaryKeywords",
  "lsi关键词": "lsiKeywords",
  "lsikeywords": "lsiKeywords",
  "lsikeyword": "lsiKeywords",
  "hero信息": "heroInfo",
  "heroinfo": "heroInfo",
  "hero": "heroInfo",
  "benefit信息": "benefitInfo",
  "benefits信息": "benefitInfo",
  "benefitinfo": "benefitInfo",
  "benefitsinfo": "benefitInfo",
  "benefit": "benefitInfo",
  "benefits": "benefitInfo",
  "howitworks信息": "howItWorksInfo",
  "howitworksinfo": "howItWorksInfo",
  "howitworks": "howItWorksInfo",
  "usecase信息": "useCaseInfo",
  "usecases信息": "useCaseInfo",
  "usecaseinfo": "useCaseInfo",
  "usecasesinfo": "useCaseInfo",
  "usecase": "useCaseInfo",
  "usecases": "useCaseInfo",
  "faq信息": "faqInfo",
  "faqinfo": "faqInfo",
  "faq": "faqInfo",
  "补充信息": "extraInfo",
  "其他补充信息": "extraInfo",
  "additionalinfo": "extraInfo",
  "extrainfo": "extraInfo",
  "extra": "extraInfo"
};

function normalizeImportHeader(header: unknown) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-:/\\|()[\]{}"'`，。；;：、（）【】]/g, "");
}

function stringifyImportCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("zh-CN");
  }

  return String(value).trim();
}

function createEmptyImportedRow(): ImportedFormRow {
  return IMPORT_FORM_KEYS.reduce(
    (row, key) => ({
      ...row,
      [key]: ""
    }),
    {} as ImportedFormRow
  );
}

function parseImportedRows(workbook: ReturnType<typeof read>) {
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;

  if (!firstSheet) {
    return [];
  }

  const rows = utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    raw: false,
    defval: ""
  });

  const nonEmptyRows = rows.filter((row) => row.some((cell) => stringifyImportCell(cell)));
  if (nonEmptyRows.length < 2) {
    return [];
  }

  const headerRow = nonEmptyRows[0];
  const columnMap = headerRow.map((header) => IMPORT_HEADER_ALIASES[normalizeImportHeader(header)] ?? null);

  if (!columnMap.some(Boolean)) {
    return [];
  }

  return nonEmptyRows
    .slice(1, MAX_IMPORT_ROWS + 1)
    .map((row) => {
      const importedRow = createEmptyImportedRow();

      columnMap.forEach((key, columnIndex) => {
        if (key) {
          importedRow[key] = stringifyImportCell(row[columnIndex]);
        }
      });

      return importedRow;
    })
    .filter((row) => IMPORT_FORM_KEYS.some((key) => row[key].trim()));
}

async function readWorkbookFromFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = await file.text();
    return read(text, { type: "string" });
  }

  const buffer = await file.arrayBuffer();
  return read(buffer, { type: "array" });
}

function createImportedModule(row: ImportedFormRow, previousModule?: WorkflowModuleState) {
  const base = createInitialModule();
  const previousForm = previousModule?.form;

  return {
    ...base,
    id: previousModule?.id ?? base.id,
    folderName: null,
    form: {
      ...base.form,
      apiKey: previousForm?.apiKey?.trim() || base.form.apiKey,
      model: previousForm?.model?.trim() || base.form.model,
      ...row
    },
    availableModels: previousModule?.availableModels?.length ? [...previousModule.availableModels] : base.availableModels,
    ui: {
      inputOpen: true,
      outputOpen: true
    }
  };
}

function readPersistedApiKey() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "";
  }

  const savedApiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim();
  if (savedApiKey) {
    return savedApiKey;
  }

  const cookieEntry = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${API_KEY_COOKIE_NAME}=`));

  if (!cookieEntry) {
    return "";
  }

  return decodeURIComponent(cookieEntry.slice(API_KEY_COOKIE_NAME.length + 1)).trim();
}

function persistApiKey(apiKey: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const normalized = apiKey.trim();

  if (!normalized) {
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    document.cookie = `${API_KEY_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  window.localStorage.setItem(API_KEY_STORAGE_KEY, normalized);
  document.cookie = `${API_KEY_COOKIE_NAME}=${encodeURIComponent(
    normalized
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function splitList(input: string) {
  return input
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueModels(models: string[]) {
  return Array.from(
    new Set(
      models
        .map((model) => model.trim())
        .filter(Boolean)
    )
  );
}

function mergeModels(models: string[]) {
  const builtIn = Array.from(BUILTIN_MODELS);
  const extras = uniqueModels(models).filter((model) => !builtIn.includes(model as (typeof BUILTIN_MODELS)[number]));
  return [...builtIn, ...extras.sort((a, b) => a.localeCompare(b))];
}

function extractTitleCandidates(markdown: string) {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = lines
    .filter((line) => {
      const normalized = line.toLowerCase();
      return normalized.startsWith("- ") || normalized.startsWith("* ") || /^\d+\./.test(normalized);
    })
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return Array.from(new Set(candidates));
}

function buildTitleMetaPrompt(form: FormState) {
  return `你现在要为一个工具页先产出“标题候选 + metadata 数据”。

请严格按下面要求输出，且输出使用 Markdown。

一、标题候选
针对这个工具页，请你基于核心词 [${form.primaryKeyword}] 来设计 5 个 H1 标题，要求：
1. 命中核心词
2. H1 字数在 20 词以内
3. 通俗易懂、具有吸引力
4. 针对用户痛点，突出产品亮点
5. H1 文案要用英文，其他说明用中文

二、metadata 数据
下面给我 title 和 description：
1. title 为英文，50-55 字符以内
2. description 为英文，145-150 字符以内
3. title 和 description 都要命中主关键词 [${form.primaryKeyword}]
4. description 要自然命中几个相关关键词
5. 不要提及免费

补充信息如下：
- 次要关键词：${form.secondaryKeywords || "无"}
- LSI 关键词：${form.lsiKeywords || "无"}
- Hero 信息：${form.heroInfo || "无"}
- Benefit 信息：${form.benefitInfo || "无"}
- How it works 信息：${form.howItWorksInfo || "无"}
- Use case 信息：${form.useCaseInfo || "无"}
- FAQ 信息：${form.faqInfo || "无"}
- 补充信息：${form.extraInfo || "无"}

请按以下 Markdown 结构输出，不要省略标题：
## Title Candidates
1. ...
2. ...
3. ...
4. ...
5. ...

## Metadata
- Title: ...
- Description: ...

## Notes
- 用中文简要说明你如何覆盖了关键词和用户痛点。`;
}

function buildOutlinePrompt(form: FormState, selectedTitle: string) {
  return `下面需要你设计整个工具页的内容大纲。

标题是 [${selectedTitle}]
目标关键词是 [${form.primaryKeyword}]

要求：
1. 包括的角度：hero、benefits、How it works、Use cases、FAQ、CTA
2. 只有 hero 有 h1 标题和描述性文本，不需要 H2、H3。其中描述文案字数 15-23 词。
3. hero 中 H1 标题沿用之前的标题，命中目标关键词，20 词以内；描述性文本 25 词以内，命中目标关键词 1 次
4. benefits 需要 h2 标题 + 描述性文本；重新命名 H2 标题，H2 命中 2 次主关键词
5. 全文仅用 H1、H2、H3，大纲格式要 SEO 友好，尽可能命中指定的词
6. 每部分开头指明使用了哪些相关词、LSI 关键词，并且尽量全部覆盖
7. 给我中文版大纲即可，但目标关键词、相关词、LSI 关键词保持英文
8. 最终按照工具页框架每个模块输出
9. 每部分都要标记 h1、h2、h3 是什么
10. 预计总字数：${form.targetWords || "未指定"}

模块补充要求：
- Benefits 主要角度：${form.benefitInfo || "未指定，请你补全合理结构"}，该部分需要 H2 标题
- How it works：${form.howItWorksInfo || "未指定，请你补全合理结构"}，该部分不需要 H2 标题
- Use cases：${form.useCaseInfo || "未指定，请你补全合理结构"}，该部分需要 H2 标题，H3 标题开头不用展示数字
- FAQ：${form.faqInfo || "未指定，请你补全合理结构"}，该部分不需要 H2 标题，每个子问题开头不要展示数字
- Hero：${form.heroInfo || "未指定，请你补全合理结构"}
- CTA：请给出一句强有力的号召，该部分需要 H2 标题，并且有描述语 10-18 词。
- 其他补充信息：${form.extraInfo || "无"}

关键词信息：
- 相关词：${form.secondaryKeywords || "无"}
- LSI 关键词：${form.lsiKeywords || "无"}

请按 Markdown 输出，使用以下结构：
## Hero
...

## Benefits
...

## How It Works
...

## Use Cases
...

## FAQ
...

## CTA
...`;
}

function buildArticlePrompt(form: FormState, selectedTitle: string, outlineMarkdown: string) {
  return `下面请你针对整个框架进行全文创作。

请基于以下信息：
- 标题：${selectedTitle}
- 目标字数：${form.targetWords || "未指定"}
- 核心关键词：${form.primaryKeyword}
- 相关词：${form.secondaryKeywords || "无"}
- LSI 关键词：${form.lsiKeywords || "无"}

以下是已经确认的大纲，请严格沿用其结构与模块：
${outlineMarkdown}

创作要求：
1. 核心关键词 [${form.primaryKeyword}] 命中 22-33 次
2. 只能生成英文，不能生成中文：
#这是相关词，每个命中 2-4 次#：${form.secondaryKeywords || "无"}
#这是 LSI 关键词，每个命中 1-2 次#：${form.lsiKeywords || "无"}
3. 各部分字数要求：
- Hero 描述性文本：13 字以内
- Features/Benefits 每个 H3 的文案：20-40 字之间
- How it works 总字数：70 字以内，且这部分不要 H3
- Use cases 每个 H3 的文案：45-60 字之间
- FAQ 共 8 个问题，每个问题 120-200 字之间；每个问题前用“Q：”作为前缀，每个回答用“A：”作为前缀；这部分不要 H2 和 H3
- CTA 描述性文案：20 字以内
4. 最终按照工具页框架每个模块输出
5. 用【】在每段开头标记，如【hero】、【benefit】等
6. 不要使用 Markdown 标题符号，不要输出 #、##、### 这种格式
7. 所有一级标题统一写成 “H1：标题内容”
8. 所有二级标题统一写成 “H2：标题内容”
9. 所有三级标题统一写成 “H3：标题内容”
10. 标题和正文换行展示，不要把标题和正文写在同一行
11. 关于核心关键词 [${form.primaryKeyword}]，FAQ 模块之前的部分命中 10 次，FAQ 模块命中 25 次
12. 最终输出为纯文本结构化内容，保留段落和换行，不要改回 Markdown 标题格式。
13. 全文总字数在1800词之内

附加上下文：
- Hero 信息：${form.heroInfo || "无"}
- Benefit 信息：${form.benefitInfo || "无"}
- How it works 信息：${form.howItWorksInfo || "无"}
- Use case 信息：${form.useCaseInfo || "无"}
- FAQ 信息：${form.faqInfo || "无"}
- 补充信息：${form.extraInfo || "无"}`;
}

function buildChatRequestBody(model: string, prompt: string) {
  return {
    model,
    messages: [
      {
        role: "system",
        content:
          "你是一个擅长 SEO 工具页生成的英文内容策划与文案专家。请严格遵守格式要求，并始终输出 Markdown。"
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    stream: false
  };
}

function createModuleId() {
  return `module-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialModule(): WorkflowModuleState {
  return {
    id: createModuleId(),
    folderName: null,
    form: {
      ...INITIAL_FORM,
      apiKey: readPersistedApiKey()
    },
    result: { ...INITIAL_RESULT },
    availableModels: mergeModels([]),
    phase: "idle",
    currentStep: "titleMeta",
    modelLoadState: "idle",
    modelMessage: "",
    error: "",
    lastPolledAt: null,
    copyState: "idle",
    ui: {
      inputOpen: false,
      outputOpen: true
    }
  };
}

function cloneModuleState(module: WorkflowModuleState): WorkflowModuleState {
  return {
    ...module,
    form: { ...module.form },
    result: {
      ...module.result,
      titleCandidates: [...module.result.titleCandidates]
    },
    availableModels: [...module.availableModels],
    ui: { ...module.ui }
  };
}

function hydrateModule(raw: Partial<WorkflowModuleState> | undefined) {
  const base = createInitialModule();
  const persistedApiKey = readPersistedApiKey();
  const copyState: CopyState = raw?.copyState === "copied" ? "copied" : "idle";
  const phase: Phase =
    raw?.phase === "running" || raw?.phase === "done" || raw?.phase === "error" ? raw.phase : "idle";
  const currentStep: GenerationStep =
    raw?.currentStep === "outline" || raw?.currentStep === "article" ? raw.currentStep : "titleMeta";
  const modelLoadState: ModelLoadState =
    raw?.modelLoadState === "loading" || raw?.modelLoadState === "done" || raw?.modelLoadState === "error"
      ? raw.modelLoadState
      : "idle";

  return {
    ...base,
    ...raw,
    form: {
      ...base.form,
      ...(raw?.form ?? {}),
      apiKey: raw?.form?.apiKey?.trim() || persistedApiKey || base.form.apiKey,
      primaryKeyword: "",
      secondaryKeywords: "",
      lsiKeywords: ""
    },
    result: { ...base.result },
    availableModels: mergeModels(raw?.availableModels ?? []),
    copyState,
    phase,
    currentStep,
    modelLoadState,
    ui: {
      ...base.ui,
      ...(raw?.ui ?? {})
    }
  };
}

function getLatestMarkdown(result: WorkflowResult) {
  return result.articleMarkdown || result.outlineMarkdown || result.titleMetaMarkdown;
}

function createTouchedResult(result: WorkflowResult, patch: Partial<WorkflowResult>) {
  return {
    ...result,
    ...patch,
    updatedAt: new Date().toLocaleString("zh-CN")
  };
}

function canGenerateTitleMeta(form: FormState) {
  return (
    Boolean(form.primaryKeyword.trim()) &&
    Boolean(form.targetWords.trim()) &&
    Boolean(form.secondaryKeywords.trim()) &&
    Boolean(form.lsiKeywords.trim())
  );
}

function createPersistedModule(module: WorkflowModuleState): PersistedModuleState {
  return {
    id: module.id,
    folderName: module.folderName,
    form: {
      ...module.form,
      primaryKeyword: "",
      secondaryKeywords: "",
      lsiKeywords: ""
    },
    result: { ...INITIAL_RESULT },
    availableModels: module.availableModels,
    currentStep: "titleMeta",
    ui: module.ui
  };
}

function saveState(modules: WorkflowModuleState[]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredState = {
    modules: modules.map(createPersistedModule)
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures so generation flow is not blocked.
  }
}

function loadState() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredState;
  } catch {
    return null;
  }
}

function isLocalDevRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  return process.env.NODE_ENV === "development";
}

function getLocalSaveUrl() {
  return `http://127.0.0.1:${LOCAL_SAVE_PORT}/save`;
}

async function requestCompletion(apiKey: string, requestBody: Record<string, unknown>): Promise<CompletionResponse> {
  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
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

  return {
    content: content.trim(),
    raw: data,
    requestBody
  };
}

async function fetchProviderModels(apiKey: string) {
  const response = await fetch(MODELS_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`模型列表获取失败（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  const models = Array.isArray(data?.data)
    ? data.data
        .map((item: { id?: unknown }) => (typeof item?.id === "string" ? item.id : ""))
        .filter(Boolean)
    : [];

  if (models.length === 0) {
    throw new Error("服务商返回的模型列表为空。");
  }

  return {
    models: mergeModels(models),
    raw: data
  };
}

async function persistMidResult(payload: MidResultPayload) {
  if (!isLocalDevRuntime()) {
    return payload.folderName;
  }

  try {
    const response = await fetch(getLocalSaveUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return payload.folderName;
    }

    const data = (await response.json()) as { folderName?: string };
    return data.folderName ?? payload.folderName;
  } catch {
    return payload.folderName;
  }
}

function buildModuleSnapshot(module: WorkflowModuleState) {
  return {
    id: module.id,
    folderName: module.folderName,
    form: module.form,
    result: module.result,
    phase: module.phase,
    currentStep: module.currentStep,
    modelLoadState: module.modelLoadState,
    modelMessage: module.modelMessage,
    error: module.error,
    availableModels: module.availableModels
  };
}

type WorkflowModuleCardProps = {
  index: number;
  module: WorkflowModuleState;
  canRemove: boolean;
  onToggleInput: (moduleId: string, nextOpen: boolean) => void;
  onToggleOutput: (moduleId: string, nextOpen: boolean) => void;
  onFormChange: <K extends keyof FormState>(moduleId: string, key: K, value: FormState[K]) => void;
  onTitleChange: (moduleId: string, value: string) => void;
  onLoadModels: (moduleId: string) => Promise<void>;
  onGenerate: (moduleId: string, step: GenerationStep) => Promise<void>;
  onReset: (moduleId: string) => void;
  onCopy: (moduleId: string) => Promise<void>;
  onDownload: (moduleId: string) => void;
  onRemove: (moduleId: string) => void;
};

function WorkflowModuleCard({
  index,
  module,
  canRemove,
  onToggleInput,
  onToggleOutput,
  onFormChange,
  onTitleChange,
  onLoadModels,
  onGenerate,
  onReset,
  onCopy,
  onDownload,
  onRemove
}: WorkflowModuleCardProps) {
  const latestMarkdown = getLatestMarkdown(module.result);
  const titleMetaEnabled = canGenerateTitleMeta(module.form);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  return (
    <article className="panel module-card">
      <div className="module-card-head">
        <div>
          <p className="eyebrow">Concurrent Module {index + 1}</p>
          <h2>模块 {index + 1}</h2>
          <p className="module-card-copy">
            一个模块包含输入区和工作流结果，适合后续并发处理。
            {module.folderName ? ` 本地开发保存目录：mid-result/${module.folderName}` : ""}
          </p>
        </div>
        <div className="module-card-head-meta">
          <span className={`status-pill status-${module.phase}`}>{module.phase}</span>
          {module.folderName ? <span className="module-folder-tag">{module.folderName}</span> : null}
          {canRemove ? (
            isConfirmingRemove ? (
              <div className="remove-confirm-actions" aria-label="确认删除模块">
                <button type="button" className="danger small" onClick={() => onRemove(module.id)}>
                  确认删除
                </button>
                <button type="button" className="ghost small" onClick={() => setIsConfirmingRemove(false)}>
                  取消
                </button>
              </div>
            ) : (
              <button type="button" className="ghost small" onClick={() => setIsConfirmingRemove(true)}>
                删除模块
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="module-card-body">
        <div className={module.ui.inputOpen ? "module-section input-panel module-section-expanded" : "module-section input-panel"}>
          <div className="module-section-summary">
            <div className="module-section-summary-copy">
              <h3>输入区</h3>
              <p>API Key 仅保存在浏览器本地。模型请求方式固定为 OpenAI 兼容格式。</p>
            </div>
            <div className="input-panel-summary-actions">
              <button
                type="button"
                className="summary-action-button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void onGenerate(module.id, "titleMeta");
                }}
                disabled={!titleMetaEnabled}
              >
                1. 生成标题与 Metadata
              </button>
              <button
                type="button"
                className="summary-action-button secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void onGenerate(module.id, "outline");
                }}
                disabled={!module.result.titleMetaMarkdown}
              >
                2. 生成大纲
              </button>
              <button
                type="button"
                className="summary-action-button secondary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void onGenerate(module.id, "article");
                }}
                disabled={!module.result.outlineMarkdown}
              >
                3. 生成正文
              </button>
              <button
                type="button"
                className="ghost small toggle-chip"
                onClick={() => onToggleInput(module.id, !module.ui.inputOpen)}
              >
                {module.ui.inputOpen ? "点击收拢" : "默认收拢，点击展开"}
              </button>
            </div>
          </div>

          {module.ui.inputOpen ? (
            <form className="module-section-body" onSubmit={(event) => event.preventDefault()}>
              <div className="field-grid">
                <label className="field">
                  <span>API Key</span>
                  <input
                    type="password"
                    name="api_key"
                    autoComplete="current-password"
                    spellCheck={false}
                    value={module.form.apiKey}
                    onChange={(event) => onFormChange(module.id, "apiKey", event.target.value)}
                    placeholder="输入你的 API Key"
                  />
                </label>

                <label className="field">
                  <span>模型名称</span>
                  <select
                    value={module.form.model}
                    onChange={(event) => onFormChange(module.id, "model", event.target.value)}
                  >
                    {module.availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="field field-full">
                  <span>模型列表同步</span>
                  <div className="sync-row">
                    <button type="button" className="ghost small" onClick={() => void onLoadModels(module.id)}>
                      {module.modelLoadState === "loading" ? "同步中..." : "从服务商拉取模型"}
                    </button>
                    <span className="sync-meta">默认接口：{MODELS_URL}</span>
                  </div>
                  {module.modelMessage ? <p className="helper-text">{module.modelMessage}</p> : null}
                </div>

                <label className="field">
                  <span>主关键词</span>
                  <input
                    value={module.form.primaryKeyword}
                    onChange={(event) => onFormChange(module.id, "primaryKeyword", event.target.value)}
                    placeholder="例如：ai video generator"
                  />
                </label>

                <label className="field">
                  <span>指定字数</span>
                  <input
                    value={module.form.targetWords}
                    onChange={(event) => onFormChange(module.id, "targetWords", event.target.value)}
                    placeholder="例如：2800"
                  />
                </label>

                <label className="field field-full">
                  <span>次要关键词</span>
                  <textarea
                    value={module.form.secondaryKeywords}
                    onChange={(event) => onFormChange(module.id, "secondaryKeywords", event.target.value)}
                    placeholder="用逗号、顿号或换行分隔"
                    rows={3}
                  />
                </label>

                <label className="field field-full">
                  <span>LSI 关键词</span>
                  <textarea
                    value={module.form.lsiKeywords}
                    onChange={(event) => onFormChange(module.id, "lsiKeywords", event.target.value)}
                    placeholder="用逗号、顿号或换行分隔"
                    rows={3}
                  />
                </label>

                <label className="field field-full">
                  <span>Hero 信息</span>
                  <textarea
                    value={module.form.heroInfo}
                    onChange={(event) => onFormChange(module.id, "heroInfo", event.target.value)}
                    placeholder="可选"
                    rows={3}
                  />
                </label>

                <label className="field field-full">
                  <span>Benefit 信息</span>
                  <textarea
                    value={module.form.benefitInfo}
                    onChange={(event) => onFormChange(module.id, "benefitInfo", event.target.value)}
                    placeholder="可选"
                    rows={3}
                  />
                </label>

                <label className="field field-full">
                  <span>How it works 信息</span>
                  <textarea
                    value={module.form.howItWorksInfo}
                    onChange={(event) => onFormChange(module.id, "howItWorksInfo", event.target.value)}
                    placeholder="可选"
                    rows={3}
                  />
                </label>

                <label className="field field-full">
                  <span>Use case 信息</span>
                  <textarea
                    value={module.form.useCaseInfo}
                    onChange={(event) => onFormChange(module.id, "useCaseInfo", event.target.value)}
                    placeholder="可选"
                    rows={3}
                  />
                </label>

                <label className="field field-full">
                  <span>FAQ 信息</span>
                  <textarea
                    value={module.form.faqInfo}
                    onChange={(event) => onFormChange(module.id, "faqInfo", event.target.value)}
                    placeholder="可选"
                    rows={3}
                  />
                </label>

                <label className="field field-full">
                  <span>补充信息</span>
                  <textarea
                    value={module.form.extraInfo}
                    onChange={(event) => onFormChange(module.id, "extraInfo", event.target.value)}
                    placeholder="可选"
                    rows={4}
                  />
                </label>
              </div>

              <div className="button-row">
                <button type="button" className="ghost" onClick={() => onReset(module.id)}>
                  重置模块
                </button>
              </div>

              {module.error ? <p className="error-text">{module.error}</p> : null}
            </form>
          ) : null}
        </div>

        <div className={module.ui.outputOpen ? "module-section output-section module-section-expanded" : "module-section output-section"}>
          <div className="module-section-summary">
            <div className="module-section-summary-copy">
              <h3>工作流结果</h3>
              <p>先选标题，再继续生成大纲和正文。当前结果会自动保存到浏览器本地。</p>
            </div>
            <div className="module-section-summary-meta">
              <span>当前步骤：{module.currentStep}</span>
              <span>最近更新：{module.result.updatedAt ?? "暂无"}</span>
              <span>最近轮询：{module.lastPolledAt ?? "尚未开始"}</span>
              <button
                type="button"
                className="ghost small toggle-chip"
                onClick={() => onToggleOutput(module.id, !module.ui.outputOpen)}
              >
                {module.ui.outputOpen ? "点击收拢" : "点击展开"}
              </button>
            </div>
          </div>

          {module.ui.outputOpen ? (
            <div className="module-section-body">
              <div className="output-panel">
                <div className="result-block">
                  <div className="block-head">
                    <h3>标题候选与 Metadata</h3>
                    <span>{module.result.titleCandidates.length} 个标题</span>
                  </div>
                  {module.result.titleCandidates.length > 0 ? (
                    <div className="title-list">
                      {module.result.titleCandidates.map((title) => (
                        <button
                          key={title}
                          type="button"
                          className={title === module.result.selectedTitle ? "title-chip active" : "title-chip"}
                          onClick={() => onTitleChange(module.id, title)}
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">生成后会在这里列出可选标题。</p>
                  )}
                  <pre>{module.result.titleMetaMarkdown || "暂无内容"}</pre>
                </div>

                <div className="result-block">
                  <div className="block-head">
                    <h3>大纲</h3>
                    <span>{module.result.selectedTitle ? `已选标题：${module.result.selectedTitle}` : "尚未选标题"}</span>
                  </div>
                  <div className="title-editor">
                    <label className="field">
                      <span>当前使用标题</span>
                      <input
                        value={module.result.selectedTitle}
                        onChange={(event) => onTitleChange(module.id, event.target.value)}
                        placeholder="可在这里手动修改标题"
                      />
                    </label>
                  </div>
                  <pre>{module.result.outlineMarkdown || "暂无内容"}</pre>
                </div>

                <div className="result-block">
                  <div className="block-head">
                    <h3>正文结果</h3>
                    <div className="inline-actions">
                      <button type="button" className="ghost small" onClick={() => void onCopy(module.id)}>
                        {module.copyState === "copied" ? "已复制" : "复制"}
                      </button>
                      <button type="button" className="ghost small" onClick={() => onDownload(module.id)}>
                        下载结果
                      </button>
                    </div>
                  </div>
                  <pre>{module.result.articleMarkdown || "暂无内容"}</pre>
                </div>

                <div className="result-block">
                  <div className="block-head">
                    <h3>轮询观察区</h3>
                    <span>自动展示当前最新结果</span>
                  </div>
                  <pre>{latestMarkdown || "暂无内容"}</pre>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [modules, setModules] = useState<WorkflowModuleState[]>([createInitialModule()]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [isImportDragging, setIsImportDragging] = useState(false);

  useEffect(() => {
    const saved = loadState();
    if (saved?.modules?.length) {
      setModules(saved.modules.slice(0, MAX_MODULES).map((module) => hydrateModule(module)));
    } else {
      setModules([createInitialModule()]);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveState(modules);
  }, [isHydrated, modules]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const timer = window.setInterval(() => {
      setModules((prev) =>
        prev.map((module) => ({
          ...module,
          lastPolledAt: new Date().toLocaleTimeString("zh-CN")
        }))
      );
    }, POLL_INTERVAL);

    return () => window.clearInterval(timer);
  }, [isHydrated]);

  function updateModule(moduleId: string, updater: (module: WorkflowModuleState) => WorkflowModuleState) {
    setModules((prev) => prev.map((module) => (module.id === moduleId ? updater(module) : module)));
  }

  function getModule(moduleId: string) {
    return modules.find((module) => module.id === moduleId);
  }

  function getModuleIndex(moduleId: string) {
    return modules.findIndex((module) => module.id === moduleId);
  }

  async function saveModuleArtifacts(
    module: WorkflowModuleState,
    moduleIndex: number,
    payload: Omit<MidResultPayload, "folderName" | "moduleId" | "moduleIndex" | "snapshot">
  ) {
    const folderName = await persistMidResult({
      ...payload,
      folderName: module.folderName,
      moduleId: module.id,
      moduleIndex: moduleIndex + 1,
      snapshot: buildModuleSnapshot(module)
    });

    if (folderName && folderName !== module.folderName) {
      updateModule(module.id, (prev) => ({
        ...prev,
        folderName
      }));
    }
  }

  function handleAddModule() {
    setModules((prev) => {
      if (prev.length >= MAX_MODULES) {
        return prev;
      }

      return [...prev, createInitialModule()];
    });
  }

  async function handleImportUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["csv", "xls", "xlsx"].includes(extension)) {
      setImportMessage("请上传 .csv、.xls 或 .xlsx 文件。");
      return;
    }

    try {
      const workbook = await readWorkbookFromFile(file);
      const importedRows = parseImportedRows(workbook);

      if (!importedRows.length) {
        setImportMessage("没有读取到可用行，请确认首行是字段名，且字段在允许范围内。");
        return;
      }

      setModules((prev) => importedRows.map((row, index) => createImportedModule(row, prev[index])));
      setImportMessage(`已从 ${file.name} 读取 ${importedRows.length} 行，并覆盖当前模块。`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "文件读取失败。";
      setImportMessage(`导入失败：${message}`);
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    await handleImportUpload(file);
  }

  function handleImportDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsImportDragging(true);
  }

  function handleImportDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsImportDragging(false);
  }

  function handleImportDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsImportDragging(false);
    void handleImportUpload(event.dataTransfer.files?.[0]);
  }

  function handleRemoveModule(moduleId: string) {
    setModules((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((module) => module.id !== moduleId);
    });
  }

  function handleToggleInput(moduleId: string, nextOpen: boolean) {
    updateModule(moduleId, (module) => ({
      ...module,
      ui: {
        ...module.ui,
        inputOpen: nextOpen
      }
    }));
  }

  function handleToggleOutput(moduleId: string, nextOpen: boolean) {
    updateModule(moduleId, (module) => ({
      ...module,
      ui: {
        ...module.ui,
        outputOpen: nextOpen
      }
    }));
  }

  function handleFormChange<K extends keyof FormState>(moduleId: string, key: K, value: FormState[K]) {
    if (key === "apiKey" && typeof value === "string") {
      persistApiKey(value);
    }

    updateModule(moduleId, (module) => ({
      ...module,
      form: {
        ...module.form,
        [key]: value
      }
    }));
  }

  function handleTitleChange(moduleId: string, value: string) {
    updateModule(moduleId, (module) => ({
      ...module,
      result: createTouchedResult(module.result, {
        selectedTitle: value
      })
    }));
  }

  async function handleLoadModels(moduleId: string) {
    const module = getModule(moduleId);
    const moduleIndex = getModuleIndex(moduleId);

    if (!module || moduleIndex === -1) {
      return;
    }

    if (!module.form.apiKey.trim()) {
      updateModule(moduleId, (prev) => ({
        ...prev,
        modelLoadState: "error",
        modelMessage: "请先输入 API Key，再同步模型列表。"
      }));
      return;
    }

    updateModule(moduleId, (prev) => ({
      ...prev,
      modelLoadState: "loading",
      modelMessage: ""
    }));

    try {
      const { models, raw } = await fetchProviderModels(module.form.apiKey.trim());

      const nextModule: WorkflowModuleState = {
        ...module,
        availableModels: models,
        modelLoadState: "done",
        modelMessage: `已从服务商同步 ${models.length} 个模型。`,
        form: {
          ...module.form,
          model: module.form.model.trim() ? module.form.model : models[0]
        }
      };

      updateModule(moduleId, () => nextModule);

      await saveModuleArtifacts(nextModule, moduleIndex, {
        action: "models-sync",
        requestBody: {
          method: "GET",
          url: MODELS_URL
        },
        responseJson: raw
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "模型列表同步失败。";
      const nextModule: WorkflowModuleState = {
        ...module,
        modelLoadState: "error",
        modelMessage: message
      };

      updateModule(moduleId, () => nextModule);

      await saveModuleArtifacts(nextModule, moduleIndex, {
        action: "models-sync-error",
        error: message
      });
    }
  }

  async function runTitleMeta(module: WorkflowModuleState, moduleIndex: number) {
    const prompt = buildTitleMetaPrompt(module.form);
    const requestBody = buildChatRequestBody(module.form.model, prompt);
    const { content, raw } = await requestCompletion(module.form.apiKey, requestBody);
    const candidates = extractTitleCandidates(content);

    const nextModule: WorkflowModuleState = {
      ...module,
      currentStep: "outline",
      result: createTouchedResult(module.result, {
        titleMetaMarkdown: content,
        titleCandidates: candidates,
        selectedTitle: "",
        outlineMarkdown: "",
        articleMarkdown: ""
      })
    };

    updateModule(module.id, () => nextModule);

    await saveModuleArtifacts(nextModule, moduleIndex, {
      action: "title-meta",
      requestBody: {
        method: "POST",
        url: CHAT_COMPLETIONS_URL,
        body: requestBody
      },
      responseJson: raw,
      responseText: content
    });

    return nextModule;
  }

  async function runOutline(module: WorkflowModuleState, moduleIndex: number) {
    if (!module.result.selectedTitle.trim()) {
      throw new Error("请先从标题候选中选择一个标题。");
    }

    const prompt = buildOutlinePrompt(module.form, module.result.selectedTitle);
    const requestBody = buildChatRequestBody(module.form.model, prompt);
    const { content, raw } = await requestCompletion(module.form.apiKey, requestBody);

    const nextModule: WorkflowModuleState = {
      ...module,
      currentStep: "article",
      result: createTouchedResult(module.result, {
        outlineMarkdown: content,
        articleMarkdown: ""
      })
    };

    updateModule(module.id, () => nextModule);

    await saveModuleArtifacts(nextModule, moduleIndex, {
      action: "outline",
      requestBody: {
        method: "POST",
        url: CHAT_COMPLETIONS_URL,
        body: requestBody
      },
      responseJson: raw,
      responseText: content
    });

    return nextModule;
  }

  async function runArticle(module: WorkflowModuleState, moduleIndex: number) {
    if (!module.result.selectedTitle.trim()) {
      throw new Error("缺少已选标题，无法生成正文。");
    }

    if (!module.result.outlineMarkdown.trim()) {
      throw new Error("请先生成大纲。");
    }

    const prompt = buildArticlePrompt(module.form, module.result.selectedTitle, module.result.outlineMarkdown);
    const requestBody = buildChatRequestBody(module.form.model, prompt);
    const { content, raw } = await requestCompletion(module.form.apiKey, requestBody);

    const nextModule: WorkflowModuleState = {
      ...module,
      currentStep: "article",
      result: createTouchedResult(module.result, {
        articleMarkdown: content
      })
    };

    updateModule(module.id, () => nextModule);

    await saveModuleArtifacts(nextModule, moduleIndex, {
      action: "article",
      requestBody: {
        method: "POST",
        url: CHAT_COMPLETIONS_URL,
        body: requestBody
      },
      responseJson: raw,
      responseText: content
    });

    return nextModule;
  }

  async function handleGenerate(moduleId: string, step: GenerationStep) {
    const module = getModule(moduleId);
    const moduleIndex = getModuleIndex(moduleId);

    if (!module || moduleIndex === -1) {
      return;
    }

    if (!module.form.apiKey.trim()) {
      updateModule(moduleId, (prev) => ({
        ...prev,
        error: "请先输入 API Key。"
      }));
      return;
    }

    if (!module.form.model.trim()) {
      updateModule(moduleId, (prev) => ({
        ...prev,
        error: "请先填写模型名称。"
      }));
      return;
    }

    if (step === "titleMeta" && !canGenerateTitleMeta(module.form)) {
      updateModule(moduleId, (prev) => ({
        ...prev,
        error: "主关键词、指定字数、次要关键词、LSI 关键词都填写后才能生成标题与 Metadata。"
      }));
      return;
    }

    if (step !== "titleMeta" && !module.result.selectedTitle.trim()) {
      updateModule(moduleId, (prev) => ({
        ...prev,
        error: "请先主动选择一个标题，再继续后续流程。"
      }));
      return;
    }

    if (!module.form.primaryKeyword.trim()) {
      updateModule(moduleId, (prev) => ({
        ...prev,
        error: "请先输入主关键词。"
      }));
      return;
    }

    updateModule(moduleId, (prev) => ({
      ...prev,
      phase: "running",
      error: ""
    }));

    try {
      let workingModule = cloneModuleState(module);

      if (step === "titleMeta") {
        workingModule = await runTitleMeta(workingModule, moduleIndex);
      } else if (step === "outline") {
        workingModule = await runOutline(workingModule, moduleIndex);
        workingModule = await runArticle(workingModule, moduleIndex);
      } else {
        workingModule = await runArticle(workingModule, moduleIndex);
      }

      updateModule(moduleId, (prev) => ({
        ...prev,
        phase: "done"
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成失败，请稍后重试。";

      const nextModule: WorkflowModuleState = {
        ...module,
        phase: "error",
        error: message
      };

      updateModule(moduleId, (prev) => ({
        ...prev,
        phase: "error",
        error: message
      }));

      await saveModuleArtifacts(nextModule, moduleIndex, {
        action: `${step}-error`,
        error: message
      });
    }
  }

  function handleReset(moduleId: string) {
    const persistedApiKey = readPersistedApiKey();
    updateModule(moduleId, (module) => ({
      ...createInitialModule(),
      id: module.id,
      form: {
        ...createInitialModule().form,
        apiKey: persistedApiKey
      },
      ui: module.ui
    }));
  }

  async function handleCopy(moduleId: string) {
    const module = getModule(moduleId);
    if (!module) {
      return;
    }

    const text = getLatestMarkdown(module.result);
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);

    updateModule(moduleId, (prev) => ({
      ...prev,
      copyState: "copied"
    }));

    window.setTimeout(() => {
      updateModule(moduleId, (prev) => ({
        ...prev,
        copyState: "idle"
      }));
    }, 1500);
  }

  function handleDownload(moduleId: string) {
    const module = getModule(moduleId);
    if (!module) {
      return;
    }

    const text = getLatestMarkdown(module.result);
    if (!text) {
      return;
    }

    const keyword = module.form.primaryKeyword.trim() || `module-${getModuleIndex(moduleId) + 1}`;
    const safeKeyword = keyword
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeKeyword || `module-${getModuleIndex(moduleId) + 1}`}.md`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">OpenAI-Compatible Workflow</p>
          <h1>Tool Page Markdown Generator</h1>
          <p className="hero-copy">
            页面已重构为并发模块模式。每个模块都包含输入区与工作流结果区，并支持本地开发时自动保存中间结果。
          </p>
        </div>
        <div className="status-card">
          <span className="status-pill status-idle">{modules.length} / {MAX_MODULES}</span>
          <p>并发模块上限：{MAX_MODULES}</p>
          <p>聊天接口：POST {CHAT_COMPLETIONS_URL}</p>
          <p>模型接口：GET {MODELS_URL}</p>
          <p>服务商基址：https://api.guijiapi.net</p>
          <p>本地开发保存：mid-result/日期+随机数/</p>
        </div>
      </section>

      <section className="workflow-stack">
        <div className="panel workflow-toolbar">
          <div>
            <h2>并发模块</h2>
            <p>一个模块由输入区和工作流结果组成，最多支持 10 并发。</p>
          </div>
          <div className="workflow-toolbar-actions">
            <span className="workflow-toolbar-count">当前模块数：{modules.length}</span>
            <label
              className={isImportDragging ? "import-dropzone import-dropzone-active" : "import-dropzone"}
              onDragOver={handleImportDragOver}
              onDragLeave={handleImportDragLeave}
              onDrop={handleImportDrop}
            >
              上传 Excel/CSV
              <span className="import-dropzone-title">上传 Excel/CSV</span>
              <span className="import-dropzone-hint">点击或拖拽文件到这里</span>
              <input type="file" accept=".csv,.xls,.xlsx" onChange={handleImportFile} />
            </label>
            <button type="button" onClick={handleAddModule} disabled={modules.length >= MAX_MODULES}>
              新增模块
            </button>
          </div>
        </div>

        {importMessage ? <p className="import-message">{importMessage}</p> : null}

        <div className="module-list">
          {modules.map((module, index) => (
            <WorkflowModuleCard
              key={module.id}
              index={index}
              module={module}
              canRemove={modules.length > 1}
              onToggleInput={handleToggleInput}
              onToggleOutput={handleToggleOutput}
              onFormChange={handleFormChange}
              onTitleChange={handleTitleChange}
              onLoadModels={handleLoadModels}
              onGenerate={handleGenerate}
              onReset={handleReset}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onRemove={handleRemoveModule}
            />
          ))}
        </div>
      </section>

      <section className="panel tips-panel">
        <div className="section-head">
          <div>
            <h2>接口说明</h2>
            <p>根据你给的第三方文档，本页已固定为该服务商的 OpenAI 兼容调用方式。</p>
          </div>
        </div>
        <ul className="tips-list">
          <li>聊天补全固定请求：POST {CHAT_COMPLETIONS_URL}</li>
          <li>模型列表固定请求：GET {MODELS_URL}</li>
          <li>模块支持输入区与工作流结果双折叠，并可扩展到最多 10 个并发。</li>
          <li>本地开发环境下，模块请求的输入、输出和中间结果会保存到 mid-result 目录。</li>
          <li>
            文档参考：
            <a href={PROVIDER_DOCS_URL} target="_blank" rel="noreferrer">
              {PROVIDER_DOCS_URL}
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
