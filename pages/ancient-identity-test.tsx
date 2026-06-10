import Head from 'next/head';
import {useMemo, useRef, useState} from 'react';
import styles from '@/styles/ancient-identity-test.module.css';

type OptionKey = 'A' | 'B' | 'C' | 'D';

type Question = {
    id: number;
    text: string;
    options: {key: OptionKey; text: string}[];
};

type ResultName =
    | '曹操'
    | '张良'
    | '武则天'
    | '李清照'
    | '韩信'
    | '张飞'
    | '诸葛亮'
    | '张居正'
    | '王阳明'
    | '李白';

type ResultInfo = {
    title: ResultName;
    subtitle: string;
    desc: string;
    ability: string;
    risk: string;
    death: string;
    advice: string;
};

const questions: Question[] = [
    {
        id: 1,
        text: '若只能选一个，你更能接受哪一种人生结局？',
        options: [
            {key: 'A', text: '生前背尽骂名，死后被写进史书。'},
            {key: 'B', text: '生前受尽敬重，死后很快被人遗忘。'},
            {key: 'C', text: '名声与史书都轻，我更在意这一生有没有活得干净。'},
            {key: 'D', text: '别人如何记我都在后话，我只想活着的时候把想做的事做成。'},
        ],
    },
    {
        id: 2,
        text: '若你终将立于权力之巅，只留一个背影给后世，你更希望人们如何说起你？',
        options: [
            {key: 'A', text: '乱世将倾之时，有人一肩扛住了它。'},
            {key: 'B', text: '天命既至，便由我来定规矩。'},
            {key: 'C', text: '爱我也好，恨我也罢，这天下终究留下了我的手笔。'},
            {key: 'D', text: '此生行过，终究没有辜负自己信过的道理。'},
        ],
    },
    {
        id: 3,
        text: '若要择一人并肩同行，你更愿意与谁共路？',
        options: [
            {key: 'A', text: '性子烈些无妨，到了紧要关头真能提刀上前的人。'},
            {key: 'B', text: '平日寡言，但有事从不躲，缺口总会先去补上的人。'},
            {key: 'C', text: '心思细，眼界远，凡事总比旁人先看三步的人。'},
            {key: 'D', text: '胸中自有定盘星，天塌下来也不先乱了气息的人。'},
        ],
    },
    {
        id: 4,
        text: '四幅景致，只许入其一，你最愿身在——',
        options: [
            {key: 'A', text: '朔风猎猎，旌旗欲动，天地之间只剩一线将开未开的锋芒。'},
            {key: 'B', text: '夜雨青灯，案牍如山，你正翻到最要紧的一页。'},
            {key: 'C', text: '满堂宾客，觥筹交错，你一句话落下，四座俱静。'},
            {key: 'D', text: '溪山微雨，草木含烟，你只想缓步而行，不问来处。'},
        ],
    },
    {
        id: 5,
        text: '一桩差事，你出力最多，临到论功，旁人却先一步把彩头揽去。你会——',
        options: [
            {key: 'A', text: '含笑添一句：“此事奔走劳碌，我亦不敢居后。”'},
            {key: 'B', text: '先让席上风平，席散之后再把话说透。'},
            {key: 'C', text: '当下不动声色，心里已把此人记上了一笔。'},
            {key: 'D', text: '面上云淡风轻，从此往后只与他留三分情面。'},
        ],
    },
    {
        id: 6,
        text: '若只能从下面四样旧物里留一件，你会留下——',
        options: [
            {key: 'A', text: '一把尚带寒光的旧剑。'},
            {key: 'B', text: '一本批注密密麻麻的旧书。'},
            {key: 'C', text: '一枚能调动人心的旧印。'},
            {key: 'D', text: '一只被岁月磨得很亮的酒杯。'},
        ],
    },
    {
        id: 7,
        text: '若有人当众折你颜面，而你只要低头这一回，往后就能换来更大的路。你会——',
        options: [
            {key: 'A', text: '忍。今日这口气先咽下，来日我自会把场子赢回来。'},
            {key: 'B', text: '面上忍，心里记。这一回我低头，往后总有一回轮到他抬不起头。'},
            {key: 'C', text: '不忍。路可以不要，脸不能这么丢。'},
            {key: 'D', text: '先看值不值。真值得，我忍；不值得，这局我当场就散。'},
        ],
    },
    {
        id: 8,
        text: '若只能择一句，作你心中的行路之辞，你更偏爱——',
        options: [
            {key: 'A', text: '“长风破浪会有时，直挂云帆济沧海。”'},
            {key: 'B', text: '“安得广厦千万间，大庇天下寒士俱欢颜。”'},
            {key: 'C', text: '“不畏浮云遮望眼，只缘身在最高层。”'},
            {key: 'D', text: '“行到水穷处，坐看云起时。”'},
        ],
    },
    {
        id: 9,
        text: '若你要在古画里站一个位置，你更想站在——',
        options: [
            {key: 'A', text: '城楼最高处，风一吹，衣摆便猎猎扬起。'},
            {key: 'B', text: '灯火最亮处，桌上摊着还未处理完的案卷。'},
            {key: 'C', text: '众人之外一点点，能把满场神色尽收眼底的地方。'},
            {key: 'D', text: '山水之间，远一点，静一点，谁都不用应付。'},
        ],
    },
    {
        id: 10,
        text: '若朝局忽生差池，此事本非你一人之责，满堂目光却先落在你身上。你会——',
        options: [
            {key: 'A', text: '当先出列，先把这局接住，旁的都往后放。'},
            {key: 'B', text: '先安众心，待风声稍定，再将曲直一一分明。'},
            {key: 'C', text: '不忙辩白，先查是谁顺水推舟，把祸引到了我身前。'},
            {key: 'D', text: '先补最险的一环，让局面不至再坏，其余是非留待日后再算。'},
        ],
    },
];

