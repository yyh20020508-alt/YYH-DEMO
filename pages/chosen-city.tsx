import {useState, useRef, useCallback, useEffect, useMemo} from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import {useNewAppTheme} from '@/hooks/useNewAppTheme';
import {useNewAppLog} from '@/hooks/useNewAppLog';
import {NewAppBridge} from '@/lib/newapp-bridge';
import {NewAppFooterButton} from '@/components/NewAppFooterButton';
import {NewAppTopBar} from '@/components/NewAppTopBar';
import styles from '@/styles/chosen-city.module.css';
import pageData from '@/config/chosen-city-data.json';
import {
    DIMENSIONS,
    QUESTIONS,
    LOADING_LINES,
    CHINA_REGIONS,
    PROVINCE_DEFAULTS,
    CITY_OVERRIDES,
    TIER_SCORES,
    GEO_SCORES,
    ECON_SCORES,
    REGION_SCORES,
    CULTURE_SCORES,
    KW_POOLS,
    MOMENT_BANK,
    PERSONA_ARCHETYPES,
    SIGN_TO_CN,
    SIGN_PROFILES,
    HOUSE_PROFILES,
    PLANET_DIM_AFFINITIES,
    ASPECT_MODIFIERS,
    ELEMENT_CLIMATE_PREF,
    SIGN_ELEMENT,
    getTopDimKeys,
    clampScores,
    normalizeAstroScores,
    getBaseScores,
    addScores,
    getCityAttrs,
    computeCityScores,
    buildAllCities,
    hashStr,
    pickCityKeywords,
    pickCityMoment,
    applySignImpact,
    applyHouseImpact,
    applyAllAspects,
    detectPatterns,
    applyPatternBonuses,
    getDominantElement,
    applyQuestionCorrections,
    calculateSimilarity,
    getPersonaLabel,
    generateInsights,
    generateUserKeywords,
    generateAuraText,
    generateCityInsights,
    type DimKey,
    type DimScores,
    type CityData,
    type AstroProfile,
    type ResultData
} from '@/lib/chosen-city-utils';

type Screen = 'intro' | 'quiz' | 'loading' | 'result';

interface ProfileState {
    nickname: string;
    gender: string;
    birthDate: string;
    birthTime: string;
    birthProvince: string;
    birthCity: string;
}

