// chosen-city-utils.ts
// "天选之城" (Chosen City) — utility/data file
// Contains ALL data constants and computation functions

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type DimKey = 'drive' | 'connection' | 'freedom' | 'order' | 'healing' | 'vibe';
export type DimScores = Record<DimKey, number>;

export interface CityAttrs {
    tier: number;
    region: string;
    geo: string;
    economy: string;
    culture: string[];
    special?: Partial<DimScores>;
}

export interface CityData {
    name: string;
    fullName: string;
    province: string;
    scores: DimScores;
    attrs: CityAttrs;
    similarity?: number;
}

export interface QuizQuestion {
    id: number;
    scene: string;
    title: string;
    options: { title: string; scores: Partial<DimScores> }[];
}

export interface AstroProfile {
    scores: DimScores;
    summary: string;
    detail: string;
    majorAspectCount: number;
    patternCount: number;
    patterns: string[];
    dominantElement: string;
    usedTimeFallback: boolean;
}

export interface ResultData {
    userScores: DimScores;
    winner: CityData;
    top3: CityData[];
    personaLabel: string;
    insights: string[];
    keywords: string;
    cityKeywords: string[];
    cityMoment: string;
    astroProfile: AstroProfile;
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

export const DIMENSIONS: { key: DimKey; name: string; desc: string }[] = [
    { key: 'drive', name: '驱力', desc: '你有多需要一座城市在事业跃迁、资源密度和竞争张力上推你一把。' },
    { key: 'connection', name: '链接', desc: '你有多需要一座城市提供高密度的人际交互和社交机会。' },
    { key: 'freedom', name: '自由', desc: '你有多需要一座城市给你空间去游荡、探索和自由切换状态。' },
    { key: 'order', name: '秩序', desc: '你有多需要一座城市在基建、服务和日常便利上做到确定和可预期。' },
    { key: 'healing', name: '治愈', desc: '你有多需要一座城市能给你慢节奏、安全感和情绪缓冲。' },
    { key: 'vibe', name: '氛围', desc: '你有多需要一座城市具有独特烟火气、生活质感和文化厚度。' },
];

export const SIGN_TO_CN: Record<string, string> = {
    aries: '白羊',
    taurus: '金牛',
    gemini: '双子',
    cancer: '巨蟹',
    leo: '狮子',
    virgo: '处女',
    libra: '天秤',
    scorpio: '天蝎',
    sagittarius: '射手',
    capricorn: '摩羯',
    aquarius: '水瓶',
    pisces: '双鱼',
};

export const SIGN_PROFILES: Record<string, Partial<Record<DimKey, number>>> = {
    aries: { drive: 7, freedom: 5, vibe: 2 },
    taurus: { order: 6, healing: 5, vibe: 3 },
    gemini: { connection: 6, freedom: 5, vibe: 3 },
    cancer: { healing: 7, connection: 4, order: 3 },
    leo: { drive: 5, connection: 5, vibe: 5 },
    virgo: { order: 7, healing: 3, drive: 2 },
    libra: { connection: 5, vibe: 5, order: 3 },
    scorpio: { drive: 4, healing: 4, vibe: 4 },
    sagittarius: { freedom: 7, connection: 3, vibe: 3 },
    capricorn: { drive: 5, order: 7, healing: 1 },
    aquarius: { freedom: 7, connection: 4, vibe: 3 },
    pisces: { healing: 7, vibe: 5, freedom: 2 },
};

export const HOUSE_PROFILES: Record<number, Partial<Record<DimKey, number>>> = {
    1: { drive: 4, freedom: 3 },
    2: { order: 5, drive: 3 },
    3: { connection: 4, freedom: 3 },
    4: { healing: 5, order: 3 },
    5: { vibe: 5, connection: 3 },
    6: { order: 4, healing: 3 },
    7: { connection: 5, healing: 2 },
    8: { drive: 3, healing: 3, vibe: 3 },
    9: { freedom: 5, vibe: 3 },
    10: { drive: 6, order: 3 },
    11: { connection: 4, freedom: 4 },
    12: { healing: 5, vibe: 3, freedom: 2 },
};

export const PLANET_DIM_AFFINITIES: Record<string, Partial<Record<DimKey, number>>> = {
    sun: { drive: 0.4, connection: 0.2, vibe: 0.2, freedom: 0.1, order: 0.1 },
    moon: { healing: 0.5, vibe: 0.2, connection: 0.2, order: 0.1 },
    mercury: { connection: 0.4, order: 0.3, freedom: 0.2, drive: 0.1 },
    venus: { connection: 0.3, healing: 0.3, vibe: 0.3, freedom: 0.1 },
    mars: { drive: 0.5, freedom: 0.2, vibe: 0.1, connection: 0.1, order: 0.1 },
    jupiter: { freedom: 0.4, connection: 0.2, drive: 0.2, vibe: 0.1, healing: 0.1 },
    saturn: { order: 0.6, drive: 0.2, healing: 0.1 },
    uranus: { freedom: 0.6, vibe: 0.2, connection: 0.1 },
    neptune: { healing: 0.5, vibe: 0.4, freedom: 0.1 },
    pluto: { drive: 0.3, vibe: 0.3, order: 0.2 },
    chiron: { healing: 0.6, vibe: 0.2, freedom: 0.1 },
    northnode: { drive: 0.3, freedom: 0.3, connection: 0.2 },
    southnode: { healing: 0.4, order: 0.3, vibe: 0.2 },
    lilith: { freedom: 0.5, vibe: 0.4, drive: 0.1 },
};

export const ASPECT_MODIFIERS: Record<string, number> = {
    conjunction: 1.0,
    trine: 0.85,
    sextile: 0.6,
    square: -0.6,
    opposition: -0.5,
    quincunx: -0.3,
    'semi-sextile': 0.25,
    quintile: 0.4,
    septile: 0.2,
    'semi-square': -0.2,
};

export const ELEMENT_CLIMATE_PREF: Record<string, string> = {
    fire: 'warm',
    earth: 'stable',
    air: 'seasonal',
    water: 'coastal',
};

export const SIGN_ELEMENT: Record<string, string> = {
    aries: 'fire',
    leo: 'fire',
    sagittarius: 'fire',
    taurus: 'earth',
    virgo: 'earth',
    capricorn: 'earth',
    gemini: 'air',
    libra: 'air',
    aquarius: 'air',
    cancer: 'water',
    scorpio: 'water',
    pisces: 'water',
};

export const QUESTIONS: QuizQuestion[] = [
    {
        id: 1,
        scene: '理想周末',
        title: '理想周末突然空出来，你更想把自己放进哪一种城市片段？',
        options: [
            { title: '钻进陌生街区，边走边逛新路线', scores: { freedom: 8, vibe: 4, healing: 2 } },
            { title: '连逛几个点，把周末排得很满', scores: { drive: 7, connection: 4, order: 2 } },
            { title: '待在熟悉片区，按自己的节奏慢慢过', scores: { order: 7, healing: 5 } },
            { title: '白天安静待着，晚上去热闹里接点能量', scores: { healing: 4, vibe: 6, connection: 3 } },
        ],
    },
    {
        id: 2,
        scene: '生活节奏',
        title: '你最舒服的生活节奏，更像下面哪一种？',
        options: [
            { title: '节奏快一点也行，关键是每天都在推进', scores: { drive: 8, order: 3 } },
            { title: '快慢都行，但我需要能随时切换状态', scores: { freedom: 6, order: 3, healing: 2 } },
            { title: '我喜欢稳定日常，生活最好边界清晰', scores: { order: 8, healing: 3 } },
            { title: '节奏不是重点，人和氛围才是电量来源', scores: { connection: 7, vibe: 5 } },
        ],
    },
    {
        id: 3,
        scene: '社交温度',
        title: '对于社交这件事，你更接近哪种状态？',
        options: [
            { title: '喜欢认识新的人，也想接住新的机会', scores: { connection: 9, drive: 3 } },
            { title: '可以社交，但前提是保留自己的空间', scores: { freedom: 5, order: 4, healing: 2 } },
            { title: '更喜欢熟人社交，不想被高频社交消耗', scores: { healing: 6, vibe: 4, order: 2 } },
            { title: '全看心情，热闹和隐身我都需要', scores: { freedom: 5, healing: 4, connection: 3 } },
        ],
    },
    {
        id: 4,
        scene: '安全感来源',
        title: '一座城市真正让你安心的地方，会是什么？',
        options: [
            { title: '机会和资源够多，想往上走时接得住我', scores: { drive: 7, connection: 5 } },
            { title: '秩序和便利都在线，别让琐碎天天消耗我', scores: { order: 8, healing: 3 } },
            { title: '有自然和呼吸感，不会一直困在高压里', scores: { freedom: 6, healing: 6 } },
            { title: '街头是活的，人情味是真实存在的', scores: { vibe: 7, healing: 4, connection: 2 } },
        ],
    },
    {
        id: 5,
        scene: '面对压力',
        title: '当压力上来时，你更容易被哪种冲动牵引？',
        options: [
            { title: '再往上冲一点，用行动把情绪压过去', scores: { drive: 9, order: 2 } },
            { title: '想逃到更开阔的地方，先把呼吸找回来', scores: { freedom: 7, healing: 5 } },
            { title: '找熟悉的人吃顿饭，城市最好有回应感', scores: { connection: 6, vibe: 4, healing: 2 } },
            { title: '回到自己的秩序里，把生活重新摆正', scores: { order: 8, healing: 4 } },
        ],
    },
    {
        id: 6,
        scene: '夜晚偏好',
        title: '夜幕降下来之后，什么样的城市夜色最让你着迷？',
        options: [
            { title: '灯火很多、选择很多，像随时能开新剧情', scores: { vibe: 7, connection: 5, drive: 2 } },
            { title: '灯不必太亮，但街区要有质感和秩序', scores: { order: 6, healing: 4 } },
            { title: '河边海边山脚下，风一吹就能放空自己', scores: { freedom: 7, healing: 5 } },
            { title: '走进一家小店，就能感到这座城的脾气', scores: { vibe: 7, healing: 3, connection: 2 } },
        ],
    },
    {
        id: 7,
        scene: '人生关键词',
        title: '如果只能选一个词描述你接下来最想拥有的生活，你会选？',
        options: [
            { title: '跃迁', scores: { drive: 9, connection: 3 } },
            { title: '流动', scores: { freedom: 8, vibe: 3, connection: 2 } },
            { title: '安放', scores: { healing: 8, order: 3 } },
            { title: '归位', scores: { order: 7, healing: 4 } },
        ],
    },
    {
        id: 8,
        scene: '城市长期关系',
        title: '如果要和一座城市长期相处，你最看重它能给你什么？',
        options: [
            { title: '能托举我的上限，也允许我继续有野心', scores: { drive: 8, connection: 4 } },
            { title: '能让我自由切换状态，不被单一节奏绑住', scores: { freedom: 7, healing: 3, order: 2 } },
            { title: '能给我稳定秩序和长期生活的确定性', scores: { order: 8, vibe: 2 } },
            { title: '能让我感到真实有人味，日常本身就值得被爱', scores: { vibe: 7, healing: 4, connection: 2 } },
        ],
    },
];

export const CHINA_REGIONS: Record<string, string[]> = {
    '北京市': ['北京市'],
    '天津市': ['天津市'],
    '上海市': ['上海市'],
    '重庆市': ['重庆市'],
    '河北省': ['石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市', '保定市', '张家口市', '承德市', '沧州市', '廊坊市', '衡水市'],
    '山西省': ['太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '晋中市', '运城市', '忻州市', '临汾市', '吕梁市'],
    '内蒙古自治区': ['呼和浩特市', '包头市', '乌海市', '赤峰市', '通辽市', '鄂尔多斯市', '呼伦贝尔市', '巴彦淖尔市', '乌兰察布市', '兴安盟', '锡林郭勒盟', '阿拉善盟'],
    '辽宁省': ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市', '阜新市', '辽阳市', '盘锦市', '铁岭市', '朝阳市', '葫芦岛市'],
    '吉林省': ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市', '延边朝鲜族自治州'],
    '黑龙江省': ['哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市', '大庆市', '伊春市', '佳木斯市', '七台河市', '牡丹江市', '黑河市', '绥化市', '大兴安岭地区'],
    '江苏省': ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'],
    '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市', '舟山市', '台州市', '丽水市'],
    '安徽省': ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市', '阜阳市', '宿州市', '六安市', '亳州市', '池州市', '宣城市'],
    '福建省': ['福州市', '厦门市', '莆田市', '三明市', '泉州市', '漳州市', '南平市', '龙岩市', '宁德市'],
    '江西省': ['南昌市', '景德镇市', '萍乡市', '九江市', '新余市', '鹰潭市', '赣州市', '吉安市', '宜春市', '抚州市', '上饶市'],
    '山东省': ['济南市', '青岛市', '淄博市', '枣庄市', '东营市', '烟台市', '潍坊市', '济宁市', '泰安市', '威海市', '日照市', '临沂市', '德州市', '聊城市', '滨州市', '菏泽市'],
    '河南省': ['郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', '新乡市', '焦作市', '濮阳市', '许昌市', '漯河市', '三门峡市', '南阳市', '商丘市', '信阳市', '周口市', '驻马店市', '济源市'],
    '湖北省': ['武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市', '鄂州市', '荆门市', '孝感市', '荆州市', '黄冈市', '咸宁市', '随州市', '恩施土家族苗族自治州', '仙桃市', '潜江市', '天门市', '神农架林区'],
    '湖南省': ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市', '益阳市', '郴州市', '永州市', '怀化市', '娄底市', '湘西土家族苗族自治州'],
    '广东省': ['广州市', '韶关市', '深圳市', '珠海市', '汕头市', '佛山市', '江门市', '湛江市', '茂名市', '肇庆市', '惠州市', '梅州市', '汕尾市', '河源市', '阳江市', '清远市', '东莞市', '中山市', '潮州市', '揭阳市', '云浮市'],
    '广西壮族自治区': ['南宁市', '柳州市', '桂林市', '梧州市', '北海市', '防城港市', '钦州市', '贵港市', '玉林市', '百色市', '贺州市', '河池市', '来宾市', '崇左市'],
    '海南省': ['海口市', '三亚市', '三沙市', '儋州市', '五指山市', '琼海市', '文昌市', '万宁市', '东方市'],
    '四川省': ['成都市', '自贡市', '攀枝花市', '泸州市', '德阳市', '绵阳市', '广元市', '遂宁市', '内江市', '乐山市', '南充市', '眉山市', '宜宾市', '广安市', '达州市', '雅安市', '巴中市', '资阳市'],
    '贵州省': ['贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市'],
    '云南省': ['昆明市', '曲靖市', '玉溪市', '保山市', '昭通市', '丽江市', '普洱市', '临沧市'],
    '西藏自治区': ['拉萨市', '日喀则市', '昌都市', '林芝市', '山南市', '那曲市'],
    '陕西省': ['西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市', '商洛市'],
    '甘肃省': ['兰州市', '嘉峪关市', '金昌市', '白银市', '天水市', '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市', '定西市', '陇南市'],
    '青海省': ['西宁市', '海东市'],
    '宁夏回族自治区': ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
    '新疆维吾尔自治区': ['乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市'],
    '香港特别行政区': ['香港特别行政区'],
    '澳门特别行政区': ['澳门特别行政区'],
    '台湾省': ['台北市', '新北市', '桃园市', '台中市', '台南市', '高雄市'],
};

export const PROVINCE_DEFAULTS: Record<string, { tier: number; region: string; geo: string; economy: string; culture: string[] }> = {
    '北京市': { tier: 1, region: 'HB', geo: 'nl', economy: 'zh', culture: ['ls', 'kj', 'gj'] },
    '天津市': { tier: 2, region: 'HB', geo: 'hb', economy: 'zz', culture: ['ls', 'ms'] },
    '上海市': { tier: 1, region: 'HD', geo: 'hb', economy: 'zh', culture: ['gj', 'kj', 'my'] },
    '重庆市': { tier: 2, region: 'XN', geo: 'sd', economy: 'zh', culture: ['ms'] },
    '河北省': { tier: 4, region: 'HB', geo: 'nl', economy: 'zz', culture: [] },
    '山西省': { tier: 4, region: 'HB', geo: 'sd', economy: 'zy', culture: ['ls'] },
    '内蒙古自治区': { tier: 4, region: 'XB', geo: 'gy', economy: 'zy', culture: ['mz'] },
    '辽宁省': { tier: 4, region: 'DB', geo: 'nl', economy: 'zz', culture: [] },
    '吉林省': { tier: 4, region: 'DB', geo: 'nl', economy: 'ny', culture: [] },
    '黑龙江省': { tier: 4, region: 'DB', geo: 'nl', economy: 'ny', culture: [] },
    '江苏省': { tier: 3, region: 'HD', geo: 'nl', economy: 'zz', culture: [] },
    '浙江省': { tier: 3, region: 'HD', geo: 'nl', economy: 'my', culture: [] },
    '安徽省': { tier: 4, region: 'HD', geo: 'nl', economy: 'zh', culture: [] },
    '福建省': { tier: 4, region: 'HD', geo: 'hb', economy: 'my', culture: ['ms'] },
    '江西省': { tier: 4, region: 'HZ', geo: 'sd', economy: 'ny', culture: [] },
    '山东省': { tier: 3, region: 'HB', geo: 'nl', economy: 'zz', culture: [] },
    '河南省': { tier: 4, region: 'HZ', geo: 'nl', economy: 'ny', culture: ['ls'] },
    '湖北省': { tier: 4, region: 'HZ', geo: 'nl', economy: 'zh', culture: [] },
    '湖南省': { tier: 4, region: 'HZ', geo: 'sd', economy: 'zh', culture: ['ms'] },
    '广东省': { tier: 3, region: 'HN', geo: 'hb', economy: 'zh', culture: ['ms'] },
    '广西壮族自治区': { tier: 4, region: 'HN', geo: 'sd', economy: 'ny', culture: ['mz'] },
    '海南省': { tier: 4, region: 'HN', geo: 'hb', economy: 'ly', culture: ['yj'] },
    '四川省': { tier: 4, region: 'XN', geo: 'pd', economy: 'zh', culture: ['ms'] },
    '贵州省': { tier: 4, region: 'XN', geo: 'sd', economy: 'ny', culture: ['mz'] },
    '云南省': { tier: 4, region: 'XN', geo: 'sd', economy: 'ny', culture: ['mz', 'yj'] },
    '西藏自治区': { tier: 5, region: 'XB', geo: 'gy', economy: 'ny', culture: ['mz'] },
    '陕西省': { tier: 4, region: 'XB', geo: 'nl', economy: 'zh', culture: ['ls'] },
    '甘肃省': { tier: 4, region: 'XB', geo: 'nl', economy: 'ny', culture: [] },
    '青海省': { tier: 4, region: 'XB', geo: 'gy', economy: 'ny', culture: ['mz'] },
    '宁夏回族自治区': { tier: 4, region: 'XB', geo: 'nl', economy: 'ny', culture: ['mz'] },
    '新疆维吾尔自治区': { tier: 4, region: 'XB', geo: 'gy', economy: 'zy', culture: ['mz'] },
    '香港特别行政区': { tier: 1, region: 'HN', geo: 'hb', economy: 'zh', culture: ['gj', 'my'] },
    '澳门特别行政区': { tier: 3, region: 'HN', geo: 'hb', economy: 'ly', culture: ['gj', 'ms'] },
    '台湾省': { tier: 2, region: 'HD', geo: 'hb', economy: 'kj', culture: ['ms', 'gj'] },
};

export const CITY_OVERRIDES: Record<string, Partial<CityAttrs>> = {
    '石家庄市': { tier: 3, economy: 'zh', culture: ['ls'] },
    '唐山市': { tier: 3, economy: 'zz', culture: ['gy'] },
    '秦皇岛市': { geo: 'hb', economy: 'ly', culture: ['yj'] },
    '太原市': { tier: 3, economy: 'zh', culture: ['ls'] },
    '大同市': { culture: ['ls'] },
    '呼和浩特市': { tier: 3, economy: 'zh', culture: ['mz', 'ls'] },
    '包头市': { tier: 3, economy: 'zz', culture: ['gy'] },
    '鄂尔多斯市': { tier: 3, economy: 'zy', culture: [] },
    '沈阳市': { tier: 2, economy: 'zh', culture: ['ls', 'ms'] },
    '大连市': { tier: 2, geo: 'hb', economy: 'zh', culture: ['yj', 'gj'] },
    '长春市': { tier: 3, economy: 'zh', culture: ['gy'] },
    '吉林市': { tier: 4, culture: ['yj'] },
    '哈尔滨市': { tier: 2, economy: 'zh', culture: ['ls', 'ms', 'gj'] },
    '南京市': { tier: 2, economy: 'zh', culture: ['ls', 'kj', 'gj'], special: { drive: 5, vibe: 3, healing: 3 } },
    '无锡市': { tier: 2, economy: 'zz', culture: ['yj'] },
    '徐州市': { tier: 3, economy: 'zh', culture: ['ls'] },
    '常州市': { tier: 3, economy: 'zz', culture: ['yj'] },
    '苏州市': { tier: 2, economy: 'zz', culture: ['ls', 'yj'], special: { order: 6, healing: 5 } },
    '南通市': { tier: 3, economy: 'zz' },
    '连云港市': { geo: 'hb' },
    '扬州市': { culture: ['ls', 'ms', 'yj'], special: { healing: 4, vibe: 4 } },
    '镇江市': { culture: ['ls', 'yj'] },
    '泰州市': { culture: ['yj'] },
    '杭州市': { tier: 2, economy: 'kj', culture: ['yj', 'ls', 'kj'], special: { healing: 6, freedom: 4 } },
    '宁波市': { tier: 2, economy: 'zz', culture: ['yj'] },
    '温州市': { tier: 3, economy: 'my', culture: ['ms'] },
    '嘉兴市': { culture: ['ls', 'yj'] },
    '湖州市': { culture: ['yj'] },
    '绍兴市': { culture: ['ls', 'yj'] },
    '金华市': { economy: 'my' },
    '舟山市': { economy: 'ly', culture: ['yj'], special: { freedom: 6, healing: 5 } },
    '台州市': { economy: 'zz' },
    '丽水市': { economy: 'ly', culture: ['yj'] },
    '合肥市': { tier: 2, economy: 'kj', culture: ['kj'] },
    '芜湖市': { tier: 3, economy: 'zz' },
    '黄山市': { economy: 'ly', culture: ['ls', 'yj'], special: { healing: 6, freedom: 5, vibe: 3 }, geo: 'sd' },
    '安庆市': { culture: ['ls'] },
    '福州市': { tier: 2, economy: 'zh', culture: ['ls', 'ms'] },
    '厦门市': { tier: 2, geo: 'hb', economy: 'my', culture: ['yj', 'gj'], special: { healing: 8, freedom: 6 } },
    '泉州市': { tier: 3, economy: 'zz', culture: ['ls', 'ms'] },
    '漳州市': { culture: ['ms', 'yj'] },
    '南昌市': { tier: 3, economy: 'zh', culture: ['ls'] },
    '景德镇市': { culture: ['ls'], special: { vibe: 4 } },
    '九江市': { culture: ['ls', 'yj'] },
    '赣州市': { culture: ['ls'] },
    '济南市': { tier: 2, economy: 'zh', culture: ['ls', 'ms'] },
    '青岛市': { tier: 2, geo: 'hb', economy: 'zh', culture: ['yj', 'gj'], special: { freedom: 5, healing: 5 } },
    '烟台市': { tier: 3, geo: 'hb', culture: ['yj'] },
    '威海市': { tier: 3, geo: 'hb', economy: 'ly', culture: ['yj'], special: { healing: 6, freedom: 5 } },
    '潍坊市': { tier: 3, economy: 'zz' },
    '临沂市': { tier: 3, economy: 'my' },
    '郑州市': { tier: 2, economy: 'zh', culture: ['ls'] },
    '洛阳市': { tier: 3, culture: ['ls'], special: { vibe: 4, healing: 3 } },
    '武汉市': { tier: 2, economy: 'zh', culture: ['ls', 'kj', 'ms'], special: { drive: 5, connection: 4 } },
    '宜昌市': { tier: 3, culture: ['yj'] },
    '长沙市': { tier: 2, economy: 'zh', culture: ['ms', 'kj'], special: { vibe: 6, connection: 4 } },
    '株洲市': { tier: 3, economy: 'zz' },
    '张家界市': { economy: 'ly', culture: ['yj'], special: { healing: 5, freedom: 5 } },
    '广州市': { tier: 1, economy: 'zh', culture: ['ms', 'gj', 'my'], special: { connection: 5, vibe: 4 } },
    '深圳市': { tier: 1, economy: 'kj', culture: ['kj', 'gj', 'my'], special: { drive: 8, freedom: 4 } },
    '珠海市': { tier: 3, geo: 'hb', economy: 'kj', culture: ['yj'], special: { healing: 5, freedom: 5 } },
    '佛山市': { tier: 3, economy: 'zz', culture: ['ms'] },
    '东莞市': { tier: 3, economy: 'zz', culture: ['gy'] },
    '中山市': { tier: 3, culture: ['ls'] },
    '南宁市': { tier: 3, economy: 'zh', culture: ['mz', 'ms'] },
    '桂林市': { tier: 4, geo: 'sd', economy: 'ly', culture: ['yj'], special: { healing: 6, vibe: 5, freedom: 4 } },
    '北海市': { geo: 'hb', economy: 'ly', culture: ['yj'], special: { healing: 5, freedom: 5 } },
    '防城港市': { geo: 'hb', economy: 'ly' },
    '钦州市': { geo: 'hb' },
    '海口市': { tier: 3, geo: 'hb', economy: 'ly', culture: ['yj'], special: { healing: 6, freedom: 5 } },
    '三亚市': { tier: 3, geo: 'hb', economy: 'ly', culture: ['yj'], special: { healing: 8, freedom: 7 } },
    '成都市': { tier: 2, economy: 'zh', culture: ['ms', 'kj'], special: { vibe: 7, healing: 5, connection: 4 } },
    '绵阳市': { tier: 3, economy: 'kj' },
    '乐山市': { culture: ['ls', 'yj'], special: { healing: 4, vibe: 4 } },
    '雅安市': { culture: ['yj'], special: { healing: 5 } },
    '贵阳市': { tier: 3, economy: 'kj', culture: ['mz', 'ms'], special: { vibe: 4 } },
    '遵义市': { culture: ['ls', 'ms'] },
    '昆明市': { tier: 2, economy: 'ly', culture: ['mz', 'yj'], special: { healing: 7, freedom: 6, vibe: 5 } },
    '丽江市': { geo: 'sd', economy: 'ly', culture: ['mz', 'yj'], special: { healing: 8, freedom: 7, vibe: 6 } },
    '大理白族自治州': { geo: 'sd', economy: 'ly', culture: ['mz', 'yj'], special: { healing: 8, freedom: 8, vibe: 7 } },
    '西安市': { tier: 2, economy: 'zh', culture: ['ls', 'ms', 'kj'], special: { vibe: 5, drive: 4 } },
    '兰州市': { tier: 3, economy: 'zh', culture: ['ms'] },
    '西宁市': { tier: 3, economy: 'zh', culture: ['mz'] },
    '银川市': { tier: 3, economy: 'zh', culture: ['mz'] },
    '乌鲁木齐市': { tier: 3, economy: 'zh', culture: ['mz', 'ms'] },
    '拉萨市': { tier: 4, economy: 'ly', culture: ['mz'], special: { freedom: 9, healing: 7, vibe: 6 } },
    // ── 台湾城市（各城性格差异明显，需独立 override）──
    '台北市': { tier: 1, economy: 'zh', culture: ['gj', 'kj', 'my', 'ms'], special: { drive: 6, connection: 5, vibe: 3 } },
    '新北市': { tier: 2, culture: ['ms', 'yj', 'ls'], special: { healing: 4, freedom: 3, vibe: 2 } },
    '桃园市': { tier: 2, economy: 'zz', culture: ['gj'], special: { order: 4, drive: 2 } },
    '台中市': { tier: 2, culture: ['ms', 'yj', 'my'], special: { vibe: 5, healing: 3, freedom: 2 } },
    '台南市': { tier: 2, economy: 'ly', culture: ['ls', 'ms'], special: { vibe: 6, healing: 5 } },
    '高雄市': { tier: 2, economy: 'zz', culture: ['ms', 'gj', 'gy'], special: { freedom: 4, vibe: 2 } },
};

export const TIER_SCORES: Record<number, Partial<DimScores>> = {
    1: { drive: 32, connection: 28, order: 30, vibe: 25, freedom: 18, healing: 15 },
    2: { drive: 25, connection: 22, order: 26, vibe: 22, freedom: 22, healing: 20 },
    3: { drive: 18, connection: 18, order: 22, vibe: 20, freedom: 25, healing: 25 },
    4: { drive: 12, connection: 14, order: 18, vibe: 18, freedom: 30, healing: 32 },
    5: { drive: 8, connection: 10, order: 14, vibe: 16, freedom: 34, healing: 36 },
};

export const GEO_SCORES: Record<string, Partial<DimScores>> = {
    hb: { healing: 8, freedom: 8, vibe: 6 },
    nl: { order: 6, drive: 4, connection: 4 },
    sd: { healing: 6, freedom: 6, vibe: 4 },
    gy: { freedom: 10, healing: 8, vibe: 4 },
    pd: { healing: 6, vibe: 6, freedom: 4 },
};

export const ECON_SCORES: Record<string, Partial<DimScores>> = {
    zh: { drive: 8, connection: 6, order: 6 },
    zz: { drive: 6, order: 8, connection: 4 },
    ny: { healing: 6, order: 4, freedom: 4 },
    zy: { freedom: 4, healing: 4 },
    kj: { drive: 8, connection: 8, freedom: 4 },
    my: { connection: 8, drive: 6, vibe: 4 },
    ly: { healing: 8, vibe: 8, freedom: 6 },
};

export const REGION_SCORES: Record<string, Partial<DimScores>> = {
    HB: { order: 6, drive: 4 },
    HD: { order: 6, connection: 6, drive: 4 },
    HZ: { healing: 4, order: 4, vibe: 4 },
    HN: { vibe: 6, healing: 4, connection: 4 },
    XN: { vibe: 6, healing: 6, freedom: 4 },
    XB: { freedom: 8, healing: 6 },
    DB: { order: 4, healing: 4, freedom: 4 },
};

export const CULTURE_SCORES: Record<string, Partial<DimScores>> = {
    ls: { order: 4, vibe: 4 },
    gj: { connection: 6, drive: 4, freedom: 4 },
    kj: { drive: 6, connection: 4 },
    my: { vibe: 6, connection: 4 },
    ms: { vibe: 6, healing: 4 },
    mz: { vibe: 6, freedom: 4, healing: 4 },
    yj: { vibe: 6, healing: 6, freedom: 2 },
    gy: { drive: 4, order: 4 },
};

export const KW_POOLS: Record<DimKey, string[]> = {
    drive: ['高速运转', '资源密集', '效率优先', '机会前沿', '决策枢纽', '竞争张力', '跃迁通道', '速度感', '推进力', '事业引力'],
    connection: ['社交充沛', '高频互动', '链接网络', '人情流动', '圈层活跃', '合作氛围', '社群密度', '人际磁场', '交叉共振', '接口畅达'],
    freedom: ['自由空间', '高包容度', '多元选择', '节奏自控', '自在舒展', '低拘束感', '逃逸路径', '空间宽裕', '切换灵活', '开阔视野'],
    order: ['秩序可靠', '生活便利', '流程成熟', '确定性强', '基建完善', '规则清晰', '运转稳定', '系统感强', '边界清楚', '高可预期'],
    healing: ['治愈氛围', '慢节奏', '安全感', '情绪缓冲', '压力释放', '自然疗愈', '低消耗感', '身心休憩', '安放自我', '柔软包裹'],
    vibe: ['烟火气浓', '质感独特', '生活美学', '文化厚度', '城市呼吸', '街区个性', '日常诗意', '味觉丰富', '人情温度', '氛围浓郁'],
};

export const MOMENT_BANK: Record<string, string> = {
    hb_healing: '看海',
    hb_freedom: '沿海路跑步',
    hb_vibe: '老街串巷',
    hb_connection: '海边聚会',
    hb_drive: '滨海CBD加班',
    hb_order: '按时赶渡轮',
    nl_healing: '逛公园',
    nl_freedom: '骑车穿城',
    nl_vibe: '夜市觅食',
    nl_connection: '咖啡馆约人',
    nl_drive: '深夜改方案',
    nl_order: '早起坐地铁',
    sd_healing: '山间徒步',
    sd_freedom: '盘山路骑行',
    sd_vibe: '古镇喝茶',
    sd_connection: '爬山结伴',
    sd_drive: '山城拼搏',
    sd_order: '缆车通勤',
    gy_healing: '看星空',
    gy_freedom: '草原驰骋',
    gy_vibe: '帐篷音乐节',
    gy_connection: '篝火聊天',
    gy_drive: '高原创业',
    gy_order: '牧场日常',
    pd_healing: '泡温泉',
    pd_freedom: '环湖骑行',
    pd_vibe: '盆地火锅',
    pd_connection: '茶馆摆龙门阵',
    pd_drive: '新区开荒',
    pd_order: '早高峰过桥',
};

export const LOADING_LINES: string[] = [
    '正在调取你的城市星图...',
    '正在匹配与你同频的命运坐标...',
    '正在校准上升驱力与治愈补给曲线...',
    '正在比对你与城市画像的重叠雷达...',
    '正在分析凯龙星与莉莉丝的深层指引...',
    '正在识别星盘格局与城市气场的共振...',
];

export const PERSONA_ARCHETYPES: { label: string; match: (s: DimScores) => boolean }[] = [
    { label: '先锋开拓者', match: s => s.drive >= 75 && s.freedom >= 60 },
    { label: '高维推进者', match: s => s.drive >= 75 && s.order >= 65 },
    { label: '链接放大器', match: s => s.connection >= 75 && s.vibe >= 60 },
    { label: '社交建筑师', match: s => s.connection >= 72 && s.order >= 65 },
    { label: '自由漫游者', match: s => s.freedom >= 75 && s.healing >= 60 },
    { label: '流动型发光体', match: s => s.freedom >= 72 && s.connection >= 62 },
    { label: '秩序守护者', match: s => s.order >= 76 && s.drive >= 60 },
    { label: '稳态生长者', match: s => s.order >= 72 && s.healing >= 65 },
    { label: '治愈感漫游者', match: s => s.healing >= 75 && s.freedom >= 62 },
    { label: '温柔锚定者', match: s => s.healing >= 72 && s.order >= 60 },
    { label: '烟火感共振体', match: s => s.vibe >= 76 && s.connection >= 58 },
    { label: '沉浸式生活家', match: s => s.vibe >= 72 && s.healing >= 62 },
];

// ──────────────────────────────────────────────────────────────
// Functions
// ──────────────────────────────────────────────────────────────

export function addScores(target: DimScores, addition: Partial<DimScores>): void {
    Object.entries(addition).forEach(([k, v]) => {
        if (k in target) target[k as DimKey] += v as number;
    });
}

export function getCityAttrs(province: string, city: string): CityAttrs {
    const prov = PROVINCE_DEFAULTS[province] || { tier: 4, region: 'HZ', geo: 'nl', economy: 'ny', culture: [] };
    const ovr = CITY_OVERRIDES[city] || {};
    return {
        tier: ovr.tier ?? prov.tier,
        region: ovr.region ?? prov.region,
        geo: ovr.geo ?? prov.geo,
        economy: ovr.economy ?? prov.economy,
        culture: ovr.culture ?? prov.culture,
        special: ovr.special,
    };
}

export function computeCityScores(attrs: CityAttrs): DimScores {
    const s: DimScores = { drive: 20, connection: 20, freedom: 20, order: 20, healing: 20, vibe: 20 };
    addScores(s, (TIER_SCORES as any)[attrs.tier] || {});
    addScores(s, (GEO_SCORES as any)[attrs.geo] || {});
    addScores(s, (ECON_SCORES as any)[attrs.economy] || {});
    addScores(s, (REGION_SCORES as any)[attrs.region] || {});
    attrs.culture.forEach(c => addScores(s, (CULTURE_SCORES as any)[c] || {}));
    if (attrs.special) addScores(s, attrs.special);
    clampScores(s);
    return s;
}

export function buildAllCities(chinaRegions: Record<string, string[]>): CityData[] {
    const cities: CityData[] = [];
    Object.entries(chinaRegions).forEach(([province, cityList]) => {
        cityList.forEach(cityName => {
            const displayName = cityName.replace(/市$|地区$|自治州$|自治县$|林区$|盟$/, '');
            const attrs = getCityAttrs(province, cityName);
            const scores = computeCityScores(attrs);
            cities.push({ name: displayName, fullName: cityName, province, scores, attrs });
        });
    });
    return cities;
}

export function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

export function getTopDimKeys(scores: DimScores, n: number): DimKey[] {
    return (Object.keys(scores) as DimKey[]).sort((a, b) => scores[b] - scores[a]).slice(0, n);
}

export function pickCityKeywords(cityName: string, scores: DimScores): string[] {
    const top3 = getTopDimKeys(scores, 3);
    const h = hashStr(cityName);
    return top3.map((dim, i) => {
        const pool = KW_POOLS[dim];
        return pool[(h + i * 3) % pool.length];
    });
}

export function pickCityMoment(cityName: string, scores: DimScores, attrs: CityAttrs): string {
    const topDim = getTopDimKeys(scores, 1)[0];
    const geo = attrs.geo || 'nl';
    const key = `${geo}_${topDim}`;
    return MOMENT_BANK[key] || MOMENT_BANK[`nl_${topDim}`] || '漫步街头';
}

export function getBaseScores(): DimScores {
    return { drive: 44, connection: 44, freedom: 44, order: 44, healing: 44, vibe: 44 };
}

export function clampScores(scores: DimScores): void {
    (Object.keys(scores) as DimKey[]).forEach(k => {
        scores[k] = Math.max(20, Math.min(95, scores[k]));
    });
}

export function normalizeAstroScores(scores: DimScores): void {
    const vals = Object.values(scores);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const stddev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length) || 1;
    (Object.keys(scores) as DimKey[]).forEach(k => {
        scores[k] = 50 + ((scores[k] - mean) / stddev) * 15;
    });
}

