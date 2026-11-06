# 开发者宝石 · 实现规格（Spec）

## 1. 目标

新增「开发者宝石」道具：新开局初始背包自带，主动使用传送到「郊区卖场」，消耗 1 回合并走既有回合结算；宝石不消耗、可无限使用；战斗中禁止使用（UI 入口禁用 + 逻辑层直调拒绝）；不可丢弃。老存档不补发。

## 2. 调研结论（已确认）

- 素材真实路径：`public/image/宝石/开发者宝石.webp`。宝石图片由构造器自动拼为 `/image/宝石/${name}.webp`。
- 道具体系统一在 `src/data/items/gem.js`，通过：

```js
function gem(id, name, description, extra = {}) {
  return { id, name, category: 'gem', image: `/image/宝石/${name}.webp`, description, stackable: false, maxStack: 1, ...extra }
}
```

- `ITEMS` 由各分类汇总，`getItem(id)` 统一查询；宝石不存在装备槽概念（背包即生效 / 主动使用），不会占近战/远程槽。
- 地图「郊区卖场」`id = 'suburb-market'`，`open: true`、无 `unlockDay`、不在 `HARBOR_MUTINY.banMapIds`；`enterMap()` 内含开放 / 解锁天数 / 港口封禁 / `hidden` / 身份冲突 / 当前区域校验，并扣 `ENTRY_COST`。
- 回合推进唯一入口：`advanceTurns(count, { decay = true })`，每回合 `adjustStats(TURN_COST)`、`phase += 1`、每满 8 时段 `day += 1` 并结算交易/借贷，最后 `checkAchievements()`。
- `TURN_COST = { thirst: -5, hunger: -5, stamina: -5, sanity: -5 }`；`ENTRY_COST` 数值相同；`PHASES` 共 8 个时段。
- 初始背包唯一入口：`createInitialBackpack()`，仅在新开局分支 `game.inventory = createInitialBackpack()` 调用；老存档走 `applySlot` 的 `cloneInventory(slot.inventory)`，不回补。
- 丢弃：`discardItem(slotIndex)` 默认允许任意物品丢弃；无通用出售入口（仅武器回收、股票卖出），宝石不会被出售。
- 战斗：`battle.active`；`useBattleItem()` 在 `battle.js`，战斗背包 `usableItems` 只列 `def.effects` 的物品，宝石本身不会进入列表 → 需额外显示禁用条目与提示。
- 循环依赖：`battle.js` 已 import `store.js`；`store.js` 反向 import `battle` 会形成 ESM 环，但 `store.js` 顶层不读取 `battle`，仅函数体内访问，运行期安全。

## 3. 设计决策

| 决策 | 结论 | 理由 |
| --- | --- | --- |
| 分类 | `category: 'gem'`，走 `gem()` 构造器 | 与既有 8 颗限定宝石同体系，不建平行类 |
| 字段 | `special: 'developer-gem'`、`limited: true`，无 `effects` / 无 `passive` | 主动使用型，复用 `special` 分支；`limited` 与限定宝石一致 |
| 是否占宝石槽 | 不占。宝石无装备槽，放背包即视为持有 | 现有系统没有槽位概念 |
| 可丢弃 | 不可丢弃，`discardItem` 拦截并提示 | 开局唯一发放，丢弃不可恢复 |
| 可出售 | 不可出售。系统无通用出售入口，宝石不进货单/回收列表 | 无需额外拦截 |
| 传送目标 | `'suburb-market'`，复用 `leaveMap()` + `enterMap()` | 不硬编码坐标，完整走解锁/封禁/身份校验 |
| 未解锁处理 | 不绕过。若目标日后被配置为 `open:false`/`unlockDay`/封禁，`enterMap` 会拒绝并提示，宝石不消耗 | 复用现有校验 |
| 回合 | 传送成功后调用 `advanceTurns(1)`（`decay` 默认 true） | 与正常过回合完全同一函数 |
| 消耗 | 不使用 `entry.qty -= 1`，宝石永久保留 | 无限使用 |
| 战斗拦截 | 逻辑层 `useItem` 内 `battle.active` 拒绝；`useBattleItem` 提前 return；UI 使用按钮 `disabled` + 提示；战斗背包显示禁用条目 | 三层拦截，脚本直调也拒绝 |

### 数值预期（需实测）

- 从安全屋（无 location）使用：`leaveMap` 不执行 → `enterMap('suburb-market')` 扣 `ENTRY_COST`（饥渴/体力/理智 -5）→ `advanceTurns(1)` 扣 `TURN_COST`（再 -5）→ 合计四项各 **-10**，`phase +1`。
- 已站在「郊区卖场」再次使用：`enterMap` 命中 `game.location === mapId` 早退（不扣入场费）→ `advanceTurns(1)` → 四项各 **-5**，`phase +1`。
- 从其他地图使用：`leaveMap()` 后 `enterMap` 再扣入场费 → 与安全屋一致，合计 **-10**。
- 首日 `phase 0 → 1`，`day` 不变；相位满 8 时才跨天，由既有逻辑决定。

## 4. 精确改动

### 4.1 `src/data/items/gem.js`

在 `GEM_LIST` 末尾（`fairy-gem` 之后）新增：

```js
gem('developer-gem', '开发者宝石',
  '开发者留下的捷径。使用后直接传送到「郊区卖场」，消耗 1 回合并正常结算饥渴与体力损耗；战斗中无法使用，宝石不会消失，也无法丢弃。', {
    special: 'developer-gem',
    limited: true,
  }),
```

### 4.2 `src/data/inventory.js`

`INITIAL_ITEMS` 追加：

