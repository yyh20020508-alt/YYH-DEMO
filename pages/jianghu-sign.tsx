import {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import {useNewAppTheme} from '@/hooks/useNewAppTheme';
import {useNewAppLog} from '@/hooks/useNewAppLog';
import {NewAppTopBar} from '@/components/NewAppTopBar';
import {NewAppFooterButton} from '@/components/NewAppFooterButton';
import {NewAppBridge} from '@/lib/newapp-bridge';
import {isInNewApp} from '@/lib/newapp-env';
import styles from '@/styles/jianghu-sign.module.css';
import PAGE_DATA from '@/config/jianghu-sign-data.json';
import PROV_CITIES from '@/config/prov-cities.json';
import jianghuBgImg from '@/assets/images/jianghu-sign/bg.png';
import companionDingZhaoHui from '@/assets/images/jianghu-sign/companions/丁兆蕙.png';
import companionSiMing from '@/assets/images/jianghu-sign/companions/司命.png';
import companionZhanZhao from '@/assets/images/jianghu-sign/companions/展昭.png';
import companionZhangYueShi from '@/assets/images/jianghu-sign/companions/掌月使.png';
import companionMingZhuEr from '@/assets/images/jianghu-sign/companions/明柱儿.png';
import companionJingYiMing from '@/assets/images/jianghu-sign/companions/景逸鸣.png';
import companionZhiHua from '@/assets/images/jianghu-sign/companions/智化.png';
import companionBaiYuTang from '@/assets/images/jianghu-sign/companions/白玉堂.png';
import companionHuXiaoChen from '@/assets/images/jianghu-sign/companions/胡啸尘.png';
import companionShaoJiZu from '@/assets/images/jianghu-sign/companions/邵继祖.png';
import companionJinZhenPing from '@/assets/images/jianghu-sign/companions/金震平.png';
import companionHuoLingLong from '@/assets/images/jianghu-sign/companions/霍玲珑.png';

const COMPANION_IMGS: Record<string, {src: string}> = {
    '丁兆蕙': companionDingZhaoHui,
    '司命': companionSiMing,
    '展昭': companionZhanZhao,
    '掌月使': companionZhangYueShi,
    '明柱儿': companionMingZhuEr,
    '景逸鸣': companionJingYiMing,
    '智化': companionZhiHua,
    '白玉堂': companionBaiYuTang,
    '胡啸尘': companionHuXiaoChen,
    '邵继祖': companionShaoJiZu,
    '金震平': companionJinZhenPing,
    '霍玲珑': companionHuoLingLong
};

function debugShareLog(level: 'info' | 'error', message: string, extra?: unknown) {
    if (typeof window === 'undefined') {
        return;
    }
    const logger = (window as any).console?.[level];
    if (typeof logger === 'function') {
        logger('[jianghu-sign-share]', message, extra ?? '');
    }
}

async function compressShareImageForSave(dataUrl: string): Promise<string> {
    const img = new Image();
    img.decoding = 'async';
    const ready = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('share image decode failed'));
    });
    img.src = dataUrl;
    await ready;

    const maxWidth = 960;
    const ratio = Math.min(1, maxWidth / img.naturalWidth);
    const width = Math.max(1, Math.round(img.naturalWidth * ratio));
    const height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return dataUrl;
    }
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.88);
}

// ═══════════════════════ 八字计算（后台引擎，不暴露给用户）═══════════════════════

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEM_ELEMENT = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const CHONG_MAP: Record<string, string> = {
    子: '午',
    午: '子',
    丑: '未',
    未: '丑',
    寅: '申',
    申: '寅',
    卯: '酉',
    酉: '卯',
    辰: '戌',
    戌: '辰',
    巳: '亥',
    亥: '巳'
};

const HOUR_BRANCHES: {label: string; range: string; branch: string}[] = [
    {label: '子时', range: '23:00-01:00', branch: '子'},
    {label: '丑时', range: '01:00-03:00', branch: '丑'},
    {label: '寅时', range: '03:00-05:00', branch: '寅'},
    {label: '卯时', range: '05:00-07:00', branch: '卯'},
    {label: '辰时', range: '07:00-09:00', branch: '辰'},
    {label: '巳时', range: '09:00-11:00', branch: '巳'},
    {label: '午时', range: '11:00-13:00', branch: '午'},
    {label: '未时', range: '13:00-15:00', branch: '未'},
    {label: '申时', range: '15:00-17:00', branch: '申'},
    {label: '酉时', range: '17:00-19:00', branch: '酉'},
    {label: '戌时', range: '19:00-21:00', branch: '戌'},
    {label: '亥时', range: '21:00-23:00', branch: '亥'}
];

function getDayStemBranch(year: number, month: number, day: number) {
    const base = new Date(2000, 0, 7);
    const diff = Math.round((new Date(year, month - 1, day).getTime() - base.getTime()) / 86400000);
    return {
        stemIdx: ((diff % 10) + 10) % 10,
        branchIdx: ((diff % 12) + 12) % 12
    };
}

