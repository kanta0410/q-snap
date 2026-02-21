'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import UsageTracker from '@/components/UsageTracker';
import Link from 'next/link';
import { Send, UploadCloud, Image as ImageIcon, Phone, Video, CreditCard, Clock, Loader2, List, CheckCircle, UserCircle, RefreshCcw, KeyRound } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy');

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export default function PostQuestionForm() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [studentIdInput, setStudentIdInput] = useState('');
    const [studentPasswordInput, setStudentPasswordInput] = useState('');

    const [userId, setUserId] = useState<string>('');

    // 持ち時間（残り時間）のステート
    const [remainingMinutes, setRemainingMinutes] = useState<number>(120);

    const [viewState, setViewState] = useState<'form' | 'list'>('form');

    const [myQuestions, setMyQuestions] = useState<any[]>([]);

    const [topic, setTopic] = useState('');
    const [grade, setGrade] = useState('中1');
    const [isGradeAutoAssigned, setIsGradeAutoAssigned] = useState(false);
    const [requestType, setRequestType] = useState('画像添削');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentIdInput || !studentPasswordInput) {
            alert('生徒IDとパスワードの両方を入力してください。');
            return;
        }

        try {
            const registeredStr = localStorage.getItem('mock_registered_students');
            if (!registeredStr) {
                alert('システムに生徒アカウント情報が存在しません。管理者に登録を依頼してください。');
                return;
            }

            const studentsDB = JSON.parse(registeredStr);
            const found = studentsDB.find((s: any) => s.id === studentIdInput);

            if (!found) {
                alert('入力された生徒IDはシステムに登録されていません。\n(エラーコード: ID_NOT_FOUND)');
                return;
            }

            if (found.password && found.password !== studentPasswordInput) {
                alert('パスワードが間違っています。正しいパスワードを入力してください。');
                return;
            }

            setUserId(studentIdInput);
            setGrade(found.grade);
            setIsGradeAutoAssigned(true);
            setIsLoggedIn(true);

            // 持ち時間をロード（初期状態は120）
            const localRem = localStorage.getItem(`mock_remaining_${studentIdInput}`);
            if (localRem) {
                setRemainingMinutes(parseInt(localRem));
            } else {
                const initialRem = 120;
                setRemainingMinutes(initialRem);
                localStorage.setItem(`mock_remaining_${studentIdInput}`, String(initialRem));
            }

        } catch (e) {
            alert('システムエラーが発生しました。');
        }
    };

    useEffect(() => {
        if (!isLoggedIn) return;
        const interval = setInterval(() => {
            setMyQuestions(prev => {
                let hasChanges = false;
                const updated = prev.map(q => {
                    if (q.status === '待機中' || q.status === 'マッチング完了') {
                        const tutorSignal = localStorage.getItem(`mock_match_${q.id}`);
                        if (tutorSignal && tutorSignal !== q.status) {
                            hasChanges = true;
                            // グローバルストレージから最新のデータ（ミーティングURLなど）を取得して結合
                            const globalData = JSON.parse(localStorage.getItem(`mock_global_pending_${q.id}`) || '{}');
                            return { ...q, status: tutorSignal, meeting_url: globalData.meeting_url };
                        }
                    }
                    return q;
                });
                return hasChanges ? updated : prev;
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [isLoggedIn]);

    const isOverLimit = remainingMinutes <= 0;

    const handleCheckout = async () => {
        try {
            const response = await fetch('/api/checkout_sessions', { method: 'POST' });
            const data = await response.json();

            if (data.id) {
                const stripe = await stripePromise;
                const result = await (stripe as any)?.redirectToCheckout({ sessionId: data.id });
                if (result?.error) alert(`決済エラー: ${result.error.message}`);
            } else {
                alert('【Stripe連動確認】\n現在有効なAPIキーが設定されていないため、モック動作を行います。');
                const newRem = remainingMinutes + 60;
                setRemainingMinutes(newRem);
                localStorage.setItem(`mock_remaining_${userId}`, String(newRem));
            }
        } catch (err: any) {
            alert(`サーバー接続エラー: ${err.message}`);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('checkout') === 'success' && isLoggedIn) {
                alert('追加チケットの購入が完了しました！持ち時間が1時間追加されました。');
                const newRem = remainingMinutes + 60;
                setRemainingMinutes(newRem);
                localStorage.setItem(`mock_remaining_${userId}`, String(newRem));
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [isLoggedIn, remainingMinutes, userId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isOverLimit) {
            alert("持ち時間がありません。追加チケットを購入してください。");
            return;
        }
        if (!imageFile) {
            alert("画像の添付は必須です。");
            return;
        }

        setLoading(true);

        try {
            const newQuestionId = `Q-${Math.floor(Math.random() * 10000)}`;

            let base64Img = '';
            try {
                base64Img = await fileToBase64(imageFile);
            } catch (e) {
                console.warn("Base64変換エラー");
            }

            localStorage.setItem(`mock_global_pending_${newQuestionId}`, JSON.stringify({
                id: newQuestionId,
                topic,
                student_grade: grade,
                request_type: requestType,
                date: new Date().toLocaleDateString(),
                image: base64Img
            }));

            const newQuestion = {
                id: newQuestionId, topic: topic, status: "待機中", request_type: requestType, date: new Date().toLocaleDateString()
            };

            setMyQuestions(prev => [newQuestion, ...prev]);
            setViewState('list');
            setTopic('');
            setImageFile(null);
            setLoading(false);

            // モック：本来は解決済み時に減らすが、ここでは質問時に一定分数消費するデモ
            const decrement = 15;
            const newRem = Math.max(0, remainingMinutes - decrement);
            setRemainingMinutes(newRem);
            localStorage.setItem(`mock_remaining_${userId}`, String(newRem));

        } catch (err: any) {
            alert(`通信エラー: ${err.message}`);
            setLoading(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black font-sans px-4">
                <Link href="/" className="absolute top-4 left-4 text-indigo-600 hover:text-indigo-800 font-bold transition-colors md:block hidden">← トップ</Link>
                <div className="bg-white p-8 sm:p-12 rounded-[2rem] border-2 border-gray-200 shadow-2xl w-full max-w-sm">
                    <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserCircle className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-black mb-2 text-center tracking-tight text-gray-900">生徒ログイン</h2>
                    <p className="font-bold text-gray-500 text-xs sm:text-sm text-center mb-8">
                        管理者ページで登録された<br />IDとパスワードでのみアクセス可能です
                    </p>
                    <form onSubmit={handleLogin} className="flex flex-col space-y-5">
                        <div className="space-y-1">
                            <input
                                type="text" placeholder="生徒ID (例: STU-001)"
                                value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)}
                                className="border-2 border-gray-200 bg-gray-50 p-4 w-full rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-black font-bold text-lg text-center tracking-widest uppercase placeholder-gray-400"
                                required
                            />
                        </div>
                        <div className="space-y-1 relative">
                            <KeyRound className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                            <input
                                type="password" placeholder="パスワードを入力"
                                value={studentPasswordInput} onChange={(e) => setStudentPasswordInput(e.target.value)}
                                className="border-2 border-gray-200 bg-gray-50 p-4 w-full rounded-2xl pl-12 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-black font-black text-lg text-center tracking-widest placeholder-gray-400"
                                required
                            />
                        </div>
                        <button type="submit" className="bg-black hover:bg-gray-800 transition-colors focus:ring-4 focus:ring-gray-300 text-white font-black text-lg md:text-xl px-4 py-4 rounded-2xl shadow-[0_6px_0_0_rgba(107,114,128,1)] active:translate-y-2 active:shadow-none transition-all w-full mt-2">
                            システムに入室
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (viewState === 'list') {
        return (
            <div className="min-h-screen bg-white text-gray-900 font-sans pb-12">
                <div className="bg-gray-50 border-b-2 border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                    <Link href="/" className="font-black text-indigo-700 text-xl tracking-tighter hover:text-indigo-900">Q-Snap</Link>
                    <div className="flex items-center space-x-3 md:space-x-4">
                        <span className="text-xs md:text-sm font-extrabold text-gray-500 border-r-2 border-gray-300 pr-3 md:pr-4">ID: {userId}</span>
                        <button onClick={() => setViewState('form')} className="bg-black hover:bg-gray-800 text-white font-extrabold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all shadow-md active:scale-95 text-xs sm:text-sm">
                            ＋ 新しい質問
                        </button>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto p-4 md:p-6 mt-6 md:mt-10">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 border-b-2 border-gray-100 pb-5">
                        <h1 className="text-2xl md:text-3xl font-black flex items-center tracking-tight text-gray-900 mb-2 sm:mb-0">
                            <List className="w-6 h-6 md:w-8 md:h-8 mr-3 md:mr-4 text-indigo-600" />自分の質問リスト
                        </h1>
                        <p className="text-[10px] md:text-xs font-bold text-gray-400">※講師の応答を自動取得しています</p>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                        {myQuestions.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 font-bold border-4 border-dashed border-gray-200 rounded-[2rem]">
                                まだ質問はありません。「＋ 新しい質問」から投稿してください。
                            </div>
                        ) : myQuestions.map((q, idx) => (
                            <div key={idx} className={`bg-gray-50 p-5 md:p-8 rounded-[1.5rem] md:rounded-3xl border-2 ${q.status === '待機中' ? 'border-orange-200 shadow-md ring-2 ring-orange-50' : q.status === 'マッチング完了' ? 'border-green-200 shadow-sm' : 'border-gray-200'} flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-lg transition-all relative overflow-hidden group`}>

                                {q.status === '待機中' && <div className="absolute top-0 left-0 w-full h-1.5 md:h-2 bg-gradient-to-r from-orange-400 to-yellow-400"></div>}
                                {q.status === 'マッチング完了' && <div className="absolute top-0 left-0 w-full h-1.5 md:h-2 bg-green-500"></div>}

                                <div className="flex-1 w-full">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        {q.status === '待機中' && <span className="flex items-center px-3 py-1 text-[10px] md:text-xs font-black rounded-full bg-orange-100 text-orange-700 shadow-sm"><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> 講師の待機中・応答待ち...</span>}
                                        {q.status === 'マッチング完了' && <span className="flex items-center px-3 py-1 text-[10px] md:text-xs font-black rounded-full bg-green-100 text-green-800 border-2 border-green-200 shadow-sm"><CheckCircle className="w-3 h-3 mr-1.5" /> マッチング完了・対応中</span>}
                                        {q.status === '解決済み' && <span className="px-3 py-1 text-[10px] md:text-xs font-black rounded-full bg-white border border-gray-300 text-gray-600 shadow-sm">解決済み</span>}
                                        <span className="text-gray-400 font-bold text-xs">{q.id}</span>
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black text-black mb-2 leading-tight">{q.topic}</h3>
                                    <p className="text-gray-500 font-bold text-xs md:text-sm flex items-center">
                                        希望形式: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 md:py-1 rounded-md ml-2 font-black leading-none">{q.request_type}</span>
                                    </p>
                                </div>

                                <div className="mt-4 md:mt-0 w-full md:w-auto shrink-0 md:ml-6 flex items-center justify-center">
                                    {q.status === '待機中' ? (
                                        <button className="w-full md:w-auto bg-gray-200 text-gray-400 cursor-not-allowed font-black px-6 py-3.5 md:py-5 rounded-xl border-2 border-gray-300 opacity-60 flex items-center justify-center text-sm md:text-lg">
                                            <RefreshCcw className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin-slow" />応答を待つ
                                        </button>
                                    ) : q.status === 'マッチング完了' && q.request_type.includes('通話') ? (
                                        <button onClick={() => { if (q.meeting_url) window.open(q.meeting_url, '_blank') }} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-black text-sm md:text-lg px-6 py-3.5 md:py-5 rounded-xl md:rounded-2xl shadow-[0_4px_0_0_rgba(21,128,61,1)] active:translate-y-1 md:active:translate-y-2 active:shadow-none transition-all flex items-center justify-center">
                                            <Video className="w-4 h-4 md:w-5 md:h-5 mr-2" /> 講師からの通話ルームへ参加
                                        </button>
                                    ) : q.status === 'マッチング完了' ? (
                                        <button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm md:text-lg px-6 py-3.5 md:py-5 rounded-xl md:rounded-2xl shadow-[0_4px_0_0_rgba(67,56,202,1)] active:translate-y-1 md:active:translate-y-2 active:shadow-none transition-all flex items-center justify-center">
                                            <ImageIcon className="w-4 h-4 md:w-5 md:h-5 mr-2" /> 添削結果を確認
                                        </button>
                                    ) : (
                                        <button className="w-full md:w-auto bg-white border-2 border-gray-200 hover:bg-gray-100 text-gray-600 font-bold px-6 py-3 md:py-4 rounded-xl transition-colors shadow-sm text-sm">詳細ログ</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans pb-12 selection:bg-indigo-200">
            <UsageTracker userId={userId} />

            <div className="bg-gray-50 border-b-2 border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <Link href="/" className="font-black text-indigo-700 text-xl tracking-tighter hover:text-indigo-900">Q-Snap</Link>
                <div className="flex items-center space-x-3 md:space-x-4">
                    <span className="text-xs md:text-sm font-extrabold text-gray-500 border-r-2 border-gray-300 pr-3 md:pr-4">ID: {userId}</span>
                    <div className="flex items-center space-x-2 md:space-x-3 bg-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl border-2 border-gray-200 shadow-sm cursor-pointer hover:bg-gray-100 active:scale-95 transition-all" onClick={() => setViewState('list')}>
                        <List className="w-4 h-4 md:w-5 md:h-5 text-indigo-700" />
                        <span className="text-xs md:text-sm font-black text-gray-800">マイリスト</span>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 md:p-6 mt-6 md:mt-10">
                <div className={`mb-8 md:mb-10 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 ${isOverLimit ? 'bg-red-50 border-red-300 shadow-inner' : 'bg-gray-50 border-gray-200 shadow-sm'} flex flex-col sm:flex-row items-start sm:items-center justify-between`}>
                    <div className="mb-4 sm:mb-0">
                        <h3 className="font-black text-gray-900 tracking-tight mb-1 flex items-center text-lg md:text-xl">
                            <Clock className="w-5 h-5 md:w-7 md:h-7 mr-2 md:mr-3 text-indigo-600" /> あなたの持ち時間
                        </h3>
                        <p className="text-[10px] md:text-xs font-bold text-gray-500">※時間が0になると追加購入が必要です</p>
                    </div>
                    <div className="text-right flex items-end self-end sm:self-auto">
                        <span className={`text-4xl md:text-5xl font-black ${isOverLimit ? 'text-red-600' : 'text-indigo-700'} tracking-tighter`}>{remainingMinutes}</span>
                        <span className="text-xs md:text-sm font-black text-gray-400 ml-1 md:ml-2 mb-1">分 (残り)</span>
                    </div>
                </div>

                {isOverLimit && (
                    <div className="mb-8 md:mb-10 bg-red-600 border border-red-700 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-lg flex flex-col items-center text-center relative overflow-hidden">
                        <CreditCard className="w-12 h-12 md:w-16 md:h-16 text-yellow-300 mb-4 md:mb-6" />
                        <h3 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">持ち時間がありません</h3>
                        <button onClick={handleCheckout} className="bg-white hover:bg-yellow-50 text-indigo-900 font-black text-lg md:text-2xl px-8 py-4 md:px-12 md:py-6 rounded-xl md:rounded-[2rem] transition-all w-full">
                            💳 ¥4,000 で 購入する (+60分)
                        </button>
                    </div>
                )}

                <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-10 text-black tracking-tight border-b-2 border-gray-100 pb-4 md:pb-5">
                    質問を作成する
                </h1>

                <form onSubmit={handleSubmit} className={`bg-gray-50 border-2 border-gray-200 p-6 md:p-12 rounded-[1.5rem] md:rounded-[2rem] shadow-sm space-y-8 md:space-y-10 ${isOverLimit ? 'opacity-40 pointer-events-none grayscale' : ''}`}>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div className="space-y-2 md:space-y-3">
                            <label className="flex font-black text-gray-700 text-xs md:text-sm uppercase tracking-wider justify-between items-center">
                                学年・所属
                                {isGradeAutoAssigned && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded ml-2">ID連携済み</span>}
                            </label>
                            <select disabled={isGradeAutoAssigned} value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full bg-white border-2 border-gray-300 text-black px-4 py-4 md:px-6 md:py-5 rounded-xl md:rounded-[1.2rem] font-black text-base md:text-lg appearance-none disabled:opacity-80">
                                <option value="中1">中学1年</option><option value="中2">中学2年</option><option value="中3">中学3年</option>
                                <option value="高1">高校1年</option><option value="高2">高校2年</option><option value="高3">高校3年</option>
                            </select>
                        </div>

                        <div className="space-y-2 md:space-y-3">
                            <label className="block font-black text-gray-700 text-xs md:text-sm uppercase tracking-wider">トピック（科目など）</label>
                            <input type="text" placeholder="例: 数学 二次関数" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-white border-2 border-gray-300 text-black px-4 py-4 md:px-6 md:py-5 rounded-xl md:rounded-[1.2rem] font-black text-base md:text-lg" required />
                        </div>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                        <label className="flex font-black text-gray-700 text-xs md:text-sm uppercase tracking-wider items-center">
                            問題の画像 <span className="ml-2 bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-sm font-black">必須</span>
                        </label>
                        <div className="relative group">
                            <input type="file" required accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className={`border-4 border-dashed ${imageFile ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-gray-300 hover:bg-gray-100 bg-white'} rounded-xl md:rounded-[1.5rem] p-8 md:p-12 transition-all flex flex-col items-center justify-center text-center`}>
                                {imageFile ? (
                                    <>
                                        <ImageIcon className="w-10 h-10 md:w-16 md:h-16 text-indigo-700 mb-3 drop-shadow-sm" />
                                        <p className="font-black text-sm md:text-xl text-indigo-900 break-all px-4">{imageFile.name}</p>
                                        <p className="text-xs md:text-sm font-bold text-indigo-600 mt-3 bg-white px-4 py-2 rounded-lg border border-indigo-100 shadow-sm">タップ変更</p>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-10 h-10 md:w-16 md:h-16 text-gray-300 mb-3 md:mb-4 group-hover:text-indigo-400" />
                                        <p className="font-black text-black text-sm md:text-xl">画像をドロップか選択</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                        <label className="block font-black text-gray-700 text-xs md:text-sm uppercase tracking-wider">希望形式</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
                            {[{ id: '画像添削', icon: ImageIcon, desc: '画像で返信' }, { id: '音声通話', icon: Phone, desc: '音声で質問' }, { id: 'ビデオ通話', icon: Video, desc: '画面共有で授業' }].map((method) => (
                                <label key={method.id} className={`relative flex flex-col items-center p-4 md:p-6 border-2 rounded-xl md:rounded-[1.5rem] cursor-pointer transition-all ${requestType === method.id ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-[2px_2px_0_0_rgba(79,70,229,0.3)] md:shadow-[4px_4px_0_0_rgba(79,70,229,0.3)] translate-y-[-2px]' : 'border-gray-200 hover:border-gray-400 bg-white text-gray-500 hover:shadow-sm'}`}>
                                    <input type="radio" name="requestType" value={method.id} checked={requestType === method.id} onChange={(e) => setRequestType(e.target.value)} className="sr-only" />
                                    <method.icon className={`w-6 h-6 md:w-8 md:h-8 mb-2 md:mb-4 ${requestType === method.id ? 'text-indigo-700' : 'text-gray-300'}`} />
                                    <span className="font-black text-base md:text-xl">{method.id}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="group relative w-full flex items-center justify-center bg-black text-white font-black text-xl md:text-2xl px-6 py-5 md:px-8 md:py-6 rounded-xl md:rounded-2xl transition-all shadow-[0_6px_0_0_rgba(107,114,128,1)] active:translate-y-2 md:active:translate-y-3 active:shadow-none disabled:opacity-70 disabled:cursor-not-allowed mt-6 md:mt-10">
                        {loading ? <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin" /> :
                            <><Send className="w-6 h-6 md:w-8 md:h-8 mr-3 md:mr-4" /> 質問を送信</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
