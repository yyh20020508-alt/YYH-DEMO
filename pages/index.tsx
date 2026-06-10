import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Home.module.css';

const featuredWorks = [
  {
    href: '/drama-lover-test',
    title: '剧系恋人测试',
    desc: '角色匹配测试与情绪化视觉包装。',
    preview: '剧系恋人',
    accent: '#f1bebf',
    glow: '#fff1f1',
    tags: ['测试策划', '视觉设计', '互动体验'],
  },
  {
    href: '/chosen-city',
    title: '天选之城',
    desc: '城市倾向测试与结果页叙事表达。',
    preview: '天选之城',
    accent: '#a9c7ee',
    glow: '#eef6ff',
    tags: ['测试包装', '移动端', '结果表达'],
  },
  {
    href: '/ancient-identity-test',
    title: '职场前世测试',
    desc: '古风身份测试与更完整的结果气质塑造。',
    preview: '职场前世',
    accent: '#d8c1a0',
    glow: '#fff8ec',
    tags: ['内容策划', '题目节奏', '古风视觉'],
  },
  {
    href: '/dao-dun-dog-game.html',
    title: '刀盾狗大作战',
    desc: '轻战斗小游戏，包含成长、道具与反馈循环。',
    preview: '刀盾狗',
    accent: '#ffcf96',
    glow: '#fff6e8',
    tags: ['轻游戏', '交互反馈', '资源整合'],
  },
];

const projectGroups = [
  {
    title: '测试 / 占卜',
    items: [
      { href: '/ancient-identity-test', title: '职场前世测试' },
      { href: '/drama-lover-test', title: '剧系恋人' },
      { href: '/jianghu-sign', title: '每日江湖签' },
      { href: '/destiny-chart', title: '命运图谱' },
    ],
  },
  {
    title: '游戏 / 互动',
    items: [
      { href: '/dao-dun-dog-game.html', title: '刀盾狗大作战' },
      { href: '/goose-game', title: '逆流鹅上' },
      { href: '/chosen-city', title: '天选之城' },
    ],
  },
  {
    title: '工具',
    items: [
      { href: '/slacking-calculator', title: '带薪摸鱼计算器' },
    ],
  },
];

const totalProjects = projectGroups.reduce((count, section) => count + section.items.length, 0);
const skillTags = ['内容策划', '产品运营', 'AI 协作', '交互体验', '视觉包装', '移动端设计'];

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
        <section className={styles.heroShell}>
          <div className={styles.topbar}>
            <div className={styles.brand}>YH<span>.</span></div>
            <div className={styles.menuMark} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <div className={styles.heroBadge}>Interactive Portfolio</div>
              <h1 className={styles.h1}>你好，我是姚岳含</h1>
              <p className={styles.roleLine}>互动内容策划 | AI 创意应用 | 国际关系研究生</p>
              <p className={styles.subtitle}>
                把测试、小应用和轻互动页面，做成可以直接展示、直接体验的作品。
              </p>

              <div className={styles.heroActions}>
                <a href="#featured" className={styles.primaryAction}>查看作品</a>
                <a href="#contact" className={styles.secondaryAction}>在线链接</a>
              </div>

              <div className={styles.heroMeta}>
                <span>{totalProjects} 个页面</span>
                <span>手机优先适配</span>
                <span>持续更新中</span>
              </div>
            </div>

            <div className={styles.heroPortrait} aria-hidden="true">
              <div className={styles.portraitAura} />
              <div className={styles.portraitCard}>
                <div className={styles.portraitGlow} />
                <div className={styles.portraitInitial}>YH</div>
              </div>
            </div>
          </div>
        </section>

        <section id="featured" className={styles.featuredSection}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionHeadingTitle}>精选作品</div>
            <a href="#work" className={styles.sectionHeadingLink}>查看全部</a>
          </div>

          <div className={styles.featuredList}>
            {featuredWorks.map((work) => (
              <Link
                key={work.href}
                href={work.href}
                className={styles.featuredCard}
                style={{
                  ['--card-accent' as string]: work.accent,
                  ['--card-glow' as string]: work.glow,
                }}
              >
                <div className={styles.previewBlock}>
                  <div className={styles.previewScreen}>
                    <div className={styles.previewLabel}>{work.preview}</div>
                  </div>
                </div>
                <div className={styles.featuredCopy}>
                  <div className={styles.featuredTitle}>{work.title}</div>
                  <div className={styles.featuredDesc}>{work.desc}</div>
                  <div className={styles.tagRow}>
                    {work.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <span className={styles.featuredArrow}>›</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="work" className={styles.infoSection}>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>项目分类</div>
            <div className={styles.groupList}>
              {projectGroups.map((group) => (
                <div key={group.title} className={styles.groupItem}>
                  <div className={styles.groupName}>{group.title}</div>
                  <div className={styles.groupLinks}>
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} className={styles.groupLink}>
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.infoSection}>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>关于我</div>
            <p className={styles.infoText}>
              我在做的不是单纯页面堆砌，而是把灵感、题目设计、视觉表达和交互节奏，组合成可以被点开体验的作品。
            </p>
          </div>
        </section>

        <section className={styles.infoSection}>
          <div className={styles.infoTitle}>能力标签</div>
          <div className={styles.skillGrid}>
            {skillTags.map((tag) => (
              <span key={tag} className={styles.skillTag}>{tag}</span>
            ))}
          </div>
        </section>

        <section id="contact" className={styles.infoSection}>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>在线链接</div>
            <div className={styles.contactRow}>
              <a href="https://yyh-demo.vercel.app" target="_blank" rel="noreferrer" className={styles.contactLink}>
                Vercel 作品站
              </a>
              <a href="https://github.com/yyh20020508-alt/YYH-DEMO" target="_blank" rel="noreferrer" className={styles.contactLink}>
                GitHub 仓库
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
