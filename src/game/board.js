// 地图数据：40 格棋盘
// 格子类型：corner(角落) / city(城市) / station(交通枢纽) / utility(公共事业)
//           chance(机会) / destiny(命运) / tax(税)

export const GO_SALARY = 2000;        // 经过/停留起点领取
export const START_CASH = 15000;      // 起始资金
export const JAIL_FINE = 500;         // 出狱罚款
export const JAIL_INDEX = 10;         // 监狱格（探访）
export const GO_TO_JAIL_INDEX = 30;   // 进监狱格

export const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'];

// 25 座城市：按价格从低到高分 8 个色组，[名称, 分组, 价格]
const CITIES = [
  ['三亚', 'g1', 600],
  ['哈尔滨', 'g1', 600],
  ['昆明', 'g2', 1000],
  ['福州', 'g2', 1000],
  ['宁波', 'g2', 1200],
  ['合肥', 'g3', 1400],
  ['济南', 'g3', 1400],
  ['沈阳', 'g3', 1600],
  ['大连', 'g4', 1800],
  ['厦门', 'g4', 1800],
  ['青岛', 'g4', 2000],
  ['长沙', 'g5', 2200],
  ['郑州', 'g5', 2200],
  ['西安', 'g5', 2400],
  ['武汉', 'g6', 2600],
  ['南京', 'g6', 2600],
  ['天津', 'g6', 2800],
  ['苏州', 'g7', 3000],
  ['杭州', 'g7', 3000],
  ['成都', 'g7', 3200],
  ['重庆', 'g7', 3500],
  ['广州', 'g8', 3500],
  ['深圳', 'g8', 4000],
  ['上海', 'g8', 4000],
  ['北京', 'g8', 4000],
];

export const GROUPS = {
  g1: { name: '起步组', color: '#8d6e63' },
  g2: { name: '成长组', color: '#42a5f5' },
  g3: { name: '发展中组', color: '#ec407a' },
  g4: { name: '东部沿海组', color: '#ff9800' },
  g5: { name: '中部崛起组', color: '#ef5350' },
  g6: { name: '长江沿线组', color: '#fdd835' },
  g7: { name: '新一线组', color: '#66bb6a' },
  g8: { name: '一线城市组', color: '#3949ab' },
};

// 城市租金：base 为价格 1/10，随房子数按经典比例递增
function makeCity([name, group, price]) {
  const base = Math.round(price / 10);
  const rent = [base, base * 5, base * 15, base * 45, base * 80, base * 100];
  const houseCost = Math.round((price * 0.5) / 50) * 50;
  return { type: 'city', name, group, price, rent, houseCost };
}

function buildBoard() {
  const cities = CITIES.map(makeCity);
  const board = new Array(40);

  // 城市格（顺序与 CITIES 一一对应）
  const cityIndex = [
    1, 2, 6, 7, 8, 11, 12, 13, 16, 17, 18, 21, 22, 23,
    25, 26, 27, 31, 32, 33, 34, 36, 37, 38, 39,
  ];
  cityIndex.forEach((pos, i) => { board[pos] = cities[i]; });

  // 角落
  board[0] = { type: 'corner', corner: 'go', name: '起点' };
  board[10] = { type: 'corner', corner: 'jail', name: '监狱 · 探访' };
  board[20] = { type: 'corner', corner: 'parking', name: '免费停车' };
  board[30] = { type: 'corner', corner: 'gotojail', name: '进监狱' };

  // 机会 / 命运 / 税
  board[3] = { type: 'destiny', name: '命运' };
  board[9] = { type: 'chance', name: '机会' };
  board[19] = { type: 'destiny', name: '命运' };
  board[29] = { type: 'chance', name: '机会' };
  board[4] = { type: 'tax', name: '所得税', amount: 1000 };

  // 交通枢纽：按拥有数量收租
  const station = { type: 'station', price: 2000, rent: [250, 500, 1000, 2000] };
  board[5] = { ...station, name: '火车站' };
  board[15] = { ...station, name: '高铁站' };
  board[24] = { ...station, name: '机场' };
  board[35] = { ...station, name: '港口' };

  // 公共事业：租金 = 骰子点数 ×（1 个 ×4 / 2 个 ×10）
  board[14] = { type: 'utility', name: '电力公司', price: 1500 };
  board[28] = { type: 'utility', name: '自来水公司', price: 1500 };

  board.forEach((cell, i) => { cell.index = i; });
  return board;
}

export const BOARD = buildBoard();
