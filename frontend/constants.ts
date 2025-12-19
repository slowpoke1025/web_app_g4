export const TAG_OPTIONS = {
  gender: ["女性", "男性", "其他"],
  age: ["18-24 歲", "25-30 歲", "31-35 歲", "36 歲以上"],
  personality: ["開朗", "文靜", "傲嬌", "成熟", "充滿活力", "神秘", "高冷"],
  interests: [
    "看電影",
    "閱讀",
    "旅遊",
    "打遊戲",
    "烹飪",
    "運動",
    "時尚",
    "音樂",
  ],
  occupation: [
    "上班族",
    "學生",
    "藝術家",
    "醫生",
    "工程師",
    "自由接案者",
    "模特兒",
  ],
};

export const DATE_OPTIONS = {
  morning: [
    { id: "brunch", label: "網美早午餐", type: "美食/拍照" },
    { id: "park", label: "遊樂園排隊", type: "戶外/熱鬧" },
    { id: "library", label: "市立圖書館展覽", type: "室內/知性" },
    { id: "gym", label: "高強度健身房", type: "運動/流汗" }, // Risky
    { id: "sleep", label: "放鳥讓他在家等", type: "作死/惡搞" }, // Terrible
  ],
  afternoon: [
    { id: "bike", label: "河濱公園騎腳踏車", type: "運動/自然" },
    { id: "mall", label: "百貨公司逛街看電影", type: "室內/娛樂" },
    { id: "museum", label: "歷史博物館", type: "文化/嚴肅" },
    { id: "netcafe", label: "充滿煙味的網咖", type: "室內/吵雜" }, // Terrible for most
    { id: "cemetery", label: "公墓試膽大會", type: "恐怖/特殊" }, // Risky
  ],
  evening: [
    { id: "dinner", label: "浪漫景觀餐廳晚餐", type: "浪漫/昂貴" },
    { id: "nightmarket", label: "熱鬧的夜市掃街", type: "親民/美食" },
    { id: "home", label: "回家打電動 / Netflix", type: "宅家/放鬆" },
    { id: "street", label: "路邊蹲著吃便利商店", type: "隨便/窮酸" }, // Terrible
    { id: "club", label: "夜店狂歡", type: "吵雜/酒精" }, // Risky
  ],
};

export const OUTFIT_OPTIONS = {
  tops: [
    { id: "01", name: "休閒 T-Shirt" },
    { id: "02", name: "正式襯衫" },
    { id: "03", name: "連帽衫" },
    { id: "04", name: "背心" },
    { id: "05", name: "吊嘎" }, // Terrible
    { id: "06", name: "充滿亮片的舞衣" }, // Risky
  ],
  bottoms: [
    { id: "01", name: "牛仔褲" },
    { id: "02", name: "西裝褲" },
    { id: "03", name: "短褲" },
    { id: "04", name: "優雅長裙" },
    { id: "05", name: "海灘泳褲/比基尼" }, // Inappropriate for most dates
    { id: "06", name: "睡褲" }, // Terrible
    { id: "07", name: "彎刀褲" }, // Terrible
  ],
  head: [
    { id: "00", name: "無" },
    { id: "01", name: "棒球帽" },
    { id: "02", name: "髮夾" },
    { id: "03", name: "貝雷帽" }, // Terrible
    { id: "04", name: "漁夫帽" }, // Terrible
  ],
  body: [
    { id: "00", name: "無" },
    { id: "01", name: "圍巾" },
    { id: "02", name: "側背包" },
    { id: "03", name: "金條項鍊" }, // Risky
    { id: "04", name: "骷髏項鍊" }, // Risky
  ],
  hand: [
    { id: "00", name: "無" },
    { id: "01", name: "名牌手錶" },
    { id: "02", name: "編織手環" },
    { id: "03", name: "戒指" }, // Terrible
  ],
};
