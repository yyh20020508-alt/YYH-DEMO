import dynamic from 'next/dynamic';
import {useState, useRef, useCallback, useEffect, useMemo} from 'react';
import Head from 'next/head';
import {useNewAppTheme} from '@/hooks/useNewAppTheme';
import {useNewAppLog} from '@/hooks/useNewAppLog';
import {NewAppTopBar} from '@/components/NewAppTopBar';
import {NewAppFooterButton} from '@/components/NewAppFooterButton';
import {NewAppBridge} from '@/lib/newapp-bridge';
import styles from '@/styles/destiny-chart.module.css';
import DATA from '@/config/destiny-chart-data.json';
import {
    PROV_CITIES,
    STEMS,
    BRANCHES,
    S_EL,
    B_EL,
    EL,
    EC,
    EA,
    GEN_MAP,
    CTRL_MAP,
    HIDDEN_STEMS,
    clamp,
    sd,
    getPillars,
    getProfile,
    getElSum,
    getDM,
    getDaYun,
    getNarr,
    buildLine,
    buildMainKline,
    analyzeTL,
    buildDimScores,
    buildMonthWealth,
    buildMonthLove,
    buildMonthCareer,
    getRadarData,
    stgL,
    stgT,
    bandL,
    bandLA,
    generate,
    getBaziYear,
    getMonthStem,
    type ReadingData,
    type LinePt,
    type KlinePt,
    type DimScores
} from '@/lib/destiny-chart-utils';

/* helper: DimScores → indexable */
function ds(scores: DimScores): Record<string, number> {
    return scores as unknown as Record<string, number>;
}

/* ══════ Chart config ══════ */
const DEFAULT_GAP = 11;
const MIN_GAP = 6;
const MAX_GAP = 18;
const CH = 280;
const PAD = {top: 30, right: 18, bottom: 34, left: 34};

const DIMS = DATA.dims as {key: string; label: string; color: [string, string]; track: string}[];

function getGrade(score: number) {
    if (score >= 92) {
        return '天命之年';
    }
    if (score >= 85) {
        return '顺势而为';
    }
    if (score >= 78) {
        return '稳中有进';
    }
    if (score >= 70) {
        return '平稳积累';
    }
    return '蓄势待发';
}

function getCareerPhaseSegments(scores: number[]) {
    const avg = scores.reduce((acc, value) => acc + value, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const hi = avg + (max - avg) * 0.45;
    const lo = avg - (avg - min) * 0.45;
    const phaseOf = (value: number) => {
        if (value >= hi + 3) {
            return 'peak';
        }
        if (value >= hi) {
            return 'push';
        }
        if (value <= lo) {
            return 'gather';
        }
        if (value <= lo + 3) {
            return 'wrap';
        }
        return 'steady';
    };
    const phases = scores.map(phaseOf);
    const segments: {phase: string; start: number; end: number}[] = [];
    let current = {phase: phases[0], start: 0, end: 0};
    for (let i = 1; i < phases.length; i += 1) {
        if (phases[i] === current.phase) {
            current.end = i;
        } else {
            segments.push(current);
            current = {phase: phases[i], start: i, end: i};
        }
    }
    segments.push(current);
    return segments;
}

/* ══════ dimQuip (from JSON + age-aware) ══════ */
function getAgeStage(age: number): string {
    if (age <= 3) {
        return 'baby';
    }
    if (age <= 6) {
        return 'preschool';
    }
    if (age <= 12) {
        return 'primary';
    }
    if (age <= 18) {
        return 'teen';
    }
    if (age <= 30) {
        return 'young';
    }
    if (age <= 45) {
        return 'prime';
    }
    if (age <= 60) {
        return 'mature';
    }
    return 'senior';
}

function dimQuip(key: string, score: number, age: number): string {
    const stage = getAgeStage(age);
    const quips = (DATA.dimQuips as unknown as Record<string, Record<string, [number, string][]>>)[stage];
    if (!quips) {
        return '';
    }
    const list = quips[key];
    if (!list) {
        return '';
    }
    for (const [th, txt] of list) {
        if (score >= th) {
            return txt;
        }
    }
    return list[list.length - 1]?.[1] || '';
}

/* ══════ Canvas helpers (pure draw fns) ══════ */
function yOf(s: number, h: number) {
    return h - PAD.bottom - ((s - 50) / 55) * (h - PAD.top - PAD.bottom);
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    [55, 65, 75, 85, 98].forEach(t => {
        const y = yOf(t, h);
        ctx.beginPath();
        ctx.moveTo(PAD.left, y);
        ctx.lineTo(w - PAD.right, y);
        ctx.stroke();
    });
}

function drawSmooth(ctx: CanvasRenderingContext2D, pts: {x: number; y: number}[]) {
    if (pts.length < 2) {
        return;
    }
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) {
        ctx.lineTo(pts[1].x, pts[1].y);
        return;
    }
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)],
            p1 = pts[i],
            p2 = pts[i + 1],
            p3 = pts[Math.min(pts.length - 1, i + 2)],
            t = 0.25;
        ctx.bezierCurveTo(
            p1.x + (p2.x - p0.x) * t,
            p1.y + (p2.y - p0.y) * t,
            p2.x - (p3.x - p1.x) * t,
            p2.y - (p3.y - p1.y) * t,
            p2.x,
            p2.y
        );
    }
}