```js
{ id: 'developer-gem', qty: 1 },
```

仅影响 `createInitialBackpack()`（新开局）；不改 `applySlot`。

### 4.3 `src/game/store.js`

1. 顶部新增 `import { battle } from './battle'`。
2. `useItem(slotIndex)` 在 `const def = getItem(entry.id)` 之后、天使宝石分支之前插入：

```js
if (def?.special === 'developer-gem') {
  if (battle.active) {
    notify('战斗中无法使用开发者宝石，请先结束这场战斗。', 3200)
    return
  }
  if (game.dead) return
  if (game.location && game.location !== 'suburb-market') leaveMap()
  if (!enterMap('suburb-market')) {
    notify('开发者宝石未能开启传送门。', 3200)
    return
  }
  advanceTurns(1)
  if (!game.dead) {
    notify('开发者宝石开启捷径 · 已传送至「郊区卖场」 · 消耗 1 回合', 3200)
  }
  return
}
```

3. `discardItem(slotIndex)` 在 `const def = getItem(entry.id)` 之后插入：

```js
if (def?.special === 'developer-gem') {
  notify('开发者宝石是开局馈赠，无法丢弃。')
  return
}
```

### 4.4 `src/components/InventoryPanel.vue`

- 新增 `import { battle } from '../game/battle'`。
- 新增 computed：

```js
const devGemLocked = computed(
  () => battle.active && selectedDef.value?.special === 'developer-gem',
)
```

- `handleUse()` 首行守卫：`if (devGemLocked.value) return`（提示由 store 统一给出）。
- 使用按钮 `:disabled="devGemLocked"`。
- 在该按钮附近增加行内提示：`<p v-if="devGemLocked" class="bag-lock">战斗中无法使用开发者宝石，请先结束战斗。</p>`。

### 4.5 `src/components/BattleView.vue`

- 新增 computed `devGemEntry`：查找背包中 `id === 'developer-gem'` 的条目（返回 `{ entry, index, def }` 或 null）。
- 在战斗背包列表中、`usableItems` 列表之后渲染禁用条目（即使 `usableItems` 为空也显示）：

```html
<article v-if="devGemEntry" class="bag__item bag__item--locked">
  <img v-if="devGemEntry.def.image" :src="devGemEntry.def.image" :alt="devGemEntry.def.name" />
  <div class="bag__main">
    <h5>{{ devGemEntry.def.name }} ×{{ devGemEntry.entry.qty }}</h5>
    <p>战斗中无法使用，请先结束这场战斗。</p>
  </div>
  <button type="button" class="btn" disabled>不可用</button>
</article>
```

- 空状态文案保持：宝石条目单独显示，不依赖 `usableItems`。

### 4.6 `src/game/battle.js`

`useBattleItem(slotIndex)` 在取到 `def` 后、`if (!def?.effects) return` 之前插入：

```js
if (def?.special === 'developer-gem') {
  notify('战斗中无法使用开发者宝石，请先结束这场战斗。', 3200)
  pushLog('开发者宝石在战斗中无法使用。')
  return
}
```

确认 `notify` 已在 battle.js 的 store 导入列表中；若没有则补充导入。

## 5. 验证步骤

1. `npm run build` 必须通过（不得回退其他会话改动）。
2. 启动开发服务器（避免与后台 preview 重复），无头浏览器实测：
   - 新开局 → 打开背包 → 首屏可见「开发者宝石」，数量 1，图标加载成功（`naturalWidth > 0`）。
   - 记录使用前 `day / phase / hunger / thirst / stamina / sanity / location`。
   - 非战斗状态使用 → 记录使用后数值；断言 `phase +1`、`location === 'suburb-market'`、四项各 -10（从安全屋）。
   - 再次使用（仍在郊区卖场）→ 四项各 -5、`phase +1`、宝石仍在背包（qty 1）。
3. 战斗拦截：
   - 在郊区卖场反复探索直至进入战斗；打开战斗背包，断言开发者宝石行显示、按钮 `disabled`、提示文案存在。
   - 战斗中用浏览器控制台动态导入 `/src/game/battle.js` 与 `/src/game/store.js`（同一 Vite 模块实例），设 `battle.active = true` 后直接调用 `useItem(宝石槽位)`，断言状态数值不变、提示为「战斗中无法使用开发者宝石，请先结束这场战斗。」。
   - 断言 `useBattleItem` 直接调用时不会触发 `zombieTurn()`（回合数不变）。
4. 老存档：
   - 代码层断言：仅 `isNew` 分支写 `createInitialBackpack()`；`applySlot` 不追加物品。
   - 可选实测：用既有存档槽启动，背包无宝石且不被改写。
5. 回归：普通食物/药品使用、时间宝石/天使宝石分支、地图进出正常。

## 6. 风险

- ESM 环：`store.js ⇄ battle.js`。已确认顶层无 `battle` 读取，但构建工具对环的排序仍需 build + 运行验证。
- `enterMap` 自带 `ENTRY_COST`，传送总损耗为「入场 -5 + 回合 -5」，与字面「消耗 1 回合」略有差异；这是复用既有进入流程的必然结果，将在回复中明示。
- 已站在目标地图再次使用时 `enterMap` 早退，仍扣 1 回合（视为一次使用）；若用户希望原地使用无损耗，需要额外规则。
- 战斗 UI 禁用条目依赖 `battle.active` 响应式；若战斗结束瞬间点击存在极短竞态，逻辑层仍会拦截。
- 老存档永不补发；仅当老存档背包为空数组时，既有 `applySlot` 回落逻辑会生成初始背包（含宝石），属边缘行为。
