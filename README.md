# 🎲 中国大富翁 · 在线多人对战

一个可以在线多人实时对战的大富翁游戏。地图包含 **25 座中国城市**，支持 **2-6 名玩家**用各自的手机（浏览器）加入同一房间，像真实桌游一样买地、收租、升级房子。

> 规则为「标准大富翁」：买地收租、整组翻倍、盖房/旅馆升级、机会卡/命运卡、监狱、破产淘汰（不做玩家间交易）。

## ✨ 功能特性

- 🌐 房间制多人对战：输入 6 位房间码即可加入朋友的对局
- 📱 移动端优先：手机浏览器直接玩，无需安装 App
- 🏙️ 25 座中国城市 + 交通枢纽 + 公共事业 + 机会/命运卡
- 🏠 房子/旅馆升级（集齐同组、均衡建设）
- 🎲 服务端权威掷骰，防作弊
- 🔁 断线重连：刷新页面可回到原房间继续

## 🛠️ 技术栈

- 后端：Node.js + Express + Socket.IO（权威游戏状态）
- 前端：React + Vite
- 部署：Render（免费 Web Service，一条链接即玩）

## 📁 项目结构

```
monopoly-china/
├── server/          # Express + Socket.IO 后端
│   └── src/
│       ├── board.js   # 40 格地图数据
│       ├── cards.js   # 机会/命运卡牌堆
│       ├── game.js    # 核心状态机（回合/买地/收租/盖房/监狱/破产）
│       ├── rooms.js   # 房间管理
│       └── index.js   # 服务入口
├── client/          # React + Vite 前端
└── render.yaml      # Render 一键部署蓝图
```

## 🚀 本地运行

```bash
# 1. 安装依赖（npm workspaces 一次装好前后端）
npm install

# 2. 同时启动后端(10000) + 前端(5173)
npm run dev
```

打开 http://localhost:5173 ，开两个浏览器窗口（或手机连同一 Wi-Fi 访问电脑 IP）即可双人对战测试。

## 📦 发布到 GitHub + Render

### 上传 GitHub

```bash
git init
git add .
git commit -m "init: 中国大富翁在线对战"
git branch -M main
git remote add origin https://github.com/<你的用户名>/monopoly-china.git
git push -u origin main
```

### 部署 Render

1. 注册/登录 [Render](https://render.com)（用 GitHub 账号即可）
2. Dashboard → **New +** → **Blueprint**
3. 选择 `monopoly-china` 仓库 → 自动读取 `render.yaml` → **Apply**
4. 等待构建完成，拿到形如 `https://monopoly-china.onrender.com` 的链接

> ⚠️ Render 免费层在空闲约 15 分钟后会休眠，首次访问需等待约 1 分钟冷启动，属正常现象。

## 🎮 玩法说明

| 项 | 规则 |
|---|---|
| 起始资金 | ¥15000 / 人 |
| 经过/停留起点 | 领取 ¥2000 |
| 买地 | 踩到无主城市可购买；资金不足则跳过 |
| 收租 | 踩到他人地产付租金；**拥有整组同色城市 → 租金翻倍** |
| 盖房 | 集齐同组城市可盖房（1→4 栋 → 旅馆），需均衡建设 |
| 交通枢纽 | 按拥有数量收租（1个¥250 / 2个¥500 / 3个¥1000 / 4个¥2000） |
| 公共事业 | 租金 = 骰子点数 ×（1个×4 / 2个×10） |
| 机会/命运卡 | 前进、后退、收付款、进监狱等随机事件 |
| 监狱 | 付 ¥500 出狱 / 掷双骰出狱 / 坐满 3 回合强制出狱 |
| 破产 | 现金不足付账且卖房仍不够 → 出局，地产回归市场 |
| 胜利 | 其他玩家全部破产，最后存活者获胜 |

## 📄 License

MIT
