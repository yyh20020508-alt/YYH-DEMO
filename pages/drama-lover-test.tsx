/**
 * drama-lover-test.tsx
 * 剧系恋人测试 -- 你撞脸哪款热剧角色？你的天命CP是谁？
 * 由 newapp-page-studio 从 public HTML 迁移
 */

import {useState, useRef, useEffect, useCallback} from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import {useNewAppLog} from '@/hooks/useNewAppLog';
import {NewAppBridge} from '@/lib/newapp-bridge';
import {NewAppTopBar} from '@/components/NewAppTopBar';
import {NewAppFooterButton} from '@/components/NewAppFooterButton';
import styles from '@/styles/drama-lover-test.module.css';
import DATA from '@/config/drama-lover-test-data.json';
import homeCoverImg from '@/assets/images/drama-lover-test/home-cover.jpg';
import shareChenLuZhou from '@/assets/images/drama-lover-test/share/chenLuZhou.jpg';
import shareChengShaoShang from '@/assets/images/drama-lover-test/share/chengShaoShang.jpg';
import shareFanYun from '@/assets/images/drama-lover-test/share/fanYun.jpg';
import shareHeSuYe from '@/assets/images/drama-lover-test/share/heSuYe.jpg';
import shareHeWeiFang from '@/assets/images/drama-lover-test/share/heWeiFang.jpg';
import shareJinChao from '@/assets/images/drama-lover-test/share/jinChao.jpg';
import shareLiWu from '@/assets/images/drama-lover-test/share/liWu.jpg';
import shareLiZan from '@/assets/images/drama-lover-test/share/liZan.jpg';
import shareNieJiuLuo from '@/assets/images/drama-lover-test/share/nieJiuLuo.jpg';
import shareSangYan from '@/assets/images/drama-lover-test/share/sangYan.jpg';
import shareWenYiFan from '@/assets/images/drama-lover-test/share/wenYiFan.jpg';
import shareXiangLiu from '@/assets/images/drama-lover-test/share/xiangLiu.jpg';
import shareXieZheng from '@/assets/images/drama-lover-test/share/xieZheng.jpg';
import shareXuYan from '@/assets/images/drama-lover-test/share/xuYan.jpg';
import shareXuZhi from '@/assets/images/drama-lover-test/share/xuZhi.jpg';
import shareZhenHuan from '@/assets/images/drama-lover-test/share/zhenHuan.jpg';

const SHARE_IMGS: Record<string, {src: string}> = {
    chenLuZhou: shareChenLuZhou,
    chengShaoShang: shareChengShaoShang,
    fanYun: shareFanYun,
    heSuYe: shareHeSuYe,
    heWeiFang: shareHeWeiFang,
    jinChao: shareJinChao,
    liWu: shareLiWu,
    liZan: shareLiZan,
    nieJiuLuo: shareNieJiuLuo,
    sangYan: shareSangYan,
    wenYiFan: shareWenYiFan,
    xiangLiu: shareXiangLiu,
    xieZheng: shareXieZheng,
    xuYan: shareXuYan,
    xuZhi: shareXuZhi,
    zhenHuan: shareZhenHuan
};

// ================================================================
// Types
// ================================================================

interface CharacterData {
    name: string;
    drama: string;
    actor: string;
    gender: 'male' | 'female';
    type: number;
    quote: string;
    personality: string;
    tag: string;
    portrait: string;
    cpId: string;
    cpReason: string;
    signature: string;
    gradient: string;
    initial: string;
    emoji: string;
}

interface QuestionItem {
    scene: string;
    q: string;
    opts: string[];
    types: number[];
}

type Gender = 'male' | 'female';
type PageView = 'home' | 'gender' | 'quiz' | 'loading' | 'result';

// ================================================================
// Data from JSON
// ================================================================

const CHARACTERS = DATA.characters as Record<string, CharacterData>;
const TYPE_CHAR_MAP = DATA.typeCharMap as Record<string, Record<string, string>>;
const QUESTIONS = DATA.questions as QuestionItem[];
const OPT_LABELS = DATA.optLabels as string[];

const HEART_EMOJIS = ['\u2764\ufe0f', '\ud83d\udc97', '\ud83d\udc95', '\ud83d\udc96', '\u2728', '\ud83c\udf38'];
const CONFETTI_COLORS = ['#ff9a9e', '#a1c4fd', '#ffd700', '#fbc2eb', '#f093fb', '#a8edea'];
const TOTAL_QUESTIONS = 10;
const NUM_TYPES = 8;

