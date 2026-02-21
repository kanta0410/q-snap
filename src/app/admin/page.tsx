'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Download, Calendar, FileSpreadsheet, ShieldCheck, FileText, UserPlus, Database, KeyRound } from 'lucide-react';

export default function AdminPage() {
    const [passwordInput, setPasswordInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [students, setStudents] = useState<any[]>([]);
    const [tutors, setTutors] = useState<any[]>([]);

    const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const [exportHistory, setExportHistory] = useState<{ date: string, filename: string }[]>([]);

    // 生徒情報の事前登録用 state
    const [regStudentId, setRegStudentId] = useState('');
    const [regStudentPassword, setRegStudentPassword] = useState('');
    const [regStudentGrade, setRegStudentGrade] = useState('中1');
    const [registeredStudents, setRegisteredStudents] = useState<{ id: string, password?: string, grade: string }[]>([]);

    const handleAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === 'MEIKOBE') {
            setIsAuthenticated(true);
            fetchData();
        } else {
            alert('パスワードが間違っています。');
        }
    };

    const fetchData = async () => {
        try {
            // 完全に本番想定のリセット状態。ローカルストレージに何か入っていれば表示。
            const mockStudents = [];
            const mockTutors = [];

            let hasUsageData = false;
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('mock_usage_')) {
                    hasUsageData = true;
                    const userId = k.replace('mock_usage_', '');
                    const mins = parseInt(localStorage.getItem(k) || '0');
                    if (mins > 0) {
                        mockStudents.push({ id: userId, total_usage_minutes: mins });
                    }
                }
            });

            const tutorAnswers = parseInt(localStorage.getItem('mock_tutor_answers') || '0');
            if (tutorAnswers > 0) {
                mockTutors.push({ tutor_id: "TUTOR (テスト講師)", answer_count: tutorAnswers });
            }

            setStudents(mockStudents);
            setTutors(mockTutors);

            const history = localStorage.getItem('mock_csv_history');
            if (history) setExportHistory(JSON.parse(history));

            const savedStudents = localStorage.getItem('mock_registered_students');
            if (savedStudents) setRegisteredStudents(JSON.parse(savedStudents));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (isAuthenticated) fetchData();
    }, [selectedMonth, isAuthenticated]);

    const handleRegisterStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!regStudentId || !regStudentPassword) {
            alert('生徒IDとパスワードの両方を設定してください');
            return;
        }
        const newStudents = [{ id: regStudentId, password: regStudentPassword, grade: regStudentGrade }, ...registeredStudents];
        setRegisteredStudents(newStudents);
        localStorage.setItem('mock_registered_students', JSON.stringify(newStudents));
        setRegStudentId('');
        setRegStudentPassword('');
        alert(`生徒ID「${regStudentId}」をデータベースに登録しました！\n生徒はこのIDとパスワードでログインできます。`);
    };

    const handleDeleteRegisteredStudent = (id: string) => {
        const newStudents = registeredStudents.filter(s => s.id !== id);
        setRegisteredStudents(newStudents);
        localStorage.setItem('mock_registered_students', JSON.stringify(newStudents));
    }

    const handleExportCSV = () => {
        const header = "種別,ユーザーID,実績・利用時間(分),対象月\n";
        const studentRows = students.map(s => `生徒,${s.id},${s.total_usage_minutes},${selectedMonth}`).join("\n");
        const tutorRows = tutors.map(t => `講師,${t.tutor_id},${t.answer_count},${selectedMonth}`).join("\n");
        const csvContent = header + studentRows + "\n" + tutorRows;

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `QSnap_Report_${selectedMonth}_${new Date().getTime()}.csv`;
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const newHistory = [{ date: new Date().toLocaleString('ja-JP'), filename }, ...exportHistory];
        setExportHistory(newHistory);
        localStorage.setItem('mock_csv_history', JSON.stringify(newHistory));
        alert(`${selectedMonth}のデータをCSVとして出力しました！`);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black font-sans">
                <Link href="/" className="absolute top-4 left-4 text-indigo-600 hover:text-indigo-800 font-bold transition-colors">← トップ</Link>
                <div className="bg-white border-2 border-gray-200 p-8 sm:p-12 rounded-[2rem] shadow-2xl w-full max-w-sm">
                    <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-10 h-10 text-gray-800" />
                    </div>
                    <h1 className="text-3xl font-black mb-8 text-center tracking-tight text-gray-900">管理者ログイン</h1>
                    <form onSubmit={handleAccess} className="flex flex-col space-y-6">
                        <input
                            type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="パスワードを入力" className="px-5 py-4 rounded-2xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 focus:border-gray-900 bg-gray-50 text-center text-black font-black text-xl tracking-[0.5em] shadow-inner" autoComplete="new-password"
                        />
                        <button type="submit" className="bg-black hover:bg-gray-800 text-white font-black text-lg px-6 py-5 rounded-2xl transition-all shadow-[0_6px_0_0_rgba(75,85,99,1)] active:translate-y-2 active:shadow-none w-full">
                            ダッシュボードへ入室
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
            <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
                <Link href="/" className="font-black text-gray-300 hover:text-white transition-colors tracking-widest uppercase">← Q-Snap</Link>
                <span className="font-extrabold flex items-center text-sm bg-gray-800 px-4 py-2 rounded-xl border border-gray-700">
                    <span className="w-2.5 h-2.5 bg-green-400 rounded-full mr-3 animate-pulse"></span> 管理者権限モード
                </span>
            </div>

            <div className="max-w-6xl mx-auto p-6 md:p-10 mt-6 space-y-12">

                {/* ヘッダー */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-gray-200 pb-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-black mb-2">管理者ダッシュボード</h1>
                        <p className="font-bold text-gray-500">プラットフォーム全体の稼働状況とアカウント管理</p>
                    </div>
                    <div className="mt-6 md:mt-0 flex items-center space-x-4 bg-white p-3 rounded-2xl border-2 border-gray-200 shadow-sm">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent font-black text-lg text-black focus:outline-none cursor-pointer" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 左側：生徒IDの事前登録システム */}
                    <div className="bg-white border-2 border-gray-200 p-8 rounded-[2rem] shadow-sm flex flex-col h-full">
                        <h2 className="text-2xl font-black mb-3 flex items-center text-gray-900"><UserPlus className="w-8 h-8 mr-3 text-orange-500" /> 生徒アカウントの登録・管理</h2>
                        <p className="text-sm font-bold text-gray-500 mb-6 leading-relaxed">ここで登録した生徒IDとパスワードでのみ、生徒用アプリへのログインが許可されます。</p>

                        <form onSubmit={handleRegisterStudent} className="bg-gray-50 border-2 border-gray-200 p-6 rounded-3xl mb-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-700 tracking-wider mb-2">生徒ID (半角英数)</label>
                                    <input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} placeholder="例: STU-005" className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-3 font-bold text-base focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all uppercase" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-700 tracking-wider mb-2">所属・学年</label>
                                    <select value={regStudentGrade} onChange={(e) => setRegStudentGrade(e.target.value)} className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-3 font-bold text-base focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all cursor-pointer">
                                        <option value="中1">中学1年</option><option value="中2">中学2年</option><option value="中3">中学3年</option>
                                        <option value="高1">高校1年</option><option value="高2">高校2年</option><option value="高3">高校3年</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-700 tracking-wider mb-2">利用パスワード</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                    <input type="text" value={regStudentPassword} onChange={(e) => setRegStudentPassword(e.target.value)} placeholder="ログイン用パスワード" className="w-full bg-white border-2 border-gray-300 rounded-xl pl-10 pr-4 py-3 font-bold text-base focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all" required />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-lg py-4 rounded-xl shadow-[0_4px_0_0_rgba(194,65,12,1)] active:translate-y-1 active:shadow-none transition-all mt-4">
                                データベースに追加する
                            </button>
                        </form>

                        <div className="border-t-2 border-gray-100 pt-6 flex-1 min-h-[200px]">
                            <h3 className="text-sm font-black text-gray-600 mb-3 flex items-center"><Database className="w-4 h-4 mr-2" /> 登録済み生徒データベース ({registeredStudents.length}人)</h3>
                            <ul className="max-h-52 overflow-y-auto space-y-2 pr-2">
                                {registeredStudents.length === 0 ? <li className="text-gray-400 text-xs font-bold text-center py-4">まだ誰も登録されていません</li> :
                                    registeredStudents.map((stu, i) => (
                                        <li key={i} className="flex justify-between items-center bg-white border border-gray-200 px-4 py-3 rounded-lg text-sm shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="font-black text-gray-900 flex items-center">
                                                    {stu.id} <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold text-[10px] ml-2">{stu.grade}</span>
                                                </span>
                                                <span className="text-xs font-bold text-gray-400 mt-0.5">PWD: {stu.password || '未設定'}</span>
                                            </div>
                                            <button onClick={() => handleDeleteRegisteredStudent(stu.id)} className="text-red-400 hover:text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">削除</button>
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>
                    </div>

                    {/* 右側：サマリー */}
                    <div className="space-y-6">
                        <div className="bg-white border-2 border-gray-200 p-8 rounded-[2rem] shadow-sm">
                            <h2 className="text-2xl font-black mb-5 flex items-center text-gray-900"><span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl mr-3">🎓</span> 利用状況サマリー</h2>
                            <ul className="space-y-3">
                                {students.length === 0 ? <li className="text-gray-400 font-bold text-center py-4">データなし</li> : students.map((s, idx) => (
                                    <li key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 shadow-inner">
                                        <span className="text-black font-extrabold">{s.id}</span>
                                        <div><span className="text-indigo-600 font-black text-xl">{s.total_usage_minutes}</span> <span className="text-xs font-bold text-gray-500">分</span></div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-white border-2 border-gray-200 p-8 rounded-[2rem] shadow-sm">
                            <h2 className="text-2xl font-black mb-5 flex items-center text-gray-900"><span className="bg-green-100 text-green-700 p-2 rounded-xl mr-3">👨‍🏫</span> 講師の実績サマリー</h2>
                            <ul className="space-y-3">
                                {tutors.length === 0 ? <li className="text-gray-400 font-bold text-center py-4">データなし</li> : tutors.map((t, idx) => (
                                    <li key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 shadow-inner">
                                        <span className="text-black font-extrabold">{t.tutor_id}</span>
                                        <div><span className="text-green-600 font-black text-xl">{t.answer_count}</span> <span className="text-xs font-bold text-gray-500">件</span></div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* CSV */}
                <div className="bg-indigo-900 text-white rounded-[2rem] p-8 md:p-10 shadow-xl relative overflow-hidden mt-8">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-indigo-700 rounded-full blur-3xl opacity-50"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center border-b border-indigo-700 pb-8 mb-8">
                        <div className="mb-6 md:mb-0 text-center md:text-left">
                            <h3 className="text-3xl font-black mb-2">CSVデータ出力</h3>
                            <p className="text-indigo-200 font-bold">現在選択中の「{selectedMonth}」の全生徒・講師データをエクスポートします</p>
                        </div>
                        <button onClick={handleExportCSV} className="flex items-center bg-white text-indigo-900 hover:bg-gray-100 font-black text-xl px-8 py-5 rounded-2xl shadow-[0_6px_0_0_rgba(49,46,129,1)] active:translate-y-2 active:shadow-none transition-all">
                            <Download className="w-6 h-6 mr-3" /> CSVをダウンロード
                        </button>
                    </div>
                    <div>
                        <h4 className="flex items-center text-lg font-black text-indigo-100 mb-4">
                            <FileSpreadsheet className="w-5 h-5 mr-2" /> 過去の出力履歴（デバイス保存）
                        </h4>
                        {exportHistory.length === 0 ? (
                            <div className="bg-indigo-800/50 border border-indigo-700 p-6 rounded-2xl text-center text-indigo-300 font-bold">まだ出力履歴がありません</div>
                        ) : (
                            <ul className="space-y-3 max-h-40 overflow-y-auto pr-2">
                                {exportHistory.map((hist, idx) => (
                                    <li key={idx} className="bg-indigo-800/80 hover:bg-indigo-700 p-4 rounded-xl border border-indigo-600 flex justify-between items-center transition-colors">
                                        <div className="flex items-center">
                                            <FileText className="w-5 h-5 text-indigo-300 mr-3" />
                                            <span className="font-extrabold">{hist.filename}</span>
                                        </div>
                                        <span className="text-sm text-indigo-200 font-bold bg-indigo-900/50 px-3 py-1 rounded-lg">{hist.date}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