export function applySignImpact(scores: DimScores, signKey: string, planetWeights: Partial<Record<DimKey, number>>): void {
    const profile = SIGN_PROFILES[signKey];
    if (!profile) return;
    (Object.keys(scores) as DimKey[]).forEach(dim => {
        const signFactor = (profile as any)[dim] || 0;
        scores[dim] += signFactor * 0.6;
    });
    const avgWeight = Object.values(planetWeights).reduce((s, v) => s + (v || 0), 0) / 6;
    (Object.entries(planetWeights) as [DimKey, number][]).forEach(([dim, w]) => {
        if (dim in scores) scores[dim] += (w - avgWeight) * 1.2;
    });
}

export function applyHouseImpact(scores: DimScores, houseId: number, planetWeights: Partial<Record<DimKey, number>>): void {
    const profile = (HOUSE_PROFILES as any)[houseId];
    if (!profile) return;
    (Object.keys(scores) as DimKey[]).forEach(dim => {
        const houseFactor = profile[dim] || 0;
        scores[dim] += houseFactor * 0.5;
    });
    (Object.entries(planetWeights) as [DimKey, number][]).forEach(([dim, w]) => {
        if (dim in scores) scores[dim] += w * 0.3;
    });
}

export function applyAllAspects(scores: DimScores, aspects: any[]): void {
    aspects.forEach((aspect: any) => {
        const mod = ASPECT_MODIFIERS[aspect.aspectKey];
        if (mod === undefined) return;
        const p1Dims = PLANET_DIM_AFFINITIES[aspect.point1Key] || {};
        const p2Dims = PLANET_DIM_AFFINITIES[aspect.point2Key] || {};
        const combinedDims: Partial<DimScores> = {};
        [...Object.entries(p1Dims), ...Object.entries(p2Dims)].forEach(([d, w]) => {
            combinedDims[d as DimKey] = ((combinedDims[d as DimKey] || 0) + (w as number)) / 2;
        });
        const strength = Math.abs(mod) * 1.5;
        const sign = mod >= 0 ? 1 : -1;
        Object.entries(combinedDims).forEach(([dim, w]) => {
            if (dim in scores) scores[dim as DimKey] += sign * strength * (w as number) * 2;
        });
    });
}

