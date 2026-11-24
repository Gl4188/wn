import { emit } from '../socket.js';

export default function PropertyModal({
  cell, owner, houses, players, me, myTurn, phase, buildable, onClose,
}) {
  const isMine = owner?.id === me;
  const canBuild = myTurn && isMine && buildable.includes(cell.index) && phase !== 'buy';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-color" style={{ background: cell.color || '#475569' }} />
        <h3>{cell.name}</h3>

        <div className="modal-meta">
          {cell.type === 'city' && (
            <>
              <span>城市地产 · 价格 ¥{cell.price} · 盖房 ¥{cell.houseCost}</span>
              {owner && <span>当前过路费 ¥{cell.rent[houses]}</span>}
            </>
          )}
          {cell.type === 'station' && <span>交通枢纽 · 价格 ¥{cell.price} · 按拥有数量收租</span>}
          {cell.type === 'utility' && <span>公共事业 · 价格 ¥{cell.price} · 租金 = 骰子点数 × 倍数</span>}
          {cell.type === 'corner' && <span>{cell.corner === 'go' ? '经过或停留领取 ¥2000' : '角落格'}</span>}
          {cell.type === 'chance' && <span>停留时抽一张机会卡</span>}
          {cell.type === 'destiny' && <span>停留时抽一张命运卡</span>}
          {cell.type === 'tax' && <span>停留时缴纳 ¥{cell.amount}</span>}
        </div>

        {cell.type === 'city' && houses > 0 && (
          <div className="houses-info">
            {houses === 5 ? '🏨 已建旅馆（满级）' : `🏠 已建 ${houses} 栋房子`}
          </div>
        )}

        {owner && (
          <div className="owner-info">
            所有者：<b style={{ color: owner.color }}>{owner.name}</b>
          </div>
        )}

        {cell.type === 'city' && cell.rent && (
          <table className="rent-table">
            <tbody>
              <tr>
                <th>0房</th><th>1房</th><th>2房</th><th>3房</th><th>4房</th><th>旅馆</th>
              </tr>
              <tr>
                {cell.rent.map((r, i) => <td key={i}>¥{r}</td>)}
              </tr>
            </tbody>
          </table>
        )}

        {canBuild && (
          <button className="btn btn-primary" onClick={() => emit('build', cell.index)}>
            盖房 ¥{cell.houseCost}
          </button>
        )}

        <button className="btn btn-ghost" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
