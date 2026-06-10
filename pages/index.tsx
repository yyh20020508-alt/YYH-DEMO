import {useState} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Home.module.css';

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function GamepadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="6" x2="10" y1="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" x2="8" y1="10" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="15" x2="15.01" y1="13" y2="13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="18" x2="18.01" y1="11" y2="11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.98 4.42l.63 5A4 4 0 0 0 7.3 18h9.4a4 4 0 0 0 3.97-3.58l.63-5A4 4 0 0 0 17.32 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9.94 15.5A2 2 0 0 0 8.5 14.06L4 12.5l4.5-1.56A2 2 0 0 0 9.94 9.5L11.5 5l1.56 4.5a2 2 0 0 0 1.44 1.44l4.5 1.56-4.5 1.56a2 2 0 0 0-1.44 1.44L11.5 20l-1.56-4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M20 3v4M22 5h-4M4 17v4M6 19H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6l-5.2 5.2a2.1 2.1 0 1 0 3 3l5.2-5.2a4.5 4.5 0 0 0 6-6l-3 3-.1 0-3.2-.8-.8-3.2v-.1l3.1-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 21a7 7 0 0 0-14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const projects = [
  {href: '/destiny-chart', index: '01', title: '命运图谱', subtitle: '命运主题的结果展示页', categoryName: '心理测试', icon: CompassIcon, tone: styles.toneBlue},
  {href: '/goose-game', index: '02', title: '逆流鹅上', subtitle: '节奏轻快的趣味互动小游戏', categoryName: '互动游戏', icon: GamepadIcon, tone: styles.toneSky},
  {href: '/slacking-calculator', index: '03', title: '带薪摸鱼计算器', subtitle: '趣味工具页，计算摸鱼收益', categoryName: '趣味工具', icon: WrenchIcon, tone: styles.toneIndigo},
  {href: '/jianghu-sign', index: '04', title: '每日江湖签', subtitle: '输入信息后生成专属签文结果', categoryName: '心理测试', icon: SparklesIcon, tone: styles.toneBlue},
  {href: '/chosen-city', index: '05', title: '天选之城', subtitle: '城市倾向测试与结果页', categoryName: '心理测试', icon: CompassIcon, tone: styles.toneSky},
  {href: '/dao-dun-dog-game.html', index: '06', title: '刀盾狗大作战', subtitle: '轻战斗成长型小游戏', categoryName: '互动游戏', icon: GamepadIcon, tone: styles.toneIndigo},
  {href: '/drama-lover-test', index: '07', title: '剧系恋人', subtitle: '角色匹配测试与情绪化互动体验', categoryName: '心理测试', icon: SparklesIcon, tone: styles.toneBlue},
  {href: '/ancient-identity-test', index: '08', title: '职场前世测试', subtitle: '古代身份 / 性格气质测试', categoryName: '心理测试', icon: UserIcon, tone: styles.toneSky},
];

export default function Home() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('1635402155@qq.com');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Head>
        <title>姚岳含的互动作品集</title>
        <meta
          name="description"
          content="收录测试、占卜、轻游戏与趣味工具的个人互动作品集。"
        />
      </Head>
      <div className={styles.page}>
        <div className={styles.bgLayer} aria-hidden="true">
          <div className={styles.bgOrbA} />
          <div className={styles.bgOrbB} />
          <div className={styles.bgOrbC} />
        </div>
        <div className={styles.container}>
          <section className={styles.hero}>
            <div className={styles.heroMeta}>
              <span className={styles.heroBadge}>PORTFOLIO</span>
              <span className={styles.heroSite}>yhh-demo.vercel.app</span>
            </div>
            <h1 className={styles.h1}>姚岳含的作品集</h1>
            <p className={styles.subtitle}>
              这里收录了我做过的测试、小游戏和趣味工具页面，点击即可进入体验。
            </p>
          </section>

          <section className={styles.listSection}>
            <div className={styles.listCard}>
              {projects.map((project) => (
                <Link key={project.href} href={project.href} className={styles.item}>
                  <span className={styles.itemIndex}>{project.index}</span>
                  <span className={`${styles.itemIcon} ${project.tone}`} aria-hidden="true">
                    <project.icon />
                  </span>
                  <div className={styles.text}>
                    <div className={styles.itemTitle}>{project.title}</div>
                    <div className={styles.itemDesc}>{project.subtitle}</div>
                  </div>
                  <div className={styles.itemAction}>
                    <span className={styles.itemActionText}>了解</span>
                    <svg className={styles.arrow} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <footer className={styles.footer}>
            <button className={`${styles.footerMail} ${copied ? styles.footerMailCopied : ''}`} onClick={handleCopyEmail}>
              <span className={styles.footerMailIcon} aria-hidden="true">
                {copied ? <CheckIcon /> : <MailIcon />}
              </span>
              <span className={styles.footerMailText}>{copied ? '邮箱已复制' : '1635402155@qq.com'}</span>
            </button>
            <div className={styles.footerCopy}>Yao Yuehan © 2026</div>
          </footer>
        </div>
      </div>
    </>
  );
}