export function detectPatterns(aspects: any[]): { type: string; planets: string[] }[] {
    const patterns: { type: string; planets: string[] }[] = [];
    const trines = aspects.filter((a: any) => a.aspectKey === 'trine');
    const squares = aspects.filter((a: any) => a.aspectKey === 'square');
    const oppositions = aspects.filter((a: any) => a.aspectKey === 'opposition');
    const foundTrines = new Set<string>();
    for (let i = 0; i < trines.length; i++) {
        for (let j = i + 1; j < trines.length; j++) {
            const t1 = trines[i], t2 = trines[j];
            const allPlanets = new Set([t1.point1Key, t1.point2Key, t2.point1Key, t2.point2Key]);
            if (allPlanets.size !== 3) continue;
            const sorted = [...allPlanets].sort();
            const key = sorted.join('-');
            if (foundTrines.has(key)) continue;
            const [a, b, c] = sorted;
            const hasAB = trines.some((t: any) => (t.point1Key === a && t.point2Key === b) || (t.point1Key === b && t.point2Key === a));
            const hasAC = trines.some((t: any) => (t.point1Key === a && t.point2Key === c) || (t.point1Key === c && t.point2Key === a));
            const hasBC = trines.some((t: any) => (t.point1Key === b && t.point2Key === c) || (t.point1Key === c && t.point2Key === b));
            if (hasAB && hasAC && hasBC) {
                foundTrines.add(key);
                patterns.push({ type: 'grandTrine', planets: sorted });
            }
        }
    }
    const foundTSq = new Set<string>();
    oppositions.forEach((opp: any) => {
        const p1 = opp.point1Key, p2 = opp.point2Key;
        const sqP1 = squares.filter((sq: any) => sq.point1Key === p1 || sq.point2Key === p1).map((sq: any) => sq.point1Key === p1 ? sq.point2Key : sq.point1Key);
        const sqP2 = squares.filter((sq: any) => sq.point1Key === p2 || sq.point2Key === p2).map((sq: any) => sq.point1Key === p2 ? sq.point2Key : sq.point1Key);
        sqP1.filter((p: string) => sqP2.includes(p)).forEach((apex: string) => {
            const key = [p1, p2, apex].sort().join('-');
            if (!foundTSq.has(key)) {
                foundTSq.add(key);
                patterns.push({ type: 'tSquare', planets: [p1, p2, apex] });
            }
        });
    });
    return patterns;
}

