import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Home.module.css';

const sections = [
  {
    title: '测试 & 占卜',
    items: [
      { href: '/ancient-identity-test', icon: '🏮', bg: '#fff1e1', title: '职场前世测试', desc: '看看你的古代身份和天生气场' },
      { href: '/drama-lover-test', icon: '🎭', bg: '#fde8e8', title: '剧系恋人', desc: '测测你和哪位剧中角色最配' },
      { href: '/jianghu-sign', icon: '📜', bg: '#e8f0fd', title: '每日江湖签', desc: '输入生辰八字，获取专属江湖签' },
      { href: '/destiny-chart', icon: '🌌', bg: '#f0e8fd', title: '命运图谱', desc: '探索你的命运走势' },
    ],
  },
  {
    title: '游戏 & 互动',
    items: [
      { href: '/dao-dun-dog-game.html', icon: '⚔️', bg: '#fde8f0', title: '刀盾狗大作战', desc: '砍障碍、揍敌人，越打越强！' },
      { href: '/goose-game', icon: '🪿', bg: '#e8fde8', title: '逆流鹅上', desc: '鹅的逆流挑战' },
      { href: '/chosen-city', icon: '🏙️', bg: '#e8fdfd', title: '天选之城', desc: '测测哪座城市最适合你' },
    ],
  },
  {
    title: '工具',
    items: [
      { href: '/slacking-calculator', icon: '💼', bg: '#fdfde8', title: '带薪摸鱼计算器', desc: '上班摸鱼到底值多少钱？' },
    ],
  },
];

const featuredWorks = [
  {
    href: '/ancient-identity-test',
    eyebrow: '古风测试',
    title: '职场前世测试',
    desc: '用更完整的题目节奏和结果包装，把古代身份测试做成一页可直接展示的作品。',
  },
  {
    href: '/chosen-city',
    eyebrow: '城市测试',
    title: '天选之城',
    desc: '通过偏好、节奏与生活想象，匹配最适合自己的城市气质。',
  },
  {
    href: '/drama-lover-test',
    eyebrow: '恋爱互动',
    title: '剧系恋人',
    desc: '用叙事感更强的问答体验，给测试结果做出更完整的人设氛围。',
  },
  {
    href: '/goose-game',
    eyebrow: '轻游戏',
    title: '逆流鹅上',
    desc: '把轻松、魔性和反馈节奏揉进一个可以快速上手的小互动里。',
  },
];

const totalProjects = sections.reduce((count, section) => count + section.items.length, 0);

export default function Home() {
  return (
    <>
      <Head>
        <title>姚岳含的互动作品集</title>
        <meta
          name="description"
          content="收录测试、占卜、轻游戏与趣味工具的个人互动作品集。"
        />
      </Head>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroBadge}>Interactive Portfolio</div>
          <h1 className={styles.h1}>把测试、小游戏和情绪体验做成可以被点开的作品。</h1>
          <p className={styles.subtitle}>
            这里收录了我正在持续打磨的互动网页项目。它们不只是功能页，更是带有情绪、节奏和视觉表达的数字作品。
          </p>

          <div className={styles.heroActions}>
            <a href="#work" className={styles.primaryAction}>查看作品</a>
            <a href="#featured" className={styles.secondaryAction}>精选项目</a>
          </div>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{totalProjects}</div>
              <div className={styles.statLabel}>已接入作品</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>4</div>
              <div className={styles.statLabel}>作品类型</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>Next.js</div>
              <div className={styles.statLabel}>当前技术栈</div>
            </div>
          </div>
        </section>

        <section id="featured" className={styles.featuredSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>精选项目</div>
            <p className={styles.sectionIntro}>这些页面更能代表我想做的方向：更完整的叙事包装、更明确的视觉气质，以及更强的互动感。</p>
          </div>

          <div className={styles.featuredGrid}>
            {featuredWorks.map((work) => (
              <Link key={work.href} href={work.href} className={styles.featuredCard}>
                <div className={styles.featuredEyebrow}>{work.eyebrow}</div>
                <div className={styles.featuredTitle}>{work.title}</div>
                <div className={styles.featuredDesc}>{work.desc}</div>
                <div className={styles.featuredLink}>打开体验</div>
              </Link>
            ))}
          </div>
        </section>

        <section id="work" className={styles.workSection}>
          {sections.map((section) => (
            <div key={section.title} className={styles.sectionBlock}>
              <div className={styles.sectionTitle}>{section.title}</div>
              <div className={styles.cardList}>
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} className={styles.item}>
                    <div className={styles.icon} style={{ background: item.bg }}>{item.icon}</div>
                    <div className={styles.text}>
                      <div className={styles.itemTitle}>{item.title}</div>
                      <div className={styles.itemDesc}>{item.desc}</div>
                    </div>
                    <span className={styles.arrow}>›</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className={styles.bottomNote}>
          <div className={styles.bottomTitle}>这个仓库正在持续整理中</div>
          <p className={styles.bottomCopy}>
            当前版本已经可以正常构建，接下来会继续补充更完整的个人介绍、项目说明和部署信息，逐步整理成适合上传 GitHub 的公开作品集。
          </p>
        </section>
      </div>
    </>
  );
}
