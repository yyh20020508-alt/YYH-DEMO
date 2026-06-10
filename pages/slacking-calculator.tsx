/**
 * slacking-calculator.tsx
 * 带薪摸鱼计算器 — 趣味工具H5页面
 * 由 newapp-page-studio 从 public/slacking-calculator.html 迁移
 */

import dynamic from 'next/dynamic';
import {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import Head from 'next/head';
import {useNewAppLog} from '@/hooks/useNewAppLog';
import {NewAppBridge} from '@/lib/newapp-bridge';
import {NewAppTopBar} from '@/components/NewAppTopBar';
import {NewAppFooterButton} from '@/components/NewAppFooterButton';
import styles from '@/styles/slacking-calculator.module.css';
import DATA from '@/config/slacking-calculator-data.json';

// ═══════════════════════ Types ═══════════════════════

interface Activity {
    emoji: string;
    name: string;
    pct: number;
}

interface SlackRecord {
    date: string;
    seconds: number;
    money: number;
    activity: string;
    emoji: string;
    pct: number;
}

interface Config {
    salary?: string;
    workDays?: string;
    workHours?: string;
    activities?: Activity[];
    goldPrice?: number;
}

interface AchievementDef {
    id: string;
    icon: string;
    name: string;
    desc: string;
    type: string;
    threshold: number;
}

type TabName = 'home' | 'stats' | 'profile';

// ═══════════════════════ Constants ═══════════════════════

const RK = 'sf_r';
const CK = 'sf_c';
const DEF_ACT: Activity[] = DATA.defaultActivities;
const ACH_DEFS: AchievementDef[] = DATA.achievements;
const TOASTS = DATA.toasts;
const MEMES_IDLE = DATA.memes.idle;
const DEFAULT_GOLD_PRICE = 980;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// ═══════════════════════ Helpers (pure) ═══════════════════════

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localYM(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function localYear(iso: string): string {
    return new Date(iso).getFullYear().toString();
}

function localHour(iso: string): number {
    return new Date(iso).getHours();
}

function localDay(iso: string): number {
    return new Date(iso).getDate();
}

function fmtD(s: number): string {
    if (s < 60) {
        return Math.round(s) + '秒';
    }
    if (s < 3600) {
        return Math.round(s / 60) + '分钟';
    }
    return Math.floor(s / 3600) + '时' + Math.round((s % 3600) / 60) + '分';
}

function fmtGold(money: number, gp: number): string {
    const r = money / gp;
    if (r >= 100) {
        return r.toFixed(1);
    }
    if (r >= 1) {
        return r.toFixed(2);
    }
    if (r >= 0.01) {
        return r.toFixed(3);
    }
    return r.toFixed(4);
}

function hourlyRate(cfg: Config): number {
    const salary = parseFloat(cfg.salary || '') || 8000;
    const days = parseFloat(cfg.workDays || '') || 22;
    const hours = parseFloat(cfg.workHours || '') || 8;
    return salary / days / hours;
}

function salHintText(sal: number): string {
    if (!sal) {
        return '';
    }
    if (sal < 3000) {
        return '吃土中';
    }
    if (sal < 4000) {
        return '月光族实名认证';
    }
    if (sal < 5000) {
        return '房租刺客天天见';
    }
    if (sal < 6500) {
        return '刚够还花呗';
    }
    if (sal < 8000) {
        return '税后还是税前？';
    }
    if (sal < 10000) {
        return '万元大关差一步';
    }
    if (sal < 12000) {
        return '破万了！（税前）';
    }
    if (sal < 15000) {
        return '中产幻觉初期';
    }
    if (sal < 20000) {
        return '摸鱼都赚的多';
    }
    if (sal < 35000) {
        return '摸鱼好贵哦';
    }
    if (sal < 50000) {
        return '大佬带带我';
    }
    if (sal < 100000) {
        return '别摸了去工作';
    }
    return '您呼吸都在赚钱';
}

function dayHintText(days: number): string {
    if (days <= 10) {
        return '什么神仙工作！';
    }
    if (days <= 15) {
        return '美美养老局';
    }
    if (days <= 20) {
        return '有双休真好';
    }
    if (days <= 22) {
        return '标准社畜';
    }
    if (days <= 24) {
        return '单休战士';
    }
    if (days <= 26) {
        return '已经很卷了';
    }
    return '你是老板吧？';
}

function hrHintText(hrs: number): string {
    if (hrs <= 5) {
        return '人间理想啊';
    }
    if (hrs <= 6) {
        return '养生达人';
    }
    if (hrs <= 7.5) {
        return '准点跑路！';
    }
    if (hrs <= 8) {
        return '朝九晚五人';
    }
    if (hrs <= 9) {
        return '小小加班';
    }
    if (hrs <= 10) {
        return '995预备役';
    }
    if (hrs <= 12) {
        return '经典996';
    }
    return '007战士';
}

function memeText(min: number, cnt: number, money: number): {text: string; sub: string} {
    if (!cnt) {
        return {text: MEMES_IDLE.text, sub: MEMES_IDLE.sub};
    }
    if (min < 3) {
        return {text: '就这？连热身都不算', sub: `${min.toFixed(0)}分钟，连鱼的毛都没摸到`};
    }
    if (min < 5) {
        return {text: '刚刚小摸了一下', sub: `才${min.toFixed(0)}分钟，这不叫摸鱼，这叫战略性休息`};
    }
    if (min < 10) {
        return {text: '摸了，但没完全摸', sub: `${min.toFixed(0)}分钟，老板的雷达还没扫到你`};
    }
    if (min < 15) {
        return {text: '初级摸鱼，谨慎试探', sub: `已赚¥${money.toFixed(1)}，你的胆子在慢慢变大`};
    }
    if (min < 20) {
        return {text: '摸鱼小能手已上线', sub: `${min.toFixed(0)}分钟到手¥${money.toFixed(1)}，血赚不亏`};
    }
    if (min < 30) {
        return {text: '你已进入摸鱼心流', sub: '工位上的你看似在思考，实则灵魂出窍'};
    }
    if (min < 45) {
        return {text: '悄悄摸鱼不出声', sub: `今天已摸${cnt}次，节奏把控得很好`};
    }
    if (min < 60) {
        return {text: '半小时了，稳住', sub: '老板路过你假装在debug，但你什么都没写'};
    }
    if (min < 90) {
        return {text: '一小时档位，渐入佳境', sub: '同事以为你在深度思考，其实你在深度摆烂'};
    }
    if (min < 120) {
        return {text: '你的工位在哭泣', sub: `到手¥${money.toFixed(1)}，效率超越99%打工人`};
    }
    if (min < 150) {
        return {text: '两小时！已有职业素养', sub: '你摸鱼摸出了哲学的味道'};
    }
    if (min < 180) {
        return {text: '老板：这人今天干活了吗', sub: `已摸${min.toFixed(0)}分钟，建议竞选「首席摸鱼官」`};
    }
    if (min < 210) {
        return {text: '三小时，正式进阶大师', sub: 'HR已读不回，IT正在查你的浏览记录'};
    }
    if (min < 240) {
        return {text: '摸鱼界的王者驾到', sub: '同事开始怀疑你是不是已经提了离职'};
    }
    if (min < 280) {
        return {text: '你是来上班还是来旅游的', sub: `¥${money.toFixed(1)}到手，你就是行走的人形BUG`};
    }
    if (min < 320) {
        return {text: '不是在上班，是在上坟', sub: '建议公司给你发「精神离职」证书'};
    }
    if (min < 360) {
        return {text: '工作是不可能工作的', sub: '这辈子都不可能工作的，摸鱼才能维持生活'};
    }
    if (min < 400) {
        return {text: '你已经不需要工位了', sub: '你的肉身在公司，灵魂在马尔代夫'};
    }
    if (min < 440) {
        return {text: '摸鱼界の传说！已封神', sub: '建议辞职创办「摸鱼大学」，你就是校长'};
    }
    if (min < 480) {
        return {text: '全天候摸鱼，无死角覆盖', sub: `今日带薪产出¥${money.toFixed(1)}，属于是躺赚了`};
    }
    if (min < 540) {
        return {text: '你已不属于这个次元', sub: '时间对你而言只是数字，你已实现带薪自由'};
    }
    if (min < 600) {
        return {text: '摸鱼十小时，创造历史', sub: '你的事迹将被写入《摸鱼名人堂》'};
    }
    return {text: '这已经不是摸鱼了，这是行为艺术', sub: '你用生命在诠释「在岗不在职」的至高境界'};
}

function monthMeme(money: number, min: number, cnt: number): string {
    if (!cnt) {
        return '';
    }
    if (money < 10) {
        return '本月摸鱼纯属意念摸鱼';
    }
    if (money < 50) {
        return '浅摸了一下，不失礼貌的摸';
    }
    if (money < 100) {
        return '摸得不多，但胜在心诚';
    }
    if (money < 300) {
        return '已经摸出了职业素养';
    }
    if (money < 500) {
        return '你的工位只是个摆设吧';
    }
    if (money < 1000) {
        return '这个月班味很淡，摸味很浓';
    }
    if (money < 2000) {
        return '建议公司查一下你的工位使用率';
    }
    if (money < 5000) {
        return '你不是在摸鱼，鱼在摸你';
    }
    if (money < 10000) {
        return '本月最佳带薪表演艺术家';
    }
    return '你已经不是在上班了，你是在表演上班';
}

/** Check whether a given achievement is unlocked */
function checkAch(a: AchievementDef, recs: SlackRecord[]): boolean {
    switch (a.type) {
        case 'count':
            return recs.length >= a.threshold;
        case 'dailyMoney': {
            const dm: Record<string, number> = {};
            recs.forEach(x => {
                const k = localDate(x.date);
                dm[k] = (dm[k] || 0) + x.money;
            });
            return Object.values(dm).some(v => v >= a.threshold);
        }
        case 'singleSeconds':
            return recs.some(x => x.seconds >= a.threshold);
        case 'dailyCount': {
            const dc: Record<string, number> = {};
            recs.forEach(x => {
                const k = localDate(x.date);
                dc[k] = (dc[k] || 0) + 1;
            });
            return Object.values(dc).some(v => v >= a.threshold);
        }
        case 'streak': {
            const dsSet = new Set(recs.map(x => localDate(x.date)));
            const ds: string[] = [];
            dsSet.forEach(v => ds.push(v));
            ds.sort();
            for (let i = a.threshold - 1; i < ds.length; i++) {
                const start = new Date(ds[i - a.threshold + 1]);
                const end = new Date(ds[i]);
                if ((end.getTime() - start.getTime()) / 86400000 === a.threshold - 1) {
                    return true;
                }
            }
            return false;
        }
        case 'totalGold':
            return recs.reduce((s, x) => s + x.money, 0) / DEFAULT_GOLD_PRICE >= a.threshold;
        case 'activityTypes':
            return new Set(recs.map(x => x.activity)).size >= a.threshold;
        default:
            return false;
    }
}

// ═══════════════════════ localStorage wrappers ═══════════════════════

function getConfig(): Config {
    try {
        return JSON.parse(localStorage.getItem(CK) || '{}') as Config;
    } catch {
        return {};
    }
}

function saveConfig(c: Config): void {
    try {
        localStorage.setItem(CK, JSON.stringify(c));
    } catch {
        // ignore
    }
}

function getRecords(): SlackRecord[] {
    try {
        return JSON.parse(localStorage.getItem(RK) || '[]') as SlackRecord[];
    } catch {
        return [];
    }
}

function saveRecords(r: SlackRecord[]): void {
    try {
        localStorage.setItem(RK, JSON.stringify(r));
    } catch {
        // ignore
    }
}

function getActivities(cfg: Config): Activity[] {
    return cfg.activities || DEF_ACT;
}

// ═══════════════════════ Gold price fetch ═══════════════════════

async function fetchGoldPrice(): Promise<number | null> {
    try {
        const r = await fetch('https://api.gold-api.com/price/XAU/CNY');
        if (r.ok) {
            const d = await r.json();
            if (d.price) {
                return Math.round(((d.price as number) / 31.1035) * 100) / 100;
            }
        }
    } catch {
        // ignore
    }
    try {
        const r = await fetch('https://open.er-api.com/v6/latest/XAU');
        if (r.ok) {
            const d = await r.json();
            if (d.rates?.CNY) {
                return Math.round(((d.rates.CNY as number) / 31.1035) * 100) / 100;
            }
        }
    } catch {
        // ignore
    }
    return null;
}

// ═══════════════════════ Share Image Generator ═══════════════════════

function genShareImage(recs: SlackRecord[], goldPriceVal: number): string {
    const td = todayStr();
    const tr = recs.filter(r => localDate(r.date) === td);
    const totalM = tr.reduce((s, r) => s + r.money, 0);
    const totalS = tr.reduce((s, r) => s + r.seconds, 0);
    const cnt = tr.length;
    const m = memeText(totalS / 60, cnt, totalM);

    const am: Record<string, {c: number; s: number; m: number; pct: number}> = {};
    tr.forEach(r => {
        const k = (r.emoji || '') + ' ' + (r.activity || '摸鱼');
        if (!am[k]) {
            am[k] = {c: 0, s: 0, m: 0, pct: r.pct || 100};
        }
        am[k].c++;
        am[k].s += r.seconds;
        am[k].m += r.money;
    });
    const al = Object.entries(am)
        .sort((a, b) => b[1].m - a[1].m)
        .slice(0, 3);
    const ua = ACH_DEFS.filter(a => checkAch(a, recs)).slice(0, 4);

    const w = 400;
    const pad = 30;
    const cw = w - pad * 2;
    const dpr = 2;
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', {year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'});

    function measureWrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, lh: number): number {
        let line = '';
        let lines = 1;
        for (const ch of text) {
            const t = line + ch;
            if (ctx.measureText(t).width > maxW && line) {
                line = ch;
                lines++;
            } else {
                line = t;
            }
        }
        return lines * lh;
    }

    function wt(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
        let line = '';
        let cy = y;
        for (const ch of text) {
            const t = line + ch;
            if (ctx.measureText(t).width > maxW && line) {
                ctx.fillText(line, x, cy);
                line = ch;
                cy += lh;
            } else {
                line = t;
            }
        }
        ctx.fillText(line, x, cy);
        return cy;
    }

    function rr(c: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number, r: number): void {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + rw - r, y);
        c.quadraticCurveTo(x + rw, y, x + rw, y + r);
        c.lineTo(x + rw, y + rh - r);
        c.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
        c.lineTo(x + r, y + rh);
        c.quadraticCurveTo(x, y + rh, x, y + rh - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
    }

    function render(ctx: CanvasRenderingContext2D, dry: boolean): number {
        let y = 0;
        const cx = w / 2;

        // Date
        y += 50;
        ctx.font = '11px "PingFang SC",sans-serif';
        if (!dry) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#9990b0';
            ctx.fillText(dateStr, cx, y);
        }

        // Title
        y += 48;
        ctx.font = 'bold 24px "PingFang SC","SF Pro Display",sans-serif';
        if (!dry) {
            ctx.fillStyle = '#1e1b4b';
            ctx.textAlign = 'center';
        }
        y = dry ? y + measureWrap(ctx, `「${m.text}」`, cw, 30) : wt(ctx, `「${m.text}」`, cx, y, cw, 30);

        // Subtitle
        y += 28;
        ctx.font = '13px "PingFang SC",sans-serif';
        if (!dry) {
            ctx.fillStyle = '#5b5675';
            ctx.textAlign = 'center';
        }
        y = dry ? y + measureWrap(ctx, m.sub, cw, 19) : wt(ctx, m.sub, cx, y, cw, 19);

        // Net value label
        y += 50;
        const nLabel = '今日净摸值';
        const nSub = '「已按摸鱼纯度折算」';
        ctx.font = 'bold 16px "PingFang SC","SF Pro Display",sans-serif';
        if (!dry) {
            const lw2 = ctx.measureText(nLabel).width;
            ctx.font = '13px "PingFang SC",sans-serif';
            const sw2 = ctx.measureText(nSub).width;
            const tw = lw2 + 6 + sw2;
            const sx = cx - tw / 2;
            ctx.font = 'bold 16px "PingFang SC","SF Pro Display",sans-serif';
            ctx.fillStyle = '#1e1b4b';
            ctx.textAlign = 'left';
            ctx.fillText(nLabel, sx, y);
            ctx.font = '13px "PingFang SC",sans-serif';
            ctx.fillStyle = '#9990b0';
            ctx.fillText(nSub, sx + lw2 + 6, y);
        }

        // Gold (main)
        y += 56;
        const goldNum = fmtGold(totalM, goldPriceVal);
        // Dynamic font size to prevent overflow for large numbers
        const goldFontSize = goldNum.length > 10 ? 28 : goldNum.length > 7 ? 36 : goldNum.length > 5 ? 44 : 52;
        const goldUnitSize = Math.round(goldFontSize * 0.346);
        const goldIconW = Math.round(goldFontSize * 0.423);
        if (!dry) {
            ctx.textAlign = 'center';
            ctx.font = `bold ${goldFontSize}px "PingFang SC","SF Pro Display",sans-serif`;
            const numW = ctx.measureText(goldNum).width;
            ctx.font = `bold ${goldUnitSize}px "PingFang SC",sans-serif`;
            const unitW = ctx.measureText(' 克黄金').width;
            const totalW = goldIconW + numW + unitW;
            const startX = cx - totalW / 2;
            ctx.fillStyle = '#d4a017';
            rr(ctx, startX, y - Math.round(goldIconW * 0.7), goldIconW, Math.round(goldIconW * 0.59), 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(startX + 2, y - Math.round(goldIconW * 0.68), goldIconW - 4, Math.round(goldIconW * 0.18));
            ctx.fillStyle = '#b8860b';
            ctx.font = `bold ${goldFontSize}px "PingFang SC","SF Pro Display",sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(goldNum, startX + goldIconW, y);
            ctx.font = `bold ${goldUnitSize}px "PingFang SC",sans-serif`;
            ctx.fillStyle = '#d4a017';
            ctx.fillText(' 克黄金', startX + goldIconW + numW, y);
        }

        // Amount (secondary)
        y += 36;
        if (!dry) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#4b5563';
            ctx.font = 'bold 20px "PingFang SC","SF Pro Display",sans-serif';
            ctx.fillText(`¥${totalM.toFixed(2)}`, cx, y);
        }

        // Divider
        y += 48;
        if (!dry) {
            const g = ctx.createLinearGradient(pad + 40, 0, w - pad - 40, 0);
            g.addColorStop(0, 'rgba(148,163,184,0)');
            g.addColorStop(0.5, 'rgba(148,163,184,0.25)');
            g.addColorStop(1, 'rgba(148,163,184,0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pad + 40, y);
            ctx.lineTo(w - pad - 40, y);
            ctx.stroke();
        }

        // Stats row
        y += 34;
        const statsArr = [
            {l: '摸鱼次数', v: cnt + '次'},
            {l: '总时长', v: fmtD(totalS)}
        ];
        const sw3 = cw / 2;
        if (!dry) {
            statsArr.forEach((s, i) => {
                const x2 = pad + sw3 * i + sw3 / 2;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#1e1b4b';
                ctx.font = 'bold 18px "PingFang SC",sans-serif';
                ctx.fillText(s.v, x2, y);
                ctx.fillStyle = '#9990b0';
                ctx.font = '10px "PingFang SC",sans-serif';
                ctx.fillText(s.l, x2, y + 18);
            });
        }
        y += 30;

        // Activities
        if (al.length > 0) {
            y += 24;
            ctx.font = 'bold 11px "PingFang SC",sans-serif';
            if (!dry) {
                ctx.textAlign = 'left';
                ctx.fillStyle = '#9990b0';
                const lbl = '— 摸鱼姿势 —';
                ctx.fillText(lbl, cx - ctx.measureText(lbl).width / 2, y);
            }
            y += 18;
            al.forEach(a => {
                if (!dry) {
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    rr(ctx, pad, y, cw, 40, 12);
                    ctx.fill();
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#1e1b4b';
                    ctx.font = '14px "PingFang SC",sans-serif';
                    ctx.fillText(a[0], pad + 14, y + 26);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#6366f1';
                    ctx.font = 'bold 14px "PingFang SC",sans-serif';
                    ctx.fillText(`¥${a[1].m.toFixed(1)} · ${a[1].c}次`, w - pad - 14, y + 26);
                }
                y += 50;
            });
        }

        // Achievements (2 cols)
        if (ua.length > 0) {
            y += 20;
            ctx.font = 'bold 11px "PingFang SC",sans-serif';
            if (!dry) {
                ctx.textAlign = 'left';
                ctx.fillStyle = '#9990b0';
                const lbl2 = '— 已解锁成就 —';
                ctx.fillText(lbl2, cx - ctx.measureText(lbl2).width / 2, y);
            }
            y += 18;
            const cols = 2;
            const gap = 10;
            const aw2 = (cw - gap) / cols;
            const ah = 52;
            ua.forEach((a, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const ax = pad + col * (aw2 + gap);
                const ay = y + row * (ah + 8);
                if (!dry) {
                    ctx.fillStyle = 'rgba(251,191,36,0.08)';
                    rr(ctx, ax, ay, aw2, ah, 10);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(251,191,36,0.2)';
                    ctx.lineWidth = 0.5;
                    rr(ctx, ax, ay, aw2, ah, 10);
                    ctx.stroke();
                    ctx.textAlign = 'left';
                    ctx.font = '18px "Apple Color Emoji","Segoe UI Emoji",serif';
                    ctx.fillStyle = '#1e1b4b';
                    ctx.fillText(a.icon, ax + 8, ay + 24);
                    ctx.font = 'bold 12px "PingFang SC",sans-serif';
                    ctx.fillStyle = '#1e1b4b';
                    ctx.fillText(a.name, ax + 32, ay + 22);
                    ctx.font = '10px "PingFang SC",sans-serif';
                    ctx.fillStyle = '#7c7494';
                    ctx.fillText(a.desc, ax + 32, ay + 40);
                }
            });
            y += Math.ceil(ua.length / cols) * (ah + 8);
        }

        y += 50;
        return y;
    }

    // Create off-screen canvas
    const cvs = document.createElement('canvas');

    // Pass 1: measure
    cvs.width = w * dpr;
    cvs.height = 1200 * dpr;
    let ctx = cvs.getContext('2d');
    if (!ctx) {
        return '';
    }
    ctx.scale(dpr, dpr);
    const h = Math.max(render(ctx, true), 500);

    // Pass 2: draw
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    cvs.width = w * dpr;
    cvs.height = h * dpr;
    ctx = cvs.getContext('2d');
    if (!ctx) {
        return '';
    }
    ctx.scale(dpr, dpr);

    // BG
    const bg = ctx.createLinearGradient(0, 0, w * 0.3, h);
    bg.addColorStop(0, '#eee8f8');
    bg.addColorStop(0.5, '#e8e2f4');
    bg.addColorStop(1, '#e4e0f6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(167,139,250,0.06)';
    ctx.beginPath();
    ctx.arc(50, 80, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(251,191,36,0.04)';
    ctx.beginPath();
    ctx.arc(w - 30, h * 0.45, 90, 0, Math.PI * 2);
    ctx.fill();

    render(ctx, false);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#b0a8c8';
    ctx.font = '10px "PingFang SC",sans-serif';
    ctx.fillText('带薪摸鱼计算器 · 认真摸鱼，快乐赚钱', w / 2, h - 16);

    const url = cvs.toDataURL('image/png');

    // Open share overlay via state will be handled by the caller
    return url;
}

// ═══════════════════════ Component ═══════════════════════

function SlackingCalculatorContent() {
    const {log} = useNewAppLog({pageName: 'new_agent_detail', agentName: DATA.page.agentName});

    // ── Core state ──
    const [tab, setTab] = useState<TabName>('home');
    const [records, setRecords] = useState<SlackRecord[]>([]);
    const [config, setConfig] = useState<Config>({});
    const [goldPrice, setGoldPrice] = useState(DEFAULT_GOLD_PRICE);

    // ── Home state ──
    const [selAct, setSelAct] = useState(0);
    const [running, setRunning] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [bump, setBump] = useState(false);
    const [coins, setCoins] = useState<{id: number; emoji: string; left: number}[]>([]);
    const coinIdRef = useRef(0);

    // ── Manual input ──
    const [manH, setManH] = useState('');
    const [manM, setManM] = useState('');
    const [manS, setManS] = useState('');

    // ── Calendar state ──
    const [calY, setCalY] = useState(new Date().getFullYear());
    const [calM, setCalM] = useState(new Date().getMonth());
    const [selDate, setSelDate] = useState(todayStr());

    // ── Modal state ──
    const [showActModal, setShowActModal] = useState(false);
    const [showShareOverlay, setShowShareOverlay] = useState(false);
    const [shareImgUrl, setShareImgUrl] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastData, setToastData] = useState({emoji: '', text: '', sub: ''});
    const [showWelcome, setShowWelcome] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // ── Add activity state ──
    const [addEmoji, setAddEmoji] = useState('');
    const [addName, setAddName] = useState('');
    const [addPct, setAddPct] = useState('100');

    // ── Activity pct draft (allow clear while editing) ──
    const [pctDraftMap, setPctDraftMap] = useState<Record<number, string>>({});

    // ── Achievement toggle ──
    const [achLockedOpen, setAchLockedOpen] = useState(false);

    // ── Gold refresh button text ──
    const [goldRefText, setGoldRefText] = useState('刷新金价');

    // ── Timer refs ──
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const coinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const bumpLastRef = useRef(0);
    const pageWrapRef = useRef<HTMLDivElement>(null);
    const cfgToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Derived values ──
    const activities = useMemo(() => getActivities(config), [config]);
    const td = todayStr();
    const todayRecords = useMemo(() => records.filter(r => localDate(r.date) === td), [records, td]);
    const todayMoney = useMemo(() => todayRecords.reduce((s, r) => s + r.money, 0), [todayRecords]);
    const todaySec = useMemo(() => todayRecords.reduce((s, r) => s + r.seconds, 0), [todayRecords]);
    const rate = useMemo(() => hourlyRate(config), [config]);

    const currentAct = activities[selAct] || activities[0];
    const pctFrac = (currentAct?.pct || 100) / 100;
    const liveMoney = running ? (rate / 3600) * elapsed * pctFrac : 0;

    const meme = useMemo(
        () => memeText(todaySec / 60, todayRecords.length, todayMoney),
        [todaySec, todayRecords.length, todayMoney]
    );

    // ── Activity stats for today ──
    const activityStats = useMemo(() => {
        if (!todayRecords.length) {
            return [];
        }
        const am: Record<string, {emoji: string; sec: number}> = {};
        todayRecords.forEach(r => {
            const k = r.activity || '摸鱼';
            if (!am[k]) {
                am[k] = {emoji: r.emoji || '', sec: 0};
            }
            am[k].sec += r.seconds;
        });
        const list = Object.entries(am).sort((a, b) => b[1].sec - a[1].sec);
        const maxS = list[0][1].sec;
        return list.map(([name, d]) => ({
            name,
            emoji: d.emoji,
            sec: d.sec,
            pct: Math.round((d.sec / maxS) * 100)
        }));
    }, [todayRecords]);

    // ── Achievements ──
    const {unlockedAchs, lockedAchs} = useMemo(() => {
        const unlocked: AchievementDef[] = [];
        const locked: AchievementDef[] = [];
        ACH_DEFS.forEach(a => {
            (checkAch(a, records) ? unlocked : locked).push(a);
        });
        return {unlockedAchs: unlocked, lockedAchs: locked};
    }, [records]);

    // ═══════════════════════ Effects ═══════════════════════

    useEffect(() => {
        NewAppBridge.loading.hideNative();
    }, []);

    // Load from localStorage on mount
    useEffect(() => {
        const cfg = getConfig();
        // Migrate old data
        if ((cfg as Record<string, unknown>).conversions) {
            const convArr = (cfg as Record<string, unknown>).conversions as Array<{name: string; price: number}>;
            const g = convArr.find(x => x.name === '黄金');
            if (g && g.price) {
                cfg.goldPrice = g.price;
            }
            delete (cfg as Record<string, unknown>).conversions;
            saveConfig(cfg);
        }
        if (cfg.goldPrice) {
            setGoldPrice(cfg.goldPrice);
        }

        // Migrate: ensure pct field exists on all activities (do NOT re-add deleted defaults)
        const a = cfg.activities;
        if (a) {
            const defMap: Record<string, number> = {};
            DEF_ACT.forEach(x => {
                defMap[x.name] = x.pct;
            });
            let pctFixed = false;
            a.forEach(x => {
                if (x.pct === undefined) {
                    x.pct = defMap[x.name] ?? 100;
                    pctFixed = true;
                }
            });
            if (pctFixed) {
                cfg.activities = a;
                saveConfig(cfg);
            }
        }

        setConfig(cfg);
        setRecords(getRecords());

        // Show welcome if no salary
        if (!cfg.salary) {
            setShowWelcome(true);
        }

        // Auto update gold price
        fetchGoldPrice().then(p => {
            if (p) {
                setGoldPrice(p);
                const c2 = getConfig();
                c2.goldPrice = p;
                saveConfig(c2);
            }
        });
        const goldInterval = setInterval(
            () => {
                fetchGoldPrice().then(p => {
                    if (p) {
                        setGoldPrice(p);
                        const c2 = getConfig();
                        c2.goldPrice = p;
                        saveConfig(c2);
                    }
                });
            },
            30 * 60 * 1000
        );

        return () => clearInterval(goldInterval);
    }, []);

    // Timer effect
    useEffect(() => {
        if (running && startTime !== null) {
            timerRef.current = setInterval(() => {
                setElapsed((Date.now() - startTime) / 1000);
            }, 50);
            coinTimerRef.current = setInterval(() => {
                const emojis = ['', '', '', '', ''];
                coinIdRef.current++;
                setCoins(prev => [
                    ...prev.slice(-5),
                    {
                        id: coinIdRef.current,
                        emoji: emojis[Math.floor(Math.random() * emojis.length)],
                        left: Math.random() * 90
                    }
                ]);
            }, 700);
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (coinTimerRef.current) {
                clearInterval(coinTimerRef.current);
            }
        };
    }, [running, startTime]);

    // Bump animation
    useEffect(() => {
        const cur = Math.floor(liveMoney * 100);
        if (cur !== bumpLastRef.current) {
            bumpLastRef.current = cur;
            setBump(true);
            const t = setTimeout(() => setBump(false), 100);
            return () => clearTimeout(t);
        }
    }, [liveMoney]);

    // Remove expired coins
    useEffect(() => {
        if (coins.length === 0) {
            return;
        }
        const t = setTimeout(() => {
            setCoins(prev => prev.slice(1));
        }, 1300);
        return () => clearTimeout(t);
    }, [coins.length]);

    // ═══════════════════════ Handlers ═══════════════════════

    const handleTabChange = useCallback(
        (t: TabName) => {
            setTab(t);
            if (pageWrapRef.current) {
                pageWrapRef.current.scrollTop = 0;
            }
            log('click', 'new_agent', {action_type: 'button_click'});
        },
        [log]
    );

    const handleToggle = useCallback(() => {
        if (!running) {
            if (!config.salary || parseFloat(config.salary) <= 0) {
                setTab('profile');
                return;
            }
            // Start
            setRunning(true);
            setStartTime(Date.now());
            setElapsed(0);
            setCoins([]);
            log('click', 'new_agent', {action_type: 'button_click'});
        } else {
            // Stop
            const el = (Date.now() - (startTime || Date.now())) / 1000;
            const act = activities[selAct] || activities[0];
            if (act.pct === 0) {
                setRunning(false);
                setStartTime(null);
                setElapsed(0);
                setCoins([]);
                NewAppBridge.toast.info('纯度0%，本次摸鱼不计入统计');
                log('click', 'stop_slacking_zero_pct');
                return;
            }
            const p = (act.pct || 100) / 100;
            const rawMoney = (rate / 3600) * el * p;
            const curTd = todayStr();
            const mKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const dayTot = records.filter(r => localDate(r.date) === curTd).reduce((s, r) => s + r.money, 0);
            const monTot = records.filter(r => localYM(r.date) === mKey).reduce((s, r) => s + r.money, 0);
            const money = Math.min(rawMoney, Math.max(0, 999999 - dayTot), Math.max(0, 999999 - monTot));
            const newRec: SlackRecord = {
                date: new Date().toISOString(),
                seconds: el,
                money,
                activity: act.name,
                emoji: act.emoji,
                pct: act.pct || 100
            };
            const newRecs = [...records, newRec];
            setRecords(newRecs);
            saveRecords(newRecs);
            setRunning(false);
            setStartTime(null);
            setElapsed(0);
            setCoins([]);

            // Show toast
            const t = TOASTS[Math.floor(Math.random() * TOASTS.length)];
            setToastData(t);
            setShowToast(true);
            log('click', 'new_agent', {action_type: 'button_click'});
            log('show', 'new_agent_result', {}, 'new_agent_detail');
        }
    }, [running, config.salary, startTime, activities, selAct, rate, records, log]);

    const handleAddManual = useCallback(() => {
        if (!config.salary || parseFloat(config.salary) <= 0) {
            setTab('profile');
            return;
        }
        const h = Math.min(24, Math.max(0, parseInt(manH) || 0));
        const m = Math.min(59, Math.max(0, parseInt(manM) || 0));
        const s = Math.min(59, Math.max(0, parseInt(manS) || 0));
        const ts = Math.min(86400, h * 3600 + m * 60 + s);
        if (ts <= 0) {
            NewAppBridge.toast.info('请先输入摸鱼时长');
            return;
        }
        const act = activities[selAct] || activities[0];
        if (act.pct === 0) {
            NewAppBridge.toast.info('纯度0%，本次摸鱼不计入统计');
            setManH('');
            setManM('');
            setManS('');
            return;
        }
        const p = (act.pct || 100) / 100;
        const rawMoney = (rate / 3600) * ts * p;
        const curTd = todayStr();
        const mKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const dayTot = records.filter(r => localDate(r.date) === curTd).reduce((sum, r) => sum + r.money, 0);
        const monTot = records.filter(r => localYM(r.date) === mKey).reduce((sum, r) => sum + r.money, 0);
        const money = Math.min(rawMoney, Math.max(0, 999999 - dayTot), Math.max(0, 999999 - monTot));
        const newRec: SlackRecord = {
            date: new Date().toISOString(),
            seconds: ts,
            money,
            activity: act.name,
            emoji: act.emoji,
            pct: act.pct || 100
        };
        const newRecs = [...records, newRec];
        setRecords(newRecs);
        saveRecords(newRecs);
        setManH('');
        setManM('');
        setManS('');
        NewAppBridge.toast.success('已保存摸鱼战绩');
        log('click', 'new_agent', {action_type: 'button_click'});
    }, [config.salary, manH, manM, manS, activities, selAct, rate, records, log]);

    const handleGenShare = useCallback(() => {
        const url = genShareImage(records, goldPrice);
        setShareImgUrl(url);
        setShowShareOverlay(true);
        log('click', 'new_agent', {action_type: 'button_click'});
    }, [records, goldPrice, log]);

    const handleSaveCfg = useCallback((field: string, value: string) => {
        let validated = value;
        let limitMsg = '';

        if (value !== '') {
            if (field === 'salary') {
                const n = parseFloat(value) || 0;
                if (n > 10000000) {
                    validated = '10000000';
                    limitMsg = '月薪已达到最大限制（1000万元）';
                }
            } else if (field === 'workDays') {
                const n = parseInt(value) || 0;
                if (n > 30) {
                    validated = '30';
                    limitMsg = '每月工作天数不可超过30天';
                }
            } else if (field === 'workHours') {
                const n = parseFloat(value) || 0;
                if (n > 24) {
                    validated = '24';
                } else if (n > 9) {
                    limitMsg = '辛苦啦，记得给自己留点休息时间';
                }
            }
        }

        if (limitMsg) {
            if (cfgToastTimerRef.current) {
                clearTimeout(cfgToastTimerRef.current);
            }
            cfgToastTimerRef.current = setTimeout(() => NewAppBridge.toast.info(limitMsg), 400);
        }

        setConfig(prev => {
            const next = {...prev, [field]: validated};
            saveConfig(next);
            return next;
        });
    }, []);

    const handleClearAll = useCallback(() => {
        setShowClearConfirm(true);
    }, []);

    const confirmClearAll = useCallback(() => {
        setRecords([]);
        try {
            localStorage.removeItem(RK);
        } catch {
            // ignore
        }
        setShowClearConfirm(false);
        log('click', 'new_agent', {action_type: 'button_click'});
    }, [log]);

    // ── Activity modal handlers ──
    const handleRemoveAct = useCallback(
        (index: number) => {
            setConfig(prev => {
                const a = [...(prev.activities || [...DEF_ACT])];
                if (a.length <= 1) {
                    setToastData({emoji: '🙅', text: '不行不行！', sub: '必须留一个摸鱼姿势'});
                    setShowToast(true);
                    return prev;
                }
                a.splice(index, 1);
                const next = {...prev, activities: a};
                saveConfig(next);
                if (selAct >= a.length) {
                    setSelAct(0);
                }
                return next;
            });
        },
        [selAct]
    );

    const handleUpdateActPct = useCallback((index: number, val: string) => {
        setConfig(prev => {
            const a = [...(prev.activities || [...DEF_ACT])];
            a[index] = {...a[index], pct: Math.min(100, Math.max(0, parseInt(val) || 0))};
            const next = {...prev, activities: a};
            saveConfig(next);
            return next;
        });
    }, []);

    const handleAddAct = useCallback(() => {
        const e = addEmoji.trim() || '';
        const n = addName.trim();
        if (!n) {
            return;
        }
        const p = Math.min(100, Math.max(0, parseInt(addPct) || 0));
        setConfig(prev => {
            const a = [...(prev.activities || [...DEF_ACT]), {emoji: e, name: n, pct: p}];
            const next = {...prev, activities: a};
            saveConfig(next);
            return next;
        });
        setAddEmoji('');
        setAddName('');
        setAddPct('100');
    }, [addEmoji, addName, addPct]);

    // ── Welcome handlers ──
    const [welSal, setWelSal] = useState('');
    const [welDays, setWelDays] = useState('');
    const [welHrs, setWelHrs] = useState('');
    const welToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleWelChange = useCallback((field: 'sal' | 'days' | 'hrs', value: string) => {
        const digits = value.replace(/[^0-9.]/g, '');
        let limited = digits;
        let limitMsg = '';
        if (digits !== '') {
            if (field === 'sal') {
                const n = parseFloat(digits) || 0;
                if (n > 10000000) {
                    limited = '10000000';
                    limitMsg = '月薪已达到最大限制（1000万元）';
                }
            } else if (field === 'days') {
                const n = parseInt(digits) || 0;
                if (n > 30) {
                    limited = '30';
                    limitMsg = '每月工作天数不可超过30天';
                }
            } else if (field === 'hrs') {
                const n = parseFloat(digits) || 0;
                if (n > 24) {
                    limited = '24';
                } else if (n > 9) {
                    limitMsg = '辛苦啦，记得给自己留点休息时间';
                }
            }
        }
        if (limitMsg) {
            if (welToastTimerRef.current) {
                clearTimeout(welToastTimerRef.current);
            }
            welToastTimerRef.current = setTimeout(() => NewAppBridge.toast.info(limitMsg), 400);
        }
        if (field === 'sal') {
            setWelSal(limited);
        } else if (field === 'days') {
            setWelDays(limited);
        } else {
            setWelHrs(limited);
        }
    }, []);

    const handleSaveWelcome = useCallback(() => {
        const c = getConfig();
        c.salary = welSal || '8000';
        c.workDays = welDays || '22';
        c.workHours = welHrs || '8';
        saveConfig(c);
        setConfig(c);
        setShowWelcome(false);
        log('click', 'new_agent', {action_type: 'form_submit', has_text_input: 1});
    }, [welSal, welDays, welHrs, log]);

    // ── Gold refresh ──
    const handleRefreshGold = useCallback(async () => {
        setGoldRefText('更新中...');
        const p = await fetchGoldPrice();
        if (p) {
            setGoldPrice(p);
            const c = getConfig();
            c.goldPrice = p;
            saveConfig(c);
            setGoldRefText('已更新');
        } else {
            setGoldRefText('更新失败');
        }
        setTimeout(() => setGoldRefText('刷新金价'), 2000);
    }, []);

    // ── Calendar navigation ──
    const handleCalPrev = useCallback(() => {
        const newM = calM === 0 ? 11 : calM - 1;
        const newY = calM === 0 ? calY - 1 : calY;
        setCalM(newM);
        setCalY(newY);
        setSelDate(`${newY}-${String(newM + 1).padStart(2, '0')}-01`);
    }, [calM, calY]);

    const handleCalNext = useCallback(() => {
        const newM = calM === 11 ? 0 : calM + 1;
        const newY = calM === 11 ? calY + 1 : calY;
        setCalM(newM);
        setCalY(newY);
        setSelDate(`${newY}-${String(newM + 1).padStart(2, '0')}-01`);
    }, [calM, calY]);

    // ═══════════════════════ Calendar data ═══════════════════════

    const calMK = `${calY}-${String(calM + 1).padStart(2, '0')}`;
    const monthRecords = useMemo(() => records.filter(r => localYM(r.date) === calMK), [records, calMK]);
    const monthMoney = useMemo(() => monthRecords.reduce((s, r) => s + r.money, 0), [monthRecords]);
    const monthSec = useMemo(() => monthRecords.reduce((s, r) => s + r.seconds, 0), [monthRecords]);

    const calDaysData = useMemo(() => {
        const firstDay = new Date(calY, calM, 1).getDay();
        const daysInMonth = new Date(calY, calM + 1, 0).getDate();
        const dayMap: Record<number, number> = {};
        monthRecords.forEach(r => {
            const day = localDay(r.date);
            dayMap[day] = (dayMap[day] || 0) + r.money;
        });
        return {firstDay, daysInMonth, dayMap};
    }, [calY, calM, monthRecords]);

    // ── Day detail ──
    const dayRecords = useMemo(
        () =>
            records
                .filter(r => localDate(r.date) === selDate)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [records, selDate]
    );

    // ── Year stats ──
    const yearStr = new Date().getFullYear().toString();
    const yearRecords = useMemo(() => records.filter(r => localYear(r.date) === yearStr), [records, yearStr]);
    const yearMoney = useMemo(() => yearRecords.reduce((s, r) => s + r.money, 0), [yearRecords]);
    const yearSec = useMemo(() => yearRecords.reduce((s, r) => s + r.seconds, 0), [yearRecords]);

    // ── Charts data ──
    const activityChartData = useMemo(() => {
        if (!monthRecords.length) {
            return [];
        }
        const actMap: Record<string, number> = {};
        monthRecords.forEach(r => {
            const k = (r.emoji || '') + ' ' + (r.activity || '摸鱼');
            actMap[k] = (actMap[k] || 0) + r.money;
        });
        const list = Object.entries(actMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
        const maxA = list.length ? list[0][1] : 1;
        return list.map(([name, val]) => ({
            name,
            val,
            pct: Math.round((val / maxA) * 100)
        }));
    }, [monthRecords]);

    const heatmapData = useMemo(() => {
        if (!monthRecords.length) {
            return null;
        }
        const hours = Array(24).fill(0) as number[];
        monthRecords.forEach(r => {
            const h = localHour(r.date);
            hours[h] += r.money;
        });
        const maxH = Math.max(...hours, 0.01);
        return hours.map((v, i) => {
            const intensity = v / maxH;
            let bg = 'rgba(99,102,241,0.04)';
            if (intensity > 0.8) {
                bg = 'rgba(99,102,241,0.55)';
            } else if (intensity > 0.5) {
                bg = 'rgba(99,102,241,0.35)';
            } else if (intensity > 0.2) {
                bg = 'rgba(99,102,241,0.2)';
            } else if (intensity > 0) {
                bg = 'rgba(99,102,241,0.1)';
            }
            const fc = intensity > 0.5 ? '#fff' : undefined;
            return {hour: i, bg, fc};
        });
    }, [monthRecords]);

    // ═══════════════════════ Time formatting ═══════════════════════

    const timeStr = useMemo(() => {
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = Math.floor(elapsed % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, [elapsed]);

    // ═══════════════════════ Render ═══════════════════════

    return (
        <>
            <Head>
                <title>带薪摸鱼计算器</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
                />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="format-detection" content="telephone=no" />
            </Head>
            <div className={styles.page}>
                <div className={styles.pageBg} />
                <div className={styles.pageWrap} ref={pageWrapRef}>
                    {/* ════════ HOME ════════ */}
                    <div className={tab === 'home' ? styles.pageSectionActive : styles.pageSection}>
                        {/* Meme top */}
                        <div className={styles.memeTop}>
                            <div className={styles.memeTitle}>
                                <span className={styles.fishTitle}>🐟</span>
                                {meme.text}
                            </div>
                            <div className={styles.memeSub}>{meme.sub}</div>
                        </div>

                        {/* Today summary */}
                        <div className={styles.todaySummary}>
                            <div className={styles.todayItem}>
                                <div className={styles.todayValue}>
                                    {todayMoney.toFixed(1)}
                                    <span className={styles.todayUnit}>元</span>
                                </div>
                                <div className={styles.todayLabel}>今日金额</div>
                            </div>
                            <div className={styles.todayItem}>
                                <div className={styles.todayValue}>
                                    {Math.round(todaySec / 60)}
                                    <span className={styles.todayUnit}>分</span>
                                </div>
                                <div className={styles.todayLabel}>今日时长</div>
                            </div>
                            <div className={`${styles.todayItem} ${styles.goldItem}`}>
                                <div className={styles.todayValue}>
                                    {todayMoney > 0 ? fmtGold(todayMoney, goldPrice) : '0'}
                                    <span className={styles.todayUnit}>g</span>
                                </div>
                                <div className={styles.todayLabel}>今日黄金</div>
                            </div>
                        </div>

                        {/* Activity stats */}
                        {activityStats.length > 0 && (
                            <div className={styles.actStats}>
                                <div className={styles.actStatsTitle}>今日摸鱼姿势统计</div>
                                <div className={styles.actStatsList}>
                                    {activityStats.map(item => (
                                        <div className={styles.actStatRow} key={item.name}>
                                            <span className={styles.asrEmoji}>{item.emoji}</span>
                                            <span className={styles.asrName}>{item.name}</span>
                                            <div className={styles.asrBar}>
                                                <div className={styles.asrFill} style={{width: `${item.pct}%`}} />
                                            </div>
                                            <span className={styles.asrDur}>{fmtD(item.sec)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Activity chips */}
                        <div className={styles.actSection}>
                            <div className={styles.actSectionHeader}>
                                <span className={styles.actSectionTitle}>选择摸鱼姿势</span>
                                <button className={styles.editBtn} onClick={() => setShowActModal(true)}>
                                    编辑
                                </button>
                            </div>
                            <div className={styles.chips}>
                                {activities.map((act, i) => (
                                    <div
                                        key={`${act.name}-${i}`}
                                        className={i === selAct ? styles.chipOn : styles.chip}
                                        onClick={() => setSelAct(i)}
                                    >
                                        <span className={styles.chipEmoji}>{act.emoji}</span>
                                        <span>{act.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Timer card */}
                        {running && (
                            <div className={styles.timerCard}>
                                <div className={styles.amtRow}>
                                    <div className={`${styles.amt}${bump ? ' ' + styles.amtBump : ''}`}>
                                        {liveMoney.toFixed(2)}
                                    </div>
                                    <div className={styles.amtUnit}>元</div>
                                </div>
                                <div className={styles.goldLive}>≈ {fmtGold(liveMoney, goldPrice)}g 黄金</div>
                                <div className={styles.timeDisplay}>{timeStr}</div>
                                <div className={styles.actLabel}>
                                    {currentAct.emoji} {currentAct.name}中... {currentAct.pct || 100}%
                                </div>
                                <div className={styles.coinBox}>
                                    {coins.map(c => (
                                        <span key={c.id} className={styles.coinFall} style={{left: `${c.left}%`}}>
                                            {c.emoji}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action group */}
                        <div className={styles.actionGroup}>
                            <button className={running ? styles.btnEnd : styles.btnGo} onClick={handleToggle}>
                                {running ? '结束摸鱼' : '开始摸鱼'}
                            </button>
                            <button className={styles.btnShare} onClick={handleGenShare}>
                                生成分享图
                            </button>

                            {/* Manual input */}
                            <div className={styles.manualBox}>
                                <div className={styles.manualTitle}>或者直接输入摸鱼时长</div>
                                <div className={styles.manualRow}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className={styles.manualInput}
                                        placeholder="0"
                                        value={manH}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                            if (raw === '') {
                                                setManH('');
                                                return;
                                            }
                                            setManH(String(Math.min(24, parseInt(raw))));
                                        }}
                                    />
                                    <span className={styles.manualLabel}>时</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className={styles.manualInput}
                                        placeholder="0"
                                        value={manM}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                            if (raw === '') {
                                                setManM('');
                                                return;
                                            }
                                            setManM(String(Math.min(59, parseInt(raw))));
                                        }}
                                    />
                                    <span className={styles.manualLabel}>分</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className={styles.manualInput}
                                        placeholder="0"
                                        value={manS}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                            if (raw === '') {
                                                setManS('');
                                                return;
                                            }
                                            setManS(String(Math.min(59, parseInt(raw))));
                                        }}
                                    />
                                    <span className={styles.manualLabel}>秒</span>
                                    <button className={styles.manualBtn} onClick={handleAddManual}>
                                        记录
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════════ STATS ════════ */}
                    <div
                        className={tab === 'stats' ? styles.pageSectionActive : styles.pageSection}
                        style={{paddingTop: 16}}
                    >
                        {/* Year banner */}
                        <div className={styles.yrBanner}>
                            <div className={styles.yrTitle}>{yearStr}年度摸鱼总览</div>
                            <div className={styles.yrRow}>
                                <div className={styles.yrItem}>
                                    <div className={styles.yrValue}>{yearMoney.toFixed(1)}</div>
                                    <div className={styles.yrLabel}>金额(元)</div>
                                </div>
                                <div className={styles.yrItem}>
                                    <div className={styles.yrValue}>{Math.round(yearSec / 60)}</div>
                                    <div className={styles.yrLabel}>时长(分)</div>
                                </div>
                                <div className={styles.yrItem}>
                                    <div className={styles.yrValue}>{yearRecords.length}</div>
                                    <div className={styles.yrLabel}>次数</div>
                                </div>
                                <div className={styles.yrItem}>
                                    <div className={styles.yrValueGold}>{fmtGold(yearMoney, goldPrice)}</div>
                                    <div className={styles.yrLabel}>
                                        克黄金{' '}
                                        <button className={styles.goldRefresh} onClick={handleRefreshGold}>
                                            {goldRefText}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className={styles.calCard}>
                            <div className={styles.monthMeme}>
                                {monthMeme(monthMoney, monthSec / 60, monthRecords.length)}
                            </div>
                            <div className={styles.calHead}>
                                <button className={styles.calNavBtn} onClick={handleCalPrev}>
                                    &#8249;
                                </button>
                                <span className={styles.calTitle}>
                                    {calY}年{calM + 1}月
                                </span>
                                <button className={styles.calNavBtn} onClick={handleCalNext}>
                                    &#8250;
                                </button>
                            </div>
                            <div className={styles.monthSummary}>
                                {monthRecords.length ? (
                                    <>
                                        本月 <span className={styles.monthSummaryBold}>¥{monthMoney.toFixed(1)}</span>
                                        {' · '}
                                        <span className={styles.monthSummaryBold}>{Math.round(monthSec / 60)}分钟</span>
                                        {' · '}
                                        {monthRecords.length}次
                                        <br />
                                        <span className={styles.monthSummaryGold}>
                                            <span className={styles.monthSummaryBold}>
                                                {fmtGold(monthMoney, goldPrice)}
                                            </span>{' '}
                                            克黄金
                                        </span>
                                    </>
                                ) : (
                                    '本月暂无摸鱼记录'
                                )}
                            </div>
                            <div className={styles.calWeekdays}>
                                {WEEKDAYS.map(d => (
                                    <span key={d}>{d}</span>
                                ))}
                            </div>
                            <div className={styles.calDays}>
                                {/* Empty cells before first day */}
                                {Array.from({length: calDaysData.firstDay}).map((_, i) => (
                                    <div key={`empty-${i}`} className={`${styles.calDayItem} ${styles.calDayEmpty}`} />
                                ))}
                                {/* Day cells */}
                                {Array.from({length: calDaysData.daysInMonth}).map((_, i) => {
                                    const day = i + 1;
                                    const ds = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const money = calDaysData.dayMap[day];
                                    const isToday = ds === td;
                                    const isSel = ds === selDate;
                                    let cls = styles.calDayItem;
                                    if (isToday) {
                                        cls += ' ' + styles.calDayToday;
                                    }
                                    if (isSel) {
                                        cls += ' ' + styles.calDaySelected;
                                    }
                                    return (
                                        <div key={ds} className={cls} onClick={() => setSelDate(ds)}>
                                            {money !== undefined && (
                                                <span className={styles.calDayMoney}>
                                                    ¥{money >= 10 ? money.toFixed(0) : money.toFixed(1)}
                                                </span>
                                            )}
                                            <span className={styles.calDayNum}>{day}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Day detail */}
                        <div>
                            {(() => {
                                const dt = new Date(selDate + 'T00:00:00');
                                const dl = `${dt.getMonth() + 1}月${dt.getDate()}日`;
                                if (!dayRecords.length) {
                                    return (
                                        <>
                                            <div className={styles.dayTitle}>{dl}</div>
                                            <div className={styles.noRecord}>这天没有摸鱼记录</div>
                                        </>
                                    );
                                }
                                return (
                                    <>
                                        <div className={styles.dayTitle}>
                                            {dl} · {dayRecords.length}次摸鱼
                                        </div>
                                        {dayRecords.map((r, idx) => {
                                            const t = new Date(r.date);
                                            const ts = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
                                            return (
                                                <div className={styles.dayRecord} key={idx}>
                                                    <div className={styles.dayRecordIcon}>{r.emoji || ''}</div>
                                                    <div className={styles.dayRecordInfo}>
                                                        <div className={styles.dayRecordName}>
                                                            {r.activity || '摸鱼'}
                                                            {r.pct && r.pct < 100 && (
                                                                <span className={styles.pctTag}> {r.pct}%</span>
                                                            )}
                                                        </div>
                                                        <div className={styles.dayRecordTime}>
                                                            {ts} · {fmtD(r.seconds)}
                                                        </div>
                                                    </div>
                                                    <div className={styles.dayRecordMoney}>
                                                        <div className={styles.dayRecordMoneyValue}>
                                                            ¥{r.money.toFixed(2)}
                                                        </div>
                                                        <div className={styles.dayRecordGold}>
                                                            {fmtGold(r.money, goldPrice)}g
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Charts */}
                        {activityChartData.length > 0 && (
                            <div className={styles.chartCard}>
                                <div className={styles.chartTitle}>本月摸鱼姿势排行</div>
                                <div className={styles.hbarList}>
                                    {activityChartData.map(item => (
                                        <div className={styles.hbarItem} key={item.name}>
                                            <span className={styles.hbarName}>{item.name}</span>
                                            <div className={styles.hbarTrack}>
                                                <div className={styles.hbarFill} style={{width: `${item.pct}%`}} />
                                            </div>
                                            <span className={styles.hbarVal}>¥{item.val.toFixed(1)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {heatmapData && (
                            <div className={styles.chartCard}>
                                <div className={styles.chartTitle}>本月摸鱼时段热力图</div>
                                <div className={styles.timeGrid}>
                                    {heatmapData.map(cell => (
                                        <div
                                            key={cell.hour}
                                            className={styles.timeCell}
                                            style={{background: cell.bg, color: cell.fc}}
                                        >
                                            <span className={styles.timeCellLabel}>{cell.hour}时</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ════════ PROFILE ════════ */}
                    <div
                        className={tab === 'profile' ? styles.pageSectionActive : styles.pageSection}
                        style={{paddingTop: 16}}
                    >
                        <div className={styles.settingGroup}>
                            <div className={styles.settingGroupTitle}>薪资信息</div>
                            <div className={styles.settingRowFirst}>
                                <span className={styles.settingLabel}>月薪（元）</span>
                                <div className={styles.rightGroup}>
                                    <span className={styles.settingHint}>
                                        {salHintText(parseFloat(config.salary || '') || 0)}
                                    </span>
                                    <input
                                        type="number"
                                        className={styles.settingInput}
                                        placeholder="8000"
                                        min={0}
                                        max={10000000}
                                        value={config.salary ?? ''}
                                        onChange={e => handleSaveCfg('salary', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className={styles.settingRow}>
                                <span className={styles.settingLabel}>每月工作天数</span>
                                <div className={styles.rightGroup}>
                                    <span className={styles.settingHint}>
                                        {dayHintText(parseFloat(config.workDays || '') || 22)}
                                    </span>
                                    <input
                                        type="number"
                                        className={styles.settingInput}
                                        placeholder="22"
                                        min={1}
                                        max={30}
                                        value={config.workDays ?? ''}
                                        onChange={e => handleSaveCfg('workDays', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className={styles.settingRowLast}>
                                <span className={styles.settingLabel}>每天工作时长</span>
                                <div className={styles.rightGroup}>
                                    <span className={styles.settingHint}>
                                        {hrHintText(parseFloat(config.workHours || '') || 8)}
                                    </span>
                                    <input
                                        type="number"
                                        className={styles.settingInput}
                                        placeholder="8"
                                        min={0.5}
                                        max={24}
                                        value={config.workHours ?? ''}
                                        step={0.5}
                                        onChange={e => handleSaveCfg('workHours', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Achievements */}
                        <div className={styles.settingGroup}>
                            <div className={styles.settingGroupTitle}>个人成就</div>
                            {unlockedAchs.length > 0 ? (
                                <div className={styles.achGrid}>
                                    {unlockedAchs.map(a => (
                                        <div key={a.id} className={styles.achUnlocked}>
                                            <span className={styles.achIcon}>{a.icon}</span>
                                            <div className={styles.achInfo}>
                                                <span className={styles.achName}>{a.name}</span>
                                                <span className={styles.achDesc}>{a.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.noAchMsg}>还没有解锁任何成就，快去摸鱼吧</div>
                            )}
                            {lockedAchs.length > 0 && (
                                <>
                                    <button
                                        className={styles.achToggle}
                                        onClick={() => setAchLockedOpen(prev => !prev)}
                                    >
                                        <span>{achLockedOpen ? '收起未解锁' : '查看未解锁'}</span>
                                        <span
                                            className={`${styles.achArrow}${achLockedOpen ? ' ' + styles.achArrowOpen : ''}`}
                                        >
                                            &#x25BE;
                                        </span>
                                    </button>
                                    <div
                                        className={`${styles.achLockedWrap}${achLockedOpen ? ' ' + styles.achLockedWrapShow : ''}`}
                                    >
                                        <div className={styles.achLockedGrid}>
                                            {lockedAchs.map(a => (
                                                <div key={a.id} className={styles.ach}>
                                                    <span className={styles.achIcon}>{a.icon}</span>
                                                    <div className={styles.achInfo}>
                                                        <span className={styles.achName}>{a.name}</span>
                                                        <span className={styles.achDesc}>{a.desc}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <button className={styles.dangerBtn} onClick={handleClearAll}>
                            清除所有摸鱼记录
                        </button>
                    </div>
                </div>

                {/* ════════ Clear Confirm Dialog ════════ */}
                {showClearConfirm && (
                    <div className={styles.confirmOverlay} onClick={() => setShowClearConfirm(false)}>
                        <div
                            className={styles.confirmDialog}
                            onClick={e => {
                                e.stopPropagation();
                            }}
                        >
                            <div className={styles.confirmHeader}>
                                <h3 className={styles.confirmTitle}>清除记录</h3>
                            </div>
                            <div className={styles.confirmBody}>
                                <p className={styles.confirmText}>确定要清除所有摸鱼记录吗？</p>
                            </div>
                            <div className={styles.confirmFooter}>
                                <button
                                    className={styles.confirmBtnSecondary}
                                    onClick={() => setShowClearConfirm(false)}
                                >
                                    取消
                                </button>
                                <button className={styles.confirmBtnDanger} onClick={confirmClearAll}>
                                    确定
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════ Tab Bar ════════ */}
                <div className={styles.tabBar}>
                    <button
                        className={tab === 'home' ? styles.tabItemActive : styles.tabItem}
                        onClick={() => handleTabChange('home')}
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                        </svg>
                        <span>摸鱼</span>
                    </button>
                    <button
                        className={tab === 'stats' ? styles.tabItemActive : styles.tabItem}
                        onClick={() => handleTabChange('stats')}
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                        </svg>
                        <span>统计</span>
                    </button>
                    <button
                        className={tab === 'profile' ? styles.tabItemActive : styles.tabItem}
                        onClick={() => handleTabChange('profile')}
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <span>个人</span>
                    </button>
                </div>
            </div>

            {/* ════════ Activity Edit Modal ════════ */}
            <div
                className={`${styles.modalOverlay}${showActModal ? ' ' + styles.modalOverlayShow : ''}`}
                onClick={e => {
                    if (e.target === e.currentTarget) {
                        setShowActModal(false);
                    }
                }}
            >
                <div className={styles.modal}>
                    <div className={styles.modalHeader}>
                        <div>
                            <div>编辑摸鱼姿势</div>
                            <div className={styles.modalHeaderHint}>（百分比为有效摸鱼占比，纯度越高越值钱）</div>
                        </div>
                        <button
                            className={styles.modalClose}
                            onClick={() => {
                                setShowActModal(false);
                                setPctDraftMap({});
                            }}
                        >
                            &times;
                        </button>
                    </div>
                    <div>
                        {activities.map((x, i) => (
                            <div className={styles.actListItem} key={`${x.name}-${i}`}>
                                <span className={styles.aliEmoji}>{x.emoji}</span>
                                <span className={styles.aliName}>{x.name}</span>
                                <input
                                    type="number"
                                    className={styles.aliPctInput}
                                    value={pctDraftMap[i] !== undefined ? pctDraftMap[i] : String(x.pct ?? 100)}
                                    min={0}
                                    max={100}
                                    onChange={e => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '');
                                        const clamped = raw === '' ? '' : String(Math.min(100, parseInt(raw) || 0));
                                        setPctDraftMap(prev => ({...prev, [i]: clamped}));
                                    }}
                                    onBlur={() => {
                                        const val = pctDraftMap[i] ?? '';
                                        handleUpdateActPct(i, val === '' ? '0' : val);
                                        setPctDraftMap(prev => {
                                            const next = {...prev};
                                            delete next[i];
                                            return next;
                                        });
                                    }}
                                />
                                <span className={styles.aliPctSuffix}>%</span>
                                <button className={styles.aliDeleteBtn} onClick={() => handleRemoveAct(i)}>
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className={styles.addActRow}>
                        <div className={styles.addActFieldWrap}>
                            <input
                                type="text"
                                className={styles.addActEmojiInput}
                                placeholder="😊"
                                value={addEmoji}
                                onChange={e => setAddEmoji([...e.target.value][0] ?? '')}
                            />
                            <span className={styles.addActFieldHint}>仅1个</span>
                        </div>
                        <div className={`${styles.addActFieldWrap} ${styles.addActNameWrap}`}>
                            <input
                                type="text"
                                className={styles.addActNameInput}
                                placeholder="名称"
                                maxLength={8}
                                value={addName}
                                onChange={e => setAddName(e.target.value)}
                            />
                            <span className={styles.addActFieldHint}>{addName.length}/8字</span>
                        </div>
                        <input
                            type="number"
                            className={styles.addActPctInput}
                            placeholder="%"
                            value={addPct}
                            min={0}
                            max={100}
                            onChange={e => {
                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                setAddPct(raw === '' ? '' : String(Math.min(100, parseInt(raw) || 0)));
                            }}
                        />
                        <button className={styles.addActBtn} onClick={handleAddAct}>
                            ✓
                        </button>
                        <button className={styles.modalConfirmBtn} onClick={() => setShowActModal(false)}>
                            ✗
                        </button>
                    </div>
                </div>
            </div>

            {/* ════════ Share Overlay ════════ */}
            <div
                className={`${styles.shareOverlay}${showShareOverlay ? ' ' + styles.shareOverlayShow : ''}`}
                onClick={e => {
                    if (e.target === e.currentTarget) {
                        setShowShareOverlay(false);
                    }
                }}
            >
                {shareImgUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shareImgUrl} alt="分享图" />
                )}
                <button
                    className={styles.shareHint}
                    onClick={() => {
                        log('click', 'new_agent', {action_type: 'save'});
                        if (shareImgUrl && NewAppBridge.env.isInApp) {
                            NewAppBridge.image.save(shareImgUrl);
                        }
                    }}
                >
                    保存到相册
                </button>
                <button className={styles.shareCloseBtn} onClick={() => setShowShareOverlay(false)}>
                    关闭
                </button>
            </div>

            {/* ════════ Toast ════════ */}
            <div
                className={`${styles.toastOverlay}${showToast ? ' ' + styles.toastOverlayShow : ''}`}
                onClick={e => {
                    if (e.target === e.currentTarget) {
                        setShowToast(false);
                    }
                }}
            >
                <div className={styles.toastBox}>
                    <div className={styles.toastEmoji}>{toastData.emoji}</div>
                    <div className={styles.toastText}>{toastData.text}</div>
                    <div className={styles.toastSub}>{toastData.sub}</div>
                    <button className={styles.toastBtn} onClick={() => setShowToast(false)}>
                        朕知道了
                    </button>
                </div>
            </div>

            {/* ════════ Welcome Modal ════════ */}
            <div className={`${styles.welcomeOverlay}${showWelcome ? ' ' + styles.welcomeOverlayShow : ''}`}>
                <div className={styles.welcomeBox}>
                    <div className={styles.welEmoji}>{''}</div>
                    <div className={styles.welTitle}>欢迎来到带薪摸鱼计算器</div>
                    <div className={styles.welSub}>填写薪资信息后，即可精准计算你的摸鱼收入</div>
                    <div className={styles.welFields}>
                        <div className={styles.welRow}>
                            <label>月薪（元）</label>
                            <span className={styles.welHint}>{salHintText(parseFloat(welSal) || 8000)}</span>
                            <input
                                type="number"
                                className={styles.welInput}
                                placeholder="8000"
                                value={welSal}
                                onChange={e => handleWelChange('sal', e.target.value)}
                            />
                        </div>
                        <div className={styles.welRow}>
                            <label>每月工作天数</label>
                            <span className={styles.welHint}>{dayHintText(parseFloat(welDays) || 22)}</span>
                            <input
                                type="number"
                                className={styles.welInput}
                                placeholder="22"
                                value={welDays}
                                onChange={e => handleWelChange('days', e.target.value)}
                            />
                        </div>
                        <div className={styles.welRow}>
                            <label>每天工作时长</label>
                            <span className={styles.welHint}>{hrHintText(parseFloat(welHrs) || 8)}</span>
                            <input
                                type="number"
                                className={styles.welInput}
                                placeholder="8"
                                value={welHrs}
                                step={0.5}
                                onChange={e => handleWelChange('hrs', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className={styles.welBtns}>
                        <button className={styles.welSkip} onClick={() => setShowWelcome(false)}>
                            稍后再说
                        </button>
                        <button className={styles.welSave} onClick={handleSaveWelcome}>
                            开始摸鱼
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

const SlackingCalculator = dynamic(() => Promise.resolve(SlackingCalculatorContent), {ssr: false});

(SlackingCalculator as any).noLayout = true;

export default SlackingCalculator;