function drawRingChartToCanvas(
    canvas: HTMLCanvasElement,
    scores: DimScores,
    options?: {size?: number; textColor?: string}
) {
    const container = canvas.parentElement;
    const size = Math.round(options?.size || container?.clientWidth || 150);
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const scale = size / 150;
    const centerR = 28 * scale;
    const outerR = cx - 6 * scale;
    const gap = 3 * scale;
    const totalGap = gap * 3;
    const bandBudget = outerR - centerR - totalGap;
    const ratios = [1.3, 1.15, 1, 0.9];
    const rSum = ratios.reduce((a, b) => a + b, 0);
    const widths = ratios.map(rt => Math.max(4, (bandBudget * rt) / rSum));
    const radii: number[] = [];
    let r = outerR;
    for (let i = 0; i < 4; i += 1) {
        radii.push(r - widths[i] / 2);
        r -= widths[i] + (i < 3 ? gap : 0);
    }
    const startA = -Math.PI / 2;
    DIMS.forEach((dim, i) => {
        const score = ds(scores)[dim.key] as number;
        const endA = startA + (score / 100) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radii[i], 0, Math.PI * 2);
        ctx.strokeStyle = dim.track;
        ctx.lineWidth = widths[i];
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, radii[i], startA, endA);
        ctx.strokeStyle = dim.color[0];
        ctx.lineWidth = widths[i];
        ctx.lineCap = 'round';
        ctx.stroke();
    });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(28 * scale)}px -apple-system,sans-serif`;
    ctx.fillStyle = options?.textColor || '#1c1c1e';
    ctx.fillText(String(scores.total), cx, cy - 2 * scale);
    ctx.font = `500 ${Math.round(10 * scale)}px -apple-system,sans-serif`;
    ctx.fillStyle = '#aeaeb2';
    ctx.fillText('总分', cx, cy + 16 * scale);
}

function drawWealthChartToCanvas(
    canvas: HTMLCanvasElement,
    monthData: {month: number; score: number}[],
    options?: {height?: number; background?: string}
) {
    const container = canvas.parentElement;
    const w = container?.clientWidth || 340;
    const h = options?.height || 160;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (options?.background) {
        ctx.fillStyle = options.background;
        ctx.fillRect(0, 0, w, h);
    }
    const pad = {top: 20, right: 14, bottom: 28, left: 32};
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const klines = monthData.map((d, i) => {
        const close = d.score;
        const open = i === 0 ? close - 1 + sd(d.month, close) * 2 - 1 : monthData[i - 1].score;
        const body = Math.abs(close - open);
        const ext = Math.max(1, Math.round(body * 0.4 + sd(d.month * 7, close * 3) * 2));
        return {
            month: d.month,
            open,
            close,
            high: Math.min(98, Math.max(open, close) + ext),
            low: Math.max(55, Math.min(open, close) - ext)
        };
    });
    const allVals = klines.flatMap(k => [k.high, k.low]);
    const minS = Math.min(...allVals) - 2;
    const maxS = Math.max(...allVals) + 2;
    const range = Math.max(1, maxS - minS);
    const colW = plotW / 12;
    const xOf = (i: number) => pad.left + colW * i + colW / 2;
    const yOf2 = (s: number) => pad.top + plotH - ((s - minS) / range) * plotH;
    const barW = Math.max(4, Math.min(16, colW * 0.5));
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
        const y = pad.top + (plotH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();
    }
    let bestI = 0;
    let worstI = 0;
    klines.forEach((k, i) => {
        if (k.close > klines[bestI].close) {
            bestI = i;
        }
        if (k.close < klines[worstI].close) {
            worstI = i;
        }
    });
    klines.forEach((k, i) => {
        const x = xOf(i);
        const rise = k.close >= k.open;
        const fillC = rise ? '#dc2626' : '#16a34a';
        ctx.strokeStyle = fillC;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yOf2(k.high));
        ctx.lineTo(x, yOf2(k.low));
        ctx.stroke();
        const bodyTop = yOf2(Math.max(k.open, k.close));
        const bodyBot = yOf2(Math.min(k.open, k.close));
        const bodyH = Math.max(1.5, bodyBot - bodyTop);
        ctx.fillStyle = fillC;
        ctx.fillRect(x - barW / 2, bodyTop, barW, bodyH);
        if (i === bestI || i === worstI) {
            ctx.font = 'bold 10px -apple-system,sans-serif';
            ctx.fillStyle = i === bestI ? '#16a34a' : '#dc2626';
            ctx.textAlign = 'center';
            const ly = yOf2(k.high) - 8;
            ctx.fillText(String(k.close), x, ly < pad.top + 6 ? yOf2(k.low) + 14 : ly);
        }
    });
    ctx.font = '10px -apple-system,sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    klines.forEach((k, i) => ctx.fillText(`${k.month}月`, xOf(i), h - 8));
    ctx.textAlign = 'right';
    ctx.font = '9px -apple-system,sans-serif';
    [Math.round(minS + 1), Math.round(minS + range / 2), Math.round(maxS - 1)].forEach(t => {
        ctx.fillText(String(t), pad.left - 4, yOf2(t) + 3);
    });
}

/* ══════ Component ══════ */
function DestinyChart() {
    const {isDark} = useNewAppTheme();
    const {log, setPage: setLogPage} = useNewAppLog({pageName: 'new_agent_detail', agentName: DATA.page.agentName});

    // Form state
    const [name, setName] = useState('未命名');
    const [gender, setGender] = useState<'female' | 'male'>('female');
    const [birthDate, setBirthDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    });
    const [birthTime, setBirthTime] = useState(() => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    });
    const timeInputRef = useRef<HTMLInputElement>(null);
    const [province, setProvince] = useState('北京');
    const [city, setCity] = useState(() => String(PROV_CITIES.find(([p]) => p === '北京')?.[1]?.[0]?.[1] ?? ''));
    const [cityName, setCityName] = useState('北京');

    // Result state
    const [reading, setReading] = useState<ReadingData | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [selAge, setSelAge] = useState(0);
    const [selYear, setSelYear] = useState(0);
    const [selScore, setSelScore] = useState(0);
    const [activeSection, setActiveSection] = useState('summary');
    const [chartMode, setChartMode] = useState<'kline' | 'line'>('kline');
    const [pointGap, setPointGap] = useState(DEFAULT_GAP);

    // Refs
    // Share state
    const [showShareOverlay, setShowShareOverlay] = useState(false);
    const [shareSaving, setShareSaving] = useState(false);

    // Refs
    const chartRef = useRef<HTMLCanvasElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLCanvasElement>(null);
    const radarRef = useRef<HTMLCanvasElement>(null);
    const wealthRef = useRef<HTMLCanvasElement>(null);
    const readingRef = useRef<HTMLDivElement>(null);
    const shareCardRef = useRef<HTMLDivElement>(null);
    const shareRingRef = useRef<HTMLCanvasElement>(null);
    const shareWealthRef = useRef<HTMLCanvasElement>(null);
    const pointGapRef = useRef(DEFAULT_GAP);

    // Derived cities
    const cities = PROV_CITIES.find(([p]) => p === province)?.[1] || [];
    const selectedCityLng = useMemo(() => {
        const matchedCity = cities.find(([cName]) => cName === cityName);
        return matchedCity ? String(matchedCity[1]) : city;
    }, [cities, cityName, city]);

    const shareData = useMemo(() => {
        if (!reading) {
            return null;
        }
        const point =
            reading.charts.line.find(item => item.age === selAge) || reading.charts.line[reading.charts.line.length - 1];
        const scores = buildDimScores(point, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        const scoreMap = ds(scores);
        const career = buildMonthCareer(point, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        const love = buildMonthLove(point, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        const wealth = buildMonthWealth(point, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        const highest = DIMS.reduce((best, dim) => (scoreMap[dim.key] >= scoreMap[best.key] ? dim : best));
        const lowest = DIMS.reduce((best, dim) => (scoreMap[dim.key] <= scoreMap[best.key] ? dim : best));
        const grade = getGrade(point.score);
        const vibe =
            point.score >= 85
                ? `${point.year}年运势在线，${point.age <= 18 ? '学什么都快' : point.age <= 45 ? '经验和运气共振' : '多年积累在兑现'}。`
                : point.score >= 70
                  ? `${point.year}年运势平稳，${point.age <= 18 ? '按部就班成长' : '稳中求进'}。`
                  : `${point.year}年运势偏低调，调整蓄力为主。`;
        const advice =
            point.score >= 85
                ? `${highest.label}维度最亮（${scoreMap[highest.key]}分），重点发力不亏。`
                : point.score >= 70
                  ? `${lowest.label}稍弱（${scoreMap[lowest.key]}分），注意补短板。`
                  : `守住${highest.label}（${scoreMap[highest.key]}分）这个优势，等待时机。`;

        return {
            point,
            grade,
            scoreMap,
            career,
            love,
            wealth,
            insightTitle: `✦ ${point.year}年度洞察`,
            insightText: `${vibe}${advice}`,
            careerSegments: getCareerPhaseSegments(career.map(item => item.score))
        };
    }, [reading, selAge]);

    /* ── Chart width calc ── */
    const chartW = useCallback(
        (len: number) => {
            return Math.max(360, PAD.left + PAD.right + Math.max(1, len - 1) * pointGap);
        },
        [pointGap]
    );

    /* ── Sync pointGapRef with state (used in non-reactive touch handlers) ── */
    useEffect(() => {
        pointGapRef.current = pointGap;
    }, [pointGap]);

    /* ── Pinch-to-zoom on chart ── */
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !showResult) {
            return;
        }
        let startDist = 0;
        let startGap = DEFAULT_GAP;

        const getDist = (touches: TouchList) => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.hypot(dx, dy);
        };

        const onStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                startDist = getDist(e.touches);
                startGap = pointGapRef.current;
            }
        };

        const onMove = (e: TouchEvent) => {
            if (e.touches.length !== 2) {
                return;
            }
            e.preventDefault();
            const ratio = getDist(e.touches) / startDist;
            const next = Math.round(Math.min(MAX_GAP, Math.max(MIN_GAP, startGap * ratio)));
            if (next !== pointGapRef.current) {
                setPointGap(next);
            }
        };

        el.addEventListener('touchstart', onStart, {passive: true});
        el.addEventListener('touchmove', onMove, {passive: false});
        return () => {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchmove', onMove);
        };
    }, [showResult]);

    /* ── Draw main chart ── */
    const drawChart = useCallback(() => {
        if (!reading || !chartRef.current) {
            return;
        }
        const canvas = chartRef.current;
        const series = reading.charts.line;
        const kline = reading.charts.kline;
        const dw = chartW(series.length);
        const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        canvas.width = Math.round(dw * dpr);
        canvas.height = Math.round(CH * dpr);
        canvas.style.width = `${dw}px`;
        canvas.style.height = `${CH}px`;
        const wrapEl = canvas.parentElement;
        if (wrapEl) {
            wrapEl.style.width = `${dw}px`;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const step = (dw - PAD.left - PAD.right) / Math.max(1, series.length - 1);
        ctx.clearRect(0, 0, dw, CH);
        drawGrid(ctx, dw, CH);

        // Y-axis labels
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px -apple-system,sans-serif';
        [55, 65, 75, 85, 98].forEach(t => ctx.fillText(String(t), 2, yOf(t, CH) + 3));
        // X-axis ticks
        const count = Math.max(6, Math.min(16, Math.floor(dw / 50)));
        const every = Math.max(1, Math.round(series.length / count));
        for (let i = 0; i < series.length; i += every) {
            ctx.fillText(String(series[i].age), PAD.left + step * i - 6, CH - 14);
        }
        if (series.length > 0) {
            const last = series[series.length - 1];
            ctx.fillText(String(last.age), PAD.left + step * (series.length - 1) - 6, CH - 14);
        }
        // Axes
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD.left, PAD.top);
        ctx.lineTo(PAD.left, CH - PAD.bottom);
        ctx.lineTo(dw - PAD.right, CH - PAD.bottom);
        ctx.stroke();

        // Current age dashed line
        const curIdx = series.findIndex(i => i.age === reading.meta.curA);
        if (curIdx >= 0) {
            const cx = PAD.left + step * curIdx;
            ctx.save();
            ctx.strokeStyle = 'rgba(79,70,229,0.18)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(cx, PAD.top);
            ctx.lineTo(cx, CH - PAD.bottom);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(79,70,229,0.6)';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('今年', cx - 10, PAD.top - 6);
            ctx.restore();
        }

        // Selected dashed line
        const si = Math.max(
            0,
            series.findIndex(i => i.age === selAge)
        );
        const sx = PAD.left + step * si;
        ctx.strokeStyle = 'rgba(79,70,229,0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, PAD.top);
        ctx.lineTo(sx, CH - PAD.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        if (chartMode === 'kline') {
            const bw = Math.max(1.5, Math.min(8, step * 0.46));
            const cs = getComputedStyle(document.documentElement);
            const cRise = cs.getPropertyValue('--rise')?.trim() || '#dc2626';
            const cFall = cs.getPropertyValue('--fall')?.trim() || '#16a34a';
            kline.forEach((k, i) => {
                const x = PAD.left + step * i;
                const oY = yOf(k.open, CH),
                    cY = yOf(k.close, CH),
                    hY = yOf(k.high, CH),
                    lY = yOf(k.low, CH);
                const up = k.close >= k.open;
                const c = up ? cRise : cFall;
                ctx.beginPath();
                ctx.moveTo(x, hY);
                ctx.lineTo(x, lY);
                ctx.strokeStyle = c;
                ctx.lineWidth = 1;
                ctx.stroke();
                const top = Math.min(oY, cY),
                    bodyH = Math.max(1, Math.abs(oY - cY));
                ctx.fillStyle = c;
                ctx.fillRect(x - bw / 2, top, bw, bodyH);
            });
            const ac = series[si];
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 11px -apple-system,sans-serif';
            ctx.fillText(`${ac.age}岁 ${ac.score}分`, Math.max(44, sx - 20), yOf(ac.score, CH) - 14);
        } else {
            const pts = series.map((it, i) => ({x: PAD.left + step * i, y: yOf(it.score, CH)}));
            const grad = ctx.createLinearGradient(0, PAD.top, 0, CH - PAD.bottom);
            grad.addColorStop(0, 'rgba(99,102,241,0.22)');
            grad.addColorStop(0.5, 'rgba(129,140,248,0.10)');
            grad.addColorStop(1, 'rgba(246,247,251,0)');
            ctx.beginPath();
            drawSmooth(ctx, pts);
            ctx.lineTo(pts[pts.length - 1].x, CH - PAD.bottom);
            ctx.lineTo(pts[0].x, CH - PAD.bottom);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.save();
            ctx.shadowColor = 'rgba(99,102,241,0.35)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            drawSmooth(ctx, pts);
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
            const dotEvery = Math.max(1, Math.round(series.length / 10));
            pts.forEach((p, i) => {
                if (i % dotEvery !== 0 && i !== si) {
                    return;
                }
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, i === si ? 5 : 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#6366f1';
                ctx.beginPath();
                ctx.arc(p.x, p.y, i === si ? 3 : 1.5, 0, Math.PI * 2);
                ctx.fill();
            });
            const ac = series[si];
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 11px -apple-system,sans-serif';
            ctx.fillText(`${ac.age}岁 ${ac.score}分`, Math.max(44, sx - 20), yOf(ac.score, CH) - 14);
        }
    }, [reading, selAge, chartMode, pointGap, chartW]);

    /* ── Draw ring chart ── */
    const drawRingChart = useCallback(
        (scores: DimScores) => {
            const canvas = ringRef.current;
            if (!canvas) {
                return;
            }
            drawRingChartToCanvas(canvas, scores, {
                textColor: isDark ? '#e5e7eb' : '#1c1c1e'
            });
        },
        [isDark]
    );

    /* ── Draw radar chart ── */
    const drawRadarChart = useCallback(() => {
        const canvas = radarRef.current;
        if (!canvas || !reading) {
            return;
        }
        const data = reading.radarData;
        const container = canvas.parentElement;
        const size = container?.clientWidth || 280;
        const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        const cx = size / 2,
            cy = size / 2,
            maxR = size * 0.34,
            n = data.length,
            stepA = (Math.PI * 2) / n,
            sa = -Math.PI / 2;
        const ptAt = (i: number, r: number) => [cx + Math.cos(sa + stepA * i) * r, cy + Math.sin(sa + stepA * i) * r];
        [25, 50, 75, 100].forEach(lv => {
            const rv = maxR * (lv / 100);
            ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const [px, py] = ptAt(i % n, rv);
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = lv === 100 ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        for (let i = 0; i < n; i++) {
            const [px, py] = ptAt(i, maxR);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
            ctx.strokeStyle = 'rgba(0,0,0,0.06)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.beginPath();
        data.forEach((d, i) => {
            const rv = maxR * (d.value / 100);
            const [px, py] = ptAt(i, rv);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(79,70,229,0.12)';
        ctx.fill();
        ctx.beginPath();
        data.forEach((d, i) => {
            const rv = maxR * (d.value / 100);
            const [px, py] = ptAt(i, rv);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.strokeStyle = 'rgba(79,70,229,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        data.forEach((d, i) => {
            const rv = maxR * (d.value / 100);
            const [px, py] = ptAt(i, rv);
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#4f46e5';
            ctx.fill();
        });
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        data.forEach((d, i) => {
            const [lx, ly] = ptAt(i, maxR + 20);
            ctx.font = 'bold 12px -apple-system,sans-serif';
            ctx.fillStyle = isDark ? '#e5e7eb' : '#111827';
            ctx.fillText(d.label, lx, ly - 7);
            ctx.font = '11px -apple-system,sans-serif';
            ctx.fillStyle = '#4f46e5';
            ctx.fillText(String(d.value), lx, ly + 8);
        });
    }, [reading, isDark]);

    /* ── Draw wealth month K-line chart ── */
    const drawWealthChart = useCallback((monthData: {month: number; score: number}[]) => {
        const canvas = wealthRef.current;
        if (!canvas) {
            return;
        }
        drawWealthChartToCanvas(canvas, monthData);
    }, []);

    /* ── Handle chart click ── */
    const handleChartClick = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!reading || !chartRef.current) {
                return;
            }
            const rect = chartRef.current.getBoundingClientRect();
            const series = reading.charts.line;
            const dw = chartW(series.length);
            const x = ((e.clientX - rect.left) / rect.width) * dw;
            const step = (dw - PAD.left - PAD.right) / Math.max(1, series.length - 1);
            const tol = Math.max(10, step * 0.6);
            let idx = -1;
            if (chartMode === 'kline') {
                const kl = reading.charts.kline;
                const bw = Math.max(1.5, Math.min(8, step * 0.46));
                for (let i = 0; i < kl.length; i++) {
                    if (Math.abs(x - (PAD.left + step * i)) <= Math.max(8, bw + 4)) {
                        idx = i;
                        break;
                    }
                }
                if (idx < 0) {
                    for (let i = 0; i < series.length; i++) {
                        if (Math.abs(x - (PAD.left + step * i)) <= tol) {
                            idx = i;
                            break;
                        }
                    }
                }
            } else {
                for (let i = 0; i < series.length; i++) {
                    if (Math.abs(x - (PAD.left + step * i)) <= tol) {
                        idx = i;
                        break;
                    }
                }
            }
            if (idx < 0) {
                return;
            }
            const p = series[idx];
            setSelAge(p.age);
            setSelYear(p.year);
            setSelScore(p.score);
            log('click', 'new_agent', {action_type: 'button_click'});
        },
        [reading, chartMode, chartW, log]
    );

    /* ── Generate reading ── */
    const handleGenerate = useCallback(() => {
        if (!birthDate || !birthTime) {
            NewAppBridge.toast.error('请填写出生日期和时间');
            return;
        }
        const [yv, mv, dv] = birthDate.split('-').map(Number);
        if (!yv || !mv || !dv) {
            NewAppBridge.toast.error('日期格式不正确');
            return;
        }
        log('click', 'new_agent', {action_type: 'form_submit', has_text_input: 1});
        const rd = generate({
            name: name || '未命名',
            g: gender,
            bd: birthDate,
            bt: birthTime,
            bp: selectedCityLng,
            bpName: cityName
        });
        setReading(rd);
        setSelAge(rd.meta.curA);
        setSelYear(rd.charts.line.find(i => i.age === rd.meta.curA)?.year || 0);
        setSelScore(rd.meta.score);
        setActiveSection('summary');
        setChartMode('kline');
        setPointGap(DEFAULT_GAP);
        setShowResult(true);
        log('show', 'new_agent_result', {}, 'new_agent_detail');
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, [name, gender, birthDate, birthTime, selectedCityLng, cityName, log, setLogPage]);

    /* ── Back to form ── */
    const handleBack = useCallback(() => {
        log('click', 'new_agent', {action_type: 'retry'});
        setShowResult(false);
        setLogPage('new_agent_detail');
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, [log]);

    /* ── Open share overlay ── */
    const openShare = useCallback(() => {
        if (!reading) {
            return;
        }
        log('click', 'share');
        setShowShareOverlay(true);
    }, [reading, log]);

    /* ── Save share image ── */
    const saveShareAsImage = useCallback(async () => {
        if (!shareCardRef.current) {
            return;
        }
        log('click', 'new_agent', {action_type: 'save'});
        setShareSaving(true);
        try {
            const h2c = (await import('html2canvas')).default;
            const canvas = await h2c(shareCardRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true
            });
            const dataUrl = canvas.toDataURL('image/png');
            await NewAppBridge.image.save(dataUrl);
        } catch (_e) {
            NewAppBridge.toast.error('保存失败，请截图保存');
        }
        setShareSaving(false);
    }, [log]);

    /* ── Scroll to age on chart ── */
    const scrollToAge = useCallback(
        (age: number) => {
            if (!reading || !scrollRef.current) {
                return;
            }
            const series = reading.charts.line;
            const dw = chartW(series.length);
            const step = (dw - PAD.left - PAD.right) / Math.max(1, series.length - 1);
            const idx = Math.max(
                0,
                series.findIndex(i => i.age === age)
            );
            const tx = PAD.left + step * idx;
            const vw = scrollRef.current.clientWidth;
            scrollRef.current.scrollLeft = Math.max(0, Math.min(dw - vw, tx - vw * 0.45));
        },
        [reading, chartW]
    );

    /* ── Effects: draw charts when state changes ── */
    useEffect(() => {
        if (showResult && reading) {
            drawChart();
            scrollToAge(selAge);
        }
    }, [showResult, reading, selAge, chartMode, pointGap, drawChart, scrollToAge]);

    useEffect(() => {
        if (!showResult || !reading) {
            return;
        }
        const pt = reading.charts.line.find(i => i.age === selAge);
        if (!pt) {
            return;
        }
        const scores = buildDimScores(pt, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        drawRingChart(scores);
    }, [showResult, reading, selAge, drawRingChart]);

    useEffect(() => {
        if (!showResult || !reading || activeSection !== 'personality') {
            return;
        }
        const timer = setTimeout(drawRadarChart, 50);
        return () => clearTimeout(timer);
    }, [showResult, reading, activeSection, selAge, drawRadarChart]);

    useEffect(() => {
        if (!showResult || !reading || activeSection !== 'wealth') {
            return;
        }
        const pt = reading.charts.line.find(i => i.age === selAge);
        if (!pt) {
            return;
        }
        const mw = buildMonthWealth(pt, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        const timer = setTimeout(() => drawWealthChart(mw), 50);
        return () => clearTimeout(timer);
    }, [showResult, reading, activeSection, selAge, drawWealthChart]);

    useEffect(() => {
        if (!showShareOverlay || !shareData) {
            return;
        }
        const timer = window.setTimeout(() => {
            if (shareRingRef.current) {
                drawRingChartToCanvas(shareRingRef.current, {
                    total: shareData.point.score,
                    career: shareData.scoreMap.career,
                    wealth: shareData.scoreMap.wealth,
                    love: shareData.scoreMap.love,
                    health: shareData.scoreMap.health
                });
            }
            if (shareWealthRef.current) {
                drawWealthChartToCanvas(shareWealthRef.current, shareData.wealth, {
                    height: 172
                });
            }
        }, 60);
        return () => window.clearTimeout(timer);
    }, [showShareOverlay, shareData]);

    /* ── Build ring right panel HTML ── */
    const ringRightHtml = (() => {
        if (!reading) {
            return '';
        }
        const pt = reading.charts.line.find(i => i.age === selAge);
        if (!pt) {
            return '';
        }
        const scores = buildDimScores(pt, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        return DIMS.map(dim => {
            const s = ds(scores)[dim.key] as number;
            return `<div class="${styles.dimRow}"><span class="${styles.dimDot}" style="background:${dim.color[0]}"></span><div class="${styles.dimInfo}"><div class="${styles.dimTop}"><span class="${styles.dimLabel}">${dim.label}</span><span class="${styles.dimScore}" style="color:${dim.color[0]}">${s}</span></div><div class="${styles.dimQuip}">${dimQuip(dim.key, s, selAge)}</div></div></div>`;
        }).join('');
    })();

    /* ── Build year insight HTML (matches original yearInsight() exactly) ── */
    const yearInsightHtml = (() => {
        if (!reading) {
            return '';
        }
        const pt = reading.charts.line.find(i => i.age === selAge);
        if (!pt) {
            return '';
        }
        const scores = buildDimScores(pt, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        const s = pt.score,
            a = pt.age,
            yr = pt.year;
        const dm = reading.dm;
        const hi = DIMS.reduce((best, d) => (ds(scores)[d.key] >= ds(scores)[best.key] ? d : best));
        const lo = DIMS.reduce((best, d) => (ds(scores)[d.key] <= ds(scores)[best.key] ? d : best));
        let vibe = '',
            advice = '';
        if (a <= 3) {
            if (s >= 85) {
                vibe = `${yr}年，${a}岁的小朋友运势在线，天生自带buff，吃好睡好就是最大的修行。`;
                advice = `<b>核心任务：健康成长。</b>这个年纪最重要的事业就是长身体，最大的财富就是全家人的爱。${hi.label}维度最亮（${ds(scores)[hi.key]}分），说明命格底子不错，慢慢来不着急。`;
            } else if (s >= 70) {
                vibe = `${yr}年运势平稳，小宝贝正在认识这个世界，每一天都是新副本。`;
                advice = `<b>核心任务：探索世界。</b>吃饭、睡觉、玩耍就是全部日程。${lo.label}稍弱（${ds(scores)[lo.key]}分），但在这个年纪完全不用操心，长大自然就好了。`;
            } else {
                vibe = `${yr}年运势偏低调，不过别担心——人家才${a}岁，人生还没正式开始呢。`;
                advice = `<b>核心任务：平安快乐。</b>家长注意宝宝的饮食和作息，其他的交给时间。命理上${dm.fav}属性的环境对小朋友有加持，比如${dm.fav === '水' ? '多听音乐、玩水' : dm.fav === '木' ? '多接触自然、绿植' : dm.fav === '火' ? '多晒太阳、穿暖色' : dm.fav === '金' ? '保持环境整洁有序' : '饮食均衡、接地气'}。`;
            }
        } else if (a <= 12) {
            if (s >= 85) {
                vibe = `${yr}年，${a}岁的少年运势高开，学什么都快，属于"别人家的孩子"体质。`;
                advice = `<b>核心策略：兴趣驱动。</b>这是打基础的黄金期，不用卷成绩但值得多尝试。${hi.label}维度突出（${ds(scores)[hi.key]}分），顺着天赋走不费劲。适当培养${dm.fav}属性相关的兴趣爱好，事半功倍。`;
            } else if (s >= 70) {
                vibe = `${yr}年运势稳当，${a}岁的小朋友按部就班成长中，没毛病。`;
                advice = `<b>核心策略：快乐学习。</b>成绩重要但不是全部，身心健康排第一。${lo.label}偏弱（${ds(scores)[lo.key]}分），${lo.key === 'health' ? '注意别用眼过度，多运动' : lo.key === 'love' ? '多带孩子参加集体活动，培养社交' : '不急，慢慢来'}。`;
            } else {
                vibe = `${yr}年运势偏弱，但${a}岁的孩子运势波动很正常，不必焦虑。`;
                advice = `<b>核心策略：陪伴和鼓励。</b>低谷期更需要家庭的温暖。${hi.label}还不错（${ds(scores)[hi.key]}分），多在这方面给孩子正反馈。少报补习班，多去公园跑跑。`;
            }
        } else if (a <= 18) {
            if (s >= 85) {
                vibe = `${yr}年，${a}岁的运势直接起飞，考试运、人缘运都在线，是全力冲刺的好年份。`;
                advice = `<b>核心策略：集中火力。</b>${hi.label}维度拉满（${ds(scores)[hi.key]}分），是你的王牌。学业上适合冲击目标院校，但也别忽略身体——熬夜有上限。${dm.fav}属性的月份安排重要考试和决定，赢面更大。`;
            } else if (s >= 70) {
                vibe = `${yr}年运势中规中矩，${a}岁正是打地基的年纪，稳扎稳打就好。`;
                advice = `<b>核心策略：补短板。</b>${lo.label}偏弱（${ds(scores)[lo.key]}分），${lo.key === 'career' ? '偏科的话趁早补，高考不等人' : lo.key === 'health' ? '别拿身体换成绩，注意颈椎和眼睛' : lo.key === 'love' ? '青春期社交困惑很正常，过来人都懂' : '合理规划零花钱也是一种能力'}。`;
            } else {
                vibe = `${yr}年运势承压，但${a}岁遇到低谷不是坏事——早经历早成长。`;
                advice = `<b>核心策略：心态第一。</b>成绩有波动很正常，别因一次考砸就否定自己。${hi.label}还有${ds(scores)[hi.key]}分的底气，守住优势科目。学会跟压力相处，这个本事比任何知识点都值钱。`;
            }
        } else if (a <= 30) {
            if (s >= 90) {
                vibe = `${yr}年运势直接拉满，${a}岁正是冲劲最足的年纪，老天还给你开了加速器。`;
                advice = `<b>核心策略：大胆出击。</b>事业上争曝光、争资源，该主动的别矜持。感情上适合推进关键节点。${hi.label}是最强维度（${ds(scores)[hi.key]}分），重点押注不亏。年轻就是资本，试错成本最低的时候，别怂。`;
            } else if (s >= 80) {
                vibe = `${yr}年运势中上，${a}岁节奏稳健。不算躺赢但明显有牌可打，关键是别浪。`;
                advice = `<b>核心策略：稳中求进。</b>${hi.label}最亮眼（${ds(scores)[hi.key]}分），是发力点；${lo.label}偏弱（${ds(scores)[lo.key]}分），别在这个方向赌太大。${dm.st ? '身强之人控制住冲劲，把力气花在刀刃上' : '身弱之人多借团队和平台的力，别硬扛'}。`;
            } else if (s >= 70) {
                vibe = `${yr}年属于蓄力期，${a}岁看起来平淡，但今年种的因决定后面好几年的果。`;
                advice = `<b>核心策略：深耕内功。</b>适合学新技能、攒人脉、修复关系。${hi.label}相对能打（${ds(scores)[hi.key]}分），维持住就好。${dm.fav}属性的月份多安排重要事项，${dm.bad}属性的月份低调为主。`;
            } else {
                vibe = `${yr}年运势偏低，但${a}岁的低谷只是蹲下来跳得更高。`;
                advice = `<b>核心策略：守住基本盘。</b>别冲动裸辞、冲动分手、冲动投资——三不原则。${hi.label}还有${ds(scores)[hi.key]}分，是为数不多的支撑点。${dm.st ? '收着点锋芒，韧性比冲劲更值钱' : '主动寻求贵人支持，开口求助不丢人'}。`;
            }
        } else if (a <= 45) {
            if (s >= 90) {
                vibe = `${yr}年运势大吉，${a}岁经验和运气双重加持，属于老天爷追着喂饭。`;
                advice = `<b>核心策略：乘势扩张。</b>事业上可以争取更大的盘子，财务上适当扩大投资半径。${hi.label}拉满（${ds(scores)[hi.key]}分），是绝对的发力方向。这个年纪的高光期含金量极高，别浪费。`;
            } else if (s >= 80) {
                vibe = `${yr}年运势稳健，${a}岁正是黄金发力期，有实力有机会。`;
                advice = `<b>核心策略：效率优先。</b>时间是最贵的资源，少做无效社交。${hi.label}（${ds(scores)[hi.key]}分）值得加码；${lo.label}（${ds(scores)[lo.key]}分）做好风控就行。${dm.st ? '中年身强，小心刚过易折' : '中年身弱，学会借力打力'}。`;
            } else if (s >= 70) {
                vibe = `${yr}年运势平稳，${a}岁的平稳不是无聊，是在为下一次爆发攒弹药。`;
                advice = `<b>核心策略：守正出奇。</b>基本盘不动，小范围试新方向。${lo.label}是短板（${ds(scores)[lo.key]}分），${lo.key === 'health' ? '健康投资回报率最高，别省' : '做好防守别踩坑就行'}。中年人最怕的不是没机会，是选错赛道。`;
            } else {
                vibe = `${yr}年运势承压，${a}岁的低谷期确实不太舒服，但你比年轻时有更多底牌。`;
                advice = `<b>核心策略：战略收缩。</b>砍掉不赚钱的投入，守住核心资产。${hi.label}还有${ds(scores)[hi.key]}分的空间，是穿越周期的锚。家庭是最稳的后盾，别忽视。`;
            }
        } else if (a <= 60) {
            if (s >= 90) {
                vibe = `${yr}年运势大旺，${a}岁依然能打，多年积累在这一年集中兑现。`;
                advice = `<b>核心策略：收获季。</b>之前种下的因，现在结果了。${hi.label}（${ds(scores)[hi.key]}分）是主收益方向。适合做长线决策、传承规划。身体是一切的本钱，高光期也别忘记体检。`;
            } else if (s >= 80) {
                vibe = `${yr}年运势不错，${a}岁经验丰富，知道什么该做什么该放下。`;
                advice = `<b>核心策略：从容布局。</b>不用再证明什么，做自己擅长的就好。${lo.label}偏弱（${ds(scores)[lo.key]}分），${lo.key === 'health' ? '健康是头等大事，定期复查' : '接受它，把精力给高回报的事'}。`;
            } else if (s >= 70) {
                vibe = `${yr}年运势平和，${a}岁的平稳是一种福气，安安稳稳就很好。`;
                advice = `<b>核心策略：知足常乐。</b>别跟年轻人比冲劲，你有他们没有的阅历和定力。${hi.label}（${ds(scores)[hi.key]}分）是你的压舱石。适合整理人际关系，留下真正重要的人。`;
            } else {
                vibe = `${yr}年运势偏低，${a}岁的身体和心态比运势数字重要得多。`;
                advice = `<b>核心策略：减法生活。</b>减少不必要的操心和消耗，把能量留给自己。${hi.label}（${ds(scores)[hi.key]}分）守住就好。多出门走走、晒晒太阳，好心情比好运势管用。`;
            }
        } else {
            if (s >= 85) {
                vibe = `${yr}年，${a}岁运势依然红火，退休生活过得比上班还精彩，令人羡慕。`;
                advice = `<b>核心关注：享受生活。</b>${hi.label}维度亮眼（${ds(scores)[hi.key]}分），${hi.key === 'career' ? '发挥余热，当顾问或带徒弟都很合适' : hi.key === 'wealth' ? '财务无忧是最大的底气' : hi.key === 'love' ? '有人陪伴是最大的幸福' : '身体硬朗就是最大的资本'}。适合旅行、学新东西、培养爱好，人生下半场同样精彩。`;
            } else if (s >= 70) {
                vibe = `${yr}年运势平和，${a}岁不求大富大贵，身边有人、心里有光就够了。`;
                advice = `<b>核心关注：身心平衡。</b>保持规律作息和适度运动。${lo.label}稍弱（${ds(scores)[lo.key]}分），${lo.key === 'health' ? '这个年纪健康是第一优先级，一定要重视体检和复查' : '不必在意，把精力给让你开心的事'}。生活节奏慢下来，反而能看见更多风景。`;
            } else {
                vibe = `${yr}年运势偏低调，${a}岁最重要的不是运势高低，是每一天都舒心。`;
                advice = `<b>核心关注：顺其自然。</b>不和自己较劲，不和身体较劲。${hi.label}（${ds(scores)[hi.key]}分）说明生活中还是有亮点的。子女的关心、老友的陪伴、清晨的阳光——这些不在评分里，但比什么都值钱。`;
            }
        }
        return `<div class="${styles.yearInsightTitle}">✦ ${yr}年度洞察</div><p>${vibe}</p><p>${advice}</p>`;
    })();

    /* ── Ring header info ── */
    const ringHeaderHtml = (() => {
        if (!reading) {
            return '';
        }
        const pt = reading.charts.line.find(i => i.age === selAge);
        if (!pt) {
            return '';
        }
        const scores = buildDimScores(pt, reading.pillars, reading.profile, reading.dm, reading.daYun, reading.es);
        return `<div class="${styles.ringTitle}">${pt.year}年运势详情</div><div class="${styles.ringSubtitle}">总分 ${scores.total} · ${bandLA(pt.score, pt.age)}</div>`;
    })();

    /* ── Build summary / section content ── */
    const sectionHtml = (() => {
        if (!reading) {
            return '';
        }
        const pil = reading.pillars,
            dm = reading.dm,
            es = reading.es,
            prof = reading.profile,
            narr = reading.narr;
        const cp =
            reading.charts.line.find(i => i.age === selAge) || reading.charts.line[reading.charts.line.length - 1];
        const s = cp.score,
            band = bandL(s);
        const dmS = dm.st ? '身强' : '身弱';
        const labels4 = ['年柱', '月柱', '日柱', '时柱'];
        const cols4 = [pil.year, pil.month, pil.day, pil.hour];
        const pillsHtml = cols4
            .map(
                (c, i) =>
                    `<div class="${styles.scPill}"><div class="${styles.scPillLbl}">${labels4[i]}</div><div class="${styles.scPillVal}">${c.stem}${c.branch}</div></div>`
            )
            .join('');
        const favsH = dm.favs.map(e => `<span style="color:${EC[e]}">${e}</span>`).join(' ');
        const badsH = dm.bads.map(e => `<span style="color:${EC[e]}">${e}</span>`).join(' ');
        const infoBlock = `<div class="${styles.scRow}"><div class="${styles.scPills}">${pillsHtml}</div><div class="${styles.scMetaLine}"><span class="${styles.scChip} ${styles.scChipDm}">${dm.stem}${dm.el}</span><span class="${styles.scChip} ${styles.scChipSt}">${dmS}</span><span class="${styles.scChip} ${styles.scChipFav}"><span class="${styles.scChipLbl}">喜</span>${favsH}</span><span class="${styles.scChip} ${styles.scChipBad}"><span class="${styles.scChipLbl}">忌</span>${badsH}</span></div></div>`;
        const elBarsHtml = (() => {
            const mx = Math.max(...Object.values(prof));
            return EL.map(el => {
                const raw = Math.round((prof[el] / mx) * 100),
                    pct = prof[el] > 0 ? Math.max(3, raw) : 0;
                return `<div class="${styles.elBarRow}"><span class="${styles.elBarLabel}" style="color:${EC[el]}">${el}</span><div class="${styles.elBarTrack}"><div class="${styles.elBarFill}" style="width:${pct}%;background:${EC[el]}${pct === 0 ? ';opacity:0.2' : ''}"></div></div><span class="${styles.elBarVal}">${prof[el].toFixed(1)}${prof[el] < 0.1 ? '(缺)' : ''}</span></div>`;
            }).join('');
        })();
        const tl = analyzeTL(reading.charts.line, selAge);
        const daYun = reading.daYun;
        const balD =
            es.bal >= 88
                ? '五行流通较好，格局端正'
                : es.bal >= 76
                  ? '五行略有偏颇，可借大运补调'
                  : '五行偏枯之象，需借运势调和';
        const cpYear = cp.year;
        const missing = EL.filter(e => prof[e] < 0.1);
        const missingMap: Record<string, string> = {
            '木': '创造力与生发之气不足，宜在大运流年借木气补充，多接触绿色、东方、植物',
            '火': '表达力与爆发力偏弱，宜借火运弥补，多接触红色、南方、社交活动',
            '土': '稳定性与落地能力欠缺，宜借土运调和，注意规律作息、接地气',
            '金': '决断力与收束力薄弱，宜借金运增强，适当培养纪律性和边界感',
            '水': '灵活性与变通力不够，宜借水运通关，多接触蓝色、北方、流动性事务'
        };
        const missingTxt = missing.length
            ? `命局<b>缺${missing.join('、')}</b>，${missing.map(e => missingMap[e] || '').join('；')}。`
            : '五行俱全，格局较为完整。';
        const curDY = daYun.pillars.find(d => selAge >= d.startAge && selAge <= d.endAge);
        const dyDesc = curDY
            ? `当前大运<b>${curDY.stem}${curDY.branch}</b>（${curDY.sEl}${curDY.bEl}），${curDY.sEl === dm.fav || curDY.bEl === dm.fav ? '大运见用神，运势得力' : '大运' + (curDY.sEl === dm.bad || curDY.bEl === dm.bad ? '见忌神，需谨慎应对' : '五行平和，稳步过渡')}，管${curDY.startAge}～${curDY.endAge}岁。`
            : `${daYun.startAge}岁起运前，受月柱<b>${pil.month.stem}${pil.month.branch}</b>（${pil.month.sEl}${pil.month.bEl}）影响为主。`;
        const lnSi = (((cpYear - 4) % 10) + 10) % 10,
            lnBi = (((cpYear - 4) % 12) + 12) % 12;
        const lnStem = STEMS[lnSi],
            lnBranch = BRANCHES[lnBi],
            lnSE = S_EL[lnSi],
            lnBE = B_EL[lnBi];
        const lnDesc = `流年<b>${lnStem}${lnBranch}</b>（${lnSE}${lnBE}），${lnSE === dm.fav || lnBE === dm.fav ? '流年见用神，助力明显' : lnSE === dm.bad || lnBE === dm.bad ? '流年见忌神，宜守不宜攻' : '流年五行中性，平稳过渡'}。`;
        const TEN_GOD_MAP: Record<string, string> = {};
        const tgCycle = ['木', '火', '土', '金', '水'];
        const dmi = tgCycle.indexOf(dm.el);
        TEN_GOD_MAP[tgCycle[dmi]] = '比劫';
        TEN_GOD_MAP[tgCycle[(dmi + 1) % 5]] = '食伤';
        TEN_GOD_MAP[tgCycle[(dmi + 2) % 5]] = '财星';
        TEN_GOD_MAP[tgCycle[(dmi + 3) % 5]] = '官杀';
        TEN_GOD_MAP[tgCycle[(dmi + 4) % 5]] = '印星';
        const domGod = TEN_GOD_MAP[es.dom] || '',
            weakGod = TEN_GOD_MAP[es.weak] || '';
        const godDesc: Record<string, string> = {
            '比劫': '同类助力旺，竞争意识强但也易与人争利',
            '食伤': '才华表达旺，创造力强但也易多思多虑',
            '财星': '求财欲望强，行动力足但也易操劳',
            '官杀': '责任感重，规则意识强但也易承压',
            '印星': '学习力强，贵人缘好但也易依赖保护'
        };
        const weakFunMap: Record<string, string> = {
            '木': '创造力和生长感偏弱——有点「死鱼眼看世界」，需要多晒太阳',
            '火': '表达力和爆发力不足——开会发言像读说明书',
            '土': '稳定感和落地能力缺缺——计划做了一堆，执行全靠随缘',
            '金': '决断力和边界感偏弱——选个外卖都能纠结20分钟',
            '水': '灵活性和变通力不够——遇到变化容易CPU过载'
        };
        const domFunMap: Record<string, string> = {
            '木': '天生卷王体质，永远在「还能更好」的路上',
            '火': '行走的氛围组，走到哪儿热闹到哪儿',
            '土': '人间定海神针，朋友圈最靠谱的存在',
            '金': '人群中的清醒型选手，别人还在纠结你已经做完决定了',
            '水': '社交变色龙，什么圈子都能混'
        };
        const favTMap: Record<string, string[]> = {
            '木': ['多接触绿植、木质家居', '晨跑散步、春天多出门', '穿搭多用绿色系'],
            '火': ['适度运动出汗', '多社交多表达', '红色系穿搭加持'],
            '土': ['规律作息比补品管用', '做饭、园艺能充电', '黄棕色系穿搭更稳'],
            '金': ['定期断舍离', '做计划列清单搞复盘', '白银色系提升气场'],
            '水': ['多喝水（真不是玩梗）', '游泳泡澡靠近水域', '蓝黑色系穿搭自带buff']
        };
        const badTMap: Record<string, string> = {
            '木': '少冲动创业，种树也得等天时',
            '火': '控制脾气和冲动消费，别一上头就all in',
            '土': '别太固执，灵活变通比死磕更聪明',
            '金': '少做断舍离式的决定，砍掉的可能是命根子',
            '水': '少折腾方向，变来变去反而迷路'
        };
        const persFunMap: Record<string, string> = {
            '木': '你就是那种明明已经很累了还会说「我再看一下」的人',
            '火': '朋友圈里你是最会带节奏的——好的那种',
            '土': '所有人都慌的时候你是最稳的那个，但你的慢热确实让人着急',
            '金': '你的口头禅大概是「这不合理」——然后用逻辑说服所有人',
            '水': '「见人说人话，见鬼说鬼话」不是贬义，是你的天赋技能'
        };
        const weakFun = weakFunMap[es.weak] || '';
        const domFun = domFunMap[es.dom] || '';
        const favT = favTMap[dm.fav] || [];
        const badT = badTMap[dm.bad] || '';
        const persFun = persFunMap[dm.el] || '';
        const yearP = pil.year,
            monthP = pil.month;
        const ageLabel = selAge === reading.meta.curA ? `现年${selAge}岁` : `${selAge}岁（${cpYear}年）`;
        const pad2 = (n: number) => String(n).padStart(2, '0');
        const tstDesc = reading.tst
            ? `<div class="${styles.secHeading}">真太阳时</div>出生地<b>${reading.tst.city}</b>，北京时间${pad2(reading.tst.origH)}:${pad2(reading.tst.origMin)} → 真太阳时<b>${pad2(reading.tst.corrH)}:${pad2(reading.tst.corrMin)}</b>（校正${reading.tst.correction >= 0 ? '+' : ''}${reading.tst.correction}分钟）。<br><br>`
            : '';
        const spouseHidden = pil.day.hidden || [];
        const mwData = buildMonthWealth(cp, pil, prof, dm, daYun, es);
        const bestWM = mwData.reduce((a, b) => (b.score > a.score ? b : a));
        const worstWM = mwData.reduce((a, b) => (b.score < a.score ? b : a));
        const mlData = buildMonthLove(cp, pil, prof, dm, daYun, es);
        const loveHeatmap = (() => {
            const lo = Math.min(...mlData.map(d => d.score)),
                hi = Math.max(...mlData.map(d => d.score));
            const rng = hi - lo || 1;
            return (
                `<div class="${styles.loveHeatmap}">` +
                mlData
                    .map(d => {
                        const t = (d.score - lo) / rng;
                        const bg = `rgba(242,53,141,${(0.08 + t * 0.55).toFixed(2)})`;
                        const fg = t > 0.5 ? '#8c0e4a' : '#b8447a';
                        return `<div class="${styles.loveHmCell}" style="background:${bg};color:${fg}"><div class="${styles.loveHmMonth}">${d.month}月</div><div class="${styles.loveHmScore}">${d.score}</div></div>`;
                    })
                    .join('') +
                '</div>'
            );
        })();
        const mcData = buildMonthCareer(cp, pil, prof, dm, daYun, es);
        const cScores = mcData.map(d => d.score);
        const cAvg = cScores.reduce((a, b) => a + b, 0) / 12;
        const cMx = Math.max(...cScores),
            cMn = Math.min(...cScores);
        const cHi = cAvg + (cMx - cAvg) * 0.45,
            cLo = cAvg - (cAvg - cMn) * 0.45;
        type SCarPhase = 'peak' | 'push' | 'steady' | 'gather' | 'wrap';
        const cPhaseOf = (v: number): SCarPhase =>
            v >= cHi + 3 ? 'peak' : v >= cHi ? 'push' : v <= cLo ? 'gather' : v <= cLo + 3 ? 'wrap' : 'steady';
        const cPhases = cScores.map(cPhaseOf);
        const cSegs: {phase: SCarPhase; start: number; end: number}[] = [];
        let cCur: {phase: SCarPhase; start: number; end: number} = {phase: cPhases[0], start: 0, end: 0};
        for (let i = 1; i < 12; i++) {
            if (cPhases[i] === cCur.phase) {
                cCur.end = i;
            } else {
                cSegs.push(cCur);
                cCur = {phase: cPhases[i], start: i, end: i};
            }
        }
        cSegs.push(cCur);
        const cCfg: Record<SCarPhase, {label: string; bg: string; fg: string}> = {
            peak: {label: '🔥 发力窗口', bg: 'linear-gradient(135deg,#4f46e5,#6366f1)', fg: '#fff'},
            push: {label: '推进期', bg: 'linear-gradient(135deg,#818cf8,#a5b4fc)', fg: '#fff'},
            steady: {label: '平稳期', bg: '#ddd6fe', fg: '#5b21b6'},
            gather: {label: '蓄力期', bg: '#ede9fe', fg: '#7c3aed'},
            wrap: {label: '收束期', bg: '#c7d2fe', fg: '#3730a3'}
        };
        const cPeakIdx = cScores.indexOf(cMx);
        let cStartM = 0;
        for (let i = 0; i < 12; i++) {
            if (cPhases[i] === 'push' || cPhases[i] === 'peak') {
                cStartM = i + 1;
                break;
            }
        }
        let cAdjustM = 0;
        for (let i = cPeakIdx + 1; i < 12; i++) {
            if (cPhases[i] === 'steady' || cPhases[i] === 'gather' || cPhases[i] === 'wrap') {
                cAdjustM = i + 1;
                break;
            }
        }
        const cPushMonths = mcData
            .filter(d => cPhaseOf(d.score) === 'peak' || cPhaseOf(d.score) === 'push')
            .map(d => d.month + '月');
        const cGatherMonths = mcData
            .filter(d => cPhaseOf(d.score) === 'gather' || cPhaseOf(d.score) === 'wrap')
            .map(d => d.month + '月');
        const careerBar = (() => {
            const track = cSegs
                .map(sg => {
                    const span = sg.end - sg.start + 1;
                    const c = cCfg[sg.phase];
                    const w = ((span / 12) * 100).toFixed(1);
                    return `<div class="${styles.careerBarSeg}" style="width:${w}%;background:${c.bg};color:${c.fg}">${span >= 2 ? c.label : span === 1 && sg.phase === 'peak' ? '🔥' : ''}</div>`;
                })
                .join('');
            const monthLabels = Array.from({length: 12}, (_, i) => `<span>${i + 1}月</span>`).join('');
            return `<div class="${styles.careerBarWrap}"><div class="${styles.careerBarTrack}">${track}</div><div class="${styles.careerBarMonths}">${monthLabels}</div></div>`;
        })();
        const rhythmText = (() => {
            if (!cPushMonths.length) {
                return '全年事业节奏偏平稳，无明显发力窗口，适合匀速推进、逐步积累。';
            }
            const pkM = cPeakIdx + 1;
            const pkYSi = (((getBaziYear(cp.year, pkM, 15) - 4) % 10) + 10) % 10;
            const pkMBi = pkM % 12;
            const pkMSi = getMonthStem(pkYSi, pkMBi);
            let t = `从月令干支与${dm.fav}（用神）的交互来看，<b>${cPushMonths.join('、')}</b>形成事业发力窗口`;
            if (cStartM) {
                t += `，<b>${cStartM}月</b>为启动节点`;
            }
            t += `，<b>${pkM}月</b>${STEMS[pkMSi]}${BRANCHES[pkMBi]}当令，事业能量达到峰值`;
            if (cAdjustM) {
                t += `；<b>${cAdjustM}月</b>起进入调整收束`;
            }
            if (cGatherMonths.length) {
                t += `。${cGatherMonths.join('、')}属于蓄力阶段，适合复盘和储备`;
            }
            return t + '。';
        })();
        function careerBlock(): string {
            const dyYear = curDY ? `<div class="${styles.secHeading}">大运分析</div>${dyDesc}<br><br>` : '';
            const lifeCareer = `<div class="${styles.secHeading}">事业总览</div>${es.dom}旺格局，${domGod}主导，${narr.c}。日主${dmS}，${dm.st ? '执行力和主导力偏强' : '善于借力合作、整合资源'}。用神<b>${dm.fav}</b>，适合关注${EA[dm.fav].ind}。`;
            if (selAge <= 6) {
                const yearTxt = `${ageLabel}，正处于感知世界的阶段。${rhythmText}${lnDesc}今年整体运势<b>${s}分</b>（${band}），${s >= 85 ? '成长节奏顺畅，好奇心旺盛，新技能解锁飞快，是拓展兴趣的好时机' : s >= 74 ? '发育稳步推进，每一天都在积累，保持规律的生活节奏就是最好的成长' : '可能有些小波折，情绪和身体都需要更多关注，多陪伴多鼓励比什么都管用'}。`;
                return `${lifeCareer}<div class="${styles.secSpacer}"></div><div class="${styles.secHeading}">${cpYear}年成长</div>${careerBar}${dyYear}${yearTxt}<br><br><div class="${styles.secHeading}">成长建议</div><ul class="${styles.adviceList}"><li>规律作息比任何早教课都管用</li><li>多接触自然和同龄人，这就是最好的课程</li><li>${cPushMonths.length ? cPushMonths.join('、') + '状态活跃，适合尝试新事物' : '全年节奏平稳，按部就班即可'}</li><li>${dm.fav}属性环境有加持——${EA[dm.fav].color}系的玩具和衣服可以多备</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>才${selAge}岁，唯一的KPI是健康快乐。${s >= 85 ? '老天给的底子不错，好好长就行。' : '急什么，人生才刚刚开机呢。'}</p></div>`;
            }
            if (selAge <= 12) {
                const yearTxt = `${ageLabel}。${lnDesc}今年学业运势<b>${s}分</b>（${band}），${rhythmText}${s >= 85 ? '学习状态全面在线，理解力和记忆力处于高峰，适合多拓展课外兴趣、发现天赋方向' : s >= 74 ? '学习节奏平稳，基础功扎实就够了，不必过度焦虑排名' : '学习上可能遇到卡点，换个方法、换个老师试试，别死磕一条路'}。`;
                return `${lifeCareer}<div class="${styles.secSpacer}"></div><div class="${styles.secHeading}">${cpYear}年学业</div>${careerBar}${dyYear}${yearTxt}<br><br><div class="${styles.secHeading}">学习建议</div><ul class="${styles.adviceList}"><li>${s >= 85 ? '状态好的时候多尝试新兴趣，发现天赋' : '先稳住主科，课外班别贪多'}</li><li>${cPushMonths.length ? '<b>' + cPushMonths.join('、') + '</b>学习效率最高，重要任务优先安排在此' : '全年学习节奏均匀，保持稳定输出'}</li><li>运动要保证——身体好成绩才能好</li><li>用神${dm.fav}属性的月份适合安排重要考试</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>${s >= 85 ? '学霸体质初现，但别忘了出去疯玩也是正事。' : s >= 74 ? '成绩中等不是坏事，找到擅长的东西更重要。' : '暂时落后不代表以后不行，很多大佬小时候也只是普通孩子。'}</p></div>`;
            }
            if (selAge <= 18) {
                return (
                    `${lifeCareer}<div class="${styles.secSpacer}"></div>` +
                    (tl
                        ? `<div class="${styles.secHeading}">${cpYear}年学业</div>${careerBar}${dyYear}${ageLabel}。${lnDesc}今年学业运势<b>${s}分</b>（${band}），${rhythmText}${s >= 90 ? '学业能量拉满，思维活跃、效率极高，是冲击理想目标的绝佳时机，大胆争取' : s >= 78 ? '学习节奏稳健，持续输出就能出成绩，不需要特别激进，保持状态即可' : '学业压力偏大，心态比努力更重要，先调整好状态再发力'}。近三年走势偏${tl.td}，${tl.td === '上升' ? '势头向好，乘胜追击' : '需要耐心积累，厚积薄发'}。<br><br>`
                        : '') +
                    `<div class="${styles.secHeading}">行动建议</div><ul class="${styles.adviceList}"><li>${s >= 85 ? '集中火力冲目标，这是出成绩的年份' : '先稳基础，查漏补缺比刷难题有用'}</li><li>${cPushMonths.length ? '<b>' + cPushMonths.join('、') + '</b>学业能量最强，重要考试和冲刺优先安排在此' : '全年节奏均匀，保持稳定输出即可'}</li><li>${cAdjustM ? cAdjustM + '月后进入调整期，适合复盘总结、查漏补缺' : '作息规律比熬夜刷题效率高十倍'}</li><li>适当减压——运动、音乐、和朋友聊天都算</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>${s >= 90 ? cpYear + '年是学业冲刺好时机，别客气直接冲。' : s >= 78 ? cpYear + '年稳着来，别跟别人比进度，跟昨天的自己比。' : cpYear + '年压力大很正常，深呼吸，你比想象中能打。'}</p></div>`
                );
            }
            if (selAge >= 61) {
                return (
                    `${lifeCareer}<div class="${styles.secSpacer}"></div>` +
                    (tl
                        ? `<div class="${styles.secHeading}">${cpYear}年生活</div>${careerBar}${dyYear}${ageLabel}。${lnDesc}今年生活运势<b>${s}分</b>（${band}），${rhythmText}${s >= 85 ? '精神状态不错，退休生活过得比上班还充实，适合发挥余热、参与社区活动' : s >= 74 ? '生活平稳有序，安安静静享受当下就很好' : '身体或精力可能有些波动，注意休息，少操心多享福'}。<br><br>`
                        : '') +
                    `<div class="${styles.secHeading}">生活建议</div><ul class="${styles.adviceList}"><li>${s >= 85 ? '精力好的话可以带带徒弟、做做顾问' : '养花遛弯下棋，怎么开心怎么来'}</li><li>${cPushMonths.length ? cPushMonths.join('、') + '精力较旺，适合安排社交活动或外出' : '全年节奏平稳，顺其自然就好'}</li><li>健康是一切的前提，定期体检不能省</li><li>多和老朋友聚聚，社交是最好的养生</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>都退休了还看事业运？${s >= 85 ? '行吧，你这精力确实还能再战。广场舞C位等着你。' : '放过自己吧，人生下半场的KPI只有一个：开心。'}</p></div>`
                );
            }
            return (
                `${lifeCareer}<div class="${styles.secSpacer}"></div>` +
                (tl
                    ? `<div class="${styles.secHeading}">${cpYear}年事业</div>${careerBar}${dyYear}${ageLabel}。${lnDesc}今年事业运势<b>${s}分</b>（${band}），${rhythmText}${s >= 90 ? '正处发力高点，事业能量充沛，适合争取晋升、拿下关键项目、扩大影响力' : s >= 78 ? '节奏平稳，适合打磨核心能力、积累行业口碑，稳扎稳打就是进步' : '宜守不宜攻，这一年的主题是复盘和储备，把基本盘守好就是胜利'}。近三年走势偏${tl.td}，${tl.td === '上升' ? '正处上升通道，宜主动出击' : tl.td === '下行' ? '调整期，以守代攻' : '稳步推进'}。黄金窗口<b>${tl.b5s}～${tl.b5e}岁</b>。<br><br>`
                    : '') +
                `<div class="${styles.secHeading}">行动建议</div><ul class="${styles.adviceList}"><li>${cPushMonths.length ? '<b>' + cPushMonths.join('、') + '</b>是年度事业发力窗口——晋升答辩、项目推进、关键谈判优先安排在此' : '全年节奏偏平稳，适合匀速推进、逐步积累'}</li><li>${cStartM ? '<b>' + cStartM + '月</b>事业能量启动，提前做好准备、卡好节奏' : '年初即可稳步推进，不必刻意等待窗口'}</li><li>${cAdjustM ? cAdjustM + '月后进入收束调整期，适合复盘总结、储备下一阶段资源' : '下半年延续势头，保持节奏即可'}</li><li>用神${dm.fav}旺的流年可侧重${EA[dm.fav].ind}</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>${s >= 90 ? cpYear + '年事业运拉满，现在不冲更待何时？' + (tl ? tl.b5s + '到' + tl.b5e + '岁是黄金期，到时候请大家吃饭。' : '') : s >= 78 ? cpYear + '年稳着来就行，不用跟别人比速度。马拉松前半程跑太快反而崩。' : cpYear + '年属于「战略性摸鱼」阶段——不是不干，是把力气攒着等风来。'}</p></div>`
            );
        }
        function loveBlock(): string {
            const dyLove = curDY
                ? `<div class="${styles.secHeading}">大运感情</div>${dyDesc}${curDY.sEl === dm.fav || curDY.bEl === dm.fav ? '当前大运利感情发展。' : '当前大运感情运势需主动经营。'}<br><br>`
                : '';
            const lifeLove = `<div class="${styles.secHeading}">感情总览</div>${narr.l}。日主${dm.el}${dmS}，${dm.st ? '感情中主动性强，喜欢掌握节奏' : '更重安全感与情绪共鸣，需要稳定的关系'}。日支<b>${pil.day.branch}</b>为配偶宫，${spouseHidden.some(h => TEN_GOD_MAP[h.el] === '财星') ? '宫见财星，伴侣务实能干' : spouseHidden.some(h => TEN_GOD_MAP[h.el] === '官杀') ? '宫见官杀，伴侣有责任心' : spouseHidden.some(h => TEN_GOD_MAP[h.el] === '印星') ? '宫见印星，伴侣温和体贴' : '伴侣性格独立'}。`;
            if (selAge <= 6) {
                const yearTxt = `${ageLabel}，这个阶段的"社交"就是和家人撒娇、和小朋友互动。${lnDesc}今年社交运势<b>${s}分</b>（${band}），${s >= 85 ? '人见人爱的一年，走到哪儿都有人疼，亲和力爆棚' : s >= 74 ? '社交能力稳步发展中，开始学会分享和表达' : '可能会有点认生或黏人，需要更多的安全感和陪伴，多带出门见见世面'}。`;
                return `${lifeLove}<div class="${styles.secSpacer}"></div><div class="${styles.secHeading}">${cpYear}年社交</div>${loveHeatmap}${yearTxt}<br><br><div class="${styles.secHeading}">陪伴建议</div><ul class="${styles.adviceList}"><li>多陪伴 > 多报班</li><li>鼓励和同龄人互动，学会分享</li><li>安全感充足的孩子长大更独立</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>这个年纪的社交核心就一个字：玩。会玩的孩子朋友多，朋友多的孩子情商高。</p></div>`;
            }
            if (selAge <= 12) {
                const yearTxt = `${ageLabel}。${lnDesc}今年社交运势<b>${s}分</b>（${band}），${s >= 85 ? '人缘爆棚，走到哪儿都有小伙伴追着玩，在集体中容易成为核心人物' : s >= 74 ? '同学关系融洽，有稳定的朋友圈，友情质量不错' : '可能会有些社交摩擦或小团体冲突，引导孩子学会处理矛盾比回避更重要'}。`;
                return `${lifeLove}<div class="${styles.secSpacer}"></div><div class="${styles.secHeading}">${cpYear}年社交</div>${loveHeatmap}${yearTxt}<br><br><div class="${styles.secHeading}">社交建议</div><ul class="${styles.adviceList}"><li>鼓励参加团队活动和集体运动</li><li>教会处理冲突比回避冲突更重要</li><li>${dm.st ? '适当提醒别太强势，学会倾听' : '鼓励主动表达，不用总迁就别人'}</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>这个年纪的友情比大人想象的复杂多了。${dm.st ? '你家孩子天生领袖气质，小心别变成班里的小霸王就行。' : '你家孩子心思细腻，交到真心朋友会特别珍惜。'}</p></div>`;
            }
            if (selAge <= 18) {
                return (
                    `${lifeLove}<div class="${styles.secSpacer}"></div>` +
                    (tl
                        ? `<div class="${styles.secHeading}">${cpYear}年人际</div>${loveHeatmap}${dyLove}${ageLabel}。${lnDesc}今年人际运势<b>${s}分</b>，${s >= 85 ? '人际关系顺畅，社交圈活跃，可能会遇到对你很重要的人，值得用心经营' : s >= 74 ? '社交圈平稳，保持真诚待人就好，不必刻意讨好谁' : '人际上可能有些波动，同学关系或朋友圈里会有摩擦，别太在意流言蜚语，做好自己'}。<br><br>`
                        : '') +
                    `<div class="${styles.secHeading}">社交建议</div><ul class="${styles.adviceList}"><li>这个年纪友情比爱情重要得多</li><li>${s >= 85 ? '人缘好的时候多帮帮同学，这些人脉以后会回来找你' : '交几个真心朋友比认识一堆人强'}</li><li>${dm.st ? '控制表达欲，听别人说完再发表意见' : '有想法就大胆说，别总闷在心里'}</li><li>任何关系都不值得影响学业和心情</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>青春期的关系特别像过山车——${dm.st ? '你可能是那个带节奏的人，注意别把别人甩飞了。' : '你可能是那个默默观察的人，但你的温柔其实很有力量。'}${s >= 85 ? ' 今年社交运不错，有些人值得深交。' : ''}</p></div>`
                );
            }
            if (selAge >= 61) {
                return (
                    `${lifeLove}<div class="${styles.secSpacer}"></div>` +
                    (tl
                        ? `<div class="${styles.secHeading}">${cpYear}年家庭</div>${loveHeatmap}${dyLove}${ageLabel}。${lnDesc}今年家庭运势<b>${s}分</b>，${s >= 85 ? '家庭关系和谐温馨，儿孙绕膝的幸福感在线，和老伴的默契也在加深' : s >= 74 ? '生活平静安稳，和家人、老朋友相处融洽，日子过得不急不躁' : '可能会有些孤独感或家庭小摩擦，主动找人聊聊天，别闷在心里'}。<br><br>`
                        : '') +
                    `<div class="${styles.secHeading}">生活建议</div><ul class="${styles.adviceList}"><li>老伴是最大的财富，互相包容别计较</li><li>多和子女沟通，但别过度干涉他们的生活</li><li>培养社交圈——老年大学、棋友茶友都很好</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>${s >= 85 ? '晚年幸福指数在线，有人陪有事做有期待，这就是最好的状态。' : '一个人也没什么不好，但偶尔找人下盘棋聊聊天，比看电视养生多了。'}</p></div>`
                );
            }
            return (
                `${lifeLove}<div class="${styles.secSpacer}"></div>` +
                (tl
                    ? `<div class="${styles.secHeading}">${cpYear}年感情</div>${loveHeatmap}${dyLove}${ageLabel}。${lnDesc}今年感情运势<b>${s}分</b>，${s >= 85 ? '互动能量充足，关系中的推进力很强，适合做重大感情决策——表白、确认关系、婚嫁等关键节点都宜安排在今年' : s >= 74 ? '感情节奏平稳，没有大的波澜，经营好日常细节比搞大动作更重要，用心陪伴胜过一切仪式感' : '精力有限，感情上容易力不从心，先照顾好自己的状态和情绪，稳定了再去经营关系'}。近三年感情走势偏${tl.td}。<br><br>`
                    : '') +
                `<div class="${styles.secHeading}">行动建议</div><ul class="${styles.adviceList}"><li>高分年适合做重大感情决策、推进关键节点</li><li>平稳年是关系维护期，经营细节比表态重要</li><li>低分年先照顾好自己的状态</li><li>择偶宜找${dm.st ? '能包容和柔化你的人，适当示弱反而更有吸引力' : '能给予支持和安全感的人，保持自我比过度迁就更重要'}</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>${dm.st ? '你在感情里属于「带头大哥/大姐」型，偶尔示弱一下对方会更爱你。强不是问题，让对方觉得被需要才是真课题。' : '你在感情里需要安全感，这不丢人。找一个让你安心的人比找一个让你心动的人更重要——心动会退潮，安心才是永动机。'}</p></div>`
            );
        }
        function wealthBlock(): string {
            const dyWealthPart = curDY
                ? `<div class="${styles.secHeading}">大运财运</div>当前大运<b>${curDY.stem}${curDY.branch}</b>（${curDY.sEl}${curDY.bEl}），${curDY.sEl === GEN_MAP[dm.el] || curDY.bEl === GEN_MAP[dm.el] ? '大运见财星，求财机会增多' : curDY.sEl === dm.fav || curDY.bEl === dm.fav ? '大运见用神，整体运势对财运有间接助力' : '大运未直接助财，需靠个人努力开拓'}。<br><br>`
                : `${daYun.startAge}岁起运前，受月柱<b>${pil.month.stem}${pil.month.branch}</b>影响为主。<br><br>`;
            const lifeWealth = `<div class="${styles.secHeading}">财富总览</div>${narr.w}。五行中<b>${GEN_MAP[dm.el]}</b>为财星（我克者为财），命局中${GEN_MAP[dm.el]}气${prof[GEN_MAP[dm.el]].toFixed(1)}分，${prof[GEN_MAP[dm.el]] >= 2 ? '财星有力，求财有门路' : prof[GEN_MAP[dm.el]] >= 0.5 ? '财星偏弱，需借大运流年之力' : '财星极弱，财运依托大运补充'}。日主${dmS}，${dm.st ? '身强能担财，风险承受力较强' : '身弱宜谨慎理财，量入为出'}。`;
            if (selAge <= 6) {
                const yearTxt = `${ageLabel}，这个年纪的"财运"基本等于压岁钱和爸妈的零食预算。${lnDesc}今年运势<b>${s}分</b>（${band}），${s >= 85 ? '今年压岁钱收入有望创新高，长辈缘不错，走到哪儿都有红包拿' : s >= 74 ? '压岁钱收成中规中矩，不多不少刚刚好' : '可能被爸妈「代为保管」更多压岁钱，别急，长大了自己赚回来'}。`;
                return `${lifeWealth}<div class="${styles.secSpacer}"></div><div class="${styles.secHeading}">${cpYear}年"财运"</div><div class="${styles.wealthChartWrap}"><canvas id="wealthMC"></canvas></div>${yearTxt}<br><br><div class="${styles.secHeading}">理财启蒙</div><ul class="${styles.adviceList}"><li>开始认识钱——知道钱能买东西就是巨大进步</li><li>准备一个存钱罐，培养攒钱意识</li><li>别太早开始比较谁的玩具多</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>现阶段最大的资产是无限的可能性。压岁钱被没收不算亏，长大了自己赚回来。</p></div>`;
            }
            if (selAge <= 12) {
                const yearTxt = `${ageLabel}。${lnDesc}今年"财运"<b>${s}分</b>（${band}），${s >= 85 ? '零花钱管理能力在线，甚至可能攒出一笔小金库，理财意识超前' : s >= 74 ? '收支基本平衡，偶尔超支但整体可控，继续保持就好' : s >= 68 ? '月初富翁月底吃土的经典循环，需要学会规划' : '经济完全依赖家长，正常的，先把学习搞好'}。`;
                return `${lifeWealth}<div class="${styles.secSpacer}"></div><div class="${styles.secHeading}">${cpYear}年"财运"</div><div class="${styles.wealthChartWrap}"><canvas id="wealthMC"></canvas></div>${yearTxt}<br><br><div class="${styles.secHeading}">理财建议</div><ul class="${styles.adviceList}"><li>学会记账——知道钱花在哪里比攒多少更重要</li><li>区分「想要」和「需要」，这个能力受用终身</li><li>可以尝试用零花钱做小目标储蓄</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>现在学会管零花钱，长大才能管大钱。${dm.st ? '你家孩子花钱挺有主见的，适当放手让他自己决定。' : '你家孩子花钱比较犹豫，反而是好事——以后不容易冲动消费。'}</p></div>`;
            }
            if (selAge <= 18) {
                const yearTxt = `${ageLabel}。${lnDesc}今年财务运势<b>${s}分</b>（${band}），${s >= 85 ? '生活费管理得当，可能还有余钱，理财意识开始萌芽' : s >= 74 ? '收支基本平衡，没什么大问题' : '可能会有些意料外的开支，学会控制冲动消费很关键'}。全年来看，<b style="color:#16a34a">${bestWM.month}月</b>财务状态最好（${bestWM.score}分），<b style="color:#dc2626">${worstWM.month}月</b>偏紧（${worstWM.score}分）。`;
                return `${lifeWealth}<div class="${styles.secSpacer}"></div><div class="${styles.secHeading}">${cpYear}年财务</div><div class="${styles.wealthChartWrap}"><canvas id="wealthMC"></canvas></div>${dyWealthPart}${yearTxt}<br><br><div class="${styles.secHeading}">理财建议</div><ul class="${styles.adviceList}"><li>学会规划生活费——月初分配比月底借钱强</li><li>${bestWM.month}月如果有想买的大件可以考虑出手</li><li>${worstWM.month}月少逛淘宝，控制冲动消费</li><li>可以尝试了解基本理财概念，为将来打基础</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>这个年纪不用想太多理财的事，但${s >= 85 ? '你的财务敏感度不错，以后搞钱应该有天赋。' : '至少别月初奶茶自由月底泡面续命就行。'}学会延迟满足比什么理财课都管用。</p></div>`;
            }
            return (
                `${lifeWealth}<div class="${styles.secSpacer}"></div><div class="${styles.secHeading}">${cpYear}年财运</div><div class="${styles.wealthChartWrap}"><canvas id="wealthMC"></canvas></div>${dyWealthPart}${ageLabel}。${lnDesc}今年财运<b>${s}分</b>（${band}），${s >= 90 ? '财务弹性大，收入渠道活跃，适合主动争取加薪、推动投资配置、把握关键财务机会' : s >= 78 ? '财运平稳，没有大起大落，适合优化资产结构、增加储蓄比例，稳中求进' : '需严控支出，避免大额投资和借贷，守住现有基本盘就是这一年最大的胜利'}。` +
                (tl ? `财运最佳窗口<b>${tl.b5s}～${tl.b5e}岁</b>。` : '') +
                `全年走势来看，<b style="color:#16a34a">${bestWM.month}月</b>财运最旺（${bestWM.score}分），适合争取关键收入、推动重要财务决策；<b style="color:#dc2626">${worstWM.month}月</b>偏弱（${worstWM.score}分），宜保守理财、控制开支。<br><br><div class="${styles.secHeading}">行动建议</div><ul class="${styles.adviceList}"><li>高分月重点出击：<b>${bestWM.month}月</b>前后适合谈薪、签约、推进重要项目</li><li>低分月防守为主：<b>${worstWM.month}月</b>前后控制大额支出，避免冲动投资</li><li>${dm.st ? '身强能担财，可适度扩大投资半径' : '身弱需谨慎，量入为出、稳健配置优先'}</li><li>用神${dm.fav}旺的月份可关注${EA[dm.fav].ind}</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>${s >= 85 ? cpYear + '年财运不错，但「不错」≠「随便浪」。重点盯住' + bestWM.month + '月这波机会，趁运气好多攒点。' : cpYear + '年不是搞钱最佳时机，' + worstWM.month + '月尤其别冲动。'}${tl ? ' ' + tl.b5s + '到' + tl.b5e + '岁是最能搞钱的阶段，现在的准备都在给那时候铺路。' : ''}</p></div>`
            );
        }
        if (activeSection === 'summary') {
            return (
                `${infoBlock}<div class="${styles.elBars}">${elBarsHtml}</div><div class="${styles.sectionDivider}"></div>${tstDesc}<div class="${styles.secHeading}">命盘总结</div>日主<b>${dm.stem}${dm.el}</b>，${dmS}，${narr.p}。命局中<b>${es.dom}</b>气最旺（${prof[es.dom].toFixed(1)}），对应${domGod}——${godDesc[domGod] || ''}；<b>${es.weak}</b>最弱（${prof[es.weak].toFixed(1)}），${weakFun.split('——')[0]}。${missing.length ? `命局<b>缺${missing.join('、')}</b>，需在大运流年借力补充。` : '五行俱全，格局较为完整。'}平衡度<b>${es.bal}分</b>，${balD}。<br><br>用神取<b>${dm.fav}</b>——${EA[dm.fav].color}、${EA[dm.fav].dir}方位对你有天然加持，适合关注${EA[dm.fav].ind}；忌神为<b>${dm.bad}</b>，${badT}。${dm.st ? '身强能扛事，执行力和主导力是你的核心武器，但也要注意别刚过头' : '身弱善借力，借平台和贵人放大自己是你的最优策略'}。${narr.c.includes('适合') ? '事业方向上，' + narr.c + '。' : ''}感情上，${narr.l.charAt(0).toLowerCase() + narr.l.slice(1)}。财运上，${narr.w.charAt(0).toLowerCase() + narr.w.slice(1)}。<br><br><div class="${styles.secHeading}">${cpYear}年运势</div>${ageLabel}。${dyDesc}${lnDesc}运势<b>${cp.score}分</b>（${bandL(cp.score)}），处于<b>${stgL(selAge)}</b>，${stgT(selAge)}。` +
                (tl
                    ? `未来十年高点<b>${tl.pk.year}年（${tl.pk.age}岁，${tl.pk.score}分）</b>，低点<b>${tl.vl.year}年（${tl.vl.age}岁，${tl.vl.score}分）</b>。近三年走势偏<b>${tl.td}</b>。黄金五年窗口：<b>${tl.b5s}～${tl.b5e}岁</b>（均分${tl.b5a}）。`
                    : '') +
                `<div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>${domFun}。${weakFun}。你是<b>${es.dom}</b>型选手，${dm.st ? '能量足但需要泄压阀' : '需要外援加buff'}。${cp.score >= 85 ? cpYear + '年运势在线，别浪费好牌！' : cp.score >= 74 ? cpYear + '年不算大年但也不差，稳着来。' : cpYear + '年先蓄力，你的高光时刻在后面。'}</p></div>`
            );
        }
        if (activeSection === 'personality') {
            return `<div class="${styles.radarWrap}"><canvas id="radarChart"></canvas></div><div class="${styles.secHeading}">性格总结</div>日主<b>${dm.stem}${dm.el}</b>，${dmS}。${narr.p}。五行中<b>${es.dom}</b>气最旺（${prof[es.dom].toFixed(1)}），对应${domGod}——${godDesc[domGod] || ''}；<b>${es.weak}</b>最弱（${prof[es.weak].toFixed(1)}），对应${weakGod}——容易在相关事务上节奏卡顿。${dm.st ? '偏主动型选手——决策快、执行力强、喜欢掌控节奏，但有时候刚过头容易把人怼走，大事面前缓一拍反而更稳' : '偏内敛型选手——思虑细腻、观察力强、做事讲铺垫，但关键时刻容易犹豫拖延，需要有人推一把或者自己逼自己一下'}。年柱${yearP.sEl}气奠定了从小的性格底色，月柱${monthP.sEl}气决定了在外人面前的人设。<br><br><div class="${styles.secHeading}">优势与短板</div><ul class="${styles.adviceList}"><li><b>核心天赋：</b>${es.dom}旺 → ${domFun}</li><li><b>容易卡壳：</b>${es.weak}弱 → ${weakFun}</li><li><b>社交风格：</b>${dm.st ? '天生带点气场，别人容易被你说服或者被你吓到' : '天生亲和力不错，但有时候太在意别人感受反而消耗自己'}</li>${missing.length ? `<li><b>缺失五行：</b>${missing.join('、')}偏弱——${missingTxt}</li>` : ''}</ul><br><div class="${styles.secHeading}">开运指南</div><ul class="${styles.adviceList}"><li>用神<b>${dm.fav}</b>加持：${favT.join('、')}</li><li>忌神<b>${dm.bad}</b>避雷：${badT}</li><li>五行平衡度${es.bal}分——${es.bal >= 85 ? '格局端正，顺着自己节奏走就好' : '有意识补短板，多借用神属性的外力来平衡'}</li></ul><div class="${styles.tipBox}"><p><span class="${styles.tipLabel}">💬 说人话</span></p><p>${persFun}。${es.dom}旺的人${domFun.toLowerCase()}。缺${es.weak}的副作用：${weakFun.toLowerCase()}。简单说就是——你的出厂设置${dm.st ? '自带主角光环，但记得给配角留点戏份' : '是辅助型天赋，但别小看自己，关键时刻你才是团队的定心丸'}。</p></div>`;
        }
        if (activeSection === 'career') {
            return careerBlock();
        }
        if (activeSection === 'love') {
            return loveBlock();
        }
        if (activeSection === 'wealth') {
            return wealthBlock();
        }
        return '';
    })();

    /* ── Tooltip brief ── */
    const tooltipBrief = reading?.yearBriefs.find(i => i.age === selAge)?.text || '';

    /* ── Section tab labels (age-aware) ── */
    const sectionLabels: Record<string, string> = {
        summary: '总览',
        personality: '性格',
        career: selAge <= 18 ? '学业' : '事业',
        love: selAge <= 12 ? '社交' : selAge <= 18 ? '人际' : '感情',
        wealth: selAge <= 12 ? '零花钱' : selAge <= 18 ? '财务' : '财富'
    };

    /* ── After rendering section, bind canvas refs ── */
    useEffect(() => {
        if (!readingRef.current) {
            return;
        }
        const rc = readingRef.current.querySelector('#radarChart') as HTMLCanvasElement | null;
        if (rc && radarRef.current !== rc) {
            (radarRef as React.MutableRefObject<HTMLCanvasElement | null>).current = rc;
            drawRadarChart();
        }
        const wc = readingRef.current.querySelector('#wealthMC') as HTMLCanvasElement | null;
        if (wc && wealthRef.current !== wc) {
            (wealthRef as React.MutableRefObject<HTMLCanvasElement | null>).current = wc;
            if (reading) {
                const pt = reading.charts.line.find(i => i.age === selAge);
                if (pt) {
                    const mw = buildMonthWealth(
                        pt,
                        reading.pillars,
                        reading.profile,
                        reading.dm,
                        reading.daYun,
                        reading.es
                    );
                    drawWealthChart(mw);
                }
            }
        }
    }, [sectionHtml, drawRadarChart, drawWealthChart, reading, selAge]);

    return (
        <>
            <Head>
                <title>命运图谱</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
                />
            </Head>
            <div className={styles.page}>
                {/* ── Hero Form ── */}
                {!showResult && (
                    <div className={styles.hero}>
                        <div className={styles.eyebrow}>DESTINY ATLAS</div>
                        <h1 className={styles.heroTitle}>命运图谱</h1>
                        <div className={styles.desc}>
                            输入生辰信息，基于八字命理体系，为你绘制一生运势K线并给出关键维度评分，一张图谱读懂命盘全貌。
                        </div>
                    </div>
                )}
                {/* ── Hero Result ── */}
                {showResult && (
                    <div className={styles.hero}>
                        <div className={styles.heroRow}>
                            <div className={styles.heroMain}>
                                <h1 className={styles.heroTitle}>命运图谱</h1>
                                <div className={styles.eyebrow}>DESTINY ATLAS</div>
                            </div>
                            <div className={styles.heroActions}>
                                <button className={styles.shareBtn} onClick={openShare}>
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M12 16V4" />
                                        <path d="M7 9l5-5 5 5" />
                                        <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
                                    </svg>
                                    <span>分享</span>
                                </button>
                                <button className={styles.backLink} onClick={handleBack}>
                                    <span className={styles.backArrow}>‹</span>
                                    重新输入
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Form Panel ── */}
                {!showResult && (
                    <div className={styles.panel}>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>姓名</label>
                            <input
                                className={styles.fieldInput}
                                placeholder="请输入姓名"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>性别</label>
                            <div className={styles.chips}>
                                {(['female', 'male'] as const).map(g => (
                                    <button
                                        key={g}
                                        className={`${styles.chip} ${gender === g ? styles.chipActive : ''}`}
                                        style={
                                            gender === g
                                                ? {
                                                      color: 'rgba(255,255,255,1)',
                                                      WebkitTextFillColor: 'rgba(255,255,255,1)'
                                                  }
                                                : {color: 'var(--text-primary)', WebkitTextFillColor: 'unset'}
                                        }
                                        onClick={() => {
                                            setGender(g);
                                            log('click', 'new_agent', {action_type: 'option_select'});
                                        }}
                                    >
                                        {g === 'female' ? '女' : '男'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.stack}>
                            <div className={styles.field}>
                                <label className={styles.fieldLabel}>出生日期（公历）</label>
                                <input
                                    className={`${styles.fieldInput} ${styles.dateTimeInput}`}
                                    type="date"
                                    placeholder="年月日"
                                    max={new Date().toISOString().split('T')[0]}
                                    value={birthDate}
                                    onChange={e => setBirthDate(e.target.value)}
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.fieldLabel}>出生时间</label>
                                <input
                                    ref={timeInputRef}
                                    className={`${styles.fieldInput} ${styles.dateTimeInput}`}
                                    type="time"
                                    placeholder="--:--"
                                    max={(() => {
                                        const n = new Date();
                                        const todayLocal = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
                                        if (birthDate !== todayLocal) {
                                            return undefined;
                                        }
                                        return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
                                    })()}
                                    value={birthTime}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const n = new Date();
                                        const todayLocal = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
                                        if (birthDate === todayLocal) {
                                            const nowStr = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
                                            if (val > nowStr) {
                                                NewAppBridge.toast.info('出生时间不能选择未来');
                                                setBirthTime(nowStr);
                                                if (timeInputRef.current) {
                                                    timeInputRef.current.value = nowStr;
                                                }
                                                return;
                                            }
                                        }
                                        setBirthTime(val);
                                    }}
                                />
                            </div>
                        </div>
                        <div className={`${styles.field} ${styles.fieldLast}`}>
                            <label className={styles.fieldLabel}>出生地</label>
                            <div className={styles.bpRow}>
                                <select
                                    className={styles.fieldSelect}
                                    value={province}
                                    onChange={e => {
                                        setProvince(e.target.value);
                                        setCity('');
                                        setCityName('');
                                    }}
                                >
                                    <option value="">省份</option>
                                    {PROV_CITIES.map(([p]) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className={styles.fieldSelect}
                                    value={cityName}
                                    onChange={e => {
                                        const nextCityName = e.target.value;
                                        const nextCity = cities.find(([cName]) => cName === nextCityName);
                                        setCityName(nextCityName);
                                        setCity(nextCity ? String(nextCity[1]) : '');
                                    }}
                                >
                                    <option value="">城市</option>
                                    {cities.map(([cName]) => (
                                        <option key={cName} value={cName}>
                                            {cName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button className={styles.button} onClick={handleGenerate}>
                            生成命盘分析
                        </button>
                    </div>
                )}

                {/* ── Result View ── */}
                {showResult && reading && (
                    <>
                        {/* Chart Panel */}
                        <div className={styles.panel} style={{marginTop: 8, paddingTop: 14, paddingBottom: 14}}>
                            <div className={styles.chartHeader}>
                                <div className={styles.scTitle}>@{reading.name}</div>
                                <div className={styles.chartModeTabs}>
                                    {(['kline', 'line'] as const).map(m => (
                                        <button
                                            key={m}
                                            className={`${styles.chartModeTab} ${chartMode === m ? styles.chartModeTabActive : ''}`}
                                            onClick={() => {
                                                setChartMode(m);
                                                log('click', 'new_agent', {action_type: 'option_select'});
                                            }}
                                        >
                                            {m === 'kline' ? 'K线' : '折线'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.chartScroll} ref={scrollRef}>
                                <div className={styles.chartWrap}>
                                    <canvas className={styles.canvas} ref={chartRef} onClick={handleChartClick} />
                                    <div
                                        ref={tooltipRef}
                                        className={`${styles.tooltipCard} ${selAge ? '' : styles.tooltipCardHidden}`}
                                    >
                                        <div className={styles.tooltipYear}>
                                            {selYear}年 · <b>{selScore}</b>分
                                        </div>
                                        <div className={styles.tooltipScore}>{tooltipBrief}</div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.zoomHint}>双指缩放 · 滑动平移</div>

                            {/* Year Chart Section (Ring) */}
                            <div style={{marginTop: 10}}>
                                <div style={{marginTop: 14, padding: '10px 2px'}}>
                                    <div
                                        className={styles.ringHeader}
                                        dangerouslySetInnerHTML={{__html: ringHeaderHtml}}
                                    />
                                    <div className={styles.ringLayout}>
                                        <div className={styles.ringLeft}>
                                            <canvas ref={ringRef} />
                                        </div>
                                        <div
                                            className={styles.ringRight}
                                            dangerouslySetInnerHTML={{__html: ringRightHtml}}
                                        />
                                    </div>
                                    <div
                                        className={styles.yearInsight}
                                        dangerouslySetInnerHTML={{__html: yearInsightHtml}}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Analysis Panel */}
                        <div className={styles.panel}>
                            <div className={styles.panelTitle}>命盘总览</div>
                            <div className={styles.sectionTabs}>
                                {(['summary', 'personality', 'career', 'love', 'wealth'] as const).map(sec => (
                                    <button
                                        key={sec}
                                        className={`${styles.sectionTab} ${activeSection === sec ? styles.sectionTabActive : ''}`}
                                        onClick={() => {
                                            setActiveSection(sec);
                                            log('click', 'new_agent', {action_type: 'button_click'});
                                        }}
                                    >
                                        {sectionLabels[sec]}
                                    </button>
                                ))}
                            </div>
                            <div ref={readingRef}>
                                <div className={styles.readingCard}>
                                    <div
                                        className={styles.readingContent}
                                        dangerouslySetInnerHTML={{__html: sectionHtml}}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {/* Share overlay */}
            {showShareOverlay && (
                <div
                    className={styles.shareOverlay}
                    onClick={e => {
                        if (e.target === e.currentTarget) {
                            setShowShareOverlay(false);
                        }
                    }}
                >
                    <div className={styles.shareScrollArea}>
                        {shareData && (
                            <div ref={shareCardRef} className={styles.sharePreview}>
                                <div className={styles.sharePreviewHeader}>
                                    <div className={styles.sharePreviewTitle}>{reading?.name || '未命名'}的命运图谱</div>
                                    <div className={styles.sharePreviewSub}>{shareData.point.year}年运势 · {shareData.grade}</div>
                                    <div className={styles.sharePreviewDesc}>{reading?.narr?.p || ''}</div>
                                </div>

                                <div className={styles.shareSection}>
                                    <div className={styles.shareSectionTitle}>{shareData.point.year}年运势详情</div>
                                    <div className={styles.shareSectionSub}>总分 {shareData.point.score} · {shareData.grade}</div>
                                    <div className={styles.shareScoreRow}>
                                        <div className={styles.shareScoreRing}>
                                            <canvas ref={shareRingRef} className={styles.shareScoreCanvas} />
                                        </div>
                                        <div className={styles.shareScoreList}>
                                            {DIMS.map(dim => (
                                                <div key={dim.key} className={styles.shareScoreItem}>
                                                    <div className={styles.shareScoreMeta}>
                                                        <span className={styles.shareScoreDot} style={{background: dim.color[0]}} />
                                                        <div>
                                                            <div className={styles.shareScoreLabel}>{dim.label}</div>
                                                            <div className={styles.shareScoreHint}>{dimQuip(dim.key, shareData.scoreMap[dim.key], shareData.point.age)}</div>
                                                        </div>
                                                    </div>
                                                    <div className={styles.shareScoreValue} style={{color: dim.color[0]}}>
                                                        {shareData.scoreMap[dim.key]}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className={`${styles.shareSection} ${styles.shareInsightCard}`}>
                                    <div className={styles.shareInsightTitle}>{shareData.insightTitle}</div>
                                    <div className={styles.shareInsightText}>{shareData.insightText}</div>
                                </div>

                                <div className={styles.shareSection}>
                                    <div className={styles.shareLineTitle}>
                                        <span><i className={styles.shareBullet} style={{background: DIMS[0].color[0]}} />{shareData.point.year}年事业月度节奏</span>
                                        <strong style={{color: DIMS[0].color[0]}}>{shareData.scoreMap[DIMS[0].key]}</strong>
                                    </div>
                                    <div className={styles.shareCareerBar}>
                                        {shareData.careerSegments.map((segment, index) => (
                                            <div
                                                key={`${segment.phase}-${index}`}
                                                className={`${styles.shareCareerSegment} ${styles[`shareCareer${segment.phase[0].toUpperCase()}${segment.phase.slice(1)}`]}`}
                                                style={{flex: segment.end - segment.start + 1}}
                                            >
                                                {segment.end - segment.start >= 1 ? (
                                                    <span>
                                                        {segment.phase === 'peak' ? '发力期' : segment.phase === 'push' ? '推进期' : segment.phase === 'gather' ? '蓄力期' : segment.phase === 'wrap' ? '收束期' : '平稳期'}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.shareMonthTicks}>
                                        {shareData.career.map(item => <span key={item.month}>{item.month}</span>)}
                                    </div>
                                </div>

                                <div className={styles.shareSection}>
                                    <div className={styles.shareLineTitle}>
                                        <span><i className={styles.shareBullet} style={{background: DIMS[2].color[0]}} />{shareData.point.year}年感情月度热力</span>
                                        <strong style={{color: DIMS[2].color[0]}}>{shareData.scoreMap[DIMS[2].key]}</strong>
                                    </div>
                                    <div className={styles.shareHeatmap}>
                                        {shareData.love.map(item => (
                                            <div key={item.month} className={styles.shareHeatCell}>
                                                <span>{item.month}月</span>
                                                <strong>{item.score}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.shareSection}>
                                    <div className={styles.shareLineTitle}>
                                        <span><i className={styles.shareBullet} style={{background: DIMS[1].color[0]}} />{shareData.point.year}年财富月度K线</span>
                                        <strong style={{color: DIMS[1].color[0]}}>{shareData.scoreMap[DIMS[1].key]}</strong>
                                    </div>
                                    <div className={styles.shareWealthCanvasWrap}>
                                        <canvas ref={shareWealthRef} className={styles.shareWealthCanvas} />
                                    </div>
                                </div>

                                <div className={styles.sharePreviewFooter}>DESTINY ATLAS · 命运图谱</div>
                            </div>
                        )}
                    </div>
                    <div className={styles.shareActionBar}>
                        <button className={styles.shareSaveBtn} onClick={saveShareAsImage} disabled={shareSaving}>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                            {shareSaving ? '生成中…' : '保存图片'}
                        </button>
                        <button className={styles.shareCloseBtn} onClick={() => setShowShareOverlay(false)}>
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

const DestinyChartPage = dynamic(() => Promise.resolve(DestinyChart), {ssr: false});
(DestinyChartPage as any).noLayout = true;
export default DestinyChartPage;
