import Link from 'next/link';
import { ArrowRight, BookOpen, UserCircle, ShieldCheck } from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-200">

            {/* ヒーローセクション */}
            <div className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-50 blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-50 blur-3xl opacity-50"></div>

                <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center space-x-2 bg-black text-white px-4 py-1.5 rounded-full text-sm font-extrabold mb-8 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span>Q-Snap V1.0 - 稼働中</span>
                    </div>

                    <h1 className="text-6xl md:text-7xl font-black mb-8 tracking-tighter text-black leading-tight">
                        いつでも、どこでも、<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                            最高の指導を。
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-black font-extrabold mb-12 max-w-2xl mx-auto leading-relaxed">
                        Q-Snap は、わからない問題をスマホで撮って送るだけで、プロの講師から即座に解説や通話サポートが受けられる次世代アプリです。
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {/* 生徒向けログイン */}
                        <Link href="/post" className="group relative bg-white border-2 border-gray-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col items-center text-center">
                            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors">
                                <UserCircle className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black mb-3 text-black">生徒 ログイン</h2>
                            <p className="text-black font-bold text-sm mb-6">質問を作成・履歴を確認する</p>
                            <span className="text-indigo-600 font-black flex items-center group-hover:translate-x-1 transition-transform">
                                アクセスする <ArrowRight className="w-5 h-5 ml-2" />
                            </span>
                        </Link>

                        {/* 講師向けログイン */}
                        <Link href="/tutor" className="group relative bg-white border-2 border-gray-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-blue-500 transition-all flex flex-col items-center text-center md:-translate-y-4">
                            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                                <BookOpen className="w-10 h-10 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-black mb-3 text-black">講師 ログイン</h2>
                            <p className="text-black font-bold text-sm mb-6">生徒の質問に回答・指導する</p>
                            <span className="text-blue-600 font-black flex items-center group-hover:translate-x-1 transition-transform">
                                アクセスする <ArrowRight className="w-5 h-5 ml-2" />
                            </span>
                        </Link>

                        {/* 管理者向けログイン */}
                        <Link href="/admin" className="group relative bg-white border-2 border-gray-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-gray-900 transition-all flex flex-col items-center text-center">
                            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:bg-gray-200 transition-colors">
                                <ShieldCheck className="w-10 h-10 text-gray-700" />
                            </div>
                            <h2 className="text-2xl font-black mb-3 text-black">管理者 パネル</h2>
                            <p className="text-black font-bold text-sm mb-6">利用状況・実績を管理する</p>
                            <span className="text-gray-900 font-black flex items-center group-hover:translate-x-1 transition-transform">
                                アクセスする <ArrowRight className="w-5 h-5 ml-2" />
                            </span>
                        </Link>
                    </div>
                </div>
            </div>

        </div>
    );
}
