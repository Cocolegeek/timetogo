/** Distinct, muted participant colours (identity per person, white initials stay readable). */
export const PARTICIPANT_COLORS = [
  "#D9734E", // terracotta
  "#3D8B7D", // teal
  "#5B7DB1", // blue
  "#B8901F", // mustard
  "#8E6BBF", // violet
  "#C95F82", // rose
  "#4E8A48", // green
  "#4A4D57", // ink
];

export function participantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}
