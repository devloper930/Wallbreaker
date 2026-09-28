import { getTitleForRating } from './profile.js';

/**
 * Official Top 100 Global Competitive Wallbreaker Leaderboard
 * Calibrated precisely to the 300-player skill pyramid:
 * - 3 Grandmasters (2300+ Elo / Podium)
 * - 6 International Masters (2000 - 2299 Elo)
 * - 15 FIDE Masters (1700 - 1999 Elo)
 * - 24 National Masters (1500 - 1699 Elo)
 * - 42 Candidate Masters (1300 - 1499 Elo)
 * - 10 Top Tacticians (1200 - 1299 Elo)
 */
export const BASE_LEADERBOARD_PLAYERS = [
  {
    "id": "lb_1",
    "name": "Harsh_Patel",
    "avatar": "👑",
    "country": "🇮🇳",
    "rating": 2445,
    "wins": 450,
    "losses": 26,
    "draws": 22
  },
  {
    "id": "lb_2",
    "name": "Babar_Fan_01",
    "avatar": "👑",
    "country": "🇵🇰",
    "rating": 2380,
    "wins": 404,
    "losses": 33,
    "draws": 19
  },
  {
    "id": "lb_3",
    "name": "Mahmud_Hasan",
    "avatar": "🦅",
    "country": "🇧🇩",
    "rating": 2325,
    "wins": 400,
    "losses": 39,
    "draws": 21
  },
  {
    "id": "lb_4",
    "name": "Yuki_S",
    "avatar": "🦊",
    "country": "🇯🇵",
    "rating": 2260,
    "wins": 364,
    "losses": 47,
    "draws": 16
  },
  {
    "id": "lb_5",
    "name": "Hao_Beijing",
    "avatar": "👑",
    "country": "🇨🇳",
    "rating": 2215,
    "wins": 358,
    "losses": 55,
    "draws": 14
  },
  {
    "id": "lb_6",
    "name": "Sofi_Chess",
    "avatar": "👩‍💼",
    "country": "🇫🇷",
    "rating": 2170,
    "wins": 355,
    "losses": 60,
    "draws": 15
  },
  {
    "id": "lb_7",
    "name": "Maxime_V",
    "avatar": "👑",
    "country": "🇫🇷",
    "rating": 2125,
    "wins": 343,
    "losses": 61,
    "draws": 18
  },
  {
    "id": "lb_8",
    "name": "Elena_Quor",
    "avatar": "👑",
    "country": "🇪🇸",
    "rating": 2080,
    "wins": 321,
    "losses": 61,
    "draws": 19
  },
  {
    "id": "lb_9",
    "name": "Tariq_KSA",
    "avatar": "🦅",
    "country": "🇸🇦",
    "rating": 2035,
    "wins": 295,
    "losses": 63,
    "draws": 17
  },
  {
    "id": "lb_10",
    "name": "Aditya_K",
    "avatar": "🦁",
    "country": "🇮🇳",
    "rating": 1980,
    "wins": 296,
    "losses": 70,
    "draws": 17
  },
  {
    "id": "lb_11",
    "name": "Arjun_Blaze",
    "avatar": "🔥",
    "country": "🇮🇳",
    "rating": 1961,
    "wins": 288,
    "losses": 71,
    "draws": 17
  },
  {
    "id": "lb_12",
    "name": "Varun_Tempo",
    "avatar": "⏳",
    "country": "🇮🇳",
    "rating": 1942,
    "wins": 282,
    "losses": 71,
    "draws": 17
  },
  {
    "id": "lb_13",
    "name": "Rajesh_K",
    "avatar": "👑",
    "country": "🇮🇳",
    "rating": 1923,
    "wins": 274,
    "losses": 72,
    "draws": 17
  },
  {
    "id": "lb_14",
    "name": "Daniyal_K",
    "avatar": "🐺",
    "country": "🇵🇰",
    "rating": 1904,
    "wins": 267,
    "losses": 72,
    "draws": 17
  },
  {
    "id": "lb_15",
    "name": "Chen_Wei",
    "avatar": "🐉",
    "country": "🇨🇳",
    "rating": 1885,
    "wins": 260,
    "losses": 72,
    "draws": 17
  },
  {
    "id": "lb_16",
    "name": "Nguyen_Hanoi",
    "avatar": "🐉",
    "country": "🇻🇳",
    "rating": 1866,
    "wins": 253,
    "losses": 72,
    "draws": 17
  },
  {
    "id": "lb_17",
    "name": "Chloe_UK",
    "avatar": "🎯",
    "country": "🇬🇧",
    "rating": 1847,
    "wins": 246,
    "losses": 73,
    "draws": 16
  },
  {
    "id": "lb_18",
    "name": "Alexey_K",
    "avatar": "🦁",
    "country": "🇷🇺",
    "rating": 1828,
    "wins": 240,
    "losses": 73,
    "draws": 16
  },
  {
    "id": "lb_19",
    "name": "Oleg_Kyiv",
    "avatar": "🛡️",
    "country": "🇺🇦",
    "rating": 1809,
    "wins": 233,
    "losses": 74,
    "draws": 15
  },
  {
    "id": "lb_20",
    "name": "Magnus_Fan99",
    "avatar": "👑",
    "country": "🇳🇴",
    "rating": 1790,
    "wins": 226,
    "losses": 74,
    "draws": 15
  },
  {
    "id": "lb_21",
    "name": "Fabian_Zurich",
    "avatar": "🏔️",
    "country": "🇨🇭",
    "rating": 1771,
    "wins": 220,
    "losses": 75,
    "draws": 14
  },
  {
    "id": "lb_22",
    "name": "Logan_Seattle",
    "avatar": "☕",
    "country": "🇺🇸",
    "rating": 1752,
    "wins": 214,
    "losses": 75,
    "draws": 14
  },
  {
    "id": "lb_23",
    "name": "William_Ottawa",
    "avatar": "🏛️",
    "country": "🇨🇦",
    "rating": 1733,
    "wins": 208,
    "losses": 76,
    "draws": 13
  },
  {
    "id": "lb_24",
    "name": "Bruno_Recife",
    "avatar": "🦈",
    "country": "🇧🇷",
    "rating": 1714,
    "wins": 203,
    "losses": 77,
    "draws": 12
  },
  {
    "id": "lb_25",
    "name": "Vikram_R",
    "avatar": "🧙‍♂️",
    "country": "🇮🇳",
    "rating": 1690,
    "wins": 205,
    "losses": 78,
    "draws": 15
  },
  {
    "id": "lb_26",
    "name": "Ishaan_Tactics",
    "avatar": "⚔️",
    "country": "🇮🇳",
    "rating": 1682,
    "wins": 195,
    "losses": 79,
    "draws": 10
  },
  {
    "id": "lb_27",
    "name": "Rahul_Verma",
    "avatar": "🦅",
    "country": "🇮🇳",
    "rating": 1674,
    "wins": 208,
    "losses": 86,
    "draws": 9
  },
  {
    "id": "lb_28",
    "name": "Gaurav_Kolkata",
    "avatar": "🐅",
    "country": "🇮🇳",
    "rating": 1666,
    "wins": 210,
    "losses": 83,
    "draws": 14
  },
  {
    "id": "lb_29",
    "name": "Suresh_Chennai",
    "avatar": "🦁",
    "country": "🇮🇳",
    "rating": 1658,
    "wins": 192,
    "losses": 77,
    "draws": 13
  },
  {
    "id": "lb_30",
    "name": "Dinesh_K",
    "avatar": "🦁",
    "country": "🇮🇳",
    "rating": 1650,
    "wins": 191,
    "losses": 82,
    "draws": 9
  },
  {
    "id": "lb_31",
    "name": "Zubair_ISB",
    "avatar": "🦁",
    "country": "🇵🇰",
    "rating": 1642,
    "wins": 204,
    "losses": 87,
    "draws": 11
  },
  {
    "id": "lb_32",
    "name": "Omer_Tactics",
    "avatar": "⚔️",
    "country": "🇵🇰",
    "rating": 1634,
    "wins": 197,
    "losses": 81,
    "draws": 14
  },
  {
    "id": "lb_33",
    "name": "Khurram_Shah",
    "avatar": "🦁",
    "country": "🇵🇰",
    "rating": 1626,
    "wins": 181,
    "losses": 78,
    "draws": 11
  },
  {
    "id": "lb_34",
    "name": "Shakib_DHK",
    "avatar": "⚡",
    "country": "🇧🇩",
    "rating": 1618,
    "wins": 189,
    "losses": 85,
    "draws": 8
  },
  {
    "id": "lb_35",
    "name": "Imtiaz_BD",
    "avatar": "👑",
    "country": "🇧🇩",
    "rating": 1610,
    "wins": 197,
    "losses": 87,
    "draws": 12
  },
  {
    "id": "lb_36",
    "name": "Daiki_Tokyo",
    "avatar": "⚡",
    "country": "🇯🇵",
    "rating": 1602,
    "wins": 183,
    "losses": 79,
    "draws": 14
  },
  {
    "id": "lb_37",
    "name": "Wang_Shanghai",
    "avatar": "🏙️",
    "country": "🇨🇳",
    "rating": 1594,
    "wins": 174,
    "losses": 80,
    "draws": 9
  },
  {
    "id": "lb_38",
    "name": "Hyun_Woo",
    "avatar": "🐺",
    "country": "🇰🇷",
    "rating": 1586,
    "wins": 186,
    "losses": 87,
    "draws": 9
  },
  {
    "id": "lb_39",
    "name": "Wei_SG",
    "avatar": "🦁",
    "country": "🇸🇬",
    "rating": 1578,
    "wins": 187,
    "losses": 85,
    "draws": 13
  },
  {
    "id": "lb_40",
    "name": "Felix_Berlin",
    "avatar": "🦅",
    "country": "🇩🇪",
    "rating": 1570,
    "wins": 170,
    "losses": 78,
    "draws": 12
  },
  {
    "id": "lb_41",
    "name": "Oliver_LDN",
    "avatar": "🦁",
    "country": "🇬🇧",
    "rating": 1562,
    "wins": 170,
    "losses": 82,
    "draws": 8
  },
  {
    "id": "lb_42",
    "name": "Javier_MAD",
    "avatar": "🐂",
    "country": "🇪🇸",
    "rating": 1554,
    "wins": 182,
    "losses": 88,
    "draws": 10
  },
  {
    "id": "lb_43",
    "name": "Luca_Rossi",
    "avatar": "🏎️",
    "country": "🇮🇹",
    "rating": 1546,
    "wins": 175,
    "losses": 81,
    "draws": 14
  },
  {
    "id": "lb_44",
    "name": "Kowalski_P",
    "avatar": "🦅",
    "country": "🇵🇱",
    "rating": 1538,
    "wins": 160,
    "losses": 78,
    "draws": 10
  },
  {
    "id": "lb_45",
    "name": "Erik_Stockholm",
    "avatar": "⚔️",
    "country": "🇸🇪",
    "rating": 1530,
    "wins": 168,
    "losses": 86,
    "draws": 7
  },
  {
    "id": "lb_46",
    "name": "Jan_Prague",
    "avatar": "🏰",
    "country": "🇨🇿",
    "rating": 1522,
    "wins": 176,
    "losses": 87,
    "draws": 11
  },
  {
    "id": "lb_47",
    "name": "Kaspar_Tallinn",
    "avatar": "💻",
    "country": "🇪🇪",
    "rating": 1514,
    "wins": 162,
    "losses": 79,
    "draws": 13
  },
  {
    "id": "lb_48",
    "name": "David_99",
    "avatar": "🐺",
    "country": "🇺🇸",
    "rating": 1506,
    "wins": 154,
    "losses": 79,
    "draws": 8
  },
  {
    "id": "lb_49",
    "name": "Aarav_Mehta",
    "avatar": "🐅",
    "country": "🇮🇳",
    "rating": 1495,
    "wins": 157,
    "losses": 77,
    "draws": 13
  },
  {
    "id": "lb_50",
    "name": "Siddharth_V",
    "avatar": "🛡️",
    "country": "🇮🇳",
    "rating": 1490,
    "wins": 166,
    "losses": 85,
    "draws": 12
  },
  {
    "id": "lb_51",
    "name": "Dev_Mumbai",
    "avatar": "🏙️",
    "country": "🇮🇳",
    "rating": 1486,
    "wins": 158,
    "losses": 85,
    "draws": 7
  },
  {
    "id": "lb_52",
    "name": "Akash_Joshi",
    "avatar": "🌪️",
    "country": "🇮🇳",
    "rating": 1481,
    "wins": 148,
    "losses": 78,
    "draws": 9
  },
  {
    "id": "lb_53",
    "name": "Nikhil_Chawla",
    "avatar": "🚀",
    "country": "🇮🇳",
    "rating": 1477,
    "wins": 160,
    "losses": 82,
    "draws": 13
  },
  {
    "id": "lb_54",
    "name": "Karthik_N",
    "avatar": "⚡",
    "country": "🇮🇳",
    "rating": 1472,
    "wins": 164,
    "losses": 88,
    "draws": 10
  },
  {
    "id": "lb_55",
    "name": "Pranav_Pune",
    "avatar": "🦅",
    "country": "🇮🇳",
    "rating": 1468,
    "wins": 147,
    "losses": 80,
    "draws": 7
  },
  {
    "id": "lb_56",
    "name": "Abhishek_T",
    "avatar": "⚡",
    "country": "🇮🇳",
    "rating": 1463,
    "wins": 145,
    "losses": 76,
    "draws": 11
  },
  {
    "id": "lb_57",
    "name": "Naveen_Blr",
    "avatar": "💻",
    "country": "🇮🇳",
    "rating": 1459,
    "wins": 161,
    "losses": 86,
    "draws": 11
  },
  {
    "id": "lb_58",
    "name": "Hamza_LHE",
    "avatar": "🦅",
    "country": "🇵🇰",
    "rating": 1454,
    "wins": 156,
    "losses": 87,
    "draws": 7
  },
  {
    "id": "lb_59",
    "name": "Saad_Raza",
    "avatar": "🔥",
    "country": "🇵🇰",
    "rating": 1450,
    "wins": 141,
    "losses": 76,
    "draws": 10
  },
  {
    "id": "lb_60",
    "name": "Hassan_LHE",
    "avatar": "👑",
    "country": "🇵🇰",
    "rating": 1445,
    "wins": 147,
    "losses": 79,
    "draws": 12
  },
  {
    "id": "lb_61",
    "name": "Imran_Peshawar",
    "avatar": "🦅",
    "country": "🇵🇰",
    "rating": 1441,
    "wins": 156,
    "losses": 88,
    "draws": 8
  },
  {
    "id": "lb_62",
    "name": "Tahsin_BD",
    "avatar": "🐅",
    "country": "🇧🇩",
    "rating": 1436,
    "wins": 144,
    "losses": 84,
    "draws": 6
  },
  {
    "id": "lb_63",
    "name": "Sabbir_Chess",
    "avatar": "🔥",
    "country": "🇧🇩",
    "rating": 1432,
    "wins": 141,
    "losses": 76,
    "draws": 12
  },
  {
    "id": "lb_64",
    "name": "Siam_Ahmed",
    "avatar": "🎯",
    "country": "🇧🇩",
    "rating": 1427,
    "wins": 151,
    "losses": 83,
    "draws": 12
  },
  {
    "id": "lb_65",
    "name": "Kenji_T",
    "avatar": "🥷",
    "country": "🇯🇵",
    "rating": 1423,
    "wins": 145,
    "losses": 85,
    "draws": 7
  },
  {
    "id": "lb_66",
    "name": "Zhang_Lei",
    "avatar": "🔥",
    "country": "🇨🇳",
    "rating": 1418,
    "wins": 135,
    "losses": 77,
    "draws": 8
  },
  {
    "id": "lb_67",
    "name": "Minho_K",
    "avatar": "⚡",
    "country": "🇰🇷",
    "rating": 1414,
    "wins": 145,
    "losses": 80,
    "draws": 12
  },
  {
    "id": "lb_68",
    "name": "Joshua_Cebu",
    "avatar": "🏝️",
    "country": "🇵🇭",
    "rating": 1409,
    "wins": 150,
    "losses": 86,
    "draws": 10
  },
  {
    "id": "lb_69",
    "name": "Rian_Bandung",
    "avatar": "🌋",
    "country": "🇮🇩",
    "rating": 1405,
    "wins": 134,
    "losses": 80,
    "draws": 7
  },
  {
    "id": "lb_70",
    "name": "Antoine_L",
    "avatar": "🤺",
    "country": "🇫🇷",
    "rating": 1400,
    "wins": 131,
    "losses": 75,
    "draws": 10
  },
  {
    "id": "lb_71",
    "name": "Marcus_V",
    "avatar": "⚡",
    "country": "🇩🇪",
    "rating": 1396,
    "wins": 147,
    "losses": 84,
    "draws": 11
  },
  {
    "id": "lb_72",
    "name": "Emily_Walls",
    "avatar": "🧱",
    "country": "🇬🇧",
    "rating": 1391,
    "wins": 143,
    "losses": 87,
    "draws": 7
  },
  {
    "id": "lb_73",
    "name": "Alejandro_S",
    "avatar": "🔥",
    "country": "🇪🇸",
    "rating": 1387,
    "wins": 127,
    "losses": 76,
    "draws": 8
  },
  {
    "id": "lb_74",
    "name": "Marco_Roma",
    "avatar": "🏛️",
    "country": "🇮🇹",
    "rating": 1382,
    "wins": 132,
    "losses": 76,
    "draws": 12
  },
  {
    "id": "lb_75",
    "name": "Piotr_Krakow",
    "avatar": "🐉",
    "country": "🇵🇱",
    "rating": 1378,
    "wins": 143,
    "losses": 87,
    "draws": 8
  },
  {
    "id": "lb_76",
    "name": "Ivan_SPB",
    "avatar": "❄️",
    "country": "🇷🇺",
    "rating": 1373,
    "wins": 132,
    "losses": 83,
    "draws": 6
  },
  {
    "id": "lb_77",
    "name": "Thijs_Rotterdam",
    "avatar": "⚓",
    "country": "🇳🇱",
    "rating": 1369,
    "wins": 127,
    "losses": 74,
    "draws": 11
  },
  {
    "id": "lb_78",
    "name": "Nikos_ATH",
    "avatar": "🏛️",
    "country": "🇬🇷",
    "rating": 1364,
    "wins": 136,
    "losses": 80,
    "draws": 12
  },
  {
    "id": "lb_79",
    "name": "Balazs_BP",
    "avatar": "🌉",
    "country": "🇭🇺",
    "rating": 1360,
    "wins": 133,
    "losses": 85,
    "draws": 6
  },
  {
    "id": "lb_80",
    "name": "Filip_Zagreb",
    "avatar": "⚽",
    "country": "🇭🇷",
    "rating": 1355,
    "wins": 122,
    "losses": 77,
    "draws": 7
  },
  {
    "id": "lb_81",
    "name": "Callum_Edinburgh",
    "avatar": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "country": "🇬🇧",
    "rating": 1351,
    "wins": 130,
    "losses": 77,
    "draws": 12
  },
  {
    "id": "lb_82",
    "name": "Tyler_NYC",
    "avatar": "🗽",
    "country": "🇺🇸",
    "rating": 1346,
    "wins": 137,
    "losses": 84,
    "draws": 10
  },
  {
    "id": "lb_83",
    "name": "Ethan_Denver",
    "avatar": "🏔️",
    "country": "🇺🇸",
    "rating": 1342,
    "wins": 122,
    "losses": 79,
    "draws": 6
  },
  {
    "id": "lb_84",
    "name": "Jordan_Vegas",
    "avatar": "🎲",
    "country": "🇺🇸",
    "rating": 1337,
    "wins": 117,
    "losses": 73,
    "draws": 9
  },
  {
    "id": "lb_85",
    "name": "Mia_Charlotte",
    "avatar": "👑",
    "country": "🇺🇸",
    "rating": 1333,
    "wins": 132,
    "losses": 82,
    "draws": 11
  },
  {
    "id": "lb_86",
    "name": "Noah_YYZ",
    "avatar": "🏙️",
    "country": "🇨🇦",
    "rating": 1328,
    "wins": 131,
    "losses": 85,
    "draws": 7
  },
  {
    "id": "lb_87",
    "name": "Carlos_CDMX",
    "avatar": "🌮",
    "country": "🇲🇽",
    "rating": 1324,
    "wins": 115,
    "losses": 74,
    "draws": 7
  },
  {
    "id": "lb_88",
    "name": "Sofia_Leon",
    "avatar": "🦁",
    "country": "🇲🇽",
    "rating": 1319,
    "wins": 119,
    "losses": 73,
    "draws": 11
  },
  {
    "id": "lb_89",
    "name": "Angel_PR",
    "avatar": "🇵🇷",
    "country": "🇺🇸",
    "rating": 1315,
    "wins": 130,
    "losses": 85,
    "draws": 8
  },
  {
    "id": "lb_90",
    "name": "Lucas_Silva",
    "avatar": "🦅",
    "country": "🇧🇷",
    "rating": 1310,
    "wins": 121,
    "losses": 82,
    "draws": 5
  },
  {
    "id": "lb_91",
    "name": "Rohan_Sharma",
    "avatar": "⚡",
    "country": "🇮🇳",
    "rating": 1290,
    "wins": 124,
    "losses": 84,
    "draws": 8
  },
  {
    "id": "lb_92",
    "name": "Priya_Chess",
    "avatar": "👩‍💼",
    "country": "🇮🇳",
    "rating": 1281,
    "wins": 108,
    "losses": 71,
    "draws": 10
  },
  {
    "id": "lb_93",
    "name": "Kabir_Walls",
    "avatar": "🧱",
    "country": "🇮🇳",
    "rating": 1272,
    "wins": 116,
    "losses": 82,
    "draws": 5
  },
  {
    "id": "lb_94",
    "name": "Kiran_Bangalore",
    "avatar": "💻",
    "country": "🇮🇳",
    "rating": 1263,
    "wins": 112,
    "losses": 74,
    "draws": 11
  },
  {
    "id": "lb_95",
    "name": "Bilal_KHI",
    "avatar": "⚡",
    "country": "🇵🇰",
    "rating": 1254,
    "wins": 105,
    "losses": 76,
    "draws": 5
  },
  {
    "id": "lb_96",
    "name": "Tariq_Malik",
    "avatar": "🛡️",
    "country": "🇵🇰",
    "rating": 1245,
    "wins": 114,
    "losses": 79,
    "draws": 10
  },
  {
    "id": "lb_97",
    "name": "Tamim_Chittagong",
    "avatar": "🏏",
    "country": "🇧🇩",
    "rating": 1236,
    "wins": 97,
    "losses": 71,
    "draws": 6
  },
  {
    "id": "lb_98",
    "name": "Tanvir_Ahmed",
    "avatar": "🛡️",
    "country": "🇧🇩",
    "rating": 1227,
    "wins": 112,
    "losses": 82,
    "draws": 7
  },
  {
    "id": "lb_99",
    "name": "Ren_Osaka",
    "avatar": "🐉",
    "country": "🇯🇵",
    "rating": 1218,
    "wins": 95,
    "losses": 68,
    "draws": 9
  },
  {
    "id": "lb_100",
    "name": "Li_Jun",
    "avatar": "🐼",
    "country": "🇨🇳",
    "rating": 1209,
    "wins": 105,
    "losses": 80,
    "draws": 5
  }
];

