'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, Phone, Image as ImageIcon, CheckCircle, Send, UploadCloud, FileText, Trash2, BellRing, ZoomIn } from 'lucide-react';
import { getTutorQuestions, updateQuestionStatus } from '@/app/actions';
import { compressImageToBase64 } from '@/lib/utils';

export default function TutorDashboard() {
    const [tutorIdInput, setTutorIdInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [questions, setQuestions] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');

    const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
    const [replyText, setReplyText] = useState('');
    const [meetingUrl, setMeetingUrl] = useState('');
    const [replyImage, setReplyImage] = useState<File | null>(null);
    const [submittingReply, setSubmittingReply] = useState(false);

    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    const fetchQuestions = async () => {
        try {
            const qs = await getTutorQuestions();
            // Map 'resolved' strings to frontend tab names
            const mappedQs = qs.map(q => ({
                ...q,
                status: q.status === 'resolved' ? 'completed' : q.status
            }));
            setQuestions(mappedQs);

            // Update selected question state if it was changed
            if (selectedQuestion) {
                const updatedStatus = mappedQs.find(q => q.id === selectedQuestion.id);
                if (updatedStatus && updatedStatus.status !== selectedQuestion.status) {
                    setSelectedQuestion(updatedStatus);
                }
            }
        } catch (e) {
            console.error("Fetch err", e);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput) {
            setIsLoggedIn(true);
            fetchQuestions();
        }
    };

    useEffect(() => {
        if (!isLoggedIn) return;
        const interval = setInterval(() => fetchQuestions(), 5000);
        return () => clearInterval(interval);
    }, [isLoggedIn]);

    const handleSelectQuestion = (q: any) => {
        setSelectedQuestion(q);
        setReplyText('');
        setMeetingUrl('');
        setReplyImage(null);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const pwd = prompt('削除するには管理者パスワードを入力してください（削除パスワード: admin）');
        if (pwd === 'admin') {
            try {
                // Delete from supabase via action
                await updateQuestionStatus(id, tutorIdInput, 'deleted_by_admin', { tutor_reply_text: 'Admin Override' });
                alert('問題を削除しました。');
                fetchQuestions();
                if (selectedQuestion?.id === id) setSelectedQuestion(null);
            } catch (err) { alert('削除エラー'); }
        }
    };

    const acceptRequestImagesOnly = async () => {
        if (!selectedQuestion) return;
        try {
            await updateQuestionStatus(selectedQuestion.id, tutorIdInput, 'in_progress');
            alert('「対応中」にステータス変更しました！画像と解説を作成して返信してください。');
            fetchQuestions();
            setActiveTab('in_progress');
        } catch (e) { alert('エラーが発生しました'); }
    };

    const submitReply = async () => {
        if (!selectedQuestion) return;
        setSubmittingReply(true);

        try {
            if (selectedQuestion.request_type === '画像添削') {
                let imgB64 = null;
                if (replyImage) {
                    imgB64 = await compressImageToBase64(replyImage);
                }
                await updateQuestionStatus(selectedQuestion.id, tutorIdInput, 'resolved', {
                    tutor_reply_text: replyText,
                    tutor_reply_image_b64: imgB64
                });
                alert('回答を送信しました。（解決済み）');
                setActiveTab('completed');
                setSelectedQuestion(null);
            } else {
                if (!meetingUrl) {
                    alert('ミーティングURLを入力してください');
                    setSubmittingReply(false);
                    return;
                }
                await updateQuestionStatus(selectedQuestion.id, tutorIdInput, 'in_progress', {
                    meeting_url: meetingUrl
                });
                alert('生徒へURLを送信し、マッチング完了しました！通話終了後に完了してください。');
                setActiveTab('in_progress');
            }
            fetchQuestions();
        } catch (error) {
            console.error(error);
            alert('送信エラー');
        } finally {
            setSubmittingReply(false);
        }
    };

    const markAsCompleted = async () => {
        if (!selectedQuestion) return;
        if (window.confirm('通話を終了し、「解決済み」に移行してよろしいですか？')) {
            try {
                await updateQuestionStatus(selectedQuestion.id, tutorIdInput, 'resolved');
                alert('実績が加算されました！');
                setActiveTab('completed');
                setSelectedQuestion(null);
                fetchQuestions();
            } catch (e) {
                alert('完了処理エラー');
            }
        }
    };

    const getRequestIcon = (type: string) => {
        if (type?.includes('ビデオ')) return <Video className="w-5 h-5 text-indigo-600 inline" />;
        if (type?.includes('音声')) return <Phone className="w-5 h-5 text-green-600 inline" />;
        return <ImageIcon className="w-5 h-5 text-orange-600 inline" />;
    };

    const filteredQuestions = questions.filter(q => q.status === activeTab);

    // Render Logic below is identical to the previous but changed img.src to image_b64
    if (!isLoggedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black font-sans px-4">
                <Link href="/" className="absolute top-4 left-4 text-indigo-600 hover:text-indigo-800 font-bold transition-colors">← トップ</Link>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-gray-200 shadow-2xl w-full max-w-sm">
                    <h2 className="text-3xl font-black mb-8 text-center tracking-tight text-gray-900">講師ログイン</h2>
                    <form onSubmit={handleLogin} className="flex flex-col space-y-5">
                        <input type="text" placeholder="講師IDを入力" value={tutorIdInput} onChange={(e) => setTutorIdInput(e.target.value)} className="border-2 border-gray-200 bg-gray-50 p-4 w-full rounded-2xl font-bold text-lg text-center" required />
                        <input type="password" placeholder="パスワード" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="border-2 border-gray-200 bg-gray-50 p-4 w-full rounded-2xl font-bold text-lg text-center tracking-widest" required />
                        <button type="submit" className="bg-black text-white font-black text-xl mt-4 px-4 py-4 rounded-2xl shadow-[0_6px_0_0_rgba(107,114,128,1)] active:translate-y-2 active:shadow-none w-full">システムに入る</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-black font-sans pb-20 selection:bg-indigo-300">
            {enlargedImage && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setEnlargedImage(null)}>
                    <button className="absolute top-6 right-6 text-white bg-black/50 hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all p-3 rounded-full font-black text-xl flex items-center justify-center w-12 h-12 shadow-lg z-[110]" onClick={() => setEnlargedImage(null)}>✕</button>
                    <div className="relative max-w-full max-h-full">
                        <img src={enlargedImage} className="max-w-full max-h-[90vh] object-contain border-4 border-white/20 rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} alt="拡大画像" />
                    </div>
                </div>
            )}

            <div className="bg-white border-b-2 border-gray-200 shadow-sm sticky top-0 z-10 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link href="/" className="text-gray-500 hover:text-black font-bold transition-colors">← Q-Snap トップ</Link>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 border-l-2 border-gray-200 pl-4 hidden md:block">講師システム</h1>
                </div>
                <div className="bg-green-100 border-2 border-green-200 px-4 py-1.5 rounded-full text-sm font-extrabold text-green-800 flex items-center shadow-sm">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></span> {tutorIdInput || 'TUTOR'}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">

                <div className="lg:col-span-5 flex flex-col h-auto lg:h-[85vh]">
                    <div className="flex space-x-2 bg-gray-200 p-1.5 rounded-[1.2rem] mb-4 shadow-inner shrink-0 overflow-x-auto hide-scrollbar">
                        <button onClick={() => { setActiveTab('pending'); setSelectedQuestion(null); }} className={`whitespace-nowrap flex-1 py-3 px-2 text-sm font-black rounded-xl transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500'}`}>
                            回答前 <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'pending' ? 'bg-indigo-100' : 'bg-gray-300'}`}>{questions.filter(q => q.status === 'pending').length}</span>
                        </button>
                        <button onClick={() => { setActiveTab('in_progress'); setSelectedQuestion(null); }} className={`whitespace-nowrap flex-1 py-3 px-2 text-sm font-black rounded-xl transition-all ${activeTab === 'in_progress' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500'}`}>
                            対応中 <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'in_progress' ? 'bg-green-100' : 'bg-gray-300'}`}>{questions.filter(q => q.status === 'in_progress').length}</span>
                        </button>
                        <button onClick={() => { setActiveTab('completed'); setSelectedQuestion(null); }} className={`whitespace-nowrap flex-1 py-3 px-2 text-sm font-black rounded-xl transition-all ${activeTab === 'completed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                            完了 <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'completed' ? 'bg-gray-200' : 'bg-gray-300'}`}>{questions.filter(q => q.status === 'completed').length}</span>
                        </button>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-2 pb-10 flex-1 max-h-[500px] lg:max-h-none">
                        {filteredQuestions.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-white border-2 border-dashed border-gray-300 rounded-3xl font-bold">空です</div>
                        ) : (
                            filteredQuestions.map((q) => (
                                <div
                                    key={q.id} onClick={() => handleSelectQuestion(q)}
                                    className={`w-full text-left p-3 md:p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center group ${selectedQuestion?.id === q.id
                                        ? activeTab === 'in_progress' ? 'border-green-500 bg-green-50 shadow-[4px_4px_0_0_rgba(34,197,94,0.3)] translate-y-[-2px]' : 'border-indigo-600 bg-indigo-50 shadow-[4px_4px_0_0_rgba(79,70,229,0.3)] translate-y-[-2px]'
                                        : 'border-gray-200 bg-white hover:border-gray-400 shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                                        <div className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 border-2 rounded-xl flex items-center justify-center overflow-hidden ${selectedQuestion?.id === q.id ? 'bg-white border-indigo-200' : 'bg-gray-100 border-gray-200'}`}>
                                            {q.image_b64 ? <img src={q.image_b64} className="w-full h-full object-cover" /> : getRequestIcon(q.request_type)}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold text-white ${activeTab === 'in_progress' ? 'bg-green-700' : activeTab === 'completed' ? 'bg-gray-500' : 'bg-indigo-600'}`}>{q.student_grade}</span>
                                                <span className="text-xs text-gray-400 font-bold truncate">{q.id.split('-')[0]}</span>
                                            </div>
                                            <p className={`font-black text-sm md:text-base truncate leading-tight ${activeTab === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>{q.request_type}</p>
                                        </div>
                                    </div>
                                    <button onClick={(e) => handleDelete(e, q.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 shrink-0">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="lg:col-span-7 h-auto lg:h-[85vh] overflow-y-auto pb-10 lg:pr-2">
                    {selectedQuestion ? (
                        <div className="bg-white border-2 border-gray-200 rounded-[2rem] shadow-xl p-5 md:p-8 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-2 ${activeTab === 'in_progress' ? 'bg-green-500' : activeTab === 'completed' ? 'bg-gray-400' : 'bg-indigo-600'}`}></div>

                            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-100 pt-2">
                                <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                    {activeTab === 'pending' && '対応ダッシュボード'}
                                    {activeTab === 'in_progress' && '通話セッション / 添削中'}
                                    {activeTab === 'completed' && '対応済みレコード'}
                                </h3>
                                <span className="text-xs font-extrabold text-gray-700 bg-gray-100 px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-gray-200 flex items-center">
                                    {getRequestIcon(selectedQuestion.request_type)} <span className="ml-1 md:ml-2">{selectedQuestion.request_type}</span>
                                </span>
                            </div>

                            <div className="mb-6 bg-gray-50 rounded-[1.5rem] border-2 border-gray-100 overflow-hidden flex flex-col md:flex-row shadow-sm">
                                {selectedQuestion.image_b64 && (
                                    <div
                                        className="md:w-2/5 bg-gray-900 flex items-center justify-center min-h-[150px] cursor-pointer group relative"
                                        onClick={() => setEnlargedImage(selectedQuestion.image_b64)}
                                    >
                                        <img src={selectedQuestion.image_b64} className="w-full h-full object-contain max-h-[300px] group-hover:opacity-70 transition-opacity" alt="生徒がアップロードした問題プレビュー" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <span className="bg-black/80 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center shadow-lg"><ZoomIn className="w-4 h-4 mr-2" /> クリックで拡大</span>
                                        </div>
                                    </div>
                                )}
                                <div className="p-4 md:p-6 flex-1 flex flex-col justify-center">
                                    <p className="font-extrabold text-xs text-gray-400 mb-1 uppercase">質問内容 ({selectedQuestion.student_grade})</p>
                                    <p className="font-black text-xl md:text-2xl text-gray-900 break-words">{selectedQuestion.topic}</p>
                                </div>
                            </div>

                            {selectedQuestion.request_type === '画像添削' && (
                                <>
                                    {activeTab === 'pending' && (
                                        <div className="bg-orange-50 border-2 border-orange-200 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center shadow-sm">
                                            <div>
                                                <p className="font-black text-orange-800 flex items-center mb-1"><BellRing className="w-5 h-5 mr-2" /> まずは「対応開始」</p>
                                                <p className="text-xs font-bold text-orange-700">対応中ステータスにしてから画像を添削します。</p>
                                            </div>
                                            <button onClick={acceptRequestImagesOnly} className="mt-3 sm:mt-0 bg-white border-2 border-orange-300 text-orange-700 hover:bg-orange-100 font-extrabold px-6 py-3 rounded-xl shadow-sm active:translate-y-1">対応を開始する</button>
                                        </div>
                                    )}

                                    {activeTab === 'in_progress' && (
                                        <div className="space-y-5">
                                            <textarea rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="解説テキスト..." className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 font-bold text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all" />
                                            <div className="border-4 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer relative">
                                                <input type="file" onChange={(e) => setReplyImage(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                <UploadCloud className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                                                <span className="font-black text-sm">{replyImage ? '画像選択済み' : '添削済み画像を選択して返信して完了'}</span>
                                            </div>
                                            <button onClick={submitReply} disabled={submittingReply} className="w-full bg-black hover:bg-gray-800 text-white font-black text-lg px-8 py-4 rounded-xl shadow-[0_4px_0_0_rgba(107,114,128,1)] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center">
                                                <Send className="w-5 h-5 mr-3" /> 画像と一緒に返信して解決済みにする
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedQuestion.request_type !== '画像添削' && (
                                <>
                                    {activeTab === 'pending' && (
                                        <div className="space-y-6">
                                            <div className="bg-indigo-50 border-2 border-indigo-200 p-6 rounded-2xl shadow-sm">
                                                <label className="block font-black text-indigo-900 text-sm mb-3">ミーティングURL（Zoom等）</label>
                                                <input type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://zoom.us/..." className="w-full bg-white border-2 border-indigo-200 rounded-xl p-4 font-bold text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all" />
                                            </div>
                                            <button onClick={submitReply} disabled={submittingReply} className="w-full bg-black hover:bg-gray-800 text-white font-black text-lg px-8 py-4 rounded-xl shadow-[0_4px_0_0_rgba(107,114,128,1)] active:translate-y-1 active:shadow-none transition-all flex justify-center items-center">
                                                <Send className="w-5 h-5 mr-3" /> 確定して返信（通話を開始）
                                            </button>
                                        </div>
                                    )}

                                    {activeTab === 'in_progress' && (
                                        <div className="space-y-6">
                                            <div className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl text-center">
                                                <Video className="w-12 h-12 mx-auto text-green-600 mb-4" />
                                                <h4 className="text-xl md:text-2xl font-black text-green-900 tracking-tight mb-2">現在、指導通話中</h4>
                                                <p className="text-sm md:text-base font-bold text-green-800 mb-4 bg-white px-4 py-2 rounded-xl inline-block border border-green-100 break-all shadow-sm">
                                                    {selectedQuestion.meeting_url || 'https://zoom.us/j/xxxxx'}
                                                </p>
                                            </div>
                                            <button onClick={markAsCompleted} className="w-full bg-black text-white font-black text-lg px-8 py-4 rounded-xl shadow-[0_6px_0_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center">
                                                <CheckCircle className="w-6 h-6 mr-3 text-green-400" />
                                                通話を終了し、「解決済み」にする
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {activeTab === 'completed' && (
                                <div className="bg-gray-100 border-2 border-gray-200 p-6 rounded-2xl text-center opacity-70 mt-6">
                                    <CheckCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                    <h4 className="text-xl font-black text-gray-700 tracking-tight">対応完了済み</h4>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="hidden lg:flex h-full min-h-[400px] flex-col items-center justify-center bg-gray-50 border-4 border-dashed border-gray-200 rounded-[2rem] text-gray-400 p-10 text-center">
                            <FileText className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="font-black text-xl text-gray-500">リストから質問を選択してください</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
