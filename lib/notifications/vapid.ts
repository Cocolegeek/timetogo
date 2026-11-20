// Public half of the VAPID key pair (safe to ship). The private half lives only in
// the server env (VAPID_PRIVATE_KEY). Override both together if you rotate them.
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BELO_Qn-dsh1idgFBtL1qpTOraa0L2sbGAzUDeE-zaYlZzinzkP_4wtX4pnj24Ts2fp1dSnqXF2xjq6pBLVso7E";
