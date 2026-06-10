import Head from 'next/head';
import {useCallback, useMemo, useRef, useState} from 'react';
import coverImg from '@/assets/images/ancient-test/cover.png';
import quizBgImg from '@/assets/images/ancient-test/quiz-bg.png';
import shareCaocao from '@/assets/images/ancient-test/share-caocao.png';
import shareHanxin from '@/assets/images/ancient-test/share-hanxin.png';
import shareLിബai from '@/assets/images/ancient-test/share-libai.png';
import shareLiqingzhao from '@/assets/images/ancient-test/share-liqingzhao.png';
import shareWangyangming from '@/assets/images/ancient-test/share-wangyangming.png';
import shareWuzetian from '@/assets/images/ancient-test/share-wuzetian.png';
import shareZhangfei from '@/assets/images/ancient-test/share-zhangfei.png';
import shareZhangjuzheng from '@/assets/images/ancient-test/share-zhangjuzheng.png';
import shareZhangliang from '@/assets/images/ancient-test/share-zhangliang.png';
import shareZhugeliang from '@/assets/images/ancient-test/share-zhugeliang.png';
import styles from '@/styles/ancient-identity-test.module.css';

type OptionKey = 'A' | 'B' | 'C' | 'D';
type Character = '曹操' | '张良' | '武则天' | '李清照' | '韩信' | '张飞' | '诸葛亮' | '张居正' | '王阳明' | '李白';

type Question = {
    id: number;
    text: string;
    options: {key: OptionKey; text: string}[];
};

type ResultData = {
    title: Character;
    subtitle: string;
    desc: string;
    ability: string;
    risk: string;
    death: string;
    advice: string;
};

const SHARE_IMAGES: Record<Character, {src: string}> = {
    曹操: shareCaocao,
    韩信: shareHanxin,
    李白: shareLിബai,
    李清照: shareLiqingzhao,
    王阳明: shareWangyangming,
    武则天: shareWuzetian,
    张飞: shareZhangfei,
    张居正: shareZhangjuzheng,
    张良: shareZhangliang,
    诸葛亮: shareZhugeliang
};