/**
 * Returns the competitive leaderboard with top 3 podium and top 100 list,
 * merging the current user's profile and calculating their live world standing.
 */
export function getGlobalLeaderboard(userProfile) {
  const currentRating = userProfile?.rating || 400;
  const currentName = userProfile?.name && userProfile.name !== 'Player' ? userProfile.name : 'You (Player)';
  const currentAvatar = userProfile?.avatar || '👤';
  const currentTitle = getTitleForRating(currentRating);
  const currentWins = userProfile?.wins || 0;
  const currentLosses = userProfile?.losses || 0;
  const currentDraws = userProfile?.draws || 0;
  const currentCountry = userProfile?.country || '🌍';

  const userEntry = {
    id: 'user_active',
    name: currentName,
    avatar: currentAvatar,
    country: currentCountry,
    rating: currentRating,
    title: currentTitle,
    wins: currentWins,
    losses: currentLosses,
    draws: currentDraws,
    isCurrentUser: true,
  };

  // Combine and sort by rating descending
  const allPlayers = BASE_LEADERBOARD_PLAYERS.map((p) => ({
    ...p,
    title: getTitleForRating(p.rating),
    isCurrentUser: false,
  }));

  // Combine user entry and sort
  const combined = [...allPlayers, userEntry].sort((a, b) => b.rating - a.rating);

  // Assign ranks (1-based)
  const ranked = combined.map((player, idx) => {
    const total = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
    const winRate = total > 0 ? Math.round(((player.wins || 0) / total) * 100) : 0;
    return {
      ...player,
      rank: idx + 1,
      totalGames: total,
      winRate,
    };
  });

  const userRankIndex = ranked.findIndex((p) => p.isCurrentUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : 1240;

  // Top 3 Podium (The 3 Grandmasters: 2300+)
  const top3 = ranked.slice(0, 3);

  // Top 100 Players
  const top100 = ranked.slice(0, 100);

  // Backwards compatibility alias
  const top50 = ranked.slice(0, 50);

  const minTop100Rating = ranked[99]?.rating || 1209;
  const pointsToTop100 = Math.max(0, minTop100Rating - currentRating + 1);

  const minTop50Rating = ranked[49]?.rating || 1490;
  const pointsToTop50 = Math.max(0, minTop50Rating - currentRating + 1);

  return {
    top3,
    top100,
    top50,
    userStanding: {
      ...userEntry,
      rank: userRank,
      isInTop100: userRank <= 100,
      isInTop50: userRank <= 50,
      pointsToTop100,
      pointsToTop50,
      minTop100Rating,
      minTop50Rating,
    },
  };
}
