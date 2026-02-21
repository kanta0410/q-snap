import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe の Secret Key (本番稼働時は Vercel の Environment Variables に設定してください)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
    try {
        // 1時間4,000円の追加チケットのCheckout Sessionを作成
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: 'Q-Snap 追加学習チケット (1時間分)',
                            description: '無料利用枠(2時間)を超過した方向けの追加チケットです。',
                        },
                        unit_amount: 4000,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // 購入完了時、キャンセル時のリダイレクト先URL
            success_url: `${req.headers.get('origin')}/post?checkout=success`,
            cancel_url: `${req.headers.get('origin')}/post?checkout=canceled`,
        });

        return NextResponse.json({ id: session.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
