// «N personas ya se han apuntado», con puntos de color. Solo el número real, nunca nombres.
export function Crowd({ count }: { count: number }) {
  return (
    <p className="crowd">
      <span className="dots" aria-hidden="true"><i /><i /><i /><i /></span>
      {count > 0 ? `${count} ${count === 1 ? "persona ya se ha apuntado" : "personas ya se han apuntado"}` : "Sé de los primeros en apuntarte"}
    </p>
  );
}