const resultsData: Record<ResultName, ResultInfo> = {
    曹操: {
        title: '曹操',
        subtitle: '你一进场，先看的永远是牌桌。',
        desc: '你对局势很敏感，谁握着主动、哪边有缺口、什么时候该下手，心里总比别人快半拍。很多人忙着做事，你已经开始看人、看风向、看位置。',
        ability: '判断快，控场强，敢拍板，也敢担事。越是复杂的局面，你越容易兴奋。',
        risk: '看见低效和拖沓就烦，遇到装糊涂的人更烦，压迫感有时会直接写在脸上。',
        death: '节奏一旦失控，你整个人都会绷起来。',
        advice: '主动权该拿就拿，别把所有场子都打成个人秀。',
    },
    张良: {
        title: '张良',
        subtitle: '你不急着赢，你很会等风来。',
        desc: '你出手不算最早，落点通常很准。很多人喜欢抢存在感，你更在意这一手下去值不值、稳不稳、会不会改局。你对时机有种天然的嗅觉。',
        ability: '看局准，分寸稳，脑子快，关键时候落子很有用。',
        risk: '想得太明白，偶尔会显得慢半拍；有些机会，本来可以更早拿。',
        death: '太懂进退，有时会把“再等等”拖成习惯。',
        advice: '收锋很难得，出手也别总留到最后。',
    },
    武则天: {
        title: '武则天',
        subtitle: '局越难，你越容易起状态。',
        desc: '顺风顺水的时候，你未必最亮；真到逆风局，你那股劲儿会一下子顶出来。压得越狠，反弹越猛，很多人扛不住的时候，你反而会更想赢。',
        ability: '抗压强，执行狠，翻盘能力高，关键时刻很能顶。',
        risk: '习惯自己扛，很多事会下意识揽到自己身上。',
        death: '撑得太久，累也不爱说。',
        advice: '狠劲留着开路，别顺手把全场都背起来。',
    },
    李清照: {
        title: '李清照',
        subtitle: '你看着温柔，心里的波澜一点都不浅。',
        desc: '你对情绪、细节、气氛都很敏感。很多别人一带而过的瞬间，你会记很久，也想很深。你的感受力很强，心里的褶皱也比一般人多。',
        ability: '感知细，审美好，表达准，复杂心绪到你这儿往往都能落成一句话。',
        risk: '容易反复回味，表面过去了，心里还会转很久。',
        death: '嘴上能装没事，心里其实一点都没少感受。',
        advice: '敏感很珍贵，别总拿它先消耗自己。',
    },
    韩信: {
        title: '韩信',
        subtitle: '你这种人，往往后面更吓人。',
        desc: '你不一定开场最显眼，但真给到舞台，存在感会一下子拔高。前期容易被低估，后期特别容易打出一手让人回头补课的牌。',
        ability: '成长快，爆发强，到了关键节点很容易突然发光。',
        risk: '被轻视久了，心里会积气。',
        death: '太在意有没有被真正看见。',
        advice: '机会可以等，别把整个人生都挂在“等识货的人”。',
    },
    张飞: {
        title: '张飞',
        subtitle: '你这人，最大的特点就是直。',
        desc: '你看不惯绕来绕去的气氛，心里有话，嘴上通常憋不久。很多人会先试探、先铺垫、先圆场，你更习惯当场说清楚。态度鲜明，情绪也鲜明。',
        ability: '行动快，胆子大，护短，关键时候真敢顶上去。',
        risk: '一烦低效就容易炸，看见虚头巴脑更容易上头。',
        death: '好心的时候，语气也可能像在掀桌。',
        advice: '真性情很难得，开大之前先看一眼场合。',
    },
    诸葛亮: {
        title: '诸葛亮',
        subtitle: '场面一乱，大家会下意识先找你。',
        desc: '别人慌的时候，你通常还稳得住。复杂、混乱、快散掉的场子，到你这儿总会慢慢有线头。你身上很容易让人产生“有他在，事情还不至于彻底坏掉”的感觉。',
        ability: '救场快，统筹稳，执行力强，复杂局面里很少掉线。',
        risk: '责任感太重，顺手就把别人的活也背了。',
        death: '看不得事情烂掉，很难真正甩手。',
        advice: '靠谱是优点，别把自己活成全场默认售后。',
    },
    张居正: {
        title: '张居正',
        subtitle: '你一认真，世界都会被按下加速键。',
        desc: '你很适合干那些别人嫌乱、嫌麻烦、嫌推进不动的事。很多人还在讨论，你已经开始盯进度、理流程、催结果。你对“事情得往前走”这件事有天然执念。',
        ability: '推进强，组织强，压得住节奏，也拽得动全局。',
        risk: '对拖延和低效过敏，看久了会直接上火。',
        death: '劲儿使太满，容易把自己也推到过载。',
        advice: '事可以催，别把自己也催坏了。',
    },
    王阳明: {
        title: '王阳明',
        subtitle: '你心里一直有条线，别人很难带偏。',
        desc: '很多事你有自己的判断，想通之后，整个人会一下子变得很干脆。你对意义感要求很高，自己都说服不了自己的事，很难真的上心。',
        ability: '内核稳，自我校准能力强，混乱里也能守住自己的判断。',
        risk: '太容易先想透，偶尔会把行动往后压。',
        death: '看见言行不一的环境，心里会很疲。',
        advice: '你的标准没错，别让它顺手把自己也卡住。',
    },
    李白: {
        title: '李白',
        subtitle: '你的系统，常常和别人不是一套。',
        desc: '你对自由和灵感特别敏感，太死的规矩、太闷的场子、太整齐的活法，都容易让你心里先起一阵烦躁。你不一定会走出去，但心早就先飘远了。',
        ability: '灵感强，表达强，气场也强，很多人看不见的东西你先能感觉到。',
        risk: '太想活得痛快，容易对琐碎、重复、没劲的事失去耐心。',
        death: '理想太清楚，有时反而更难将就。',
        advice: '锋芒很好看，也给它找个能落地的地方。',
    },
};

