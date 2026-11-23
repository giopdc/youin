export type RewardInput = {
  confirmed: number;
  threshold: number;
  cap: number | null;
  delivered: number;
};

export type RewardState = {
  earned: number;
  delivered: number;
  pending: number;
  needsReview: boolean;
  capReached: boolean;
  /** Entradas que faltan para la siguiente invitación (null si ya no hay más). */
  missingForNext: number | null;
};

export function computeRewards({ confirmed, threshold, cap, delivered }: RewardInput): RewardState {
  const raw = Math.floor(confirmed / threshold);
  const earned = cap == null ? raw : Math.min(raw, cap);
  const capReached = cap != null && earned >= cap;
  return {
    earned,
    delivered,
    pending: Math.max(earned - delivered, 0),
    needsReview: delivered > earned,
    capReached,
    missingForNext: capReached ? null : threshold - (confirmed % threshold),
  };
}

const inv = (n: number) => (n === 1 ? "invitación" : "invitaciones");
const entradas = (n: number) => (n === 1 ? "entrada" : "entradas");
const faltan = (n: number) => (n === 1 ? "Te falta" : "Te faltan");

/** Mensaje principal del panel de una persona en el programa. */
export function rewardMessage(input: RewardInput): string {
  const { confirmed, threshold } = input;
  const s = computeRewards(input);
  if (s.earned === 0) {
    if (confirmed === 0)
      return `Comparte tu enlace. Con ${threshold} ${entradas(threshold)} confirmadas consigues tu invitación`;
    const left = threshold - confirmed;
    return `Llevas ${confirmed} de ${threshold}. ${faltan(left)} ${left} ${entradas(left)} para tu invitación`;
  }
  const delivery =
    s.pending === 0
      ? s.earned === 1 ? "Entregada" : "Entregadas"
      : s.delivered === 0
        ? s.pending === 1 ? "Pendiente de entrega" : "Pendientes de entrega"
        : `${s.delivered} ${s.delivered === 1 ? "entregada" : "entregadas"}, ${s.pending} pendiente${s.pending === 1 ? "" : "s"} de entrega`;
  if (s.capReached) {
    return `Has conseguido ${s.earned} ${inv(s.earned)}. ${delivery}. Has alcanzado el máximo para esta fiesta`;
  }
  if (confirmed % threshold === 0) {
    return `Has conseguido ${s.earned} ${inv(s.earned)}. ${delivery}`;
  }
  const left = s.missingForNext!;
  const conseguida = s.earned === 1 ? "conseguida" : "conseguidas";
  return `Tienes ${s.earned} ${inv(s.earned)} ${conseguida}. ${faltan(left)} ${left} ${entradas(left)} para la siguiente`;
}
