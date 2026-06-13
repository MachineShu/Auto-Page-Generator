"use client";

import { useEffect, useState } from "react";

type TemplateId = "1" | "2" | "3" | "4" | "5";
type BaseTemplateId = Exclude<TemplateId, "5">;

type TemplateContent = {
  label: string;
  description: string;
  part1: string;
  part2: string;
};

const BASE_TEMPLATE_CONTENT: Record<BaseTemplateId, TemplateContent> = {
  "1": {
    label: "Floor",
    description: "地面清洁",
    part1: `【*严禁*做可视化网站，你的目标是写一份报告，而不是做网站】根据我的要求，完成两大任务
（1）信息搜索
你现在是 SEO 大师，需要围绕关键词 [ {{keyword}} ] 为内容站 [ floorcleaning.org ] 写一篇内容页（我们站的功能：[ 提供地面清洁的信息，仅此而已 ]）；但是需要你先搜集信息，主要是模拟真实用户在相关场景下带着自己的痛点去搜索信息。最终给我整理出一份报告，内容包括：
1. 什么样的人群在什么场景下会搜索这个词，核心痛点是什么（1-3 个）？
2. 同类型人的痛点还有什么？（2-4 个）
3. 在搜索结果中，排名前 5 的竞争对手他们满足了用户什么痛点？
4. 为了超越竞争对手的结果，还需要增加哪些内容？
（2）大纲
根据你的调研结果为文章创建详细大纲，目标关键词是 “[ {{keyword}} ]”
要求：
包含吸引人的引言（抓住用户的痛点）
8-9 个主要章节，每个章节 2-6 个子点
每个章节标记目标关键词要多少次（不低于：[ 75 ] 次）
每个章节标题包含相关关键词，且每一个章节用到的关键词（至少 5 个）你要列出（一定全部用到，不用列出目标关键词）：
（次关键词：[ {{secondary}} ]）
（LSI 关键词：[ {{lsi}} ]）
在大纲中标注需要插入的数据、案例
包含强有力的结论和行动号召
预计每部分字数（总计 3000-3500 字）
给我中文版即可
大纲格式要 SEO 友好，使用 H2、H3 标签结构
需要基于你调研的信息给我大纲
大纲内容侧重给出落地措施的角度，而不是描述大量的意义、定义这些（文章要注重怎么做）
严禁撰写医学相关的内容，会被谷歌惩罚
【启动 Agent 模式】`,
    part2: `下面请你基于文章大纲，来做撰写文章，并插入引用，和提供元数据（title description）这三件事情：
（1）写正文的要求：
1. 确保正文总字数：[ 3000-3500 ] 字之间；（说的是正文，不包括引用链接的字数；允许 100-200 字符的差距）
2. 全部用英文；
3. 不要引用
4. 命中核心关键词 [ {{keyword}} ][ 75 ] 次、次要关键词、LSI 关键词；

次要关键词：[ {{secondary}} ]

LSI 关键词：[ {{lsi}} ]

5. 每段 3-5 句话；多用短句，多分段，保持阅读流畅性；但不能为了分段而分段，要保持一个段落一个主题；
6. 语调专业但易懂（语言表达不超过没上过大学成年人群的理解），适合目标受众看懂，用上调研的结果、数据、观点
7. 引言不要用 have ever 这样的句式，太常见了；引言字数 170-220 字之间；
【引言先介绍 1 款最值得推荐的产品/方案/策略，并且后文提及。】
8. 在合适位置添加表格：2-4 个，表格用 markdown 形式，用一种 emoji 符号（只能用对、错那种简单的符号）
9. 用词表达符合人类表达，不要用长难句
10. 用“1. 2. 3...”这种阿拉伯数字表示二级标题的开头，用“1.1 1.2 1.3 1.4...”表示三级标题的开头
11. 对于不知道、专业的信息，请你搜索查询
（2）写引用的要求
请你为我的文本在合适的位置添加引用链接（仅限 YouTube、Reddit、ins、TikTok、Quora），最少 6 个，最多不超过 10 个；其他要求：
1. 一句话中只能加一个引用链接；Reddit 必须用真实的帖子的链接，必须 2 个；tiktok 必须有1个。
2. 格式：每次添加为新的段落，然后撰写相关描述性文本（20-35 字），文本后面加一句“（锚文本：URL）”，其中“锚文本”左边是锚文本（8-15 字），右边是 URL
3. 全英文描述，并且在原文的基础上，每句话命中一个核心关键词，需要多命中核心关键词 [ {{keyword}} ][ 5 ] 次
4. 每个新增的引用链接开头加上 [url]，方便我检查；
5. 最终输出全新“引用链接 + 在 reference 后加上每一个引用链接的中文翻译”（全文仅此是中文翻译）
6. 只有引言和最后一章不要增加引用链接；
7. 输出正文中要有二级和三级标题，如 1、2、3... 都是二级标题，1.1、1.2... 都是三级标题
8. TikTok、ins 不要展示搜索结果页；
9. 前 4 章一定要出现引用链接
10. 搜索符合主题的 blog 5 篇（只能是网页，不能是 YouTube、ins、TikTok 等）和 2 篇论文；不要插入在正文中，而是按照同样的格式插入在 reference 中（这部分内容不要用中文翻译，用英文原文即可）
11. 按照我的文章格式，比如文章段落数要跟我的相近，不要全部合并到一起
*严格遵守：#12. 需要你将引用插入到正文中，严禁放到文末 reference 中！#
（3）Title 和 description
下面给我 title 和 description，前者 55 字符以内，后者 150 字符以内，英文；都要命中主关键词 “[ {{keyword}} ]”，且 description 命中几个次要/LSI 关键词
严禁撰写医学相关的内容，会被谷歌惩罚
全文围绕地面清洁展开`
  },
  "2": {
    label: "Remote Work",
    description: "远程工作",
    part1: `【*严禁*做可视化网站，你的目标是写一份报告，而不是做网站】根据我的要求，完成两大任务
（1）信息搜索
你现在是 SEO 大师，需要围绕关键词 [ {{keyword}} ] 为内容站 [ remoteworkcamp.com ] 写一篇内容页（我们站的功能：[ 提供远程工作的信息，仅此而已 ]）；但是需要你先搜集信息，主要是模拟真实用户在相关场景下带着自己的痛点去搜索信息。最终给我整理出一份报告，内容包括：
1. 什么样的人群在什么场景下会搜索这个词，核心痛点是什么（1-3 个）？
2. 同类型人的痛点还有什么？（2-4 个）
3. 在搜索结果中，排名前 5 的竞争对手他们满足了用户什么痛点？
4. 为了超越竞争对手的结果，还需要增加哪些内容？
（2）大纲
根据你的调研结果为文章创建详细大纲，目标关键词是 “[ {{keyword}} ]”
要求：
包含吸引人的引言（抓住用户的痛点）
5-7 个主要章节，每个章节 2-6 个子点
每个章节标记目标关键词要多少次（不低于：[ 65 ] 次）
每个章节标题包含相关关键词，且每一个章节用到的关键词（至少 5 个）你要列出（一定全部用到，不用列出目标关键词）：
（次关键词：[ {{secondary}} ]）
（LSI 关键词：[ {{lsi}} ]）
在大纲中标注需要插入的数据、案例
包含强有力的结论和行动号召
预计每部分字数（总计 2500-3000 字）
给我中文版即可
大纲格式要 SEO 友好，使用 H2、H3 标签结构
需要基于你调研的信息给我大纲
大纲内容侧重给出落地措施的角度，而不是描述大量的意义、定义这些（文章要注重怎么做）
严禁撰写医学相关的内容，会被谷歌惩罚
【启动 Agent 模式】`,
    part2: `下面请你基于文章大纲，来做撰写文章，并插入引用，和提供元数据（title description）这三件事情：
（1）写正文的要求：
1. 确保正文总字数：[ 2500-3000 ] 字之间；（说的是正文，不包括引用链接的字数；允许 100-200 字符的差距）
2. 全部用英文；
3. 不要引用
4. 命中核心关键词 [ {{keyword}} ][ 65 ] 次、次要关键词、LSI 关键词；

次要关键词：[ {{secondary}} ]

LSI 关键词：[ {{lsi}} ]

5. 每段 3-5 句话；多用短句，多分段，保持阅读流畅性；但不能为了分段而分段，要保持一个段落一个主题；
6. 语调专业但易懂（语言表达不超过没上过大学成年人群的理解），适合目标受众看懂，用上调研的结果、数据、观点
7. 引言不要用 have ever 这样的句式，太常见了；引言字数 170-220 字之间；
【引言先介绍 1 款最值得推荐的产品/方案/策略，并且后文提及。】
8. 在合适位置添加表格：2-4 个，表格用 markdown 形式，用一种 emoji 符号（只能用对、错那种简单的符号）
9. 用词表达符合人类表达，不要用长难句
10. 用“1. 2. 3...”这种阿拉伯数字表示二级标题的开头，用“1.1 1.2 1.3 1.4...”表示三级标题的开头
11. 对于不知道、专业的信息，请你搜索查询
（2）写引用的要求
请你为我的文本在合适的位置添加引用链接（仅限 YouTube、Reddit、ins、TikTok、Quora），最少 6 个，最多不超过 10 个；其他要求：
1. 一句话中只能加一个引用链接；Reddit 必须用真实的帖子的链接，必须 2 个；tiktok 必须有1个。
2. 格式：每次添加为新的段落，然后撰写相关描述性文本（20-35 字），文本后面加一句“（锚文本：URL）”，其中“锚文本”左边是锚文本（8-15 字），右边是 URL
3. 全英文描述，并且在原文的基础上，每句话命中一个核心关键词，需要多命中核心关键词 [ {{keyword}} ][ 5 ] 次
4. 每个新增的引用链接开头加上 [url]，方便我检查；
5. 最终输出全新“引用链接 + 在 reference 后加上每一个引用链接的中文翻译”（全文仅此是中文翻译）
6. 只有引言和最后一章不要增加引用链接；
7. 输出正文中要有二级和三级标题，如 1、2、3... 都是二级标题，1.1、1.2... 都是三级标题
8. TikTok、ins 不要展示搜索结果页；
9. 前 4 章一定要出现引用链接
10. 搜索符合主题的 blog 5 篇（只能是网页，不能是 YouTube、ins、TikTok 等）和 2 篇论文；不要插入在正文中，而是按照同样的格式插入在 reference 中（这部分内容不要用中文翻译，用英文原文即可）
11. 按照我的文章格式，比如文章段落数要跟我的相近，不要全部合并到一起
*严格遵守：#12. 需要你将引用插入到正文中，严禁放到文末 reference 中！#
（3）Title 和 description
下面给我 title 和 description，前者 55 字符以内，后者 150 字符以内，英文；都要命中主关键词 “[ {{keyword}} ]”，且 description 命中几个次要/LSI 关键词
严禁撰写医学相关的内容，会被谷歌惩罚
全文围绕远程工作展开`
  },
  "3": {
    label: "Music",
    description: "音乐站",
    part1: `【*严禁*做可视化网站，你的目标是写一份报告，而不是做网站】根据我的要求，完成两大任务
（1）信息搜索
你现在是 SEO 大师，需要围绕关键词 [ {{keyword}} ] 为 SaaS 站 [ beatbun.com ] 写一篇内容页（我们站的功能：[ 音乐生成 saas，输入提示词，生成，以及其他音乐工具 ]）；但是需要你先搜集信息，主要是模拟真实用户在相关场景下带着自己的痛点去搜索信息。最终给我整理出一份报告，内容包括：
1. 什么样的人群在什么场景下会搜索这个词，核心痛点是什么（1-3 个）？
2. 同类型人的痛点还有什么？（2-4 个）
3. 在搜索结果中，排名前 5 的竞争对手他们满足了用户什么痛点？
4. 为了超越竞争对手的结果，还需要增加哪些内容？
（2）大纲
根据你的调研结果为文章创建详细大纲，目标关键词是 “[ {{keyword}} ]”
要求：
包含吸引人的引言（抓住用户的痛点）
5-7 个主要章节，每个章节 2-6 个子点
每个章节标记目标关键词要多少次（不低于：[ 45 ] 次）
每个章节标题包含相关关键词，且每一个章节用到的关键词（至少 5 个）你要列出（一定全部用到，不用列出目标关键词）：
（次关键词：[ {{secondary}} ]）
（LSI 关键词：[ {{lsi}} ]）
在大纲中标注需要插入的数据、案例
包含强有力的结论和行动号召
预计每部分字数（总计 2200-2600 字）
给我中文版即可
大纲格式要 SEO 友好，使用 H2、H3 标签结构
需要基于你调研的信息给我大纲
大纲内容侧重给出落地措施的角度，而不是描述大量的意义、定义这些（文章要注重怎么做）
严禁撰写医学相关的内容，会被谷歌惩罚`,
    part2: `下面请你基于文章大纲，来做撰写文章，并插入引用，和提供元数据（title description）这三件事情：
（1）写正文的要求：
1. 确保正文总字数：[ 2200-2600 ] 字之间；（说的是正文，不包括引用链接的字数；允许 100-200 字符的差距）
2. 全部用英文；
3. 不要引用
4. 命中核心关键词 [ {{keyword}} ][ 45 ] 次、次要关键词、LSI 关键词；

次要关键词：[ {{secondary}} ]

LSI 关键词：[ {{lsi}} ]

5. 每段 3-5 句话；多用短句，多分段，保持阅读流畅性；但不能为了分段而分段，要保持一个段落一个主题；
6. 语调专业但易懂（语言表达不超过没上过大学成年人群的理解），适合目标受众看懂，用上调研的结果、数据、观点
7. 引言不要用 have ever 这样的句式，太常见了；引言字数 170-220 字之间；
【引言先介绍 1 款最值得推荐的产品/方案/策略，并且后文提及。】
8. 在合适位置添加表格：2-4 个，表格用 markdown 形式，用一种 emoji 符号（只能用对、错那种简单的符号）
9. 用词表达符合人类表达，不要用长难句
10. 用“1. 2. 3...”这种阿拉伯数字表示二级标题的开头，用“1.1 1.2 1.3 1.4...”表示三级标题的开头
11. 对于不知道、专业的信息，请你搜索查询
（2）写引用的要求
请你为我的文本在合适的位置添加引用链接（仅限 YouTube、Reddit、ins、TikTok、Quora），最少 3 个，最多不超过 5 个；其他要求：
1. 一句话中只能加一个引用链接；Reddit 必须用真实的帖子的链接，必须 1 个
2. 格式：每次添加为新的段落，然后撰写相关描述性文本（20-35 字），文本后面加一句“（锚文本：URL）”，其中“锚文本”左边是锚文本（8-15 字），右边是 URL
3. 全英文描述，并且在原文的基础上，每句话命中一个核心关键词，需要多命中核心关键词 [ {{keyword}} ][ 3 ] 次
4. 每个新增的引用链接开头加上 [url]，方便我检查；
5. 最终输出全新“引用链接 + 在 reference 后加上每一个引用链接的中文翻译”（全文仅此是中文翻译）
6. 只有引言和最后一章不要增加引用链接；
7. 输出正文中要有二级和三级标题，如 1、2、3... 都是二级标题，1.1、1.2... 都是三级标题
8. TikTok、ins 不要展示搜索结果页；
9. 前 3 章一定要出现引用链接
10. 搜索符合主题的 blog 5 篇（只能是网页，不能是 YouTube、ins、TikTok 等）和 2 篇论文；不要插入在正文中，而是按照同样的格式插入在 reference 中（这部分内容不要用中文翻译，用英文原文即可）
11. 按照我的文章格式，比如文章段落数要跟我的相近，不要全部合并到一起
*严格遵守：#12. 需要你将引用插入到正文中，严禁放到文末 reference 中！#
（3）Title 和 description
下面给我 title 和 description，前者 55 字符以内，后者 150 字符以内，英文；都要命中主关键词 “[ {{keyword}} ]”，且 description 命中几个次要/LSI 关键词
严禁撰写医学相关的内容，会被谷歌惩罚
全文围绕音乐生成展开。
在文章合适的位置写 2-3 个真实的经历，名字要真实。并写一些踩坑经历。
生成结果保存到 output 文件夹中，以核心关键词名来保存（md）
不要遗漏 H1 标题；H1 标题得命中核心词，字数在 10-22 词之间，英文`
  },
  "4": {
    label: "Video",
    description: "视频站",
    part1: `【*严禁*做可视化网站，你的目标是写一份报告，而不是做网站】根据我的要求，完成两大任务
（1）信息搜索
你现在是 SEO 大师，需要围绕关键词 [ {{keyword}} ] 为 SaaS 站 [ imagetovideogenerator.net ] 写一篇内容页（我们站的功能：[ 视频生成 saas，输入提示词，生成，以及其他视频工具 ]）；但是需要你先搜集信息，主要是模拟真实用户在相关场景下带着自己的痛点去搜索信息。最终给我整理出一份报告，内容包括：
1. 什么样的人群在什么场景下会搜索这个词，核心痛点是什么（1-3 个）？
2. 同类型人的痛点还有什么？（2-4 个）
3. 在搜索结果中，排名前 5 的竞争对手他们满足了用户什么痛点？
4. 为了超越竞争对手的结果，还需要增加哪些内容？
（2）大纲
根据你的调研结果为文章创建详细大纲，目标关键词是 “[ {{keyword}} ]”
要求：
包含吸引人的引言（抓住用户的痛点）
4-6 个主要章节，每个章节 2-5 个子点
每个章节标记目标关键词要多少次（不低于：[ 40 ] 次）
每个章节标题包含相关关键词，且每一个章节用到的关键词（至少 5 个）你要列出（一定全部用到，不用列出目标关键词）：
（次关键词：[ {{secondary}} ]）
（LSI 关键词：[ {{lsi}} ]）
在大纲中标注需要插入的数据、案例
包含强有力的结论和行动号召
预计每部分字数（总计 2200-2600 字）
给我中文版即可
大纲格式要 SEO 友好，使用 H2、H3 标签结构
需要基于你调研的信息给我大纲
大纲内容侧重给出落地措施的角度，而不是描述大量的意义、定义这些（文章要注重怎么做）
严禁撰写医学相关的内容，会被谷歌惩罚`,
    part2: `下面请你基于文章大纲，来做撰写文章，并插入引用，和提供元数据（title description）这三件事情：
（1）写正文的要求：
1. 确保正文总字数：[ 2200-2600 ] 字之间；（说的是正文，不包括引用链接的字数；允许 100-200 字符的差距）
2. 全部用英文；
3. 不要引用
4. 命中核心关键词 [ {{keyword}} ][ 40 ] 次、次要关键词、LSI 关键词；
次要关键词：[ {{secondary}} ]
LSI 关键词：[ {{lsi}} ]
5. 每段 3-5 句话；多用短句，多分段，保持阅读流畅性；但不能为了分段而分段，要保持一个段落一个主题；
6. 语调专业但易懂（语言表达不超过没上过大学成年人群的理解），适合目标受众看懂，用上调研的结果、数据、观点
7. 引言不要用 have ever 这样的句式，太常见了；引言字数 170-220 字之间；
【引言先介绍 1 款最值得推荐的产品/方案/策略，并且后文提及。】
8. 在合适位置添加表格：1-3 个，表格用 markdown 形式，用一种 emoji 符号（只能用对、错那种简单的符号）
9. 用词表达符合人类表达，不要用长难句
10. 用“1. 2. 3...”这种阿拉伯数字表示二级标题的开头，用“1.1 1.2 1.3 1.4...”表示三级标题的开头
11. 对于不知道、专业的信息，请你搜索查询
（2）写引用的要求
请你为我的文本在合适的位置添加引用链接（仅限 YouTube、Reddit、ins、TikTok、Quora），最少 3 个，最多不超过 5 个；其他要求：
1. 一句话中只能加一个引用链接；Reddit 必须用真实的帖子的链接，必须 1 个
2. 格式：每次添加为新的段落，然后撰写相关描述性文本（20-35 字），文本后面加一句“（锚文本：URL）”，其中“锚文本”左边是锚文本（8-15 字），右边是 URL
3. 全英文描述，并且在原文的基础上，每句话命中一个核心关键词，需要多命中核心关键词 [ {{keyword}} ][ 3 ] 次
4. 每个新增的引用链接开头加上 [url]，方便我检查；
5. 最终输出全新“引用链接 + 在 reference 后加上每一个引用链接的中文翻译”（全文仅此是中文翻译）
6. 只有引言和最后一章不要增加引用链接；
7. 输出正文中要有二级和三级标题，如 1、2、3... 都是二级标题，1.1、1.2... 都是三级标题
8. TikTok、ins 不要展示搜索结果页；
9. 前 3 章一定要出现引用链接
10. 搜索符合主题的 blog 3 篇（只能是网页，不能是 YouTube、ins、TikTok 等）和 2 篇论文；不要插入在正文中，而是按照同样的格式插入在 reference 中（这部分内容不要用中文翻译，用英文原文即可）
11. 按照我的文章格式，比如文章段落数要跟我的相近，不要全部合并到一起
*严格遵守：#12. 需要你将引用插入到正文中，严禁放到文末 reference 中！#
（3）Title 和 description
下面给我 title 和 description，前者 55 字符以内，后者 150 字符以内，英文；都要命中主关键词 “[ {{keyword}} ]”，且 description 命中几个次要/LSI 关键词
严禁撰写医学相关的内容，会被谷歌惩罚
全文围绕视频生成展开。
在文章合适的位置写 2-3 个真实的经历，名字要真实。并写一些踩坑经历。
生成结果保存到 output 文件夹中，以核心关键词名来保存（md）
不要遗漏 H1 标题；H1 标题得命中核心词，字数在 10-22 词之间，英文。
不要对主词、次要词、LSI 关键词用单引号或者加粗标记。正文中不能指向我的网站的 url。`
  }
};