const scoreTable: Record<OptionKey, Partial<Record<ResultName, number>>>[] = [
    {A: {曹操: 2, 武则天: 1}, B: {张居正: 2, 诸葛亮: 1}, C: {王阳明: 2, 李清照: 1}, D: {曹操: 2, 韩信: 1}},
    {A: {诸葛亮: 2, 张居正: 1}, B: {武则天: 2, 曹操: 1}, C: {曹操: 2, 武则天: 1}, D: {王阳明: 2, 张良: 1}},
    {A: {张飞: 2, 韩信: 1}, B: {诸葛亮: 2, 张居正: 1}, C: {张良: 2, 曹操: 1}, D: {王阳明: 2, 李清照: 1}},
    {A: {韩信: 2, 张飞: 1}, B: {张居正: 2, 诸葛亮: 1}, C: {曹操: 2, 李白: 1}, D: {李清照: 2, 李白: 1}},
    {A: {曹操: 2, 张飞: 1}, B: {诸葛亮: 2, 张良: 1}, C: {武则天: 2, 张良: 1}, D: {李清照: 2, 王阳明: 1}},
    {A: {张飞: 2, 韩信: 1}, B: {王阳明: 2, 诸葛亮: 1}, C: {曹操: 2, 武则天: 1}, D: {李白: 2, 李清照: 1}},
    {A: {韩信: 2, 张良: 1}, B: {武则天: 2, 张良: 1}, C: {张飞: 2, 李白: 1}, D: {王阳明: 2, 曹操: 1}},
    {A: {韩信: 2, 李白: 1}, B: {诸葛亮: 2, 张居正: 1}, C: {曹操: 2, 武则天: 1}, D: {李白: 2, 王阳明: 1}},
    {A: {武则天: 2, 韩信: 1}, B: {张居正: 2, 诸葛亮: 1}, C: {张良: 2, 曹操: 1}, D: {李白: 2, 李清照: 1}},
    {A: {诸葛亮: 2, 张居正: 1}, B: {张居正: 2, 诸葛亮: 1}, C: {张良: 2, 曹操: 1}, D: {王阳明: 2, 李清照: 1}},
];

