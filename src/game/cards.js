// 机会卡 / 命运卡 牌堆
// effect.type 支持：
//   advanceToGo              前进到起点（领取工资）
//   goToJail                 直接进监狱
//   advanceToIndex(index)    前进到指定格（若经过起点领取工资）
//   advanceToNearestStation  前进到最近的交通枢纽
//   moveBack(steps)          后退 N 步
//   collect(amount)          获得金钱
//   pay(amount)              支付金钱
//   repair(perHouse,perHotel) 房屋维修费
//   birthday(amount)         每位其他玩家给你钱

export function buildCardDeck() {
  return [
    // —— 机会卡 ——
    { kind: 'chance', text: '前进到「起点」，领取 ¥2000', effect: { type: 'advanceToGo' } },
    { kind: 'chance', text: '直接前往「进监狱」', effect: { type: 'goToJail' } },
    { kind: 'chance', text: '前往「北京」，若经过起点领取 ¥2000', effect: { type: 'advanceToIndex', index: 39 } },
    { kind: 'chance', text: '前往最近的交通枢纽，并支付双倍租金', effect: { type: 'advanceToNearestStation', doubleRent: true } },
    { kind: 'chance', text: '后退 3 步', effect: { type: 'moveBack', steps: 3 } },
    { kind: 'chance', text: '银行分红，获得 ¥1000', effect: { type: 'collect', amount: 1000 } },
    { kind: 'chance', text: '支付医疗费 ¥800', effect: { type: 'pay', amount: 800 } },
    { kind: 'chance', text: '彩票中奖，获得 ¥1500', effect: { type: 'collect', amount: 1500 } },
    { kind: 'chance', text: '房屋维修：每栋房 ¥250、每栋旅馆 ¥1000', effect: { type: 'repair', perHouse: 250, perHotel: 1000 } },
    { kind: 'chance', text: '前往「上海」', effect: { type: 'advanceToIndex', index: 38 } },

    // —— 命运卡 ——
    { kind: 'destiny', text: '生日收到红包，每位玩家给你 ¥200', effect: { type: 'birthday', amount: 200 } },
    { kind: 'destiny', text: '缴纳所得税 ¥1000', effect: { type: 'pay', amount: 1000 } },
    { kind: 'destiny', text: '前进到「起点」，领取 ¥2000', effect: { type: 'advanceToGo' } },
    { kind: 'destiny', text: '直接进入监狱', effect: { type: 'goToJail' } },
    { kind: 'destiny', text: '后退 2 步', effect: { type: 'moveBack', steps: 2 } },
    { kind: 'destiny', text: '继承遗产，获得 ¥2000', effect: { type: 'collect', amount: 2000 } },
    { kind: 'destiny', text: '缴纳学费 ¥600', effect: { type: 'pay', amount: 600 } },
    { kind: 'destiny', text: '前往「广州」', effect: { type: 'advanceToIndex', index: 36 } },
    { kind: 'destiny', text: '股票分红，获得 ¥800', effect: { type: 'collect', amount: 800 } },
    { kind: 'destiny', text: '支付房租维修费 ¥400', effect: { type: 'pay', amount: 400 } },
  ];
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