const questions: Question[] = [
    {
        id: 1,
        text: '若只能选一个，你更能接受哪一种人生结局？',
        options: [
            {key: 'A', text: '生前背尽骂名，死后被写进史书。'},
            {key: 'B', text: '生前受尽敬重，死后很快被人遗忘。'},
            {key: 'C', text: '名声与史书都轻，我更在意这一生有没有活得干净。'},
            {key: 'D', text: '别人如何记我都在后话，我只想活着的时候把想做的事做成。'}
        ]
    },
    {
        id: 2,
        text: '若你终将立于权力之巅，只留一个背影给后世，你更希望人们如何说起你？',
        options: [
            {key: 'A', text: '乱世将倾之时，有人一肩扛住了它。'},
            {key: 'B', text: '天命既至，便由我来定规矩。'},
            {key: 'C', text: '爱我也好，恨我也罢，这天下终究留下了我的手笔。'},
            {key: 'D', text: '此生行过，终究没有辜负自己信过的道理。'}
        ]
    },
    {
        id: 3,
        text: '若要择一人并肩同行，你更愿意与谁共路？',
        options: [
            {key: 'A', text: '性子烈些无妨，到了紧要关头真能提刀上前的人。'},
            {key: 'B', text: '平日寡言，但有事从不躲，缺口总会先去补上的人。'},
            {key: 'C', text: '心思细，眼界远，凡事总比旁人先看三步的人。'},
            {key: 'D', text: '胸中自有定盘星，天塌下来也不先乱了气息的人。'}
        ]
    },
    {
        id: 4,
        text: '四幅景致，只许入其一，你最愿身在——',
        options: [
            {key: 'A', text: '朔风猎猎，旌旗欲动，天地之间只剩一线将开未开的锋芒。'},
            {key: 'B', text: '夜雨青灯，案牍如山，你正翻到最要紧的一页。'},
            {key: 'C', text: '满堂宾客，觥筹交错，你一句话落下，四座俱静。'},
            {key: 'D', text: '溪山微雨，草木含烟，你只想缓步而行，不问来处。'}
        ]
    },
    {
        id: 5,
        text: '一桩差事，你出力最多，临到论功，旁人却先一步把彩头揽去。你会——',
        options: [
            {key: 'A', text: '含笑添一句："此事奔走劳碌，我亦不敢居后。"'},
            {key: 'B', text: '先让席上风平，席散之后再把话说透。'},
            {key: 'C', text: '当下不动声色，心里已把此人记上了一笔。'},
            {key: 'D', text: '面上云淡风轻，从此往后只与他留三分情面。'}
        ]
    },
    {
        id: 6,
        text: '若只能从下面四样旧物里留一件，你会留下——',
        options: [
            {key: 'A', text: '一把尚带寒光的旧剑。'},
            {key: 'B', text: '一本批注密密麻麻的旧书。'},
            {key: 'C', text: '一枚能调动人心的旧印。'},
            {key: 'D', text: '一只被岁月磨得很亮的酒杯。'}
        ]
    },
    {
        id: 7,
        text: '若有人当众折你颜面，而你只要低头这一回，往后就能换来更大的路。你会——',
        options: [
            {key: 'A', text: '忍。今日这口气先咽下，来日我自会把场子赢回来。'},
            {key: 'B', text: '面上忍，心里记。这一回我低头，往后总有一回轮到他抬不起头。'},
            {key: 'C', text: '不忍。路可以不要，脸不能这么丢。'},
            {key: 'D', text: '先看值不值。真值得，我忍；不值得，这局我当场就散。'}
        ]
    },
    {
        id: 8,
        text: '若只能择一句，作你心中的行路之辞，你更偏爱——',
        options: [
            {key: 'A', text: '"长风破浪会有时，直挂云帆济沧海。"'},
            {key: 'B', text: '"安得广厦千万间，大庇天下寒士俱欢颜。"'},
            {key: 'C', text: '"不畏浮云遮望眼，只缘身在最高层。"'},
            {key: 'D', text: '"行到水穷处，坐看云起时。"'}
        ]
    },
    {
        id: 9,
        text: '若你要在古画里站一个位置，你更想站在——',
        options: [
            {key: 'A', text: '城楼最高处，风一吹，衣摆便猎猎扬起。'},
            {key: 'B', text: '灯火最亮处，桌上摊着还未处理完的案卷。'},
            {key: 'C', text: '众人之外一点点，能把满场神色尽收眼底的地方。'},
            {key: 'D', text: '山水之间，远一点，静一点，谁都不用应付。'}
        ]
    },
    {
        id: 10,
        text: '若朝局忽生差池，此事本非你一人之责，满堂目光却先落在你身上。你会——',
        options: [
            {key: 'A', text: '当先出列，先把这局接住，旁的都往后放。'},
            {key: 'B', text: '先安众心，待风声稍定，再将曲直一一分明。'},
            {key: 'C', text: '不忙辩白，先查是谁顺水推舟，把祸引到了我身前。'},
            {key: 'D', text: '先补最险的一环，让局面不至再坏，其余是非留待日后再算。'}
        ]
    }
];

const scoreTable: Record<string, number>[] = [
    {A曹操: 2, A武则天: 1, B张居正: 2, B诸葛亮: 1, C王阳明: 2, C李清照: 1, D曹操: 2, D韩信: 1},
    {A诸葛亮: 2, A张居正: 1, B武则天: 2, B曹操: 1, C曹操: 2, C武则天: 1, D王阳明: 2, D张良: 1},
    {A张飞: 2, A韩信: 1, B诸葛亮: 2, B张居正: 1, C张良: 2, C曹操: 1, D王阳明: 2, D李清照: 1},
    {A韩信: 2, A张飞: 1, B张居正: 2, B诸葛亮: 1, C曹操: 2, C李白: 1, D李清照: 2, D李白: 1},
    {A曹操: 2, A张飞: 1, B诸葛亮: 2, B张良: 1, C武则天: 2, C张良: 1, D李清照: 2, D王阳明: 1},
    {A张飞: 2, A韩信: 1, B王阳明: 2, B诸葛亮: 1, C曹操: 2, C武则天: 1, D李白: 2, D李清照: 1},
    {A韩信: 2, A张良: 1, B武则天: 2, B张良: 1, C张飞: 2, C李白: 1, D王阳明: 2, D曹操: 1},
    {A韩信: 2, A李白: 1, B诸葛亮: 2, B张居正: 1, C曹操: 2, C武则天: 1, D李白: 2, D王阳明: 1},
    {A武则天: 2, A韩信: 1, B张居正: 2, B诸葛亮: 1, C张良: 2, C曹操: 1, D李白: 2, D李清照: 1},
    {A诸葛亮: 2, A张居正: 1, B张居正: 2, B诸葛亮: 1, C张良: 2, C曹操: 1, D王阳明: 2, D李清照: 1}
];