// ================================================================
// Component
// ================================================================

function DramaLoverTestContent() {
    const {log, setPage: setLogPage} = useNewAppLog({pageName: 'new_agent_detail', agentName: DATA.page.agentName});

    // Page state
    const [pageView, setPageView] = useState<PageView>('home');
    const [gender, setGender] = useState<Gender | null>(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<number[]>(new Array(TOTAL_QUESTIONS).fill(-1));
    const [selectedGenderCard, setSelectedGenderCard] = useState<Gender | null>(null);

    // Result state
    const [resultChar, setResultChar] = useState<CharacterData | null>(null);
    const [resultCharKey, setResultCharKey] = useState<string | null>(null);

    // UI state
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

    // Refs
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cachedDataUrlRef = useRef<string | null>(null);

    // ================================================================
    // Floating Hearts
    // ================================================================

    const [hearts, setHearts] = useState<
        {id: number; emoji: string; left: number; fontSize: number; duration: number; delay: number}[]
    >([]);

    useEffect(() => {
        NewAppBridge.loading.hideNative();
        // 覆盖 body/html 背景色，防止平板等大屏上页面区域外露出全局背景色
        const prevBodyBg = document.body.style.background;
        const prevHtmlBg = document.documentElement.style.background;
        document.body.style.background = 'rgba(255, 235, 236)';
        document.documentElement.style.background = 'rgba(255, 235, 236)';

        // 热启动/返回场景：原生恢复页面时会重新等待 hideNative 信号
        // 监听页面可见性变化，确保每次恢复前台都能通知原生收起 loading
        const handleResume = () => {
            if (document.visibilityState === 'visible') {
                NewAppBridge.loading.hideNative();
            }
        };
        document.addEventListener('visibilitychange', handleResume);
        window.addEventListener('pageshow', handleResume);

        return () => {
            document.body.style.background = prevBodyBg;
            document.documentElement.style.background = prevHtmlBg;
            document.removeEventListener('visibilitychange', handleResume);
            window.removeEventListener('pageshow', handleResume);
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
            if (autoAdvanceRef.current) {
                clearTimeout(autoAdvanceRef.current);
            }
            if (confettiTimerRef.current) {
                clearTimeout(confettiTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setHearts(
            Array.from({length: 12}, (_, i) => ({
                id: i,
                emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
                left: Math.random() * 100,
                fontSize: 14 + Math.random() * 14,
                duration: 8 + Math.random() * 12,
                delay: Math.random() * 10
            }))
        );
    }, []);

    // ================================================================
    // Toast
    // ================================================================

    const showToast = useCallback((msg: string) => {
        setToastMsg(msg);
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => setToastMsg(null), 2000);
    }, []);

    // ================================================================
    // Confetti
    // ================================================================

    interface ConfettiPiece {
        id: number;
        left: number;
        color: string;
        duration: number;
        delay: number;
        width: number;
        height: number;
        round: boolean;
    }

    const launchConfetti = useCallback(() => {
        const pieces: ConfettiPiece[] = Array.from({length: 30}, (_, i) => {
            const size = 6 + Math.random() * 8;
            return {
                id: Date.now() + i,
                left: Math.random() * 100,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.8,
                width: size,
                height: size,
                round: Math.random() > 0.5
            };
        });
        setConfettiPieces(pieces);
        if (confettiTimerRef.current) {
            clearTimeout(confettiTimerRef.current);
        }
        confettiTimerRef.current = setTimeout(() => setConfettiPieces([]), 4000);
    }, []);

    // ================================================================
    // Character Popup
    // ================================================================

    // ================================================================
    // Navigation
    // ================================================================

    const goGender = useCallback(() => {
        setPageView('gender');
        log('click', 'new_agent', {action_type: 'button_click'});
        window.scrollTo({top: 0, behavior: 'auto'});
    }, [log]);

    const selectGenderHandler = useCallback(
        (g: Gender) => {
            setGender(g);
            setSelectedGenderCard(g);
            setCurrentQ(0);
            setAnswers(new Array(TOTAL_QUESTIONS).fill(-1));
            log('click', 'new_agent', {action_type: 'option_select'});
            setTimeout(() => {
                setPageView('quiz');
                window.scrollTo({top: 0, behavior: 'auto'});
            }, 300);
        },
        [log]
    );

    // ================================================================
    // Quiz Logic
    // ================================================================

    const showResult = useCallback(
        (finalAnswers: number[]) => {
            setPageView('loading');
            log('click', 'new_agent', {action_type: 'button_click'});
            window.scrollTo({top: 0, behavior: 'auto'});
            setTimeout(() => {
                const scores = new Array(NUM_TYPES).fill(0);
                for (let i = 0; i < TOTAL_QUESTIONS; i++) {
                    if (finalAnswers[i] !== -1) {
                        scores[QUESTIONS[i].types[finalAnswers[i]]]++;
                    }
                }
                let maxS = -1;
                let winT = 0;
                scores.forEach((s: number, idx: number) => {
                    if (s > maxS) {
                        maxS = s;
                        winT = idx;
                    }
                });
                const g = gender ?? 'female';
                const charId = TYPE_CHAR_MAP[String(winT)]?.[g];
                if (charId) {
                    const ch = CHARACTERS[charId];
                    setResultChar(ch);
                    setResultCharKey(charId);
                }
                setPageView('result');
                log('show', 'new_agent_result', {}, 'new_agent_detail');
                window.scrollTo({top: 0, behavior: 'auto'});
                launchConfetti();
            }, 2200);
        },
        [gender, launchConfetti, log]
    );

    const selectOption = useCallback(
        (qIndex: number, optIdx: number) => {
            if (autoAdvanceRef.current) {
                clearTimeout(autoAdvanceRef.current);
            }
            const next = answers.map((a, i) => (i === qIndex ? optIdx : a));
            setAnswers(next);
            log('click', 'new_agent', {action_type: 'option_select'});
            autoAdvanceRef.current = setTimeout(() => {
                if (qIndex >= TOTAL_QUESTIONS - 1) {
                    showResult(next);
                } else {
                    setCurrentQ(prev => prev + 1);
                    window.scrollTo({top: 0, behavior: 'smooth'});
                }
            }, 320);
        },
        [answers, showResult, log]
    );

    const goPrev = useCallback(() => {
        if (currentQ <= 0) {
            return;
        }
        setAnswers(prev => prev.map((a, i) => (i === currentQ ? -1 : a)));
        setCurrentQ(prev => prev - 1);
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, [currentQ]);

    // ================================================================
    // Restart / Retake
    // ================================================================

    const retake = useCallback(() => {
        setGender(null);
        setSelectedGenderCard(null);
        setCurrentQ(0);
        setAnswers(new Array(TOTAL_QUESTIONS).fill(-1));
        setResultChar(null);
        setResultCharKey(null);
        setPageView('gender');
        log('click', 'new_agent', {action_type: 'retry'});
        setLogPage('new_agent_detail');
        window.scrollTo({top: 0, behavior: 'auto'});
    }, [log]);

    // ================================================================
    // Save Image — 预加载：结果页显示后提前 fetch+base64，避免点击时卡顿
    // ================================================================

    useEffect(() => {
        if (!resultCharKey) {
            cachedDataUrlRef.current = null;
            return;
        }
        const url = SHARE_IMGS[resultCharKey]?.src;
        if (!url) {
            cachedDataUrlRef.current = null;
            return;
        }
        fetch(url)
            .then(res => res.blob())
            .then(
                blob =>
                    new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    })
            )
            .then(dataUrl => {
                cachedDataUrlRef.current = dataUrl;
            })
            .catch(() => {});
    }, [resultCharKey]);

    const saveImage = useCallback(async () => {
        if (!resultCharKey) {
            return;
        }
        log('click', 'new_agent', {action_type: 'save'});
        showToast('正在保存...');

        // 让 toast 先渲染一帧，再做 bridge 序列化，避免主线程阻塞导致视觉卡顿
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

        try {
            // 优先使用预加载缓存，避免重复 fetch+base64 导致卡顿
            let dataUrl = cachedDataUrlRef.current;
            if (!dataUrl) {
                const res = await fetch(SHARE_IMGS[resultCharKey]?.src ?? '');
                const blob = await res.blob();
                dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            if (NewAppBridge.env.isInApp) {
                await NewAppBridge.image.save(dataUrl);
                // bridge 会弹自己的"保存成功"，提前清掉我们的"正在保存..."避免同时出现
                if (toastTimerRef.current) {
                    clearTimeout(toastTimerRef.current);
                }
                setToastMsg(null);
            } else {
                const link = document.createElement('a');
                link.download = `${resultChar?.name ?? '我的剧系恋爱人设'}.png`;
                link.href = dataUrl;
                link.click();
                showToast('图片已生成');
            }
        } catch {
            showToast('保存失败，请长按图片保存');
        }
    }, [resultCharKey, resultChar, log, showToast]);

    // ================================================================
    // Current quiz data
    // ================================================================

    const currentQuestion = QUESTIONS[currentQ];

    // ================================================================
    // Render
    // ================================================================

    return (
        <>
            <Head>
                <title>
                    {
                        '\u5267\u7cfb\u604b\u4eba\u6d4b\u8bd5\uff5c\u4f60\u649e\u8138\u54ea\u6b3e\u70ed\u5267\u89d2\u8272\uff1f\u4f60\u7684\u5929\u547dCP\u662f\u8c01\uff1f'
                    }
                </title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
                />
            </Head>

            <div
                className={styles.page}
                style={pageView === 'result' ? {background: 'rgba(234, 180, 179)'} : undefined}
            >
                {/* Floating Hearts Background */}
                <div className={styles.heartsBg}>
                    {hearts.map(h => (
                        <div
                            key={h.id}
                            className={styles.heartFloat}
                            style={{
                                left: `${h.left}%`,
                                fontSize: `${h.fontSize}px`,
                                animationDuration: `${h.duration}s`,
                                animationDelay: `${h.delay}s`
                            }}
                        >
                            {h.emoji}
                        </div>
                    ))}
                </div>

                {/* ===== HOME PAGE ===== */}
                <div
                    className={`${styles.section} ${styles.homeCoverSection} ${pageView === 'home' ? styles.sectionActive : ''}`}
                    style={{background: 'rgba(255, 235, 236)'}}
                >
                    <div className={styles.homeCoverGroup}>
                        <div className={styles.homeCoverImageArea}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={homeCoverImg.src} className={styles.homeCoverImg} alt="剧系恋人测试" />
                        </div>
                        <div className={styles.homeCoverBtnWrap}>
                            <button className={styles.homeCoverBtn} onClick={goGender}>
                                {'开始测试'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ===== GENDER PAGE ===== */}
                <div
                    className={`${styles.section} ${styles.genderSection} ${pageView === 'gender' ? styles.sectionActive : ''}`}
                >
                    <div className={styles.genderWrap}>
                        <div className={styles.genderTitle}>{'\u5148\u9009\u62e9\u4f60\u7684\u6027\u522b'}</div>
                        <p className={styles.genderSub}>
                            {'\u89e3\u9501\u4e13\u5c5e\u5267\u7cfb\u604b\u7231\u4eba\u8bbe'}
                        </p>
                        <div className={styles.genderCards}>
                            <div
                                className={`${styles.genderCard} ${selectedGenderCard === 'female' ? styles.genderCardSelected : ''}`}
                                onClick={() => selectGenderHandler('female')}
                                role="button"
                                tabIndex={0}
                            >
                                <div className={styles.gcIcon}>{'\ud83d\udc78'}</div>
                                <div className={styles.gcLabel}>{'\u5973\u751f'}</div>
                                <div className={styles.gcDesc}>{'\u89e3\u9501\u5973\u4e3b\u4eba\u8bbe'}</div>
                            </div>
                            <div
                                className={`${styles.genderCard} ${selectedGenderCard === 'male' ? styles.genderCardSelected : ''}`}
                                onClick={() => selectGenderHandler('male')}
                                role="button"
                                tabIndex={0}
                            >
                                <div className={styles.gcIcon}>{'\ud83e\udd34'}</div>
                                <div className={styles.gcLabel}>{'\u7537\u751f'}</div>
                                <div className={styles.gcDesc}>{'\u89e3\u9501\u7537\u4e3b\u4eba\u8bbe'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== QUIZ PAGE ===== */}
                <div
                    className={`${styles.section} ${styles.quizSection} ${pageView === 'quiz' ? styles.sectionActive : ''}`}
                >
                    <div className={styles.quizWrap}>
                        {/* 进度区 */}
                        <div className={styles.quizProgressArea}>
                            <div className={styles.progressLabel}>
                                {'剧情推进中\u00a0\u00a0'}
                                <span className={styles.progressCurrent}>{currentQ + 1}</span>
                                {` / ${TOTAL_QUESTIONS}`}
                            </div>
                            <div className={styles.heartsRow}>
                                {Array.from({length: TOTAL_QUESTIONS}, (_, i) => {
                                    const answered = answers[i] !== -1;
                                    return (
                                        <span
                                            key={i}
                                            className={`${styles.heartItem} ${answered ? styles.heartFilled : styles.heartEmpty}`}
                                        >
                                            {answered ? '\u2665' : '\u2661'}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 题干卡片 */}
                        <div className={styles.quizCard}>
                            <svg
                                className={styles.clipDeco}
                                viewBox="0 0 28 60"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M14,4 Q24,4 24,14 L24,46 Q24,56 14,56 Q4,56 4,46 L4,20 Q4,12 12,12 L20,12 L20,46 Q20,52 14,52 Q8,52 8,46 L8,18"
                                    stroke="#C8A882"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className={styles.questionTime}>{currentQuestion?.scene}</div>
                            <div className={styles.quizQuestion}>{currentQuestion?.q}</div>
                            <div className={styles.cardHeartDeco}>{'\u2661'}</div>
                        </div>

                        {/* 选项 */}
                        <div className={styles.quizOptions}>
                            {currentQuestion?.opts.map((opt, i) => (
                                <div
                                    key={`${currentQ}-${i}`}
                                    className={`${styles.quizOption} ${answers[currentQ] === i ? styles.quizOptionSelected : ''}`}
                                    onClick={() => selectOption(currentQ, i)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className={styles.optLabel}>{OPT_LABELS[i]}</div>
                                    <div className={styles.optText}>{opt}</div>
                                </div>
                            ))}
                        </div>

                        {/* 导航按钮 */}
                        <div className={styles.quizNav}>
                            {currentQ === 0 ? (
                                <button
                                    className={`${styles.quizNavBtn} ${styles.reSelectGenderBtn}`}
                                    onClick={() => setPageView('gender')}
                                >
                                    {'\u91cd\u9009\u6027\u522b'}
                                </button>
                            ) : (
                                <button className={`${styles.quizNavBtn} ${styles.prevBtn}`} onClick={goPrev}>
                                    {'\u4e0a\u4e00\u9898'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== LOADING PAGE ===== */}
                <div className={`${styles.section} ${pageView === 'loading' ? styles.sectionActive : ''}`}>
                    <div className={styles.loadingWrap}>
                        <div className={styles.loadingIcon}>{'\ud83d\udc96'}</div>
                        <div className={styles.loadingText}>
                            {'\u6b63\u5728\u89e3\u9501\u4f60\u7684\u5267\u7cfb\u604b\u7231\u4eba\u8bbe'}
                            <span className={styles.loadingDots} />
                        </div>
                        <div className={styles.loadingSub}>{'\u5927\u6570\u636e\u7cbe\u51c6\u5339\u914d\u4e2d...'}</div>
                    </div>
                </div>

                {/* ===== RESULT PAGE ===== */}
                <div
                    className={`${styles.section} ${styles.resultSection} ${pageView === 'result' ? styles.sectionActive : ''}`}
                    style={{background: 'rgba(234, 180, 179)'}}
                >
                    {resultChar && resultCharKey && (
                        <>
                            <div className={styles.resultImageArea}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={SHARE_IMGS[resultCharKey]?.src ?? ''}
                                    className={styles.resultShareImg}
                                    alt={resultChar.name}
                                />
                            </div>
                            <div className={styles.resultBottomBar}>
                                <button
                                    className={`${styles.resultBottomBtn} ${styles.resultBottomBtnRetake}`}
                                    onClick={retake}
                                >
                                    {'再测一次'}
                                </button>
                                <button
                                    className={`${styles.resultBottomBtn} ${styles.resultBottomBtnSave}`}
                                    onClick={saveImage}
                                >
                                    {'保存图片'}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Confetti */}
                {confettiPieces.map(p => (
                    <div
                        key={p.id}
                        className={styles.confettiPiece}
                        style={{
                            left: `${p.left}vw`,
                            background: p.color,
                            animationDuration: `${p.duration}s`,
                            animationDelay: `${p.delay}s`,
                            width: `${p.width}px`,
                            height: `${p.height}px`,
                            borderRadius: p.round ? '50%' : '2px'
                        }}
                    />
                ))}

                {/* Toast */}
                {toastMsg && <div className={styles.toast}>{toastMsg}</div>}

            </div>
        </>
    );
}

const DramaLoverTest = dynamic(() => Promise.resolve(DramaLoverTestContent), {ssr: false});

(DramaLoverTest as any).noLayout = true;
export default DramaLoverTest;
