import type { ParticipantSplit, SplitMode } from "@/types";

function distributeCents(total: number, count: number): number[] {
  if (count === 0) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) =>
    (i < remainder ? base + 1 : base) / 100
  );
}

export function computeShares(
  totalAmount: number,
  splits: ParticipantSplit[],
  mode: SplitMode
): ParticipantSplit[] {
  const active = splits.filter((s) => !s.excluded);

  switch (mode) {
    case "equal": {
      if (active.length === 0) return splits;
      const shares = distributeCents(totalAmount, active.length);
      const shareMap = new Map(active.map((s, i) => [s.participantId, shares[i]]));
      return splits.map((s) => ({ ...s, share: shareMap.get(s.participantId) ?? 0 }));
    }

    case "percentage": {
      const pctShares = active.map((s) =>
        Math.round(totalAmount * ((s.percentage ?? 0) / 100) * 100) / 100
      );
      const pctSum = pctShares.reduce((a, b) => a + b, 0);
      const diff = Math.round((totalAmount - pctSum) * 100);
      if (diff !== 0 && active.length > 0) {
        pctShares[active.length - 1] =
          Math.round((pctShares[active.length - 1] + diff / 100) * 100) / 100;
      }
      const pctMap = new Map(active.map((s, i) => [s.participantId, pctShares[i]]));
      return splits.map((s) => ({ ...s, share: pctMap.get(s.participantId) ?? 0 }));
    }

    case "fixed": {
      return splits.map((s) => ({
        ...s,
        share: s.excluded ? 0 : Math.round((s.fixedAmount ?? 0) * 100) / 100,
      }));
    }

    default:
      return splits;
  }
}

export function buildDefaultSplits(
  participantIds: string[]
): ParticipantSplit[] {
  return participantIds.map((id) => ({
    participantId: id,
    excluded: false,
    percentage: participantIds.length > 0 ? 100 / participantIds.length : 0,
    fixedAmount: 0,
    share: 0,
  }));
}

export function validatePercentageTotal(splits: ParticipantSplit[]): boolean {
  const active = splits.filter((s) => !s.excluded);
  const total = active.reduce((acc, s) => acc + (s.percentage ?? 0), 0);
  return Math.abs(total - 100) < 0.01;
}
