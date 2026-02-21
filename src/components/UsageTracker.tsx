'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function UsageTracker({ userId }: { userId?: string }) {
    const trackingInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // ユーザーIDがない場合や、環境変数が設定されていない（ダミー状態の）場合は動作させない
        if (!userId || process.env.NEXT_PUBLIC_SUPABASE_URL === undefined) return;

        const updateUsageTime = async () => {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('total_usage_minutes')
                    .eq('id', userId)
                    .single();

                const currentMinutes = profile?.total_usage_minutes || 0;

                await supabase
                    .from('profiles')
                    .update({ total_usage_minutes: currentMinutes + 1 })
                    .eq('id', userId);
            } catch (error) {
                console.error("Using time tracking failed", error);
            }
        };

        // 1分ごとに計測
        trackingInterval.current = setInterval(updateUsageTime, 60000);

        return () => {
            if (trackingInterval.current) {
                clearInterval(trackingInterval.current);
            }
        };
    }, [userId]);

    return null;
}
