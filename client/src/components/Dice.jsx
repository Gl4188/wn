export default function Dice({ dice }) {
  return (
    <div className="dice">
      <div className="die">{dice ? dice.d1 : '?'}</div>
      <div className="die">{dice ? dice.d2 : '?'}</div>
    </div>
  );
}