export function applyPatternBonuses(scores: DimScores, patterns: { type: string; planets: string[] }[]): void {
    patterns.forEach(p => {
        if (p.type === 'grandTrine') {
            const dims: Partial<DimScores> = {};
            p.planets.forEach(pl => {
                Object.entries(PLANET_DIM_AFFINITIES[pl] || {}).forEach(([d, w]) => {
                    dims[d as DimKey] = ((dims[d as DimKey] || 0) + (w as number));
                });
            });
            const topDim = Object.entries(dims).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
            if (topDim) scores[topDim[0] as DimKey] += 3;
        }
        if (p.type === 'tSquare') {
            scores.drive += 2;
            scores.order += 1;
        }
    });
}

export function getDominantElement(horoscope: any): string {
    const counts: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
    const bodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    bodies.forEach(b => {
        const sign = horoscope.CelestialBodies[b]?.Sign?.key;
        const el = SIGN_ELEMENT[sign];
        if (el) counts[el] += (b === 'sun' || b === 'moon') ? 2 : 1;
    });
    const ascEl = SIGN_ELEMENT[horoscope.Ascendant?.Sign?.key];
    if (ascEl) counts[ascEl] += 2;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function applyQuestionCorrections(scores: DimScores, answers: (number | null)[], astroScores: DimScores | null): void {
    answers.forEach((answerIndex, questionIndex) => {
        if (answerIndex === null) return;
        const option = QUESTIONS[questionIndex]?.options[answerIndex];
        if (!option) return;
        Object.entries(option.scores).forEach(([key, value]) => {
            const astroBase = astroScores ? (astroScores[key as DimKey] || 44) : 44;
            const diminishing = 1.2 - (astroBase - 44) / 80;
            const factor = Math.max(0.5, Math.min(1.4, diminishing));
            scores[key as DimKey] += (value as number) * factor;
        });
    });
    clampScores(scores);
}

export function calculateSimilarity(userScores: DimScores, cityScores: DimScores, cityAttrs: CityAttrs, dominantElement: string): number {
    const userTopKeys = getTopDimKeys(userScores, 3);
    const cityTopKeys = getTopDimKeys(cityScores, 3);
    let dimScore = 0, dimMax = 0;
    DIMENSIONS.forEach(dim => {
        const rank = userTopKeys.indexOf(dim.key);
        const w = rank === 0 ? 2.5 : rank === 1 ? 2.0 : rank === 2 ? 1.7 : 1.0;
        const gap = Math.abs(userScores[dim.key] - cityScores[dim.key]);
        dimScore += (1 - gap / 80) * w;
        dimMax += w;
    });
    const dimNorm = (dimScore / dimMax) * 100;
    let resonance = 0;
    userTopKeys.slice(0, 2).forEach((key, i) => {
        if (cityTopKeys.includes(key)) resonance += i === 0 ? 14 : 10;
    });
    const userWeakest = getTopDimKeys(userScores, 6).slice(-2);
    let complement = 0;
    userWeakest.forEach(key => {
        if (cityScores[key] >= 60) complement += 6;
        else if (cityScores[key] >= 45) complement += 3;
    });
    let climatePref = 0;
    if (dominantElement) {
        const pref = ELEMENT_CLIMATE_PREF[dominantElement];
        if (pref === 'warm' && ['HN', 'XN'].includes(cityAttrs.region)) climatePref = 5;
        if (pref === 'coastal' && cityAttrs.geo === 'hb') climatePref = 5;
        if (pref === 'stable' && ['HD', 'HZ'].includes(cityAttrs.region)) climatePref = 5;
        if (pref === 'seasonal' && ['HB', 'HD'].includes(cityAttrs.region)) climatePref = 4;
    }
    const raw = dimNorm * 0.45 + resonance * 0.25 + complement * 0.20 + climatePref * 0.10;
    return Math.max(32, Math.min(99, raw + 28));
}

export function getPersonaLabel(scores: DimScores): string {
    const found = PERSONA_ARCHETYPES.find(a => a.match(scores));
    return found?.label || '多维共感体';
}

export function generateInsights(userScores: DimScores, city: CityData, astroProfile: AstroProfile): string[] {
    const userTopDims = getTopDimKeys(userScores, 3);
    const cityTopDims = getTopDimKeys(city.scores, 3);
    const overlaps = userTopDims.filter(d => cityTopDims.includes(d));
    const userWeak = getTopDimKeys(userScores, 6).slice(-2);
    const cityStrong = cityTopDims.filter(d => !userTopDims.includes(d));
    const dimName = (key: DimKey) => DIMENSIONS.find(d => d.key === key)?.name || key;
    const dimDesc = (key: DimKey) => DIMENSIONS.find(d => d.key === key)?.desc || '';
    const rs = (v: number) => Math.round(v);
    const cityName = city.name;

    let p1 = '';
    if (overlaps.length >= 2) {
        p1 = `你的${dimName(overlaps[0])}（${rs(userScores[overlaps[0]])}分）和${dimName(overlaps[1])}（${rs(userScores[overlaps[1]])}分）与${cityName}高度共振——${cityName}在这两个维度上分别达到了${rs(city.scores[overlaps[0]])}分和${rs(city.scores[overlaps[1]])}分。${dimDesc(overlaps[0])}而${cityName}恰好是一座能回应这种渴望的城市。`;
    } else if (overlaps.length === 1) {
        p1 = `在${dimName(overlaps[0])}这个维度上，你（${rs(userScores[overlaps[0]])}分）和${cityName}（${rs(city.scores[overlaps[0]])}分）几乎同频——${dimDesc(overlaps[0])}这是你们之间最强的引力线。`;
    } else {
        p1 = `${cityName}的气质组合与你形成了一种微妙的互补——你最突出的${dimName(userTopDims[0])}（${rs(userScores[userTopDims[0]])}分），在${cityName}则表现为${rs(city.scores[userTopDims[0]])}分，而${cityName}最擅长的${dimName(cityTopDims[0])}（${rs(city.scores[cityTopDims[0]])}分），恰好能给你带来当前生活中最缺少的能量。`;
    }

    let p2 = '';
    if (cityStrong.length > 0) {
        const compDim = cityStrong[0];
        const userVal = userScores[compDim];
        if (userVal < 55) {
            p2 = `你在${dimName(compDim)}上的得分是${rs(userVal)}分，属于相对薄弱的维度——${dimDesc(compDim)}而${cityName}在这一维度上达到了${rs(city.scores[compDim])}分，它能自然地补足你在这一面的空白，帮你找到更完整的生活状态。`;
        } else {
            const weakDim = userWeak[0];
            p2 = `值得一提的是，${cityName}在${dimName(compDim)}上的得分为${rs(city.scores[compDim])}分，这为你提供了额外的能量维度。你当前最需要关注的${dimName(weakDim)}（${rs(userScores[weakDim])}分），在这座城市的氛围中也有机会得到自然的滋养。`;
        }
    }

    const elemCN: Record<string, string> = { fire: '火', earth: '土', air: '风', water: '水' };
    let p3 = `从星盘来看，你的本命主轴是${astroProfile.summary}`;
    if (astroProfile.detail) {
        p3 += `，${astroProfile.detail}`;
    }
    if (astroProfile.patternCount > 0) {
        const counts: Record<string, number> = {};
        astroProfile.patterns.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
        const names = Object.entries(counts).map(([p, n]) => {
            const name = p === 'grandTrine' ? '大三角' : p === 'tSquare' ? 'T三角' : p;
            return n > 1 ? `${n}个${name}` : name;
        });
        p3 += `，星盘中存在${names.join('、')}格局`;
    }
    p3 += astroProfile.usedTimeFallback ? '（出生时间未填，上升与宫位按中午12:00估算）。' : '。';
    if (astroProfile.dominantElement) {
        const elemTraits: Record<string, string> = {
            fire: '热情、行动力和开创精神',
            earth: '务实、稳定和对物质安全感的追求',
            air: '沟通、思考和对社交连接的渴望',
            water: '直觉、情感深度和对内在世界的敏感'
        };
        p3 += `你的星盘以${elemCN[astroProfile.dominantElement] || astroProfile.dominantElement}元素为主导，这意味着${elemTraits[astroProfile.dominantElement] || '独特的能量倾向'}是你内在最核心的驱动力。`;
    }

    const overlapsLen = overlaps.length;
    // eslint-disable-next-line max-len
    const p4 = `这一组天象配置，天然指向${dimName(userTopDims[0])}和${dimName(userTopDims[1])}的生活需求，而你在测试中的选择进一步强化了这个方向。综合来看，${cityName}以${rs(city.scores[cityTopDims[0]])}分的${dimName(cityTopDims[0])}和${rs(city.scores[cityTopDims[1]])}分的${dimName(cityTopDims[1])}作为城市底色，与你的能量画像形成了${overlapsLen >= 2 ? '深度共鸣' : overlapsLen === 1 ? '精准呼应' : '互补平衡'}的关系。`;

    const paras = [p1];
    if (p2) {
        paras.push(p2);
    }
    paras.push(p3, p4);
    return paras;
}

export function generateUserKeywords(scores: DimScores): string {
    const topDims = getTopDimKeys(scores, 3).map(k => DIMENSIONS.find(d => d.key === k)?.name);
    return `${topDims[0]}主导 / ${topDims[1]}在线 / ${topDims[2]}加持`;
}

export function generateAuraText(userScores: DimScores, cityScores: DimScores, cityName: string): string {
    const userTop = getTopDimKeys(userScores, 2);
    const cityTop = getTopDimKeys(cityScores, 2);
    const overlap = userTop.filter(d => cityTop.includes(d));
    const dimN = (k: DimKey) => DIMENSIONS.find(d => d.key === k)?.name || k;
    if (overlap.length >= 2) {
        return `${cityName}和你在${dimN(overlap[0])}与${dimN(overlap[1])}上深度共振，这座城几乎是为你的频率量身定制的。`;
    } else if (overlap.length === 1) {
        const cityUnique = cityTop.find(d => !userTop.includes(d))!;
        return `${cityName}最能接住你对${dimN(overlap[0])}的需求，同时它在${dimN(cityUnique)}上的气质，也会慢慢补全你生活中的留白。`;
    } else {
        return `${cityName}看起来和你的主旋律不同，但正是它在${dimN(cityTop[0])}上的特质，能给你一种全新的平衡和可能性。`;
    }
}

export function generateCityInsights(userScores: DimScores, city: CityData, astroProfile: AstroProfile): string[] {
    const userTopDims = getTopDimKeys(userScores, 3);
    const cityTopDims = getTopDimKeys(city.scores, 3);
    const overlaps = userTopDims.filter(d => cityTopDims.includes(d));
    const userWeak = getTopDimKeys(userScores, 6).slice(-2);
    const dimName = (key: string) => DIMENSIONS.find(d => d.key === key)?.name || key;
    const rs = (v: number) => Math.round(v);
    const cn = city.name;
    const attrs = city.attrs || {} as CityAttrs;

    const cultMap: Record<string, string> = {
        ls: '历史积淀', gj: '国际化气质', kj: '科技活力', my: '时尚摩登',
        ms: '烟火美食', mz: '多元民族风情', yj: '艺术园林气息', gy: '工业底蕴'
    };
    // 每种文化标签对应的体验感描述（让同维度分数的城市文字有质感差异）
    const cultExperience: Record<string, string> = {
        ls: '在历史的厚度里感受时间的质感，每条老街都在说话',
        gj: '在多元文化的流动中拓展视野和链接，以更大的格局看世界',
        kj: '在创新密度极高的氛围里持续感受前沿的生长感',
        my: '在摩登街区和设计感场所里，高密度地触碰生活质感',
        ms: '在真实的烟火气里找到城市最温暖的底色，一顿饭就能落地',
        mz: '在多元民族文化的交融里，每天都能感受不同的生命形态',
        yj: '在艺术与园林的诗意空间里找到内心安放的锚点',
        gy: '在工业底蕴与城市转型的张力里感受真实的历史厚度',
    };
    const cultTags = (attrs.culture || []).map(c => cultMap[c]).filter(Boolean);
    const primaryCult = (attrs.culture || [])[0];
    const tierNote = attrs.tier <= 1 ? '顶级资源聚集地' : attrs.tier === 2 ? '区域核心城市' : attrs.tier === 3 ? '成熟二线城市' : '独特气质城市';

    // 找城市最突出的维度（城市强 & 用户需求也高）
    const cityBestOverlap = cityTopDims.find(d => userTopDims.includes(d)) as DimKey | undefined;
    // 城市独有维度（城市强但用户不强）
    const cityUniqueDim = cityTopDims.find(d => !userTopDims.includes(d)) as DimKey | undefined;
    // 用城市名 hash 决定各段切入角度
    const h = hashStr(cn);
    const angle = h % 3;
    const p2Variant = (h + 1) % 3;
    const p3Variant = (h + 2) % 2;

    // ── P1：三种不同开场角度 ────────────────────────────────────────
    let p1 = '';
    if (angle === 0) {
        if (overlaps.length >= 2) {
            const d0 = overlaps[0] as DimKey, d1 = overlaps[1] as DimKey;
            p1 = `你的测试结果在${dimName(d0)}（${rs(userScores[d0])}分）和${dimName(d1)}（${rs(userScores[d1])}分）上同时发出强信号，而${cn}在这两个维度上分别交出了${rs(city.scores[d0])}分和${rs(city.scores[d1])}分——两段频率几乎完全叠合。`;
        } else if (overlaps.length === 1) {
            const d0 = overlaps[0] as DimKey;
            const citySecond = cityTopDims.filter(d => d !== d0)[0] as DimKey;
            p1 = `你的选择偏好在${dimName(d0)}上给出了最清晰的需求信号（${rs(userScores[d0])}分），${cn}恰好以${rs(city.scores[d0])}分的${dimName(d0)}作为最强项来回应你。另一面，${cn}在${dimName(citySecond)}（${rs(city.scores[citySecond])}分）上的特质，是其他候选城市里比较少见的。`;
        } else {
            const d0 = userTopDims[0] as DimKey;
            p1 = `你和${cn}的匹配走的是"互补"逻辑——你的核心需求集中在${dimName(d0)}（${rs(userScores[d0])}分），而${cn}最强的是${dimName(cityTopDims[0] as DimKey)}（${rs(city.scores[cityTopDims[0] as DimKey])}分）。这种错位不是不合适，而是${cn}能给你一种原本生活里不常有的能量维度。`;
        }
    } else if (angle === 1) {
        const leadDim = (cityBestOverlap || cityTopDims[0]) as DimKey;
        const cultStr = cultTags.length > 0 ? `以${cultTags[0]}著称、` : '';
        p1 = `${cn}是一座${cultStr}在${dimName(leadDim)}上达到${rs(city.scores[leadDim])}分的城市——这正好命中了你的核心需求曲线（你的${dimName(leadDim)}：${rs(userScores[leadDim])}分）。`;
        if (overlaps.length >= 2) {
            const d1 = overlaps[1] as DimKey;
            p1 += `${dimName(d1)}维度上，你（${rs(userScores[d1])}分）和${cn}（${rs(city.scores[d1])}分）的重合进一步加深了这种匹配的可靠性。`;
        } else if (cityUniqueDim) {
            p1 += `${cn}在${dimName(cityUniqueDim)}（${rs(city.scores[cityUniqueDim])}分）上还有你不太常遇到的额外加成，是它有别于其他候选城市的地方。`;
        }
    } else {
        if (cityUniqueDim && userScores[cityUniqueDim] < 55) {
            p1 = `你和${cn}之间最有意思的点，不只是那些重叠的频率，还有${cn}在${dimName(cityUniqueDim)}（${rs(city.scores[cityUniqueDim])}分）上的突出——而你恰好在这个维度相对薄弱（${rs(userScores[cityUniqueDim])}分）。这种"你缺的它有"的结构，往往比纯共鸣更能让人在一座城市里持续生长。`;
        } else if (overlaps.length >= 2) {
            const d0 = overlaps[0] as DimKey, d1 = overlaps[1] as DimKey;
            p1 = `把你的能量画像叠到${cn}上，${dimName(d0)}和${dimName(d1)}两条线同时亮起来——你是${rs(userScores[d0])}分对${rs(city.scores[d0])}分，${rs(userScores[d1])}分对${rs(city.scores[d1])}分。这种多维同频并不常见。`;
        } else {
            const d0 = userTopDims[0] as DimKey;
            p1 = `${cn}和你的主旋律不完全相同，但它在${dimName(cityTopDims[0] as DimKey)}（${rs(city.scores[cityTopDims[0] as DimKey])}分）上的特质，恰好能补上你在${dimName(d0)}强驱动之外缺少的那块——让整个生活节奏有机会变得更立体。`;
        }
    }

    // ── P2：三种不同角度描述城市与用户的关系 ────────────────────────
    let p2 = '';
    const weakDim = userWeak[0] as DimKey;
    const compDim = (cityUniqueDim || cityTopDims[0]) as DimKey;

    if (p2Variant === 0) {
        // 分数补足视角
        const cityWeakScore = city.scores[weakDim];
        if (cityWeakScore >= 55) {
            p2 = `你目前在${dimName(weakDim)}上是${rs(userScores[weakDim])}分，属于相对需要补给的区间。${cn}在这里有${rs(cityWeakScore)}分，${cultTags.length > 0 ? `它${cultTags[0]}的城市底色` : '这座城市的日常氛围'}会在潜移默化中给你这块能量。`;
        } else {
            p2 = `${cn}在${dimName(compDim)}上的${rs(city.scores[compDim])}分是它的显著特色，你在这个维度是${rs(userScores[compDim])}分——这种差值不是距离，而是${cn}能给你持续延展的方向。`;
        }
    } else if (p2Variant === 1) {
        // 文化体验视角（每座城市独有）
        const expLine = primaryCult ? cultExperience[primaryCult] : '';
        if (expLine) {
            const d = (cityBestOverlap || cityTopDims[0]) as DimKey;
            p2 = `在${cn}，意味着${expLine}。这与你对${dimName(d)}（${rs(userScores[d])}分）的需求恰好形成呼应——${cn}在这个维度上达到了${rs(city.scores[d])}分，底气十足。`;
        } else {
            const d = (cityBestOverlap || cityTopDims[0]) as DimKey;
            p2 = `作为${tierNote}，${cn}在${dimName(d)}（${rs(city.scores[d])}分）和${dimName(compDim)}（${rs(city.scores[compDim])}分）两面都有不错的表现，与你的偏好形成有机的呼应。`;
        }
    } else {
        // 城市特质对比视角
        const d0 = cityTopDims[0] as DimKey;
        const d1 = cityTopDims[1] as DimKey;
        const cultDesc = cultTags.length >= 2 ? `${cultTags[0]}与${cultTags[1]}兼具` : cultTags[0] || tierNote;
        p2 = `${cn}的城市气质是${cultDesc}，它的${dimName(d0)}（${rs(city.scores[d0])}分）和${dimName(d1)}（${rs(city.scores[d1])}分）是最明显的两张底牌。你在这两个维度是${rs(userScores[d0])}分和${rs(userScores[d1])}分——两段能量的叠加方式，决定了这座城市对你的吸引力结构。`;
    }

    // ── P3：星盘视角（两种连接方式交替） ──────────────────────────────
    let p3 = '';
    if (astroProfile) {
        const elemCN: Record<string, string> = {fire: '火', earth: '土', air: '风', water: '水'};
        const el = astroProfile.dominantElement;
        const elemNeeds: Record<string, string> = {
            fire: '行动力与开创冲动',
            earth: '稳定感与务实落地',
            air: '社交连接与思维流动',
            water: '情感安全与内在深度',
        };
        const fallbackNote = astroProfile.usedTimeFallback ? '（上升与宫位按12:00估算）' : '';

        if (p3Variant === 0) {
            // 元素 → 城市最强维度
            const cityTopDimName = dimName(cityTopDims[0] as DimKey);
            const cityTopScore = rs(city.scores[cityTopDims[0] as DimKey]);
            let cityLink = '';
            if (el === 'fire') {
                cityLink = `${cn}在${cityTopDimName}上${cityTopScore}分的能量密度，能承接和放大这种开创型的驱动力`;
            } else if (el === 'earth') {
                cityLink = attrs.tier <= 2
                    ? `${cn}作为${tierNote}，成熟的城市结构与这种追求稳定落地的能量方向高度契合`
                    : `${cn}扎实的城市底子和可预期的生活节奏，与务实型能量形成自然呼应`;
            } else if (el === 'air') {
                cityLink = cultTags.includes('国际化气质') || cultTags.includes('科技活力')
                    ? `${cn}${cultTags.find(t => t === '国际化气质' || t === '科技活力') || ''}的一面，能承接这种连接型、流动型的能量需求`
                    : `${cn}在${cityTopDimName}（${cityTopScore}分）上的活力，与这种偏向社交和信息流动的星盘倾向契合`;
            } else if (el === 'water') {
                const waterCult = cultTags.find(t => ['艺术园林气息', '烟火美食', '多元民族风情', '历史积淀'].includes(t));
                cityLink = waterCult
                    ? `${cn}${waterCult}的一面，与这种重视情感深度和内在感受的星盘特质产生共鸣`
                    : `${cn}柔性的城市底色，与这种追求内在安全感和情绪深度的能量方向自然呼应`;
            } else {
                cityLink = `${cn}在${cityTopDimName}（${cityTopScore}分）上的气场，与你的星盘能量方向有内在契合`;
            }
            p3 = `从星盘看，你的本命主轴${astroProfile.summary}${fallbackNote}，${elemCN[el] || ''}元素为主导，核心需求指向${elemNeeds[el] || '独特的能量倾向'}——${cityLink}。`;
        } else {
            // 具体行星信息 → 城市文化/特质
            const cultLine = primaryCult ? cultExperience[primaryCult] : '';
            let astroLine = '';
            if (el === 'fire') {
                astroLine = `你的火元素底色意味着你需要一座城市能接住行动力，不让这股劲儿白白消散`;
            } else if (el === 'earth') {
                astroLine = `你的土元素底色让你天然渴望一座城市能给出清晰的结构感和可落脚的确定性`;
            } else if (el === 'air') {
                astroLine = `你的风元素底色意味着思维流动和人际连接是你最重要的能量来源`;
            } else if (el === 'water') {
                astroLine = `你的水元素底色让你对情感氛围极为敏感，需要一座城市在情绪上接得住你`;
            } else {
                astroLine = `你的星盘主轴${astroProfile.summary}指向了独特的内在能量需求`;
            }
            p3 = `从星盘看，${astroLine}${fallbackNote}。${cultLine ? `在${cn}，${cultLine}——这种城市性格` : `${cn}的城市气场`}与你的${elemCN[el] || ''}元素特质之间，有一种不用刻意解释的契合感。`;
        }

        if (astroProfile.patternCount > 0) {
            const patternCN: Record<string, string> = {grandTrine: '大三角', tSquare: 'T三角'};
            const names = [...new Set(astroProfile.patterns)].map(p => patternCN[p] || p);
            p3 += `星盘中的${names.join('、')}格局，会让这个方向的能量需求在生活里格外强烈。`;
        }
    }

    // ── P4：综合结论 ─────────────────────────────────────────────────
    const matchLevel = overlaps.length >= 2 ? '深度共鸣' : overlaps.length === 1 ? '精准呼应' : '互补平衡';
    // eslint-disable-next-line max-len
    const p4 = `综合来看，${cn}以${rs(city.scores[cityTopDims[0] as DimKey])}分的${dimName(cityTopDims[0])}和${rs(city.scores[cityTopDims[1] as DimKey])}分的${dimName(cityTopDims[1])}为底色，与你的能量画像形成${matchLevel}，综合匹配度 ${city.similarity?.toFixed(1)}%。`;

    const paras = [p1];
    if (p2) {
        paras.push(p2);
    }
    if (p3) {
        paras.push(p3);
    }
    paras.push(p4);
    return paras;
}