const resultOrder = Object.keys(resultsData) as ResultName[];

export default function AncientIdentityTestPage() {
    const [started, setStarted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Partial<Record<number, OptionKey>>>({});
    const [saving, setSaving] = useState(false);
    const shareCardRef = useRef<HTMLDivElement>(null);

    const resultName = useMemo(() => {
        if (Object.keys(answers).length < questions.length) {
            return null;
        }

        const scores = Object.fromEntries(resultOrder.map(name => [name, 0])) as Record<ResultName, number>;
        questions.forEach((question, index) => {
            const key = answers[question.id];
            if (!key) {
                return;
            }
            const mapping = scoreTable[index][key];
            Object.entries(mapping).forEach(([name, score]) => {
                scores[name as ResultName] += score ?? 0;
            });
        });

        let maxScore = -1;
        let candidates: ResultName[] = [];
        resultOrder.forEach(name => {
            if (scores[name] > maxScore) {
                maxScore = scores[name];
                candidates = [name];
            } else if (scores[name] === maxScore) {
                candidates.push(name);
            }
        });

        if (candidates.length === 1) {
            return candidates[0];
        }

        const tieBreakers = [1, 2, 10];
        for (const questionNo of tieBreakers) {
            const key = answers[questionNo];
            if (!key) {
                continue;
            }
            const mapping = scoreTable[questionNo - 1][key];
            for (const name of candidates) {
                if (mapping[name] === 2) {
                    return name;
                }
            }
        }

        return candidates[0];
    }, [answers]);

    const currentQuestion = questions[currentIndex];
    const selectedOption = answers[currentQuestion?.id];
    const result = resultName ? resultsData[resultName] : null;

    const handleSelect = (key: OptionKey) => {
        const nextAnswers = {...answers, [currentQuestion.id]: key};
        setAnswers(nextAnswers);

        if (currentIndex < questions.length - 1) {
            window.setTimeout(() => setCurrentIndex(prev => prev + 1), 240);
        }
    };

    const handleRestart = () => {
        setStarted(false);
        setCurrentIndex(0);
        setAnswers({});
    };

    const handleSaveImage = async () => {
        if (!shareCardRef.current || !result) {
            return;
        }

        setSaving(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(shareCardRef.current, {
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#f5f0e8',
                scale: 2,
                logging: false,
            });

            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = url;
            link.download = `职场前世测试-${result.title}.png`;
            link.click();
        } finally {
            setSaving(false);
        }
    };

    const progress = Math.round((Object.keys(answers).length / questions.length) * 100);

    return (
        <>
            <Head>
                <title>职场前世测试</title>
                <meta name="description" content="测测你的职场前世，看看你在古代会是哪一种人物气质。" />
            </Head>
            <main className={styles.page}>
                {!started && !result && (
                    <section className={styles.cover}>
                        <div className={styles.coverTexture} aria-hidden="true" />
                        <div className={styles.coverContent}>
                            <div className={styles.coverLabel}>Career Past Life Test</div>
                            <h1 className={styles.coverTitle}>测测你的职场前世</h1>
                            <p className={styles.coverSubtitle}>看看你的古代身份、行事路数和最容易被人记住的气场。</p>
                            <button className={styles.primaryButton} onClick={() => setStarted(true)}>
                                开始测试
                            </button>
                        </div>
                    </section>
                )}

                {started && !result && (
                    <section className={styles.quizSection}>
                        <div className={styles.quizShell}>
                            <div className={styles.quizHeader}>
                                <div className={styles.progressMeta}>
                                    <span>第 {currentIndex + 1} / {questions.length} 题</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className={styles.progressBar}>
                                    <div className={styles.progressFill} style={{width: `${progress}%`}} />
                                </div>
                            </div>

                            <div className={styles.questionCard}>
                                <div className={styles.questionNumber}>问题 {currentQuestion.id}</div>
                                <h2 className={styles.questionText}>{currentQuestion.text}</h2>
                                <div className={styles.options}>
                                    {currentQuestion.options.map((option) => (
                                        <button
                                            key={option.key}
                                            className={`${styles.optionButton}${selectedOption === option.key ? ` ${styles.optionButtonSelected}` : ''}`}
                                            onClick={() => handleSelect(option.key)}
                                        >
                                            <span className={styles.optionKey}>{option.key}</span>
                                            <span className={styles.optionText}>{option.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.quizActions}>
                                <button
                                    className={styles.secondaryButton}
                                    disabled={currentIndex === 0}
                                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                >
                                    上一题
                                </button>
                                <button className={styles.ghostButton} onClick={handleRestart}>
                                    重新开始
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {result && (
                    <section className={styles.resultSection}>
                        <div className={styles.resultPanel} ref={shareCardRef}>
                            <div className={styles.resultBadge}>你的古代身份</div>
                            <h2 className={styles.resultTitle}>{result.title}</h2>
                            <p className={styles.resultSubtitle}>{result.subtitle}</p>

                            <div className={styles.resultGrid}>
                                <article className={styles.resultCard}>
                                    <h3>人物解析</h3>
                                    <p>{result.desc}</p>
                                </article>
                                <article className={styles.resultCard}>
                                    <h3>天赋 Buff</h3>
                                    <p>{result.ability}</p>
                                </article>
                                <article className={styles.resultCard}>
                                    <h3>性格雷区</h3>
                                    <p>{result.risk}</p>
                                </article>
                                <article className={styles.resultCard}>
                                    <h3>宿命软肋</h3>
                                    <p>{result.death}</p>
                                </article>
                                <article className={styles.resultCard}>
                                    <h3>今生通关箴言</h3>
                                    <p>{result.advice}</p>
                                </article>
                            </div>
                        </div>

                        <div className={styles.resultActions}>
                            <button className={styles.primaryButton} onClick={handleSaveImage} disabled={saving}>
                                {saving ? '生成中...' : '保存分享图'}
                            </button>
                            <button className={styles.secondaryButton} onClick={handleRestart}>
                                重新测试
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </>
    );
}
