import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Home.module.css';

const projects = [
  { href: '/destiny-chart', title: '命运图谱', desc: '命运主题的结果展示页' },
  { href: '/goose-game', title: '逆流鹅上', desc: '节奏轻快的趣味互动小游戏' },
  { href: '/slacking-calculator', title: '带薪摸鱼计算器', desc: '趣味工具页，计算摸鱼收益' },
  { href: '/jianghu-sign', title: '每日江湖签', desc: '输入信息后生成专属签文结果' },
  { href: '/chosen-city', title: '天选之城', desc: '城市倾向测试与结果页' },
  { href: '/dao-dun-dog-game.html', title: '刀盾狗大作战', desc: '轻战斗成长型小游戏' },
  { href: '/drama-lover-test', title: '剧系恋人', desc: '角色匹配测试与情绪化互动体验' },
  { href: '/ancient-identity-test', title: '职场前世测试', desc: '古代身份 / 性格气质测试' },
];

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
          <h1 className={styles.h1}>姚岳含的作品集</h1>
          <p className={styles.subtitle}>
            这里收录了我做过的测试、小游戏和趣味工具页面，点击右侧箭头即可进入体验。
          </p>
        </section>

        <section className={styles.listSection}>
          <div className={styles.listCard}>
            {projects.map((project) => (
              <Link key={project.href} href={project.href} className={styles.item}>
                <div className={styles.text}>
                  <div className={styles.itemTitle}>{project.title}</div>
                  <div className={styles.itemDesc}>{project.desc}</div>
                </div>
                <span className={styles.arrow}>›</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