const CHARACTERS: Character[] = ['曹操', '张良', '武则天', '李清照', '韩信', '张飞', '诸葛亮', '张居正', '王阳明', '李白'];

const resultsData: Record<Character, ResultData> = {
    曹操: {title: '曹操', subtitle: '你一进场，先看的永远是牌桌。', desc: '你对局势很敏感，谁握着主动、哪边有缺口、什么时候该下手，心里总比别人快半拍。很多人忙着做事，你已经开始看人、看风向、看位置。', ability: '判断快，控场强，敢拍板，也敢担事。越是复杂的局面，你越容易兴奋。', risk: '看见低效和拖沓就烦，遇到装糊涂的人更烦，压迫感有时会直接写在脸上。', death: '节奏一旦失控，你整个人都会绷起来。', advice: '主动权该拿就拿，别把所有场子都打成个人秀。'},
    张良: {title: '张良', subtitle: '你不急着赢，你很会等风来。', desc: '你出手不算最早，落点通常很准。很多人喜欢抢存在感，你更在意这一手下去值不值、稳不稳、会不会改局。你对时机有种天然的嗅觉。', ability: '看局准，分寸稳，脑子快，关键时候落子很有用。', risk: '想得太明白，偶尔会显得慢半拍；有些机会，本来可以更早拿。', death: '太懂进退，有时会把"再等等"拖成习惯。', advice: '收锋很难得，出手也别总留到最后。'},
    武则天: {title: '武则天', subtitle: '局越难，你越容易起状态。', desc: '顺风顺水的时候，你未必最亮；真到逆风局，你那股劲儿会一下子顶出来。压得越狠，反弹越猛，很多人扛不住的时候，你反而会更想赢。', ability: '抗压强，执行狠，翻盘能力高，关键时刻很能顶。', risk: '习惯自己扛，很多事会下意识揽到自己身上。', death: '撑得太久，累也不爱说。', advice: '狠劲留着开路，别顺手把全场都背起来。'},
    李清照: {title: '李清照', subtitle: '你看着温柔，心里的波澜一点都不浅。', desc: '你对情绪、细节、气氛都很敏感。很多别人一带而过的瞬间，你会记很久，也想很深。你的感受力很强，心里的褶皱也比一般人多。', ability: '感知细，审美好，表达准，复杂心绪到你这儿往往都能落成一句话。', risk: '容易反复回味，表面过去了，心里还会转很久。', death: '嘴上能装没事，心里其实一点都没少感受。', advice: '敏感很珍贵，别总拿它先消耗自己。'},
    韩信: {title: '韩信', subtitle: '你这种人，往往后面更吓人。', desc: '你不一定开场最显眼，但真给到舞台，存在感会一下子拔高。前期容易被低估，后期特别容易打出一手让人回头补课的牌。', ability: '成长快，爆发强，到了关键节点很容易突然发光。', risk: '被轻视久了，心里会积气。', death: '太在意有没有被真正看见。', advice: '机会可以等，别把整个人生都挂在"等识货的人"。'},
    张飞: {title: '张飞', subtitle: '你这人，最大的特点就是直。', desc: '你看不惯绕来绕去的气氛，心里有话，嘴上通常憋不久。很多人会先试探、先铺垫、先圆场，你更习惯当场说清楚。态度鲜明，情绪也鲜明。', ability: '行动快，胆子大，护短，关键时候真敢顶上去。', risk: '一烦低效就容易炸，看见虚头巴脑更容易上头。', death: '好心的时候，语气也可能像在掀桌。', advice: '真性情很难得，开大之前先看一眼场合。'},
    诸葛亮: {title: '诸葛亮', subtitle: '场面一乱，大家会下意识先找你。', desc: '别人慌的时候，你通常还稳得住。复杂、混乱、快散掉的场子，到你这儿总会慢慢有线头。你身上很容易让人产生"有他在，事情还不至于彻底坏掉"的感觉。', ability: '救场快，统筹稳，执行力强，复杂局面里很少掉线。', risk: '责任感太重，顺手就把别人的活也背了。', death: '看不得事情烂掉，很难真正甩手。', advice: '靠谱是优点，别把自己活成全场默认售后。'},
    张居正: {title: '张居正', subtitle: '你一认真，世界都会被按下加速键。', desc: '你很适合干那些别人嫌乱、嫌麻烦、嫌推进不动的事。很多人还在讨论，你已经开始盯进度、理流程、催结果。你对"事情得往前走"这件事有天然执念。', ability: '推进强，组织强，压得住节奏，也拽得动全局。', risk: '对拖延和低效过敏，看久了会直接上火。', death: '劲儿使太满，容易把自己也推到过载。', advice: '事可以催，别把自己也催坏了。'},
    王阳明: {title: '王阳明', subtitle: '你心里一直有条线，别人很难带偏。', desc: '很多事你有自己的判断，想通之后，整个人会一下子变得很干脆。你对意义感要求很高，自己都说服不了自己的事，很难真的上心。', ability: '内核稳，自我校准能力强，混乱里也能守住自己的判断。', risk: '太容易先想透，偶尔会把行动往后压。', death: '看见言行不一的环境，心里会很疲。', advice: '你的标准没错，别让它顺手把自己也卡住。'},
    李白: {title: '李白', subtitle: '你的系统，常常和别人不是一套。', desc: '你对自由和灵感特别敏感，太死的规矩、太闷的场子、太整齐的活法，都容易让你心里先起一阵烦躁。你不一定会走出去，但心早就先飘远了。', ability: '灵感强，表达强，气场也强，很多人看不见的东西你先能感觉到。', risk: '太想活得痛快，容易对琐碎、重复、没劲的事失去耐心。', death: '太自由，有时候留不住该留住的东西。', advice: '诗和远方不用放弃，找个能落地的锚点就好。'}
};