function getMonthBranchIndex(month: number, day: number): number {
    const thresholds: [number, number, number][] = [
        [1, 6, 1],
        [2, 4, 2],
        [3, 6, 3],
        [4, 5, 4],
        [5, 6, 5],
        [6, 6, 6],
        [7, 7, 7],
        [8, 8, 8],
        [9, 8, 9],
        [10, 8, 10],
        [11, 7, 11],
        [12, 7, 0]
    ];
    let bi = 1;
    for (const [m, d, b] of thresholds) {
        if (month > m || (month === m && day >= d)) {
            bi = b;
        }
    }
    return bi;
}

function seededRandom(seed: number): number {
    const x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
}
function pickRand<T>(arr: T[], seed: number): T {
    return arr[Math.floor(seededRandom(seed) * arr.length)];
}

// ═══════════════════════ 分享图生成（html2canvas + DOM，字体走 CSS 渲染） ═══════════════════════

async function buildShareCanvas(fortune: FortuneResult, todayLabel: string): Promise<string> {
    const h2c = (await import('html2canvas')).default;
    const W = 686;
    const FONT = "'Ma Shan Zheng','STKaiti','Kaiti SC','KaiTi','STSong','Songti SC','SimSun',serif";

    // 预加载图片为 dataURL（解决 iPad WebView 离屏元素图片加载挂死问题）
    const toDataUrl = (url: string) =>
        fetch(url)
            .then(r => r.blob())
            .then(
                blob =>
                    new Promise<string>(resolve => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => resolve('');
                        reader.readAsDataURL(blob);
                    })
            )
            .catch(() => '');

    const [companionImgUrl, bgImgUrl] = await Promise.all([
        toDataUrl(COMPANION_IMGS[fortune.companion.name]?.src ?? ''),
        toDataUrl(jianghuBgImg.src)
    ]);

    const rawTip = fortune.renwu.split('——')[0].trim();
    const PUNCT_END = new Set('。！？…"』】》');
    const tipText = PUNCT_END.has(rawTip.slice(-1)) ? rawTip : rawTip + '。';
    const qianwenLines = fortune.qianwen.split('\n').slice(0, 2);

    // 等级菱形 HTML
    const diamonds = Array.from(
        {length: 5},
        (_, i) => `<span style="color:${i < fortune.overallLevel ? fortune.levelColor : 'rgba(30,30,40,.14)'}">◆</span>`
    ).join('');

    const el = document.createElement('div');
    el.style.cssText = `
        position:fixed; left:-9999px; top:0;
        width:${W}px; box-sizing:border-box;
        font-family:${FONT};
        background-image:url('${bgImgUrl || '/jianghu-sign-bg.png'}');
        background-size:cover; background-position:center;
    `;
    el.innerHTML = `
      <div style="
        min-height:100%;
        background:linear-gradient(to bottom,rgba(248,244,238,.32),rgba(240,234,224,.52));
        padding:30px 24px 30px;
        box-sizing:border-box;
      ">
        <div style="
          background:rgba(255,252,248,.86);
          border:1.5px solid rgba(139,26,26,.18);
          border-radius:4px;
          padding:44px 56px 40px;
          position:relative;
        ">
          <!-- 左右装饰竖线 -->
          <div style="position:absolute;left:12px;top:16px;bottom:16px;width:1px;background:rgba(139,26,26,.10)"></div>
          <div style="position:absolute;right:12px;top:16px;bottom:16px;width:1px;background:rgba(139,26,26,.10)"></div>

          <!-- 顶部装饰 -->
          <div style="text-align:center;color:#8B1A1A;font-size:18px;margin-bottom:10px">✦ 雨霖铃 · 江湖命签 ✦</div>
          <!-- 主标题 -->
          <div style="text-align:center;font-size:52px;font-weight:bold;color:#1c1c2c;line-height:1.1;margin-bottom:10px">今日江湖签</div>
          <!-- 日期 -->
          <div style="text-align:center;font-size:20px;color:#5a5a6a;margin-bottom:22px">${todayLabel}</div>

          <!-- 分隔线 -->
          <div style="border-top:1px solid rgba(139,26,26,.12);margin-bottom:18px"></div>

          <!-- 签运：标签 + 大字 + 菱形 同行 -->
          <div style="display:flex;align-items:center;margin-bottom:20px">
            <span style="font-size:20px;font-weight:bold;color:#8B1A1A;flex-shrink:0;margin-right:18px">签运</span>
            <span style="font-size:34px;font-weight:bold;color:${fortune.levelColor};line-height:1;flex:1;margin-right:8px">${fortune.levelLabel}</span>
            <span style="font-size:18px;letter-spacing:3px;flex-shrink:0">${diamonds}</span>
          </div>

          <!-- 分隔线 -->
          <div style="border-top:1px solid rgba(139,26,26,.12);margin-bottom:18px"></div>

          <!-- 今日同行人 -->
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
            <div style="flex:1">
              <div style="font-size:20px;font-weight:bold;color:#8B1A1A;margin-bottom:4px">今日同行人</div>
              <div style="font-size:30px;font-weight:bold;color:#1c1c2c;margin-bottom:6px">
                ${fortune.companion.name}
                <span style="font-size:18px;color:#8B1A1A;font-weight:normal"> · ${fortune.companion.type}</span>
              </div>
              <div style="font-size:20px;color:#4a4a5a;line-height:1.6">${fortune.companion.desc}</div>
            </div>
            <img src="${companionImgUrl}" style="width:110px;object-fit:contain;flex-shrink:0">
          </div>

          <!-- 分隔线 -->
          <div style="border-top:1px solid rgba(139,26,26,.12);margin-bottom:18px"></div>

          <!-- 今日提示 -->
          <div style="font-size:20px;font-weight:bold;color:#8B1A1A;margin-bottom:8px">今日提示</div>
          <div style="font-size:24px;color:#2a2a3a;line-height:1.7;margin-bottom:20px;word-break:break-all">${tipText}</div>

          <!-- 分隔线 -->
          <div style="border-top:1px solid rgba(139,26,26,.12);margin-bottom:18px"></div>

          <!-- 今日签文 -->
          <div style="font-size:20px;font-weight:bold;color:#8B1A1A;margin-bottom:8px">今日签文</div>
          <div style="font-size:26px;color:#1c1c2c;line-height:1.8">${qianwenLines.join('<br/>')}</div>

          <!-- 页脚 -->
          <div style="text-align:center;font-size:15px;color:rgba(139,26,26,.38);margin-top:28px">⊙ 每日江湖签 · 雨霖铃</div>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    try {
        const canvas = await Promise.race([
            h2c(el, {
                useCORS: true,
                allowTaint: true,
                scale: window.devicePixelRatio || 2,
                width: W,
                logging: false,
                imageTimeout: 8000
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        ]);
        return canvas.toDataURL('image/png');
    } finally {
        document.body.removeChild(el);
    }
}

// ═══════════════════════ 打卡系统 ═══════════════════════

const CHECKIN_KEY = 'jianghu_sign_checkin';

interface CheckinData {
    lastDate: string;
    streak: number;
    totalDays: number;
}

function getCheckinData(): CheckinData {
    if (typeof window === 'undefined') {
        return {lastDate: '', streak: 0, totalDays: 0};
    }
    try {
        const raw = localStorage.getItem(CHECKIN_KEY);
        return raw ? JSON.parse(raw) : {lastDate: '', streak: 0, totalDays: 0};
    } catch {
        return {lastDate: '', streak: 0, totalDays: 0};
    }
}

function recordCheckin(): CheckinData {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const data = getCheckinData();
    if (data.lastDate === today) {
        return data;
    }
    const streak = data.lastDate === yesterday ? data.streak + 1 : 1;
    const totalDays = (data.totalDays || 0) + 1;
    const next = {lastDate: today, streak, totalDays};
    try {
        localStorage.setItem(CHECKIN_KEY, JSON.stringify(next));
    } catch {}
    return next;
}

function getBadge(streak: number): {name: string; icon: string; desc: string} | null {
    const milestones = [10, 7, 5, 3];
    for (const m of milestones) {
        if (streak >= m) {
            return (PAGE_DATA.checkin_badges as any)[String(m)];
        }
    }
    return null;
}

// ═══════════════════════ 签文生成 ═══════════════════════

interface FortuneResult {
    overallLevel: number;
    levelLabel: string;
    levelColor: string;
    levelJianghu: string;
    levelReal: string;
    jushiAtmos: string;
    jushiJianghu: string;
    jushiReal: string;
    yi: {label: string; tip: string}[];
    ji: {label: string; tip: string}[];
    xingwu: {name: string; jianghu: string; realTip: string};
    xiansuo: {clue: string; tip: string};
    pojue: string;
    renwu: string;
    qianwen: string;
    companion: {name: string; type: string; desc: string; tags: string[]};
    color: {name: string; hex: string; jianghu: string};
    direction: {dir: string; jianghu: string};
    luckyNumbers: number[];
    chongBranch: string;
    isChongYear: boolean;
    todayGanzhi: string;
    mingZhu: string; // 命主：日主天干+五行，如"丙火"
    checkin: CheckinData;
}

function generateFortune(birthYear: number, birthMonth: number, birthDay: number, hourBranch: string): FortuneResult {
    const now = new Date();
    const todayDay = getDayStemBranch(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const monthBranchIdx = getMonthBranchIndex(now.getMonth() + 1, now.getDate());
    const jianxingIdx = (todayDay.branchIdx - monthBranchIdx + 12) % 12;

    const todaySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const personSeed = birthYear * 10000 + birthMonth * 100 + birthDay + BRANCHES.indexOf(hourBranch);
    const seed = todaySeed + personSeed;

    const masterStemIdx = getDayStemBranch(birthYear, birthMonth, birthDay).stemIdx;
    const masterElement = STEM_ELEMENT[masterStemIdx];
    const todayElement = STEM_ELEMENT[todayDay.stemIdx];
    const todayBranch = BRANCHES[todayDay.branchIdx];

    // 十二建星决定基础运势等级，叠加个人偏差
    const jxBaseLevel = [4, 3, 4, 3, 4, 3, 1, 2, 5, 3, 4, 2][jianxingIdx];
    const overallLevel = Math.max(1, Math.min(5, jxBaseLevel + Math.round(seededRandom(seed + 99) * 2) - 1));

    const levelData = (PAGE_DATA.juqi_levels as any)[String(overallLevel)] as {
        label: string;
        color: string;
        jianghu: string;
        real: string;
    };
    const jushiData = (PAGE_DATA.jushi_by_jianxing as any)[String(jianxingIdx)] as {
        atmos: string;
        jianghu: string;
        real: string;
    };

    // 宜（按十二建星取专属池，再按个人生辰选2条）
    const yiPool = (PAGE_DATA.yi_by_jianxing as {label: string; tip: string}[][])[jianxingIdx];
    const yi1 = pickRand(yiPool, personSeed);
    let yi2 = pickRand(yiPool, personSeed + 11);
    if (yi2 === yi1) {
        yi2 = yiPool[(yiPool.indexOf(yi1) + 1) % yiPool.length];
    }

    // 忌（按十二建星取专属池，再按个人生辰选2条）
    const jiPool = (PAGE_DATA.ji_by_jianxing as {label: string; tip: string}[][])[jianxingIdx];
    const ji1 = pickRand(jiPool, personSeed + 2);
    let ji2 = pickRand(jiPool, personSeed + 13);
    if (ji2 === ji1) {
        ji2 = jiPool[(jiPool.indexOf(ji1) + 1) % jiPool.length];
    }

    // 信物（按命主五行，当天建星决定取哪一件）
    const xingwuPool = (PAGE_DATA.xingwu_by_element as any)[masterElement] as {
        name: string;
        jianghu: string;
        realTip: string;
    }[];
    const xingwu = xingwuPool[jianxingIdx % xingwuPool.length];

    // 线索（今日建星偏移命主天干，生辰+黄历双合）
    const xiansuoIdx = (jianxingIdx + masterStemIdx) % 12;
    const xiansuo = (PAGE_DATA.xiansuo_by_jianxing as {clue: string; tip: string}[])[xiansuoIdx];

    // 破局提示（同上，错位偏移避免与线索同条）
    const pojue = (PAGE_DATA.pojue_by_jianxing as string[])[(jianxingIdx + masterStemIdx + 3) % 12];

    // 今日小任务（同上）
    const renwu = (PAGE_DATA.renwu_by_jianxing as string[])[(jianxingIdx + masterStemIdx + 6) % 12];

    // 签文（同上）
    const qianwenBase = PAGE_DATA.qianwen_by_jianxing[(jianxingIdx + masterStemIdx + 9) % 12];
    const qianwen = qianwenBase;

    // 今日同行（建星×命主五行双维度，无随机）
    const ELEMENTS_ORDER = ['木', '火', '土', '金', '水'];
    const elementIdx = ELEMENTS_ORDER.indexOf(masterElement);
    const companionName = (PAGE_DATA.companion_matrix as string[][])[jianxingIdx][elementIdx];
    const companion = {
        name: companionName,
        ...((PAGE_DATA.companion_data as any)[companionName] as {type: string; desc: string; tags: string[]})
    };

    // 随身色（命主五行）
    const colorPool = (PAGE_DATA.colors_by_element as any)[masterElement] as any[];
    const color = pickRand(colorPool, seed + 8) as {name: string; hex: string; jianghu: string};

    // 方位（命主五行）
    const direction = (PAGE_DATA.directions_by_element as any)[masterElement] as {dir: string; jianghu: string};

    // 幸运数字
    const luckyNumbers = (PAGE_DATA.lucky_numbers as any)[masterElement] as number[];

    // 六冲：只有用户出生年支与今日冲支相同时才警告
    const chongBranch = CHONG_MAP[todayBranch] ?? '';
    const birthYearBranchIdx = (((birthYear - 1900) % 12) + 12) % 12;
    const isChongYear = chongBranch !== '' && BRANCHES[birthYearBranchIdx] === chongBranch;

    // 打卡
    const checkin = recordCheckin();

    return {
        overallLevel,
        levelLabel: levelData.label,
        levelColor: levelData.color,
        levelJianghu: levelData.jianghu,
        levelReal: levelData.real,
        jushiAtmos: jushiData.atmos,
        jushiJianghu: jushiData.jianghu,
        jushiReal: jushiData.real,
        yi: [yi1, yi2],
        ji: [ji1, ji2],
        xingwu,
        xiansuo,
        pojue,
        renwu,
        qianwen,
        companion,
        color,
        direction,
        luckyNumbers,
        chongBranch,
        isChongYear,
        todayGanzhi: `${STEMS[todayDay.stemIdx]}${BRANCHES[todayDay.branchIdx]}`,
        mingZhu: `${STEMS[masterStemIdx]}${STEM_ELEMENT[masterStemIdx]}`,
        checkin
    };
}

// ═══════════════════════ 今日日期 ═══════════════════════

function getTodayLabel(): string {
    const now = new Date();
    const {stemIdx, branchIdx} = getDayStemBranch(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return `${STEMS[stemIdx]}${BRANCHES[branchIdx]}日 · ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

