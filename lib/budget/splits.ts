import type { ParticipantSplit, SplitMode } from "@/types";

export function computeShares(
  totalAmount: number,
  splits: ParticipantSplit[],
  mode: SplitMode
): ParticipantSplit[] {
  const active = splits.filter((s) => !s.excluded);

  switch (mode) {
    case "equal": {
      if (active.length === 0) return splits;
      const share = Math.round((totalAmount / active.length) * 100) / 100;
      return splits.map((s) => ({ ...s, share: s.excluded ? 0 : share }));
    }

    case "percentage": {
      return splits.map((s) => ({
        ...s,
        share: s.excluded
          ? 0
          : Math.round(totalAmount * ((s.percentage ?? 0) / 100) * 100) / 100,
      }));
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