function computeResult(answers: Record<number, string>): Character {
    const scores: Record<Character, number> = {} as Record<Character, number>;
    CHARACTERS.forEach(character => {
        scores[character] = 0;
    });

    for (let questionIndex = 1; questionIndex <= 10; questionIndex += 1) {
        const selectedKey = answers[questionIndex];
        if (!selectedKey) {
            continue;
        }
        const row = scoreTable[questionIndex - 1];
        CHARACTERS.forEach(character => {
            scores[character] += row[`${selectedKey}${character}`] || 0;
        });
    }

    let maxScore = -1;
    let candidates: Character[] = [];
    CHARACTERS.forEach(character => {
        if (scores[character] > maxScore) {
            maxScore = scores[character];
            candidates = [character];
        } else if (scores[character] === maxScore) {
            candidates.push(character);
        }
    });

    if (candidates.length === 1) {
        return candidates[0];
    }

    const tiebreakers = [1, 2, 10];
    for (const questionNumber of tiebreakers) {
        const selectedKey = answers[questionNumber];
        if (!selectedKey) {
            continue;
        }
        const row = scoreTable[questionNumber - 1];
        for (const character of candidates) {
            if ((row[`${selectedKey}${character}`] || 0) === 2) {
                return character;
            }
        }
    }

    return candidates[0];
}

