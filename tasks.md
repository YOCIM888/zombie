# 开发者宝石 · 任务清单

| # | 任务 | 文件 | 状态 |
| --- | --- | --- | --- |
| T1 | 新增 `developer-gem` 定义（`category: gem`、`special: 'developer-gem'`、`limited: true`、无 `effects`） | `src/data/items/gem.js` | ✅ 完成 |
| T2 | 初始背包含宝石 ×1 | `src/data/inventory.js` | ✅ 完成 |
| T3 | `store.js`：import `battle`；`useItem` 增加战斗拦截与传送分支（`leaveMap` → `enterMap('suburb-market')` → `advanceTurns(1)`，不扣 qty）；`discardItem` 拦截 | `src/game/store.js` | ✅ 完成 |
| T4 | 背包面板：战斗中禁用「使用」按钮并显示提示 | `src/components/InventoryPanel.vue` | ✅ 完成 |
| T5 | 战斗背包：显示开发者宝石禁用条目与提示 | `src/components/BattleView.vue` | ✅ 完成 |
| T6 | `useBattleItem` 对开发者宝石提前 return（避免误推进僵尸回合） | `src/game/battle.js` | ✅ 完成 |
| T7 | `npm run build` 通过 | - | ✅ 完成（3.30s，退出码 0） |
| T8 | 浏览器实测：新开局持有、非战斗使用、传送位置、回合与损耗数值、战斗禁用/直调拒绝、老存档不补发 | - | ✅ 完成 |

## 完成标准

- 新开局背包含「开发者宝石」×1，图标正常加载。
- 非战斗使用后 `location === 'suburb-market'`，`phase +1`，饥渴/体力/理智按既有入场 + 回合逻辑扣减，宝石不消失。
- 战斗状态：背包与战斗背包入口均禁用并提示；直接调用 `useItem` / `useBattleItem` 被拒绝。
- 老存档背包不被自动写入。
- `npm run build` 成功。