const TEMPLATE_CONTENT: Record<TemplateId, TemplateContent> = {
  ...BASE_TEMPLATE_CONTENT,
  "5": {
    label: "cybersecurity",
    description: "网络安全",
    part1: `【*严禁*做可视化网站，你的目标是写一份报告，而不是做网站】根据我的要求，完成两大任务
（1）信息搜索
你现在是 SEO 大师，需要围绕关键词 [ {{keyword}} ] 为内容站 [ cybersecuritybootcamps.org ] 写一篇内容页（我们站的功能：[ 提供网络安全的信息，仅此而已 ]）；但是需要你先搜集信息，主要是模拟真实用户在相关场景下带着自己的痛点去搜索信息。最终给我整理出一份报告，内容包括：
1. 什么样的人群在什么场景下会搜索这个词，核心痛点是什么（1-3 个）？
2. 同类型人的痛点还有什么？（2-4 个）
3. 在搜索结果中，排名前 5 的竞争对手他们满足了用户什么痛点？
4. 为了超越竞争对手的结果，还需要增加哪些内容？
（2）大纲
根据你的调研结果为文章创建详细大纲，目标关键词是 “[ {{keyword}} ]”
要求：
包含吸引人的引言（抓住用户的痛点）
5-9 个主要章节，每个章节 2-6 个子点
每个章节标记目标关键词要多少次（不低于：[ 68 ] 次）。
每个章节标题包含相关关键词，且每一个章节用到的关键词（至少 5 个）你要列出（一定全部用到，不用列出目标关键词）：
（次关键词：[ {{secondary}} ]）
（LSI 关键词：[ {{lsi}} ]）
在大纲中标注需要插入的数据、案例
包含强有力的结论和行动号召
预计每部分字数（总计 2800-3500 字）
给我中文版即可
大纲格式要 SEO 友好，使用 H2、H3 标签结构
需要基于你调研的信息给我大纲
大纲内容侧重给出落地措施的角度，而不是描述大量的意义、定义这些（文章要注重怎么做）
严禁撰写医学相关的内容，会被谷歌惩罚`,
    part2: `下面请你基于文章大纲，来做撰写文章，并插入引用，和提供元数据（title description）这三件事情：
（1）写正文的要求：
1. 确保正文总字数：[ 2800-3500 ] 字之间；（说的是正文，不包括引用链接的字数；允许 100-200 字符的差距）
2. 全部用英文；
3. 不要引用
4. 命中核心关键词 [ {{keyword}} ][ 65 ] 次、次要关键词、LSI 关键词；

次要关键词：[ {{secondary}} ]

LSI 关键词：[ {{lsi}} ]

5. 每段 3-5 句话；多用短句，多分段，保持阅读流畅性；但不能为了分段而分段，要保持一个段落一个主题；
6. 语调专业但易懂（语言表达不超过没上过大学成年人群的理解），适合目标受众看懂，用上调研的结果、数据、观点
7. 引言不要用 have ever 这样的句式，太常见了；引言字数 170-220 字之间；
【引言先介绍 1 款最值得推荐的产品/方案/策略，并且后文提及。】
8. 在合适位置添加表格：1-3 个，表格用 markdown 形式，用一种 emoji 符号（只能用对、错那种简单的符号）
9. 用词表达符合人类表达，不要用长难句
10. 用“1. 2. 3...”这种阿拉伯数字表示二级标题的开头，用“1.1 1.2 1.3 1.4...”表示三级标题的开头
11. 对于不知道、专业的信息，请你搜索查询
（2）写引用的要求
请你为我的文本在合适的位置添加引用链接（仅限 YouTube、Reddit、ins、TikTok、Quora），最少 5 个，最多不超过 7 个；其他要求：
1. 一句话中只能加一个引用链接；Reddit 必须用真实的帖子的链接，必须 1-2 个；tiktok 必须有1个。
2. 格式：每次添加为新的段落，然后撰写相关描述性文本（20-35 字），文本后面加一句“（锚文本：URL）”，其中“锚文本”左边是锚文本（8-15 字），右边是 URL
3. 全英文描述，并且在原文的基础上，每句话命中一个核心关键词，需要多命中核心关键词 [ {{keyword}} ][ 5 ] 次
4. 每个新增的引用链接开头加上 [url]，方便我检查；
5. 最终输出全新“引用链接 + 在 reference 后加上每一个引用链接的中文翻译”（全文仅此是中文翻译）
6. 只有引言和最后一章不要增加引用链接；
7. 输出正文中要有二级和三级标题，如 1、2、3... 都是二级标题，1.1、1.2... 都是三级标题
8. TikTok、ins 不要展示搜索结果页；
9. 前 4 章一定要出现引用链接
10. 搜索符合主题的 blog 5 篇（只能是网页，不能是 YouTube、ins、TikTok 等）和 2 篇论文；不要插入在正文中，而是按照同样的格式插入在 reference 中（这部分内容不要用中文翻译，用英文原文即可）
11. 按照我的文章格式，比如文章段落数要跟我的相近，不要全部合并到一起
*严格遵守：#12. 需要你将引用插入到正文中，严禁放到文末 reference 中！#
（3）Title 和 description
下面给我 title 和 description，前者 55 字符以内，后者 150 字符以内，英文；都要命中主关键词 “[ {{keyword}} ]”，且 description 命中几个次要/LSI 关键词
严禁撰写医学相关的内容，会被谷歌惩罚
全文围绕网络安全展开；
最终结果输出到 output 文件夹中`
  }
};

