# 行尸 · 末日回合制生存

**Xingshi — The Walking · Survival Log**

一款运行在浏览器里的回合制末日生存游戏，使用 Vue 3 + Vite 构建，无后端依赖。

[中文](#中文) · [English](#english)

---

## 中文

### 简介

《行尸》是一款纯前端的回合制末日生存游戏。你在废墟中醒来，靠拾荒、交易与战斗维持生命，在不同势力之间周旋，并逐步揭开都城、曙光阵地与飞行船背后的剧情。每一次行动都会推进回合，饥饿、口渴、理智、体力与感染会同时逼近，活下来本身就是唯一的胜利。

### 玩法特色

- **回合制生存**：生命、饱食、口渴、理智、体力、感染六项属性并行结算；任一生存属性归零或感染满值都会触发对应的死亡结局。
- **地图探索**：15 张地图，包括末日都城、曙光阵地、废弃村庄、露营山区、郊区卖场、核心商圈、公立医院、荒废警局、山地军营、X研究所、航天基地、长滩海港、生化巢穴、乌托邦城与末日飞行船。
- **战斗系统**：近战与远程武器、闪避、泼射、处决、武器损耗，以及专项训练天赋与多套流派构筑；包含世界 BOSS 与连续死斗。
- **势力与身份**：都城的爵位体系（平民至储君）、曙光阵地的身份晋升（见习至领袖）、六大公会，以及乌托邦城的证照与自由贸易区。
- **生存经营**：背包与装备、拾荒掉落、集市与浮动物价、银行与贷款、餐厅与酒馆、自由贸易挂单、公会任务与代理城主。
- **剧情与结局**：国王、皇后、羿阳、马斐、陈博士等多条任务线；15 个剧情结局，另有 6 种由生存属性触发的死亡结局。
- **存档与成就**：10 个存档槽位，支持存档导入导出与容量统计；66 项成就跨存档记录。
- **多端适配**：桌面与移动端响应式布局，支持键盘快捷操作。

### 技术栈

| 项目 | 说明 |
|---|---|
| 框架 | Vue 3（`<script setup>` 单文件组件） |
| 构建 | Vite 7 |
| 状态 | 集中式 `reactive` store，按领域拆分在 `src/game/store/` |
| 持久化 | 浏览器 `localStorage`（10 个槽位，可导出为 JSON） |
| 资源 | 图片位于 `public/image/`，构建时由 Vite 插件生成静态清单 |

### 快速开始

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev      # 本地开发，默认 http://localhost:5173
npm run build    # 生产构建，输出到 dist/
npm run preview  # 预览生产构建
```

### 项目结构

```text
src/
  components/     界面组件（主菜单、游戏主视图、各功能面板）
  data/           静态数据：物品、武器、NPC、任务、地图、经济与规则
  game/
    store/        领域逻辑：core、city、dawn、field、quests、airship 等
    battle.js     战斗流程
    save.js       存档、设置、成就与导入导出
    config.js     属性、地图、成就等全局配置
  styles/         全局样式
public/image/     角色立绘、道具与背景资源
.dev_docs/        开发与攻略文档
```

### 剧情攻略

六周目全结局路线整理在 [剧情路线攻略](.dev_docs/剧情路线攻略.md)。

---

## English

### Overview

*Xingshi* (行尸, "The Walking") is a turn-based post-apocalyptic survival game that runs entirely in the browser. You wake up in the ruins, scavenge for supplies, trade and fight to stay alive, navigate rival factions, and uncover the stories behind the ruined city, Dawn Post and the airship. Every action advances the clock while hunger, thirst, sanity, stamina and infection close in. Survival itself is the only victory.

### Features

- **Turn-based survival**: six stats — HP, hunger, thirst, sanity, stamina and infection — are resolved together. Any survival stat hitting zero, or infection reaching its maximum, triggers a matching death ending.
- **Exploration**: 15 maps, including the Ruined City, Dawn Post, Abandoned Village, Mountain Camp, Suburb Market, Core District, Public Hospital, Abandoned Police Station, Mountain Barracks, X-Lab, Spaceport, Long Beach Harbor, Biochemical Nest, Utopia City and the Doomsday Airship.
- **Combat**: melee and ranged weapons, dodging, spray fire, executions, weapon durability, specialized training talents and multiple build archetypes, plus world bosses and consecutive gauntlet fights.
- **Factions and ranks**: the city's noble hierarchy (Commoner to Crown Prince), Dawn Post's promotion ladder (Initiate to Leader), six guilds, and Utopia City's permits and free-trade zone.
- **Economy and management**: inventory and equipment, scavenging loot, markets with fluctuating prices, bank loans, restaurants and taverns, free-market listings, guild work and the acting mayor.
- **Story and endings**: quest lines for the King, the Queen, Yiyang, Mafei, Dr. Chen and others; 15 story endings, plus 6 attribute-driven death endings.
- **Saves and achievements**: 10 save slots with JSON export/import and storage usage tracking; 66 achievements recorded across saves.
- **Responsive UI**: desktop and mobile layouts with keyboard shortcuts.

### Tech stack

| Item | Details |
|---|---|
| Framework | Vue 3 (`<script setup>` SFCs) |
| Build tool | Vite 7 |
| State | Central `reactive` stores split by domain under `src/game/store/` |
| Persistence | Browser `localStorage` (10 slots, exportable as JSON) |
| Assets | Images under `public/image/`, with a Vite plugin generating the static manifest at build time |

### Getting started

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev      # local dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

### Project layout

```text
src/
  components/     UI components (main menu, game view, feature panels)
  data/           Static data: items, weapons, NPCs, quests, maps, economy and rules
  game/
    store/        Domain logic: core, city, dawn, field, quests, airship, etc.
    battle.js     Combat flow
    save.js       Saves, settings, achievements and import/export
    config.js     Global config for stats, maps and achievements
  styles/         Global styles
public/image/     Character art, item icons and backgrounds
.dev_docs/        Development and strategy documents
```

### Story guide

The six-playthrough, all-endings route is documented in [剧情路线攻略](.dev_docs/剧情路线攻略.md) (Chinese).