function Content() {
    useNewAppTheme();
    const {log, setPage: setLogPage} = useNewAppLog({pageName: 'new_agent_detail', agentName: pageData.page.agentName});

    // ── State ──
    const [screen, setScreen] = useState<Screen>('intro');
    const [profile, setProfile] = useState<ProfileState>({
        nickname: '',
        gender: '女',
        birthDate: '',
        birthTime: '',
        birthProvince: '北京市',
        birthCity: '北京市'
    });
    const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [result, setResult] = useState<ResultData | null>(null);
    const [loadingText, setLoadingText] = useState(LOADING_LINES[0]);
    const [toastMsg, setToastMsg] = useState('');
    const [toastVisible, setToastVisible] = useState(false);

    // Modal states
    const [dimModal, setDimModal] = useState<{key: DimKey; user: DimScores; city: DimScores} | null>(null);
    const [cityDetailModal, setCityDetailModal] = useState<CityData | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareImgSrc, setShareImgSrc] = useState('');

    // Refs
    const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const natalLibRef = useRef<any>(null);
    const cityCoordRef = useRef<any>(null);

    // ── Derived: cities for selected province ──
    const citiesForProvince = useMemo(() => {
        return CHINA_REGIONS[profile.birthProvince] || [];
    }, [profile.birthProvince]);

    // ── Effects ──
    useEffect(() => {
        loadNatalLib();
    }, []);

    useEffect(() => {
        const cities = CHINA_REGIONS[profile.birthProvince] || [];
        if (cities.length > 0 && !cities.includes(profile.birthCity)) {
            setProfile(p => ({...p, birthCity: cities[0]}));
        }
    }, [profile.birthProvince]);

    async function loadNatalLib() {
        if (typeof window === 'undefined') {
            return;
        }
        // @ts-ignore
        if (window.__NATAL_LIB__) {
            // @ts-ignore
            natalLibRef.current = window.__NATAL_LIB__;
            return;
        }
        await new Promise<void>(resolve => {
            const script = document.createElement('script');
            script.src = '/scripts/natal-lib.js';
            script.onload = () => {
                // @ts-ignore
                natalLibRef.current = window.__NATAL_LIB__ || null;
                resolve();
            };
            script.onerror = () => resolve();
            document.head.appendChild(script);
        });
    }

    // ── Helpers ──
    function pickDiverseTop3<T extends {province: string; fullName: string}>(ranked: T[], winner: T): T[] {
        const result: T[] = [];
        const usedProvinces = new Set<string>([winner.province]);
        for (const city of ranked) {
            if (result.length >= 3) {
                break;
            }
            if (!usedProvinces.has(city.province)) {
                result.push(city);
                usedProvinces.add(city.province);
            }
        }
        if (result.length < 3) {
            for (const city of ranked) {
                if (result.length >= 3) {
                    break;
                }
                if (!result.find(c => c.fullName === city.fullName)) {
                    result.push(city);
                }
            }
        }
        return result;
    }

    function showToast(msg: string) {
        setToastMsg(msg);
        setToastVisible(true);
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => setToastVisible(false), 2500);
    }

    function calculateProfessionalAstroProfile(prof: ProfileState): AstroProfile | null {
        const lib = natalLibRef.current;
        if (!lib?.Origin || !lib?.Horoscope) {
            return null;
        }

        try {
            const {Origin, Horoscope} = lib;
            const coords = getBirthCoordinates(prof.birthProvince, prof.birthCity);
            if (!coords) {
                return null;
            }

            const [year, month, day] = prof.birthDate.split('-').map(Number);
            const time = prof.birthTime || '12:00';
            const [hour, minute] = time.split(':').map(Number);

            const origin = new Origin({
                year,
                month: month - 1,
                date: day,
                hour,
                minute,
                latitude: coords.lat,
                longitude: coords.lng
            });
            const horoscope = new Horoscope({
                origin,
                houseSystem: 'placidus',
                zodiac: 'tropical',
                aspectPoints: ['bodies', 'points', 'angles'],
                aspectWithPoints: ['bodies', 'points', 'angles'],
                aspectTypes: ['major', 'minor'],
                language: 'en'
            });

            const scores = getBaseScores();

            applySignImpact(scores, horoscope.CelestialBodies.sun.Sign.key, {drive: 4, vibe: 1.5, connection: 0.5});
            applySignImpact(scores, horoscope.CelestialBodies.moon.Sign.key, {healing: 5, vibe: 2, freedom: 0.5});
            applySignImpact(scores, horoscope.Ascendant.Sign.key, {drive: 4, connection: 2, freedom: 2, order: 2});
            applySignImpact(scores, horoscope.CelestialBodies.mercury.Sign.key, {
                connection: 3,
                order: 3,
                freedom: 0.5
            });
            applySignImpact(scores, horoscope.CelestialBodies.venus.Sign.key, {connection: 3.5, healing: 3, vibe: 3});
            applySignImpact(scores, horoscope.CelestialBodies.mars.Sign.key, {drive: 4, freedom: 2.5, vibe: 0.5});
            applySignImpact(scores, horoscope.CelestialBodies.jupiter.Sign.key, {freedom: 4, connection: 2, drive: 1});
            applySignImpact(scores, horoscope.CelestialBodies.saturn.Sign.key, {order: 5, drive: 2, healing: 0.5});
            applySignImpact(scores, horoscope.CelestialBodies.uranus.Sign.key, {freedom: 3, vibe: 1, connection: 0.5});
            applySignImpact(scores, horoscope.CelestialBodies.neptune.Sign.key, {healing: 3, vibe: 2, freedom: 0.5});
            applySignImpact(scores, horoscope.CelestialBodies.pluto.Sign.key, {drive: 2, order: 1.5, vibe: 2});
            if (horoscope.CelestialBodies.chiron) {
                applySignImpact(scores, horoscope.CelestialBodies.chiron.Sign.key, {healing: 3, vibe: 1.5, freedom: 1});
            }
            applySignImpact(scores, horoscope.Midheaven.Sign.key, {drive: 4, order: 3, connection: 2});
            if (horoscope.CelestialPoints.northnode) {
                applySignImpact(scores, horoscope.CelestialPoints.northnode.Sign.key, {
                    drive: 2.5,
                    freedom: 2,
                    connection: 1.5
                });
            }
            if (horoscope.CelestialPoints.southnode) {
                applySignImpact(scores, horoscope.CelestialPoints.southnode.Sign.key, {
                    healing: 2,
                    order: 1.5,
                    vibe: 1
                });
            }
            if (horoscope.CelestialPoints.lilith) {
                applySignImpact(scores, horoscope.CelestialPoints.lilith.Sign.key, {freedom: 3, vibe: 2, drive: 1});
            }

            applyHouseImpact(scores, horoscope.CelestialBodies.sun.House.id, {drive: 3, order: 2, connection: 1.5});
            applyHouseImpact(scores, horoscope.CelestialBodies.moon.House.id, {healing: 3.5, vibe: 1.5, freedom: 1});
            applyHouseImpact(scores, horoscope.CelestialBodies.venus.House.id, {connection: 3, healing: 2, vibe: 2});
            applyHouseImpact(scores, horoscope.CelestialBodies.mars.House.id, {drive: 3, freedom: 1.5, vibe: 0.5});
            applyHouseImpact(scores, horoscope.CelestialBodies.jupiter.House.id, {
                freedom: 3,
                connection: 1.5,
                drive: 1
            });
            applyHouseImpact(scores, horoscope.CelestialBodies.saturn.House.id, {order: 3.5, drive: 1, healing: 0.5});
            if (horoscope.CelestialBodies.chiron) {
                applyHouseImpact(scores, horoscope.CelestialBodies.chiron.House.id, {
                    healing: 2.5,
                    vibe: 1,
                    freedom: 0.5
                });
            }

            applyAllAspects(scores, horoscope.Aspects.all);
            const patterns = detectPatterns(horoscope.Aspects.all);
            applyPatternBonuses(scores, patterns);
            normalizeAstroScores(scores);
            clampScores(scores);

            const sunSign = horoscope.CelestialBodies.sun.Sign.key;
            const moonSign = horoscope.CelestialBodies.moon.Sign.key;
            const ascSign = horoscope.Ascendant.Sign.key;
            const mcSign = horoscope.Midheaven.Sign.key;
            const dominantElement = getDominantElement(horoscope);

            return {
                scores,
                summary: `太阳${SIGN_TO_CN[sunSign]}、月亮${SIGN_TO_CN[moonSign]}、上升${SIGN_TO_CN[ascSign]}`,
                detail: `中天${SIGN_TO_CN[mcSign]}${horoscope.CelestialPoints.northnode ? '、北交' + SIGN_TO_CN[horoscope.CelestialPoints.northnode.Sign.key] : ''}`,
                majorAspectCount: horoscope.Aspects.all.length,
                patternCount: patterns.length,
                patterns: patterns.map((p: any) => p.type),
                dominantElement,
                usedTimeFallback: !prof.birthTime
            };
        } catch (e) {
            return null;
        }
    }

    function getBirthCoordinates(province: string, city: string) {
        const coordData = cityCoordRef.current;
        if (!coordData) {
            // Fallback: use approximate coordinates from prov-cities.json structure
            return {lat: 39.9, lng: 116.4}; // Default Beijing
        }
        const provinceMap = coordData[province] || {};
        const coords = provinceMap[city] || provinceMap[Object.keys(provinceMap)[0]];
        return coords || {lat: 39.9, lng: 116.4};
    }

    function buildResultData(): ResultData {
        const astroProfile = calculateProfessionalAstroProfile(profile);
        const baseScores = astroProfile ? {...astroProfile.scores} : getBaseScores();
        const userScores = {...baseScores};
        applyQuestionCorrections(userScores, answers, astroProfile ? {...astroProfile.scores} : null);

        const allCities = buildAllCities(CHINA_REGIONS);
        const dominantElement = astroProfile?.dominantElement || 'earth';
        const rankedCities = allCities
            .map(city => ({
                ...city,
                similarity: calculateSimilarity(userScores, city.scores, city.attrs, dominantElement)
            }))
            .sort((a, b) => b.similarity! - a.similarity!);

        const winner = rankedCities[0];
        const top3 = pickDiverseTop3(rankedCities.slice(1), winner);
        const personaLabel = getPersonaLabel(userScores);
        const ap = astroProfile || {
            scores: baseScores,
            summary: '基于偏好测试',
            detail: '',
            majorAspectCount: 0,
            patternCount: 0,
            patterns: [],
            dominantElement: 'earth',
            usedTimeFallback: !profile.birthTime
        };
        const insights = generateInsights(userScores, winner, ap);
        const keywords = generateUserKeywords(userScores);
        const cityKeywords = pickCityKeywords(winner.fullName, winner.scores);
        const cityMoment = pickCityMoment(winner.fullName, winner.scores, winner.attrs);

        return {userScores, winner, top3, personaLabel, insights, keywords, cityKeywords, cityMoment, astroProfile: ap};
    }

    // ── Event handlers ──
    function handleProfileSubmit() {
        if (!profile.nickname.trim()) {
            showToast('先写一个昵称吧');
            return;
        }
        if (!profile.birthDate) {
            showToast('先填写出生年月日');
            return;
        }
        if (!profile.birthProvince || !profile.birthCity) {
            showToast('出生地也要填一下');
            return;
        }
        log('click', 'new_agent', {action_type: 'button_click'});
        setCurrentQuestion(0);
        setScreen('quiz');
    }

    function selectOption(optionIndex: number) {
        log('click', 'new_agent', {action_type: 'option_select'});
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = optionIndex;
        setAnswers(newAnswers);

        if (currentQuestion < QUESTIONS.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            launchLoading(newAnswers);
        }
    }

    function launchLoading(finalAnswers: (number | null)[]) {
        setScreen('loading');
        let idx = 0;
        setLoadingText(LOADING_LINES[0]);

        if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
        }
        if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
        }

        loadingIntervalRef.current = setInterval(() => {
            idx = (idx + 1) % LOADING_LINES.length;
            setLoadingText(LOADING_LINES[idx]);
        }, 850);

        loadingTimerRef.current = setTimeout(() => {
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
            }
            try {
                // Use finalAnswers directly since state may not be updated yet
                const tempAnswers = finalAnswers;
                const prevAnswers = answers;
                // Temporarily update answers for buildResultData
                setAnswers(tempAnswers);
                const r = buildResultFromAnswers(tempAnswers);
                setResult(r);
                setScreen('result');
                log('show', 'new_agent_result', {}, 'new_agent_detail');
            } catch (error) {
                showToast('计算暂时失败，请重试');
                setScreen('intro');
            }
        }, 3200);
    }

    function buildResultFromAnswers(currentAnswers: (number | null)[]): ResultData {
        const astroProfile = calculateProfessionalAstroProfile(profile);
        const baseScores = astroProfile ? {...astroProfile.scores} : getBaseScores();
        const userScores = {...baseScores};
        applyQuestionCorrections(userScores, currentAnswers, astroProfile ? {...astroProfile.scores} : null);

        const allCities = buildAllCities(CHINA_REGIONS);
        const dominantElement = astroProfile?.dominantElement || 'earth';
        const rankedCities = allCities
            .map(city => ({
                ...city,
                similarity: calculateSimilarity(userScores, city.scores, city.attrs, dominantElement)
            }))
            .sort((a, b) => b.similarity! - a.similarity!);

        const winner = rankedCities[0];
        const top3 = pickDiverseTop3(rankedCities.slice(1), winner);
        const personaLabel = getPersonaLabel(userScores);
        const ap = astroProfile || {
            scores: baseScores,
            summary: '基于偏好测试',
            detail: '',
            majorAspectCount: 0,
            patternCount: 0,
            patterns: [],
            dominantElement: 'earth',
            usedTimeFallback: !profile.birthTime
        };
        const insights = generateInsights(userScores, winner, ap);
        const keywords = generateUserKeywords(userScores);
        const cityKeywords = pickCityKeywords(winner.fullName, winner.scores);
        const cityMoment = pickCityMoment(winner.fullName, winner.scores, winner.attrs);

        return {userScores, winner, top3, personaLabel, insights, keywords, cityKeywords, cityMoment, astroProfile: ap};
    }

    function handleRestart() {
        log('click', 'new_agent', {action_type: 'retry'});
        if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
        }
        if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current);
        }
        setAnswers(Array(QUESTIONS.length).fill(null));
        setCurrentQuestion(0);
        setResult(null);
        setScreen('intro');
    }

    // ── Radar SVG rendering ──
    function renderRadarSvg(user: DimScores, city: DimScores, interactive = true) {
        const size = 320;
        const center = size / 2;
        const radius = 104;
        const levels = 4;

        const toPoint = (value: number, index: number) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / DIMENSIONS.length;
            const scaled = (value / 100) * radius;
            return {x: center + Math.cos(angle) * scaled, y: center + Math.sin(angle) * scaled};
        };

        const polygon = (values: DimScores) =>
            DIMENSIONS.map((dim, i) => {
                const p = toPoint(values[dim.key], i);
                return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
            }).join(' ');

        const rings = Array.from({length: levels}, (_, idx) => {
            const r = (radius / levels) * (idx + 1);
            const points = DIMENSIONS.map((_, i) => {
                const a = -Math.PI / 2 + (Math.PI * 2 * i) / DIMENSIONS.length;
                return `${(center + Math.cos(a) * r).toFixed(2)},${(center + Math.sin(a) * r).toFixed(2)}`;
            }).join(' ');
            return (
                <polygon
                    key={`ring-${idx}`}
                    points={points}
                    stroke="rgba(166,150,255,0.12)"
                    strokeWidth="1"
                    fill="none"
                />
            );
        });

        const axes = DIMENSIONS.map((_, i) => {
            const p = toPoint(100, i);
            return (
                <line
                    key={`axis-${i}`}
                    x1={center}
                    y1={center}
                    x2={p.x}
                    y2={p.y}
                    stroke="rgba(166,150,255,0.08)"
                    strokeWidth="1"
                />
            );
        });

        const labels = DIMENSIONS.map((dim, i) => {
            const o = toPoint(116, i);
            return (
                <text
                    key={`label-${i}`}
                    x={o.x}
                    y={o.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fill="rgba(74,71,102,0.7)"
                    style={{cursor: interactive ? 'pointer' : 'default'}}
                    onClick={interactive ? () => setDimModal({key: dim.key, user, city}) : undefined}
                >
                    {dim.name}
                </text>
            );
        });

        const cityPoints = DIMENSIONS.map((dim, i) => {
            const p = toPoint(city[dim.key], i);
            return <circle key={`cp-${i}`} cx={p.x} cy={p.y} r="3.8" fill="rgba(143,220,255,1)" />;
        });

        const userPoints = DIMENSIONS.map((dim, i) => {
            const p = toPoint(user[dim.key], i);
            return <circle key={`up-${i}`} cx={p.x} cy={p.y} r="3.8" fill="rgba(166,150,255,1)" />;
        });

        return (
            <svg viewBox="0 0 320 320" className={styles.radarSvg} aria-label="双层重叠雷达图">
                <defs>
                    <filter id="glowUser">
                        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="rgba(166,150,255,0.45)" />
                    </filter>
                    <filter id="glowCity">
                        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="rgba(143,220,255,0.4)" />
                    </filter>
                </defs>
                {rings}
                {axes}
                <polygon
                    points={polygon(city)}
                    fill="rgba(143,220,255,0.2)"
                    stroke="rgba(143,220,255,0.9)"
                    strokeWidth="2"
                    filter="url(#glowCity)"
                />
                <polygon
                    points={polygon(user)}
                    fill="rgba(166,150,255,0.18)"
                    stroke="rgba(166,150,255,0.9)"
                    strokeWidth="2"
                    filter="url(#glowUser)"
                />
                {cityPoints}
                {userPoints}
                {labels}
            </svg>
        );
    }

    // ── Share image generation ──
    function generateShareImage() {
        if (!result) {
            return;
        }
        log('click', 'new_agent', {action_type: 'button_click'});

        function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
            c.moveTo(x + r, y);
            c.lineTo(x + w - r, y);
            c.arcTo(x + w, y, x + w, y + r, r);
            c.lineTo(x + w, y + h - r);
            c.arcTo(x + w, y + h, x + w - r, y + h, r);
            c.lineTo(x + r, y + h);
            c.arcTo(x, y + h, x, y + h - r, r);
            c.lineTo(x, y + r);
            c.arcTo(x, y, x + r, y, r);
            c.closePath();
        }

        function wrapLines(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
            const lines: string[] = [];
            let cur = '';
            for (const ch of text || '') {
                if (c.measureText(cur + ch).width > maxW && cur) {
                    lines.push(cur);
                    cur = ch;
                } else {
                    cur += ch;
                }
            }
            if (cur) {
                lines.push(cur);
            }
            return lines;
        }

        function buildShareSummary(res: ResultData): string {
            const city = res.winner.name;
            const ap = res.astroProfile || ({} as AstroProfile);
            const sortD = (s: DimScores) =>
                (Object.keys(s) as string[]).sort((a, b) => s[b as DimKey] - s[a as DimKey]);
            const uTop = sortD(res.userScores);
            const cTop = sortD(res.winner.scores);
            const dimN = (k: string) => (DIMENSIONS.find(d => d.key === k) || {name: k}).name;
            const overlaps = uTop.slice(0, 2).filter(k => cTop.slice(0, 3).includes(k));
            const rel = overlaps.length >= 2 ? '深度共鸣' : overlaps.length >= 1 ? '精准呼应' : '互补平衡';
            let s = '';
            if (overlaps.length >= 2) {
                s += `你的${dimN(overlaps[0])}和${dimN(overlaps[1])}，恰好是${city}最擅长给予的。`;
            } else if (overlaps.length === 1) {
                s += `你与${city}在${dimN(overlaps[0])}上最为同频。`;
            } else {
                s += `${city}以${dimN(cTop[0])}和${dimN(cTop[1])}补你所缺，两者气质互补。`;
            }
            const elemCN: Record<string, string> = {fire: '火', earth: '土', air: '风', water: '水'};
            const elemCity: Record<string, string> = {
                fire: '充满活力与热度',
                earth: '务实稳定',
                air: '开放多元',
                water: '有温度有情感'
            };
            if (ap.dominantElement) {
                s += `你的星盘以${elemCN[ap.dominantElement] || ''}元素为主导，天然偏向${elemCity[ap.dominantElement] || ''}的城市气质。`;
            }
            const astroRef = ap.summary ? ap.summary.split('、')[0] + '底色的你' : '当前阶段的你';
            const c0score = res.winner.scores[cTop[0] as DimKey];
            const c1score = res.winner.scores[cTop[1] as DimKey];
            s += `综合来看，${city}以${c0score}分的${dimN(cTop[0])}和${c1score}分的${dimN(cTop[1])}为城市底色，与你的能量画像形成${rel}，是${astroRef}最契合的选择。`;
            return s;
        }

        const mc = document.createElement('canvas').getContext('2d')!;
        mc.font = "15px 'PingFang SC', sans-serif";
        const insightText = buildShareSummary(result);
        const verdictLines = wrapLines(mc, insightText, 278).slice(0, 7);

        const SCALE = 1.44;
        const VW = 750;
        const VH = 1333;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(VW * SCALE);
        canvas.height = Math.round(VH * SCALE);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }
        ctx.scale(SCALE, SCALE);

        const cR = 20;
        const iP = 24;
        const midX = VW / 2;
        const c1Y = 268;
        const c1H = 250;
        const c2Y = 534;
        const c2H = 460;
        const c3Y = 1010;
        const c3H = 284;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, VW, VH);

        // Radial glow
        const g1 = ctx.createRadialGradient(midX, 150, 0, midX, 150, 310);
        g1.addColorStop(0, 'rgba(80,170,240,0.10)');
        g1.addColorStop(0.5, 'rgba(80,170,240,0.04)');
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, VW, c1Y);

        // Orbit arcs
        (
            [
                [195, 78, -18, 0, 155, 'rgba(60,160,235,0.14)', 0.9],
                [258, 104, 14, -18, 198, 'rgba(143,220,255,0.10)', 0.8],
                [318, 132, -8, 33, 256, 'rgba(60,160,235,0.07)', 0.7],
                [158, 60, 30, 72, 282, 'rgba(160,215,255,0.11)', 0.6]
            ] as [number, number, number, number, number, string, number][]
        ).forEach(([rx, ry, rot, sa, ea, col, lw]) => {
            ctx.beginPath();
            ctx.ellipse(midX, 150, rx, ry, (rot * Math.PI) / 180, (sa * Math.PI) / 180, (ea * Math.PI) / 180);
            ctx.strokeStyle = col;
            ctx.lineWidth = lw;
            ctx.stroke();
        });

        // Star dots
        (
            [
                [82, 45, 1.5],
                [648, 62, 1.5],
                [118, 148, 1],
                [605, 185, 1],
                [52, 208, 1.5],
                [685, 128, 1],
                [155, 78, 1],
                [568, 232, 1],
                [88, 202, 1],
                [642, 105, 1.5],
                [198, 228, 1],
                [518, 72, 1],
                [32, 148, 1],
                [702, 198, 1],
                [340, 32, 2],
                [412, 216, 2],
                [95, 128, 1.5],
                [430, 120, 1],
                [290, 72, 1],
                [520, 88, 1.5],
                [170, 180, 1],
                [610, 178, 1]
            ] as [number, number, number][]
        ).forEach(([x, y, r]) => {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = r >= 2 ? 'rgba(50,181,240,0.42)' : 'rgba(50,181,240,0.24)';
            ctx.fill();
        });

        // "YOUR CITY DESTINY"
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(20,60,110,0.28)';
        ctx.font = '11px sans-serif';
        (ctx as any).letterSpacing = '4px';
        ctx.fillText('YOUR CITY DESTINY', midX, 46);
        (ctx as any).letterSpacing = '0px';

        // Headline
        ctx.fillStyle = 'rgba(20,100,200,0.62)';
        ctx.font = "bold 22px 'PingFang SC', sans-serif";
        ctx.fillText('你的天选之城是', midX, 82);

        // City name
        const cityName = result.winner.name;
        const nfs = cityName.length <= 2 ? 108 : cityName.length <= 3 ? 88 : 74;
        const nameGrad = ctx.createLinearGradient(midX - 180, 0, midX + 180, 0);
        nameGrad.addColorStop(0, '#2a8fd8');
        nameGrad.addColorStop(0.5, '#72d0f8');
        nameGrad.addColorStop(1, '#78c8f0');
        ctx.fillStyle = nameGrad;
        ctx.font = `bold ${nfs}px 'Times New Roman', 'Songti SC', serif`;
        ctx.fillText(cityName, midX, 184);

        // Astro summary
        ctx.fillStyle = 'rgba(20,60,110,0.44)';
        ctx.font = "14px 'PingFang SC', sans-serif";
        ctx.fillText(result.astroProfile?.summary || '', midX, 242);

        // Hero divider
        ctx.beginPath();
        ctx.moveTo(60, c1Y - 12);
        ctx.lineTo(VW - 60, c1Y - 12);
        ctx.strokeStyle = 'rgba(60,160,235,0.40)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Card 1: match ring + persona/keywords
        ctx.save();
        ctx.beginPath();
        rrect(ctx, 40, c1Y, VW - 80, c1H, cR);
        ctx.fillStyle = 'rgba(255,255,255,0.46)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,160,235,0.42)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(midX, c1Y + 24);
        ctx.lineTo(midX, c1Y + c1H - 24);
        ctx.strokeStyle = 'rgba(60,160,235,0.30)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left: match ring
        const rCX = 40 + (midX - 40) / 2;
        const rCY = c1Y + c1H / 2;
        const rR = 82;
        const matchFrac = Math.min((result.winner.similarity || 0) / 100, 1);

        ctx.beginPath();
        ctx.arc(rCX, rCY, rR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(60,160,235,0.14)';
        ctx.lineWidth = 12;
        ctx.stroke();

        const arcGrad = ctx.createLinearGradient(rCX - rR, rCY, rCX + rR, rCY);
        arcGrad.addColorStop(0, '#2aaae8');
        arcGrad.addColorStop(1, '#74d0f0');
        ctx.beginPath();
        ctx.arc(rCX, rCY, rR, -Math.PI / 2, -Math.PI / 2 + matchFrac * Math.PI * 2);
        ctx.strokeStyle = arcGrad;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#1068c8';
        ctx.font = "bold 34px 'PingFang SC', sans-serif";
        ctx.fillText((result.winner.similarity || 0).toFixed(1) + '%', rCX, rCY + 12);
        ctx.fillStyle = 'rgba(20,60,110,0.55)';
        ctx.font = "bold 15px 'PingFang SC', sans-serif";
        ctx.fillText('匹 配 度', rCX, rCY + 35);

        // Right: persona + keyword capsules
        const rightX = midX + iP;
        const rightMaxX = VW - 40 - iP;
        const rcTop = c1Y + 66;
        const totalKwW = rightMaxX - rightX;

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(20,60,110,0.48)';
        ctx.font = "bold 25px 'PingFang SC', sans-serif";
        ctx.fillText('城市人格', rightX, rcTop);

        ctx.fillStyle = '#1a4e90';
        const pLabel = result.personaLabel || '';
        let pFs = 34;
        ctx.font = `bold ${pFs}px 'PingFang SC', sans-serif`;
        while (ctx.measureText(pLabel).width < totalKwW - 2 && pFs < 50) {
            pFs++;
            ctx.font = `bold ${pFs}px 'PingFang SC', sans-serif`;
        }
        ctx.textAlign = 'left';
        ctx.fillText(pLabel, rightX, rcTop + 68);

        const kws = (result.cityKeywords || []).slice(0, 6);
        ctx.font = "15px 'PingFang SC', sans-serif";
        const kwH = 30;
        const kwGap = 8;
        const kwRows: string[][] = [];
        for (let r = 0; r < kws.length; r += 3) {
            kwRows.push(kws.slice(r, r + 3));
        }
        let kwY = rcTop + 106;
        kwRows.forEach(row => {
            const n = row.length;
            const tagW = (totalKwW - (n - 1) * kwGap) / n;
            row.forEach((kw, j) => {
                const tagX = rightX + j * (tagW + kwGap);
                ctx.save();
                ctx.beginPath();
                rrect(ctx, tagX, kwY, tagW, kwH, kwH / 2);
                ctx.fillStyle = 'rgba(143,220,255,0.20)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(60,160,235,0.45)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
                ctx.fillStyle = '#2e7a9e';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(kw, tagX + tagW / 2, kwY + kwH / 2);
                ctx.textBaseline = 'alphabetic';
            });
            kwY += kwH + 8;
        });

        // Card 2: radar chart
        ctx.save();
        ctx.beginPath();
        rrect(ctx, 40, c2Y, VW - 80, c2H, cR);
        ctx.fillStyle = 'rgba(255,255,255,0.44)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,160,235,0.42)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.font = "bold 17px 'PingFang SC', sans-serif";
        ctx.fillStyle = '#1a3e78';
        ctx.fillText('你 vs 城市画像', 40 + iP, c2Y + 36);

        ctx.font = "13px 'PingFang SC', sans-serif";
        const lrx = VW - 40 - iP;
        const ctw = ctx.measureText('城市').width;
        const ntw = ctx.measureText('你').width;
        const dr = 4;
        const dg = 5;
        const gg = 14;
        const cdx = lrx - ctw - dg - dr;
        ctx.fillStyle = 'rgba(143,220,255,1)';
        ctx.beginPath();
        ctx.arc(cdx, c2Y + 32, dr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(20,60,110,0.55)';
        ctx.textAlign = 'left';
        ctx.fillText('城市', cdx + dr + dg, c2Y + 36);
        const ndx = cdx - dr - gg - ntw - dg - dr;
        ctx.fillStyle = 'rgba(50,181,240,1)';
        ctx.beginPath();
        ctx.arc(ndx, c2Y + 32, dr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(20,60,110,0.55)';
        ctx.fillText('你', ndx + dr + dg, c2Y + 36);

        drawRadarOnCanvas(ctx, midX, c2Y + 256, 160, result.userScores, result.winner.scores);

        // Card 3: verdict + alt cities
        ctx.save();
        ctx.beginPath();
        rrect(ctx, 40, c3Y, VW - 80, c3H, cR);
        ctx.fillStyle = 'rgba(255,255,255,0.44)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,160,235,0.42)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(midX, c3Y + 24);
        ctx.lineTo(midX, c3Y + c3H - 24);
        ctx.strokeStyle = 'rgba(60,160,235,0.30)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left: verdict
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(20,60,110,0.52)';
        ctx.font = "bold 15px 'PingFang SC', sans-serif";
        ctx.fillText('城市解析', 40 + iP, c3Y + 44);

        ctx.fillStyle = 'rgba(60,160,235,0.44)';
        ctx.font = 'bold 24px serif';
        ctx.fillText('❝', 40 + iP - 6, c3Y + 78);

        ctx.font = "15px 'PingFang SC', sans-serif";
        ctx.fillStyle = 'rgba(20,60,110,0.82)';
        verdictLines.forEach((line, i) => {
            ctx.fillText(line, 40 + iP + 18, c3Y + 70 + (i + 1) * 26);
        });

        // Right: alt cities
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(20,60,110,0.52)';
        ctx.font = "bold 15px 'PingFang SC', sans-serif";
        ctx.fillText('备选城市', midX + iP, c3Y + 44);

        const rowBgColors = ['rgba(60,160,235,0.18)', 'rgba(143,220,255,0.14)', 'rgba(150,210,255,0.11)'];
        (result.top3 || []).forEach((altCity, i) => {
            const rowY = c3Y + 66 + i * 68;
            const rowH = 52;
            const rowLeft = midX + iP;
            const rowRight = VW - 40 - iP;
            ctx.save();
            ctx.beginPath();
            rrect(ctx, rowLeft, rowY, rowRight - rowLeft, rowH, 10);
            ctx.fillStyle = rowBgColors[i];
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = i === 0 ? '#1068c8' : '#4a7aae';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`No.${i + 1}`, rowLeft + 28, rowY + rowH / 2);

            const sc = (altCity.similarity || 0).toFixed(1) + '%';
            ctx.font = "bold 15px 'PingFang SC', sans-serif";
            const scW = ctx.measureText(sc).width + 20;
            const scX = rowRight - scW - 12;
            ctx.save();
            ctx.beginPath();
            rrect(ctx, scX, rowY + (rowH - 28) / 2, scW, 28, 14);
            ctx.fillStyle = 'rgba(80,170,240,0.22)';
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = '#1068c8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sc, scX + scW / 2, rowY + rowH / 2);

            ctx.fillStyle = '#1a3e78';
            ctx.font = "bold 17px 'PingFang SC', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(altCity.name, (rowLeft + 52 + scX - 4) / 2, rowY + rowH / 2);
            ctx.textBaseline = 'alphabetic';
        });

        // Footer
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(20,60,110,0.22)';
        ctx.font = '11px sans-serif';
        ctx.fillText('基于本命星盘 + 城市六维画像匹配', midX, c3Y + c3H + 22);

        const dataURL = canvas.toDataURL('image/jpeg', 0.92);
        setShareImgSrc(dataURL);
        setShareModalOpen(true);
    }

    function drawRadarOnCanvas(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        radius: number,
        user: DimScores,
        city: DimScores
    ) {
        const n = DIMENSIONS.length;
        const levels = 4;
        const getPoint = (value: number, index: number) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / n;
            const r = (value / 100) * radius;
            return {x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r};
        };

        // Grid rings
        for (let l = 1; l <= levels; l++) {
            ctx.beginPath();
            const r = (radius / levels) * l;
            for (let i = 0; i <= n; i++) {
                const angle = -Math.PI / 2 + (Math.PI * 2 * (i % n)) / n;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = 'rgba(166,150,255,0.12)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Axis lines
        for (let i = 0; i < n; i++) {
            const p = getPoint(100, i);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = 'rgba(166,150,255,0.08)';
            ctx.stroke();
        }

        // City shape
        ctx.beginPath();
        DIMENSIONS.forEach((dim, i) => {
            const p = getPoint(city[dim.key], i);
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(143,220,255,0.18)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(143,220,255,0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // User shape
        ctx.beginPath();
        DIMENSIONS.forEach((dim, i) => {
            const p = getPoint(user[dim.key], i);
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(166,150,255,0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(166,150,255,0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Labels
        DIMENSIONS.forEach((dim, i) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
            const lx = cx + Math.cos(angle) * (radius + 26);
            const ly = cy + Math.sin(angle) * (radius + 26);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '15px sans-serif';
            ctx.fillStyle = 'rgba(74,71,102,0.6)';
            ctx.fillText(dim.name, lx, ly);
        });

        // Dot markers
        ctx.fillStyle = 'rgba(166,150,255,1)';
        DIMENSIONS.forEach((dim, i) => {
            const p = getPoint(user[dim.key], i);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = 'rgba(143,220,255,1)';
        DIMENSIONS.forEach((dim, i) => {
            const p = getPoint(city[dim.key], i);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function handleShareDownload() {
        if (!shareImgSrc) {
            return;
        }
        log('click', 'new_agent', {action_type: 'save'});
        NewAppBridge.image
            .save(shareImgSrc)
            .then(() => {
                if (!NewAppBridge.env.isInApp) {
                    showToast('图片已保存');
                }
            })
            .catch(() => {
                if (!NewAppBridge.env.isInApp) {
                    showToast('保存失败，请长按图片保存');
                }
            });
    }

    // ── Render: Intro screen ──
    function renderIntro() {
        return (
            <section className={`${styles.screen} ${styles.introScreenActive}`}>
                <div className={styles.introStack}>
                    <div className={styles.introCopy}>
                        <div className={styles.hero}>
                            <div className={styles.eyebrow}>CITY COSMOS TEST</div>
                            <h1 className={styles.heroTitle}>天选之城</h1>
                            <div className={styles.heroIntro}>
                                填下你的出生坐标，再回答几道偏好题，看看哪座城市会和你的命运频率最同拍。
                            </div>
                        </div>

                        <div className={styles.introForm}>
                            <div className={`${styles.card} ${styles.formCard}`}>
                                <div className={styles.fieldGrid}>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>昵称</label>
                                        <input
                                            className={styles.fieldInput}
                                            type="text"
                                            placeholder="请输入你的昵称"
                                            value={profile.nickname}
                                            onChange={e => setProfile(p => ({...p, nickname: e.target.value}))}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>性别</label>
                                        <div className={styles.genderGroup}>
                                            {['女', '男'].map(g => (
                                                <label
                                                    key={g}
                                                    className={`${styles.genderOption} ${profile.gender === g ? styles.genderOptionActive : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="gender"
                                                        value={g}
                                                        checked={profile.gender === g}
                                                        onChange={() => setProfile(p => ({...p, gender: g}))}
                                                    />
                                                    <span>{g}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>出生日期</label>
                                        <div className={styles.dateWrap}>
                                            <input
                                                type="date"
                                                className={styles.dateInput}
                                                value={profile.birthDate}
                                                onChange={e => setProfile(p => ({...p, birthDate: e.target.value}))}
                                            />
                                            <div className={styles.dateDisplay}>
                                                {profile.birthDate ? (
                                                    profile.birthDate.replace(/-/g, '/')
                                                ) : (
                                                    <span className={styles.datePlaceholder}>请选择日期</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.fieldLabel}>出生时间（选填）</label>
                                        <div className={styles.dateWrap}>
                                            <input
                                                type="time"
                                                className={styles.dateInput}
                                                value={profile.birthTime}
                                                onChange={e => setProfile(p => ({...p, birthTime: e.target.value}))}
                                            />
                                            <div className={styles.dateDisplay}>
                                                {profile.birthTime ? (
                                                    profile.birthTime
                                                ) : (
                                                    <span className={styles.datePlaceholder}>请选择时间</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.fieldGroupTwoCol}>
                                        <div className={styles.field}>
                                            <label className={styles.fieldLabel}>出生省份</label>
                                            <select
                                                className={styles.fieldSelect}
                                                value={profile.birthProvince}
                                                onChange={e =>
                                                    setProfile(p => ({
                                                        ...p,
                                                        birthProvince: e.target.value,
                                                        birthCity: ''
                                                    }))
                                                }
                                            >
                                                <option value="">请选择省份</option>
                                                {Object.keys(CHINA_REGIONS).map(prov => (
                                                    <option key={prov} value={prov}>
                                                        {prov}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label className={styles.fieldLabel}>出生城市</label>
                                            <select
                                                className={styles.fieldSelect}
                                                value={profile.birthCity}
                                                onChange={e => setProfile(p => ({...p, birthCity: e.target.value}))}
                                                disabled={!profile.birthProvince}
                                            >
                                                <option value="">请选择城市</option>
                                                {citiesForProvince.map(city => (
                                                    <option key={city} value={city}>
                                                        {city}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.actions} ${styles.actionsAuto}`}>
                        <button className={styles.btn} onClick={handleProfileSubmit}>
                            进入城市偏好题
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    // ── Render: Quiz screen ──
    function renderQuiz() {
        const question = QUESTIONS[currentQuestion];
        const total = QUESTIONS.length;
        const current = currentQuestion + 1;
        const progress = Math.round((current / total) * 100);
        const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

        return (
            <section className={`${styles.screen} ${styles.quizScreenActive}`}>
                <div className={styles.sectionHead}>
                    <div className={styles.eyebrow}>STEP 02</div>
                    <h2 className={styles.sectionTitle} style={{marginTop: '14px'}}>
                        挑出你的生活同频感
                    </h2>
                </div>

                <div className={`${styles.card} ${styles.progressCard}`}>
                    <div className={styles.progressMeta}>
                        <span>
                            第 {current} / {total} 题
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{width: `${progress}%`}} />
                    </div>
                </div>

                <div className={`${styles.heroCard} ${styles.questionCard}`}>
                    <div className={styles.questionIndex}>
                        {question.scene} · {String(current).padStart(2, '0')}
                    </div>
                    <h3 className={styles.questionTitle}>{question.title}</h3>
                    <div className={styles.choiceList}>
                        {question.options.map((option, index) => (
                            <button
                                key={index}
                                type="button"
                                className={`${styles.option} ${answers[currentQuestion] === index ? styles.optionActive : ''}`}
                                onClick={() => selectOption(index)}
                            >
                                <div
                                    className={`${styles.optionBadge} ${answers[currentQuestion] === index ? styles.optionActiveBadge : ''}`}
                                >
                                    {optionLetters[index]}
                                </div>
                                <div className={styles.optionCopy}>
                                    <strong>{option.title}</strong>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.actions}>
                    {currentQuestion > 0 && (
                        <button className={styles.btnSecondary} onClick={() => setCurrentQuestion(currentQuestion - 1)}>
                            上一题
                        </button>
                    )}
                </div>
            </section>
        );
    }

    // ── Render: Loading screen ──
    function renderLoading() {
        return (
            <section className={`${styles.screen} ${styles.loadingScreenActive}`}>
                <div className={styles.loadingCard}>
                    <div className={styles.orbital}>
                        <span className={styles.orbitalDot} />
                        <em className={styles.orbitalRingInner} />
                        <i className={styles.orbitalCore} />
                    </div>
                    <div className={styles.loadingMeta}>
                        <span className={styles.loadingDot} />
                        <span className={styles.eyebrow}>CITY SIGNAL</span>
                    </div>
                    <div className={styles.loadingMain}>正在调取你的城市星图</div>
                    <div className={styles.loadingSub}>{loadingText}</div>
                    <div className={styles.loadingProgress}>
                        <div className={styles.loadingTrack}>
                            <div className={styles.loadingBar} />
                        </div>
                    </div>
                    <div className={styles.loadingHints}>
                        <div className={styles.loadingHint}>本命盘解析</div>
                        <div className={styles.loadingHint}>偏好校准</div>
                        <div className={styles.loadingHint}>城市匹配</div>
                    </div>
                </div>
            </section>
        );
    }

    // ── Render: Result screen ──
    function renderResult() {
        if (!result) {
            return null;
        }
        const auraText = generateAuraText(result.userScores, result.winner.scores, result.winner.name);
        const astroNote = `本命主轴：${result.astroProfile.summary}${result.astroProfile.usedTimeFallback ? '（出生时间未填，上升与宫位按中午12:00估算）' : ''}`;

        return (
            <section className={`${styles.screen} ${styles.resultScreenActive}`}>
                <div className={styles.resultCard}>
                    <div className={styles.eyebrow}>RESULT REPORT</div>
                    <div className={styles.resultHead}>
                        <div className={styles.resultKicker}>你的天选之城是</div>
                        <div className={styles.resultCity}>{result.winner.name}</div>
                    </div>
                    <div className={styles.resultSummary}>
                        {auraText}
                        <span className={styles.astroLine}>{astroNote}</span>
                    </div>
                    <div className={styles.matchWrap}>
                        <div className={styles.matchRow}>
                            <div className={styles.matchPill}>
                                <div className={styles.smallLabel}>匹配度</div>
                                <div className={styles.matchScore}>{result.winner.similarity!.toFixed(1)}%</div>
                            </div>
                            <div className={styles.matchPill}>
                                <div className={styles.smallLabel}>你的城市人格</div>
                                <div className={styles.personaLabel}>{result.personaLabel}</div>
                            </div>
                        </div>
                        <div className={`${styles.matchRow} ${styles.matchRowSingle}`}>
                            <div className={`${styles.matchPill} ${styles.matchPillSingle}`}>
                                <div className={styles.smallLabel}>城市关键词</div>
                                <div className={styles.cityKeywords}>{result.cityKeywords.join(' / ')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${styles.card} ${styles.radarCard} ${styles.resultCardMarginTop}`}>
                    <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>你 vs 城市画像</h2>
                        <div className={styles.muted}>
                            同一张六维雷达图中展示你的城市人格分布和城市画像分布，重叠越高，匹配度越强。
                        </div>
                    </div>
                    <div className={styles.radarBox}>
                        <div className={styles.legend}>
                            <div className={`${styles.legendPill} ${styles.legendUser}`}>你</div>
                            <div className={`${styles.legendPill} ${styles.legendCity}`}>城市</div>
                        </div>
                        {renderRadarSvg(result.userScores, result.winner.scores)}
                    </div>
                </div>

                <div className={`${styles.card} ${styles.resultCardMarginTop}`}>
                    <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>为什么会是这座城</h2>
                    </div>
                    <div className={styles.insightItem}>
                        {result.insights.map((p, i) => (
                            <p key={i}>{p}</p>
                        ))}
                    </div>
                </div>

                <div className={`${styles.card} ${styles.resultCardMarginTop}`}>
                    <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>备选城市 Top 3</h2>
                        <div className={styles.muted}>如果命运多给你几张城市门票，这几座城也会和你很容易同频。</div>
                    </div>
                    <div className={styles.top3List}>
                        {result.top3.map((city, index) => (
                            <div key={index} className={styles.topCity}>
                                <div className={styles.rank}>{index + 1}</div>
                                <div className={styles.cityInfo}>{city.name}</div>
                                <div className={styles.cityMatch}>
                                    匹配度 <strong>{city.similarity!.toFixed(1)}%</strong>
                                </div>
                                <button className={styles.detailBtn} onClick={() => setCityDetailModal(city)}>
                                    详情
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.actions}>
                    <button className={styles.btn} onClick={generateShareImage}>
                        生成分享图
                    </button>
                    <button className={styles.btnSecondary} onClick={handleRestart}>
                        重新测一次
                    </button>
                </div>
                <div className={styles.footerNote}>
                    结果先基于出生日期、出生时间与出生城市计算本命盘，再结合选择题做小幅矫正；未填写出生时间时，上升与宫位会按中午
                    12:00 估算。
                </div>
            </section>
        );
    }

    // ── Render: Dimension modal ──
    function renderDimModal() {
        if (!dimModal) {
            return null;
        }
        const dim = DIMENSIONS.find(d => d.key === dimModal.key);
        if (!dim) {
            return null;
        }
        return (
            <div
                className={`${styles.modal} ${styles.modalActive}`}
                onClick={e => {
                    if (e.target === e.currentTarget) {
                        setDimModal(null);
                    }
                }}
            >
                <div className={styles.modalPanel}>
                    <div className={styles.eyebrow}>DIMENSION DETAIL</div>
                    <h3 className={styles.modalTitle}>{dim.name}</h3>
                    <p className={styles.muted}>{dim.desc}</p>
                    <div className={styles.modalStats}>
                        <div>
                            <strong>{dimModal.user[dimModal.key]}</strong>
                            <span>你的分数</span>
                        </div>
                        <div className={styles.modalStatsMint}>
                            <strong>{dimModal.city[dimModal.key]}</strong>
                            <span>城市分数</span>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.btnSecondary} onClick={() => setDimModal(null)}>
                            知道了
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: City detail modal ──
    function renderCityDetailModal() {
        if (!cityDetailModal || !result) {
            return null;
        }
        const city = cityDetailModal;
        const kw = pickCityKeywords(city.fullName, city.scores);
        const insights = generateCityInsights(result.userScores, city, result.astroProfile);

        return (
            <div
                className={`${styles.modal} ${styles.modalActive}`}
                onClick={e => {
                    if (e.target === e.currentTarget) {
                        setCityDetailModal(null);
                    }
                }}
            >
                <div className={`${styles.modalPanel} ${styles.cdPanel}`}>
                    <div className={styles.cdResultCard}>
                        <div className={styles.eyebrow}>CITY DETAIL</div>
                        <div className={styles.resultHead}>
                            <div className={styles.resultKicker}>备选城市</div>
                            <div className={styles.cdResultCity}>{city.name}</div>
                        </div>
                        <div className={styles.matchWrap}>
                            <div className={styles.matchRow}>
                                <div className={styles.matchPill}>
                                    <div className={styles.smallLabel}>匹配度</div>
                                    <div className={styles.matchScore}>{city.similarity!.toFixed(1)}%</div>
                                </div>
                                <div className={styles.matchPill}>
                                    <div className={styles.smallLabel}>城市关键词</div>
                                    <div className={styles.cityKeywords}>{kw.join(' / ')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.cdSection}>
                        <div className={styles.sectionHead}>
                            <h2 className={styles.sectionTitle}>你 vs 城市画像</h2>
                        </div>
                        <div className={styles.radarBox}>
                            <div className={styles.legend}>
                                <div className={`${styles.legendPill} ${styles.legendUser}`}>你</div>
                                <div className={`${styles.legendPill} ${styles.legendCity}`}>城市</div>
                            </div>
                            {renderRadarSvg(result.userScores, city.scores, false)}
                        </div>
                    </div>
                    <div className={styles.cdSection}>
                        <div className={styles.sectionHead}>
                            <h2 className={styles.sectionTitle}>城市解析</h2>
                        </div>
                        <div className={styles.cdInsights}>
                            {insights.map((p, i) => (
                                <p key={i}>{p}</p>
                            ))}
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.btnSecondary} onClick={() => setCityDetailModal(null)}>
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Share modal ──
    function renderShareModal() {
        if (!shareModalOpen) {
            return null;
        }
        return (
            <div
                className={`${styles.modal} ${styles.modalActive}`}
                onClick={e => {
                    if (e.target === e.currentTarget) {
                        setShareModalOpen(false);
                    }
                }}
            >
                <div className={`${styles.modalPanel} ${styles.sharePanel}`}>
                    <div className={styles.eyebrow}>SHARE</div>
                    {shareImgSrc && <img className={styles.shareImg} src={shareImgSrc} alt="分享图" />}
                    <div className={styles.actions}>
                        <button className={styles.btn} onClick={handleShareDownload}>
                            保存图片
                        </button>
                        <button className={styles.btnSecondary} onClick={() => setShareModalOpen(false)}>
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>{pageData.page.title}</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
                />
                <style>{`
                    html, body {
                        background: linear-gradient(180deg, #cce8f8 0%, #ffffff 100%) fixed !important;
                        background-color: #cce8f8 !important;
                        min-height: 100%;
                    }
                `}</style>
            </Head>
            <div className={styles.bgLayer} />
            <div className={styles.container}>
                <div className={styles.shell}>
                    {screen === 'intro' && renderIntro()}
                    {screen === 'quiz' && renderQuiz()}
                    {screen === 'loading' && renderLoading()}
                    {screen === 'result' && renderResult()}
                </div>
            </div>
            {dimModal && renderDimModal()}
            {cityDetailModal && renderCityDetailModal()}
            {shareModalOpen && renderShareModal()}
            <div className={`${styles.toast} ${toastVisible ? styles.toastShow : ''}`}>{toastMsg}</div>
        </>
    );
}

const Page = dynamic(() => Promise.resolve(Content), {ssr: false});
(Page as any).noLayout = true;
export default Page;
