"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PaymentInfo {
  iban: string | null;
  phone: string | null;
  ownerName: string | null;
}

/**
 * Récupère les infos de paiement (IBAN, tel) du user lié comme
 * primary à un participant donné. Renvoie null tant que la
 * requête n'a pas répondu ou si le participant n'a pas de
 * primary, ou si l'utilisateur n'est pas membre du voyage.
 */
export function usePaymentInfo(participantId: string | null | undefined) {
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!participantId) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .rpc("get_payment_info", { p_participant_id: participantId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || (Array.isArray(data) && data.length === 0)) {
          setInfo(null);
        } else {
          const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
          setInfo({
            iban: (row.iban as string | null) ?? null,
            phone: (row.phone as string | null) ?? null,
            ownerName: (row.owner_name as string | null) ?? null,
          });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [participantId]);

  return { info, loading };
}