// ═══════════════════════ 子组件 ═══════════════════════

function SignCard({title, hint, children}: {title: string; hint?: string; children: React.ReactNode}) {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <span className={styles.cardDiamond}>◈</span>
                <span className={styles.cardTitle}>{title}</span>
                {hint && <span className={styles.cardHint}>{hint}</span>}
            </div>
            <div className={styles.cardBody}>{children}</div>
        </div>
    );
}

// ═══════════════════════ 主组件 ═══════════════════════

interface FormData {
    year: string;
    month: string;
    day: string;
    hourBranch: string;
    province: string;
    city: string;
    gender: string;
}

function JianghuSignContent() {
    const {isDark} = useNewAppTheme();
    const {log} = useNewAppLog({pageName: 'jianghu_sign'});
    const [step, setStep] = useState<'form' | 'result'>('form');
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showToast = useCallback((msg: string) => {
        setToastMsg(msg);
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => setToastMsg(null), 2000);
    }, []);
    const [form, setForm] = useState<FormData>({
        year: '',
        month: '',
        day: '',
        hourBranch: '午',
        province: '',
        city: '',
        gender: 'male'
    });
    const [fortune, setFortune] = useState<FortuneResult | null>(null);
    const [animating, setAnimating] = useState(false);
    const [shareImg, setShareImg] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const todayLabel = useMemo(() => getTodayLabel(), []);

    const cities = useMemo(() => {
        if (!form.province) {
            return [];
        }
        const found = (PROV_CITIES as [string, [string, number][]][]).find(x => x[0] === form.province);
        return found ? found[1] : [];
    }, [form.province]);

    const handleChange = useCallback((field: keyof FormData, value: string) => {
        setForm(prev => {
            const next = {...prev, [field]: value};
            if (field === 'province') {
                next.city = '';
            }
            return next;
        });
    }, []);

    const isFormValid = useMemo(() => {
        const y = parseInt(form.year, 10),
            m = parseInt(form.month, 10),
            d = parseInt(form.day, 10);
        return (
            y >= 1900 && y <= 2030 && m >= 1 && m <= 12 && d >= 1 && d <= 31 && form.province !== '' && form.city !== ''
        );
    }, [form]);

    const handleSubmit = useCallback(() => {
        if (!isFormValid) {
            return;
        }
        log('click', 'jianghu_sign', {action_type: 'form_submit'});
        setAnimating(true);
        setTimeout(() => {
            const y = parseInt(form.year, 10),
                m = parseInt(form.month, 10),
                d = parseInt(form.day, 10);
            setFortune(generateFortune(y, m, d, form.hourBranch));
            setStep('result');
            setAnimating(false);
        }, 1800);
    }, [form, isFormValid, log]);

    const handleReset = useCallback(() => {
        setStep('form');
        setFortune(null);
        setShareImg(null);
    }, []);

    const handleShare = useCallback(async () => {
        if (generating || !fortune) {
            return;
        }
        setGenerating(true);
        log('click', 'jianghu_sign', {action_type: 'generate_image_start'});
        const startedAt = Date.now();
        debugShareLog('info', 'generate start', {isInNewApp});
        try {
            const dataUrl = await buildShareCanvas(fortune, todayLabel);
            if (dataUrl) {
                setShareImg(dataUrl);
                log('click', 'jianghu_sign', {action_type: 'generate_image_success'});
                debugShareLog('info', 'generate success', {
                    duration: Date.now() - startedAt,
                    dataUrlLength: dataUrl.length
                });
            } else {
                log('click', 'jianghu_sign', {action_type: 'generate_image_empty'});
                debugShareLog('error', 'generate empty');
                alert('生成失败，请重试');
            }
        } catch (e) {
            log('click', 'jianghu_sign', {action_type: 'generate_image_fail'});
            debugShareLog('error', 'generate fail', e);
            alert('生成失败，请重试');
        } finally {
            setGenerating(false);
            debugShareLog('info', 'generate finish', {duration: Date.now() - startedAt});
        }
    }, [generating, fortune, todayLabel, log]);

    const handleSaveShareImage = useCallback(async () => {
        if (!shareImg) {
            debugShareLog('info', 'save skip: no generated image');
            return;
        }
        const startedAt = Date.now();
        const saveImageSupported = NewAppBridge.env.canIUse('newapp.newsystem.saveImage');
        const watchdog = window.setTimeout(() => {
            log('click', 'jianghu_sign', {action_type: 'save_generated_image_pending'});
            debugShareLog('error', 'save pending: no callback after 8000ms', {
                duration: Date.now() - startedAt,
                isInNewApp,
                isAndroid: NewAppBridge.env.isAndroid,
                isIos: NewAppBridge.env.isIos,
                saveImageSupported,
                dataUrlLength: shareImg.length,
                userAgent: window.navigator.userAgent
            });
            showToast('保存超时，请重试或长按图片保存');
        }, 8000);
        log('click', 'jianghu_sign', {action_type: 'save_generated_image_click'});
        debugShareLog('info', 'save click', {
            isInNewApp,
            isAndroid: NewAppBridge.env.isAndroid,
            isIos: NewAppBridge.env.isIos,
            saveImageSupported,
            dataUrlLength: shareImg.length,
            dataUrlHead: shareImg.slice(0, 32),
            userAgent: window.navigator.userAgent
        });
        try {
            const saveUrl = isInNewApp ? await compressShareImageForSave(shareImg) : shareImg;
            debugShareLog('info', 'save image prepared', {
                originalLength: shareImg.length,
                saveUrlLength: saveUrl.length,
                saveUrlHead: saveUrl.slice(0, 32),
                compressed: saveUrl !== shareImg
            });
            debugShareLog('info', 'save call saveImage start');
            NewAppBridge.image
                .save(saveUrl)
                .then(() => {
                    window.clearTimeout(watchdog);
                    log('click', 'jianghu_sign', {action_type: 'save_generated_image_success'});
                    debugShareLog('info', 'save success', {duration: Date.now() - startedAt});
                })
                .catch(err => {
                    window.clearTimeout(watchdog);
                    log('click', 'jianghu_sign', {action_type: 'save_generated_image_fail'});
                    debugShareLog('error', 'save fail', {
                        duration: Date.now() - startedAt,
                        err
                    });
                    showToast('保存失败，请重试');
                });
        } catch (err) {
            window.clearTimeout(watchdog);
            log('click', 'jianghu_sign', {action_type: 'save_generated_image_prepare_fail'});
            debugShareLog('error', 'save prepare fail', err);
            showToast('保存失败，请长按图片保存');
        }
    }, [shareImg, showToast, log]);

    return (
        <>
            <Head>
                <title>每日江湖签</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
                />
            </Head>
            <div className={`${styles.container} ${isDark ? styles.dark : ''}`}>
                <div className={styles.bgLayer}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={jianghuBgImg.src} alt="" className={styles.bgImg} />
                </div>
                <div className={styles.content}>
                    {/* 页头 */}
                    <div className={`${styles.header} ${step === 'result' ? styles.headerCompact : ''}`}>
                        <div className={styles.headerDecor}>—— 雨霖铃 · 江湖命签 ——</div>
                        {step === 'form' && (
                            <>
                                <h1 className={styles.title}>每日江湖签</h1>
                                <div className={styles.todayLabel}>{todayLabel}</div>
                            </>
                        )}
                    </div>

                    {/* 输入表单 */}
                    {step === 'form' && (
                        <div
                            className={`${styles.formCard} ${animating ? styles.formShake : ''}`}
                            onTouchStart={() => {
                                const el = document.querySelector('input[type="date"]') as HTMLInputElement | null;
                                el?.blur();
                            }}
                        >
                            <div className={styles.formScrollTop}>
                                <span className={styles.scrollDecor}>✦ 测签问道 ✦</span>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.fieldLabel}>出生日期</label>
                                <div style={{position: 'relative', zIndex: 1}}>
                                    <input
                                        className={styles.input}
                                        type="date"
                                        min="1900-01-01"
                                        max={(() => {
                                            const t = new Date();
                                            return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                                        })()}
                                        onChange={e => {
                                            const v = e.target.value;
                                            if (v) {
                                                const t = new Date();
                                                const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                                                // iOS 不遵守 max 属性，需手动拦截未来日期
                                                // 同时强制重置 input 的显示值，否则 input 仍会显示未来日期
                                                const clamped = v > todayStr ? todayStr : v;
                                                if (clamped !== v) {
                                                    e.target.value = clamped;
                                                }
                                                const [y, m, d] = clamped.split('-');
                                                setForm(prev => ({
                                                    ...prev,
                                                    year: y,
                                                    month: String(parseInt(m, 10)),
                                                    day: String(parseInt(d, 10))
                                                }));
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '12px 10px',
                                            height: '44px',
                                            textAlign: 'center',
                                            color: form.year && form.month && form.day ? undefined : 'transparent'
                                        }}
                                    />
                                    {/* date input 不支持 placeholder，用 overlay 实现 */}
                                    {!(form.year && form.month && form.day) && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                left: '50%',
                                                top: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                color: 'rgba(30,30,40,.3)',
                                                fontSize: 13,
                                                pointerEvents: 'none',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            选择出生日期
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.fieldLabel}>出生时辰</label>
                                <div className={styles.hourGrid}>
                                    {HOUR_BRANCHES.map(h => (
                                        <button
                                            key={h.branch}
                                            className={`${styles.hourBtn} ${form.hourBranch === h.branch ? styles.hourBtnActive : ''}`}
                                            onClick={() => handleChange('hourBranch', h.branch)}
                                        >
                                            <span className={styles.hourLabel}>{h.label}</span>
                                            <span className={styles.hourRange}>{h.range}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.fieldLabel}>出生地</label>
                                <div className={styles.cityRow}>
                                    <select
                                        className={styles.select}
                                        value={form.province}
                                        onTouchStart={() => {
                                            const el = document.querySelector(
                                                'input[type="date"]'
                                            ) as HTMLInputElement | null;
                                            el?.blur();
                                        }}
                                        onMouseDown={() => {
                                            const el = document.querySelector(
                                                'input[type="date"]'
                                            ) as HTMLInputElement | null;
                                            el?.blur();
                                        }}
                                        onChange={e => handleChange('province', e.target.value)}
                                    >
                                        <option value="">选择省份</option>
                                        {(PROV_CITIES as [string, [string, number][]][]).map(([p]) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={{position: 'relative', flex: 1}}>
                                        <select
                                            className={`${styles.select} ${!form.province ? styles.selectDisabled : ''}`}
                                            style={{width: '100%'}}
                                            value={form.city}
                                            onTouchStart={() => {
                                                const el = document.querySelector(
                                                    'input[type="date"]'
                                                ) as HTMLInputElement | null;
                                                el?.blur();
                                            }}
                                            onMouseDown={() => {
                                                const el = document.querySelector(
                                                    'input[type="date"]'
                                                ) as HTMLInputElement | null;
                                                el?.blur();
                                            }}
                                            onChange={e => handleChange('city', e.target.value)}
                                            disabled={!form.province}
                                        >
                                            <option value="">选择城市</option>
                                            {cities.map(([c]) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                        {/* 覆盖层：province 未选时拦截触摸并弹出 toast，disabled 的 select 在 iOS 上不触发 touch 事件 */}
                                        {!form.province && (
                                            <div
                                                style={{position: 'absolute', inset: 0, zIndex: 1}}
                                                onTouchStart={() => showToast('请先选择省份')}
                                                onMouseDown={() => showToast('请先选择省份')}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.fieldLabel}>性别</label>
                                <div className={styles.genderRow}>
                                    {(['male', 'female'] as const).map(g => (
                                        <button
                                            key={g}
                                            className={`${styles.genderBtn} ${form.gender === g ? styles.genderBtnActive : ''}`}
                                            onClick={() => handleChange('gender', g)}
                                        >
                                            {g === 'male' ? '⚔ 男侠' : '✿ 女侠'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className={`${styles.submitBtn} ${!isFormValid ? styles.disabled : ''} ${animating ? styles.loading : ''}`}
                                onClick={handleSubmit}
                                disabled={!isFormValid || animating}
                            >
                                {animating ? (
                                    <span className={styles.loadingText}>
                                        <span className={styles.dot}>·</span>推算入局状态中
                                        <span className={styles.dot}>·</span>
                                    </span>
                                ) : (
                                    '入局，求取今日签'
                                )}
                            </button>
                        </div>
                    )}

                    {/* 结果 */}
                    {step === 'result' && fortune && (
                        <div className={styles.resultWrapper}>
                            {/* 截图区域 */}
                            <div className={styles.signTop}>
                                <div className={styles.signTitle}>今日江湖签</div>
                                <div className={styles.signSub}>
                                    {form.gender === 'male' ? '男侠' : '女侠'} · {form.city} · {fortune.mingZhu}命
                                </div>
                                <div className={styles.todayLabel}>{todayLabel}</div>
                            </div>

                            {/* 第零块：今日同行人 */}
                            <SignCard title="今日同行人">
                                <div className={styles.companionRow}>
                                    <div className={styles.companionTextCol}>
                                        <div className={styles.companionName}>
                                            {fortune.companion.name}
                                            <span className={styles.companionType}>· {fortune.companion.type}</span>
                                        </div>
                                        <div className={styles.companionDesc}>{fortune.companion.desc}</div>
                                        <div className={styles.companionTags}>
                                            {fortune.companion.tags
                                                .filter(t => t.startsWith('特质') || t.startsWith('助力'))
                                                .map((tag, i) => (
                                                    <span key={i} className={styles.companionTag}>
                                                        {tag}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                    <img
                                        src={COMPANION_IMGS[fortune.companion.name]?.src ?? ''}
                                        alt={fortune.companion.name}
                                        className={styles.companionImg}
                                    />
                                </div>
                            </SignCard>

                            {/* 第一块：今日入局 */}
                            <SignCard title="今日入局">
                                <div className={styles.rujiuTop}>
                                    <span className={styles.rujiuLevel} style={{color: fortune.levelColor}}>
                                        签运：{fortune.levelLabel}
                                    </span>
                                    <div className={styles.rujiuDots}>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <span
                                                key={i}
                                                className={
                                                    i <= fortune.overallLevel ? styles.dotActive : styles.dotInactive
                                                }
                                                style={i <= fortune.overallLevel ? {color: fortune.levelColor} : {}}
                                            >
                                                ◆
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.rujiuDesc}>
                                    {fortune.jushiAtmos}，{fortune.levelJianghu}
                                </div>
                                <div className={styles.rujiuYiJi}>
                                    <div className={styles.rujiuYiSection}>
                                        <span className={styles.rujiuBadgeYi}>宜</span>
                                        {fortune.yi.map((t, i) => (
                                            <div key={i} className={styles.rujiuItem}>
                                                <div className={styles.rujiuItemLabel}>· {t.label}</div>
                                                <div className={styles.rujiuItemTip}>{t.tip}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.dividerV} />
                                    <div className={styles.rujiuJiSection}>
                                        <span className={styles.rujiuBadgeJi}>忌</span>
                                        {fortune.ji.map((t, i) => (
                                            <div key={i} className={styles.rujiuItem}>
                                                <div className={styles.rujiuItemLabel}>· {t.label}</div>
                                                <div className={styles.rujiuItemTip}>{t.tip}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {fortune.isChongYear && (
                                    <div className={styles.rujiuReminder}>
                                        <span className={styles.reminderIcon}>提醒</span>
                                        {`今日${fortune.todayGanzhi[1]}冲${fortune.chongBranch}，${fortune.chongBranch}年生人宜低调行事。`}
                                    </div>
                                )}
                            </SignCard>

                            {/* 第二块：今日信物 */}
                            <SignCard title="今日信物">
                                <div className={styles.xingwuName}>
                                    <span className={styles.xingwuIcon}>⊕</span>
                                    {fortune.xingwu.name}
                                </div>
                                <div className={styles.xingwuDesc}>{fortune.xingwu.jianghu}</div>
                                <div className={styles.xingwuReal}>
                                    <span className={styles.realIcon}>◉</span>
                                    {fortune.xingwu.realTip}
                                </div>
                                <div className={styles.xinwuAuxRow}>
                                    <div className={styles.auxItem}>
                                        <span className={styles.auxKey}>随身色</span>
                                        <div className={styles.auxColorVal}>
                                            <span
                                                className={styles.colorDot}
                                                style={{backgroundColor: fortune.color.hex}}
                                            />
                                            <span className={styles.auxVal}>{fortune.color.name}</span>
                                        </div>
                                    </div>
                                    <div className={styles.auxDivider} />
                                    <div className={styles.auxItem}>
                                        <span className={styles.auxKey}>行路方位</span>
                                        <span className={styles.auxVal}>{fortune.direction.dir}</span>
                                    </div>
                                    <div className={styles.auxDivider} />
                                    <div className={styles.auxItem}>
                                        <span className={styles.auxKey}>暗号数字</span>
                                        <span className={styles.auxVal}>{fortune.luckyNumbers.join('·')}</span>
                                    </div>
                                </div>
                            </SignCard>

                            {/* 第三块：今日行动指引 */}
                            <SignCard title="今日行动指引">
                                <div className={styles.actionBlock}>
                                    <div className={styles.actionLabel}>今日线索</div>
                                    <div className={styles.actionTitle}>{fortune.xiansuo.clue}</div>
                                    <div className={styles.actionTip}>{fortune.xiansuo.tip}</div>
                                </div>
                                <div className={styles.actionDivider} />
                                <div className={styles.actionBlock}>
                                    <div className={styles.actionLabel}>破局提示</div>
                                    <div className={styles.actionTitle}>{fortune.pojue}</div>
                                </div>
                                <div className={styles.actionDivider} />
                                <div className={styles.actionBlock}>
                                    <div className={styles.actionLabel}>今日小任务</div>
                                    <div className={styles.actionTitle}>{fortune.renwu}</div>
                                </div>
                            </SignCard>

                            {/* 第四块：今日签文 */}
                            <SignCard title="今日签文">
                                <div className={styles.qianwenText}>
                                    {fortune.qianwen.split('\n').map((line, i) => (
                                        <div key={i} className={i === 0 ? styles.qianwenLine1 : styles.qianwenLine}>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            </SignCard>

                            <div className={styles.resultFooter}>
                                <div className={styles.footerQuote}>✦ 江湖路漫漫，侠义系心间 ✦</div>
                                <div className={styles.footerBtns}>
                                    <button
                                        className={`${styles.shareBtn} ${generating ? styles.shareBtnLoading : ''}`}
                                        onClick={handleShare}
                                        disabled={generating}
                                    >
                                        {generating ? '生成中…' : '生成分享图片'}
                                    </button>
                                    <button className={styles.retryBtn} onClick={handleReset}>
                                        重新测签
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {shareImg && (
                    <div className={styles.shareModal} onClick={() => setShareImg(null)}>
                        <div className={styles.shareModalInner} onClick={e => e.stopPropagation()}>
                            <p className={styles.shareHint}>
                                {isInNewApp ? '图片已生成，可保存到相册' : '长按图片保存到相册'}
                            </p>
                            <img src={shareImg} alt="分享图" className={styles.shareImage} />
                            {isInNewApp && (
                                <button
                                    className={`${styles.shareClose} ${styles.shareSave}`}
                                    onPointerDown={() => debugShareLog('info', 'save button pointerdown')}
                                    onTouchStart={() => debugShareLog('info', 'save button touchstart')}
                                    onClick={handleSaveShareImage}
                                >
                                    保存图片
                                </button>
                            )}
                            <button className={styles.shareClose} onClick={() => setShareImg(null)}>
                                关闭
                            </button>
                        </div>
                    </div>
                )}
                {toastMsg && <div className={styles.toast}>{toastMsg}</div>}
            </div>
        </>
    );
}

const JianghuSign = dynamic(() => Promise.resolve(JianghuSignContent), {ssr: false});
(JianghuSign as any).noLayout = true;
export default JianghuSign;