function fillTemplate(content: string, keyword: string, secondary: string, lsi: string) {
  return content
    .replaceAll("{{keyword}}", keyword || "[ keyword ]")
    .replaceAll("{{secondary}}", secondary || "[ secondary-keywords ]")
    .replaceAll("{{lsi}}", lsi || "[ LSI-keywords ]");
}

async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function BlogPromptGeneratorPage() {
  const [templateId, setTemplateId] = useState<TemplateId>("1");
  const [keyword, setKeyword] = useState("");
  const [secondary, setSecondary] = useState("");
  const [lsi, setLsi] = useState("");
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [copiedTarget, setCopiedTarget] = useState<"part1" | "part2" | null>(null);

  useEffect(() => {
    const template = TEMPLATE_CONTENT[templateId];
    setPart1(fillTemplate(template.part1, keyword, secondary, lsi));
    setPart2(fillTemplate(template.part2, keyword, secondary, lsi));
  }, [keyword, lsi, secondary, templateId]);

  async function handleCopy(target: "part1" | "part2") {
    const value = target === "part1" ? part1 : part2;

    try {
      await copyToClipboard(value);
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget((current) => (current === target ? null : current)), 1500);
    } catch {
      window.alert("复制失败，请手动复制。");
    }
  }

  function handleDownload() {
    if (!part1 || !part2) {
      window.alert("请先生成内容。");
      return;
    }

    const fullText = `${part1}\n\n====================\n\n${part2}`;
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeKeyword = (keyword || "prompt")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 80);

    anchor.href = url;
    anchor.download = `${safeKeyword}_prompt.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  const template = TEMPLATE_CONTENT[templateId];

  return (
    <main className="blog-prompt-page">
      <section className="blog-prompt-hero">
        <div>
          <p className="page-kicker">Prompt Workflow</p>
          <h1>Blog Prompt Generator</h1>
          <p className="page-intro">
            把原来 `v1.html` 的生成逻辑直接放进项目里了。这里支持四套模板、实时生成双段 prompt、一键复制和导出 TXT。
          </p>
        </div>
        <div className="blog-prompt-badge-card">
          <span className="status-pill status-idle">{template.label}</span>
          <p>当前模板：{template.description}</p>
          <p>输出内容：调研/大纲 prompt + 正文/引用/metadata prompt</p>
        </div>
      </section>

      <section className="blog-prompt-shell">
        <div className="blog-prompt-card">
          <div className="template-switcher" role="radiogroup" aria-label="Prompt template">
            {(Object.entries(TEMPLATE_CONTENT) as [TemplateId, TemplateContent][]).map(([id, item]) => (
              <label key={id} className={templateId === id ? "template-option template-option-active" : "template-option"}>
                <input
                  type="radio"
                  name="template"
                  value={id}
                  checked={templateId === id}
                  onChange={() => setTemplateId(id)}
                />
                <span>{item.label}</span>
                <small>{item.description}</small>
              </label>
            ))}
          </div>

          <div className="blog-prompt-form">
            <label className="field field-full">
              <span>核心关键词</span>
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="例如: best robot vacuum"
              />
            </label>
            <label className="field field-full">
              <span>次关键词</span>
              <input
                type="text"
                value={secondary}
                onChange={(event) => setSecondary(event.target.value)}
                placeholder="例如: robot vacuum for hardwood floors, cheap vacuum"
              />
            </label>
            <label className="field field-full">
              <span>LSI 关键词</span>
              <input
                type="text"
                value={lsi}
                onChange={(event) => setLsi(event.target.value)}
                placeholder="例如: cleaning schedule, battery life, pet hair"
              />
            </label>
          </div>

          <div className="blog-prompt-grid">
            <section className="prompt-output-card">
              <div className="prompt-output-head">
                <div>
                  <h2>第一部分</h2>
                  <p>调研与大纲</p>
                </div>
                <button type="button" className={copiedTarget === "part1" ? "secondary" : ""} onClick={() => void handleCopy("part1")}>
                  {copiedTarget === "part1" ? "已复制" : "一键复制"}
                </button>
              </div>
              <textarea value={part1} readOnly placeholder="填写上方信息后自动生成..." />
            </section>

            <section className="prompt-output-card">
              <div className="prompt-output-head">
                <div>
                  <h2>第二部分</h2>
                  <p>正文、引用与 metadata</p>
                </div>
                <button type="button" className={copiedTarget === "part2" ? "secondary" : ""} onClick={() => void handleCopy("part2")}>
                  {copiedTarget === "part2" ? "已复制" : "一键复制"}
                </button>
              </div>
              <textarea value={part2} readOnly placeholder="填写上方信息后自动生成..." />
            </section>
          </div>

          <button type="button" className="blog-prompt-download" onClick={handleDownload}>
            下载完整 TXT
          </button>
        </div>
      </section>
    </main>
  );
}