export default function AncientIdentityTestPage() {
    const [currentPage, setCurrentPage] = useState<'cover' | 'quiz' | 'result'>('cover');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [result, setResult] = useState<Character | null>(null);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string) => {
        setToastMsg(message);
        setToastVisible(true);
        if (toastTimer.current) {
            clearTimeout(toastTimer.current);
        }
        toastTimer.current = setTimeout(() => setToastVisible(false), 1800);
    }, []);

    const startQuiz = useCallback(() => {
        setCurrentQuestion(0);
        setAnswers({});
        setCurrentPage('quiz');
    }, []);

    const selectOption = useCallback((key: string) => {
        const questionId = questions[currentQuestion].id;
        const nextAnswers = {...answers, [questionId]: key};
        setAnswers(nextAnswers);

        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            return;
        }

        setResult(computeResult(nextAnswers));
        setCurrentPage('result');
    }, [answers, currentQuestion]);

    const goBack = useCallback(() => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
            return;
        }
        setCurrentPage('cover');
    }, [currentQuestion]);

    const restart = useCallback(() => {
        setCurrentQuestion(0);
        setAnswers({});
        setResult(null);
        setCurrentPage('cover');
    }, []);

    const saveImage = useCallback(() => {
        if (!result) {
            return;
        }
        const imageSrc = SHARE_IMAGES[result].src;
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = `职场前世测试-${result}.png`;
        link.click();
        showToast('已开始保存图片');
    }, [result, showToast]);

    const current = questions[currentQuestion];
    const progress = useMemo(() => (currentQuestion / questions.length) * 100, [currentQuestion]);
    const selectedKey = current ? answers[current.id] : null;

    return (
        <>
            <Head>
                <title>测测你的职场前世：你在古代能活到第几集？</title>
                <meta name="description" content="10 道情景选择题，测一测你的职场前世是哪位古代人物。" />
            </Head>
            <div className={styles.root}>
                <div className={`${styles.page} ${styles.coverPage} ${currentPage === 'cover' ? styles.pageActive : ''}`}>
                    <div className={styles.coverImgWrap}>
                        <img src={coverImg.src} className={styles.coverImg} alt="古代身份测试封面" />
                        <div className={styles.coverBtnArea}>
                            <button className={styles.startBtn} onClick={startQuiz}>开 始 测 试</button>
                        </div>
                    </div>
                </div>

                <div
                    className={`${styles.page} ${styles.quizPage} ${currentPage === 'quiz' ? styles.pageActive : ''}`}
                    style={{backgroundImage: `url(${quizBgImg.src})`}}
                >
                    <div className={styles.quizHeader}>
                        <div className={styles.progressBarBg}>
                            <div className={styles.progressBarFill} style={{width: `${progress}%`}} />
                        </div>
                        <div className={styles.progressText}>第 {currentQuestion + 1} / {questions.length} 题</div>
                    </div>
                    <div className={styles.quizBody}>
                        {current && (
                            <div key={current.id} className={styles.questionContainer}>
                                <div className={styles.questionText}>{current.text}</div>
                                <div className={styles.options}>
                                    {current.options.map(option => (
                                        <button
                                            key={option.key}
                                            className={`${styles.optionBtn} ${selectedKey === option.key ? styles.optionSelected : ''}`}
                                            onClick={() => selectOption(option.key)}
                                        >
                                            <span className={styles.optionLabel}>{option.key}</span>
                                            <span className={styles.optionContent}>{option.text}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.quizNav}>
                                    <button className={styles.quizNavBtn} onClick={goBack}>
                                        {currentQuestion === 0 ? '返回封面' : '上一题'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`${styles.page} ${styles.resultPage} ${currentPage === 'result' ? styles.pageActive : ''}`}>
                    {result && (
                        <div className={styles.resultScroll}>
                            <div className={styles.resultHeader}>
                                <div className={styles.resultBadge}>你 的 职 场 前 世</div>
                                <div className={styles.resultTitle}>{resultsData[result].title}</div>
                                <div className={styles.resultSubtitle}>{resultsData[result].subtitle}</div>
                            </div>

                            <div className={styles.resultCard}>
                                <div className={styles.resultCardTitle}><span className={styles.resultCardIcon}>📜</span>人物解析</div>
                                <p className={styles.resultCardText}>{resultsData[result].desc}</p>
                            </div>
                            <div className={styles.resultCard}>
                                <div className={styles.resultCardTitle}><span className={styles.resultCardIcon}>⚔️</span>天赋 Buff</div>
                                <p className={styles.resultCardText}>{resultsData[result].ability}</p>
                            </div>
                            <div className={styles.resultCard}>
                                <div className={styles.resultCardTitle}><span className={styles.resultCardIcon}>🔥</span>性格雷区</div>
                                <p className={styles.resultCardText}>{resultsData[result].risk}</p>
                            </div>
                            <div className={styles.resultCard}>
                                <div className={styles.resultCardTitle}><span className={styles.resultCardIcon}>💀</span>宿命软肋</div>
                                <p className={styles.resultCardText}>{resultsData[result].death}</p>
                            </div>
                            <div className={styles.resultCard}>
                                <div className={styles.resultCardTitle}><span className={styles.resultCardIcon}>🔮</span>今生通关箴言</div>
                                <p className={styles.resultCardText}>{resultsData[result].advice}</p>
                            </div>

                            <div className={styles.resultActions}>
                                <button className={`${styles.resultBtn} ${styles.resultBtnPrimary}`} onClick={() => setShareModalVisible(true)}>保存分享图</button>
                                <button className={`${styles.resultBtn} ${styles.resultBtnSecondary}`} onClick={restart}>重新测试</button>
                            </div>

                            <div className={styles.resultFooter}>— 测测你的职场前世 —</div>
                        </div>
                    )}
                </div>

                <div className={`${styles.shareModal} ${shareModalVisible ? styles.shareModalVisible : ''}`}>
                    <button className={styles.shareModalClose} onClick={() => setShareModalVisible(false)}>×</button>
                    {result && <img className={styles.shareModalImg} src={SHARE_IMAGES[result].src} alt={`${result}分享图`} />}
                    <button className={styles.saveBtn} onClick={saveImage}>保存到相册</button>
                </div>

                <div className={`${styles.toast} ${toastVisible ? styles.toastVisible : ''}`}>{toastMsg}</div>
            </div>
        </>
    );
}
