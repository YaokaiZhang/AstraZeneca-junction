// Towns for "Who misses screening" (3.2) and the radar town drill-down (3.1): all 292 municipalities in the
// 21 wellbeing services counties + Helsinki (Åland is outside the county system). REAL published figures,
// pulled from the open APIs on 14 Nov 2026:
// - residents, share 65+, foreign-language and Swedish speakers: Statistics Finland table 11ra, 2024
// - income: median disposable income per consumption unit, Statistics Finland table 14ww, 2024
// - turnout: THL Sotkanet 6103 (bowel), 3621 (breast), 3620 (cervical), 2024, % of invited who attended
export type Programme = 'bowel' | 'breast' | 'cervical'
export const PROGRAMMES: { id: Programme; label: string; ages: string; indicator: string }[] = [
  { id: 'bowel', label: 'Bowel', ages: '56–74', indicator: '6103' },
  { id: 'breast', label: 'Breast', ages: '50–69', indicator: '3621' },
  { id: 'cervical', label: 'Cervical', ages: '30–65', indicator: '3620' },
]

export interface Town {
  /** municipality code, KU + 3 digits */
  id: string
  name: string
  county: string
  population: number
  /** median disposable income per consumption unit, k€ (2024) */
  income: number
  /** share aged 65+, % */
  share65: number
  /** foreign-language speakers, % */
  foreign: number
  /** Swedish speakers, % */
  swedish: number
  turnout: Record<Programme, number>
}

// [code, name, county, residents, income k€, 65+ %, foreign-language %, Swedish %, bowel %, breast %, cervical %]
const RAW: [string, string, string, number, number, number, number, number, number, number, number][] = [
  ['153', "Imatra", 'etela-karjala', 24724, 28.3, 33, 9.5, 0.1, 73.0, 80.1, 75.2],
  ['405', "Lappeenranta", 'etela-karjala', 73327, 28.8, 25.4, 11.2, 0.2, 74.5, 85.5, 76.1],
  ['416', "Lemi", 'etela-karjala', 2849, 29.3, 27.1, 2.4, 0.1, 79.0, 84.3, 79.9],
  ['441', "Luumäki", 'etela-karjala', 4358, 29.0, 36.8, 5.7, 0.5, 70.0, 82.5, 75.6],
  ['580', "Parikkala", 'etela-karjala', 4300, 27.6, 43.8, 3.2, 0.2, 74.5, 78.8, 65.3],
  ['689', "Rautjärvi", 'etela-karjala', 3008, 28.0, 42.2, 6.1, 0.2, 72.4, 76.4, 78.7],
  ['700', "Ruokolahti", 'etela-karjala', 4733, 30.7, 38, 4.2, 0.2, 71.6, 76.6, 77.3],
  ['739', "Savitaipale", 'etela-karjala', 3188, 28.5, 40.4, 3, 0.3, 76.6, 85.9, 76.7],
  ['831', "Taipalsaari", 'etela-karjala', 4596, 32.1, 30.1, 6.8, 0.2, 76.6, 85.1, 76.5],
  ['005', "Alajärvi", 'etela-pohjanmaa', 9078, 27.6, 31.6, 5, 0.1, 72.3, 83.6, 82.5],
  ['010', "Alavus", 'etela-pohjanmaa', 10780, 26.6, 30.8, 2.7, 0.1, 74.9, 84.5, 80.4],
  ['052', "Evijärvi", 'etela-pohjanmaa', 2272, 28.1, 31.1, 4.8, 2.1, 74.5, 84.9, 79.1],
  ['145', "Ilmajoki", 'etela-pohjanmaa', 12429, 30.7, 23.1, 2.1, 0.2, 75.9, 84.8, 84.7],
  ['151', "Isojoki", 'etela-pohjanmaa', 1794, 28.5, 36, 4.7, 0.8, 68.3, 83.8, 80.5],
  ['152', "Isokyrö", 'etela-pohjanmaa', 4319, 29.2, 29.6, 2, 0.7, 73.4, 83.7, 87.9],
  ['218', "Karijoki", 'etela-pohjanmaa', 1159, 27.9, 38.3, 2.6, 1.9, 77.0, 78.4, 75.5],
  ['232', "Kauhajoki", 'etela-pohjanmaa', 12518, 27.6, 30.7, 3.9, 0.4, 71.9, 82.5, 81.5],
  ['233', "Kauhava", 'etela-pohjanmaa', 15050, 28.8, 31.3, 6.2, 0.7, 75.4, 84.9, 79.0],
  ['300', "Kuortane", 'etela-pohjanmaa', 3335, 29.1, 33.9, 2.5, 0.2, 78.5, 84.8, 82.0],
  ['301', "Kurikka", 'etela-pohjanmaa', 19509, 28.7, 32.6, 3.3, 0.4, 74.4, 85.8, 78.5],
  ['403', "Lappajärvi", 'etela-pohjanmaa', 2758, 27.1, 39.1, 6.7, 0.4, 76.6, 85.6, 80.2],
  ['408', "Lapua", 'etela-pohjanmaa', 14028, 30.0, 26.2, 4.6, 0.2, 73.4, 86.0, 79.5],
  ['743', "Seinäjoki", 'etela-pohjanmaa', 66611, 30.0, 21.1, 5.3, 0.2, 76.0, 86.1, 84.7],
  ['759', "Soini", 'etela-pohjanmaa', 1800, 27.0, 35, 1.4, 0.1, 71.9, 87.0, 84.0],
  ['846', "Teuva", 'etela-pohjanmaa', 4662, 27.6, 36, 2.7, 0.7, 70.9, 82.3, 77.4],
  ['934', "Vimpeli", 'etela-pohjanmaa', 2607, 28.7, 34.5, 2.9, 0.2, 72.3, 84.8, 84.7],
  ['989', "Ähtäri", 'etela-pohjanmaa', 5220, 27.5, 36.1, 3, 0.1, 77.0, 84.4, 80.7],
  ['046', "Enonkoski", 'etela-savo', 1288, 28.3, 40.2, 3.5, 0.2, 76.9, 81.3, 76.8],
  ['097', "Hirvensalmi", 'etela-savo', 2059, 29.1, 41.1, 3, 0.4, 79.9, 83.5, 72.1],
  ['178', "Juva", 'etela-savo', 5674, 28.6, 39.1, 4.6, 0.3, 75.9, 79.0, 83.4],
  ['213', "Kangasniemi", 'etela-savo', 5062, 28.0, 39.3, 3.6, 0.2, 77.9, 84.1, 86.4],
  ['491', "Mikkeli", 'etela-savo', 51890, 29.2, 28.9, 6.3, 0.2, 78.7, 83.6, 82.4],
  ['507', "Mäntyharju", 'etela-savo', 7057, 28.1, 40.3, 5, 0.3, 73.2, 76.7, 74.4],
  ['593', "Pieksämäki", 'etela-savo', 17178, 27.7, 35.5, 7.1, 0.1, 76.4, 81.9, 83.6],
  ['623', "Puumala", 'etela-savo', 2101, 30.7, 48.1, 3.4, 0.3, 76.2, 85.8, 90.7],
  ['681', "Rantasalmi", 'etela-savo', 3246, 27.6, 38, 6.4, 0.2, 76.2, 77.4, 82.0],
  ['740', "Savonlinna", 'etela-savo', 31460, 28.2, 35.4, 5.7, 0.1, 76.3, 81.9, 83.2],
  ['768', "Sulkava", 'etela-savo', 2361, 28.1, 42.9, 4.6, 0.2, 68.4, 79.0, 77.5],
  ['091', "Helsinki", 'helsinki', 684018, 33.5, 17.6, 20.4, 5.4, 69.6, 74.3, 71.4],
  ['018', "Askola", 'ita-uusimaa', 4651, 32.9, 23.1, 3.7, 3.7, 69.5, 80.1, 72.5],
  ['407', "Lapinjärvi", 'ita-uusimaa', 2429, 29.8, 32.2, 7.5, 29.5, 65.7, 81.2, 69.9],
  ['434', "Loviisa", 'ita-uusimaa', 14352, 30.8, 31.8, 6.2, 38.8, 70.9, 80.4, 75.8],
  ['504', "Myrskylä", 'ita-uusimaa', 1677, 30.3, 31.2, 4, 9.5, 69.7, 68.5, 69.9],
  ['638', "Porvoo", 'ita-uusimaa', 51737, 33.8, 23.3, 9.3, 27.4, 74.0, 80.5, 76.3],
  ['616', "Pukkila", 'ita-uusimaa', 1743, 30.5, 25.7, 3.7, 0.8, 74.2, 68.7, 75.5],
  ['753', "Sipoo", 'ita-uusimaa', 22826, 36.1, 18.8, 7.6, 27.4, 69.7, 79.5, 76.0],
  ['105', "Hyrynsalmi", 'kainuu', 2002, 27.0, 46.6, 2.1, 0.1, 77.4, 79.2, 86.3],
  ['205', "Kajaani", 'kainuu', 36433, 29.1, 25.2, 7.8, 0.1, 75.8, 85.0, 77.7],
  ['290', "Kuhmo", 'kainuu', 7483, 27.2, 41, 3.4, 0.1, 77.6, 79.7, 82.6],
  ['578', "Paltamo", 'kainuu', 2990, 27.8, 37.7, 1.8, 0.2, 72.9, 80.6, 77.4],
  ['620', "Puolanka", 'kainuu', 2345, 26.5, 44.4, 3.6, 0.2, 75.5, 87.2, 73.3],
  ['697', "Ristijärvi", 'kainuu', 1163, 28.6, 42.7, 3.7, 0, 75.3, 82.6, 67.3],
  ['765', "Sotkamo", 'kainuu', 10185, 30.6, 28.7, 5.2, 0.2, 77.3, 84.5, 79.8],
  ['777', "Suomussalmi", 'kainuu', 7038, 27.4, 42.7, 3.5, 0.1, 78.5, 86.1, 78.0],
  ['061', "Forssa", 'kanta-hame', 16478, 27.3, 33.5, 9.5, 0.3, 73.1, 83.8, 71.9],
  ['082', "Hattula", 'kanta-hame', 9361, 32.6, 25.3, 2.7, 0.4, 75.5, 88.3, 72.1],
  ['086', "Hausjärvi", 'kanta-hame', 7901, 31.4, 25.5, 3.7, 0.4, 72.8, 78.3, 68.9],
  ['103', "Humppila", 'kanta-hame', 2094, 29.0, 33, 2.9, 0.2, 70.7, 75.9, 63.4],
  ['109', "Hämeenlinna", 'kanta-hame', 68433, 30.4, 27.4, 7.7, 0.4, 75.0, 84.0, 70.8],
  ['165', "Janakkala", 'kanta-hame', 16015, 31.1, 26.2, 4.2, 0.4, 72.2, 84.4, 70.4],
  ['169', "Jokioinen", 'kanta-hame', 4848, 30.2, 30.5, 3.5, 0.4, 74.8, 82.3, 68.2],
  ['433', "Loppi", 'kanta-hame', 7657, 30.8, 27.6, 3.7, 0.5, 73.0, 81.8, 72.0],
  ['694', "Riihimäki", 'kanta-hame', 28643, 30.3, 24.8, 8.1, 0.4, 74.7, 81.7, 69.1],
  ['834', "Tammela", 'kanta-hame', 5832, 31.7, 30.5, 2.9, 0.2, 76.4, 87.7, 74.5],
  ['981', "Ypäjä", 'kanta-hame', 2193, 29.0, 31.1, 2.5, 0.5, 77.9, 79.2, 59.8],
  ['074', "Halsua", 'keski-pohjanmaa', 985, 28.3, 37.8, 4.6, 0.5, 73.1, 86.1, 56.4],
  ['217', "Kannus", 'keski-pohjanmaa', 5264, 28.8, 26.9, 3.1, 0.4, 72.6, 83.0, 73.2],
  ['236', "Kaustinen", 'keski-pohjanmaa', 4118, 29.4, 26.3, 3.3, 2, 76.1, 87.9, 73.7],
  ['272', "Kokkola", 'keski-pohjanmaa', 48367, 29.6, 23.3, 5.6, 11.8, 72.6, 86.2, 67.7],
  ['421', "Lestijärvi", 'keski-pohjanmaa', 665, 29.2, 35.6, 2.4, 0.2, 72.4, 80.0, 85.7],
  ['584', "Perho", 'keski-pohjanmaa', 2594, 25.7, 26.1, 1.2, 0.4, 73.3, 82.4, 73.5],
  ['849', "Toholampi", 'keski-pohjanmaa', 2799, 27.4, 31.1, 2.5, 0.1, 78.7, 83.0, 77.8],
  ['924', "Veteli", 'keski-pohjanmaa', 2931, 28.0, 33.5, 3.7, 1.6, 75.2, 81.6, 69.6],
  ['077', "Hankasalmi", 'keski-suomi', 4509, 28.5, 35.5, 2.6, 0.3, 77.6, 84.6, 68.1],
  ['172', "Joutsa", 'keski-suomi', 4099, 27.1, 41.5, 5.3, 0.2, 75.3, 82.6, 73.8],
  ['179', "Jyväskylä", 'keski-suomi', 149194, 28.6, 19.4, 7.6, 0.2, 77.8, 85.7, 71.1],
  ['182', "Jämsä", 'keski-suomi', 19116, 29.1, 35.4, 4.1, 0.1, 75.0, 82.8, 70.0],
  ['216', "Kannonkoski", 'keski-suomi', 1186, 26.6, 39.2, 1.7, 0.1, 71.7, 80.6, 66.0],
  ['226', "Karstula", 'keski-suomi', 3573, 27.9, 38.8, 2.2, 0.1, 72.1, 87.0, 67.5],
  ['249', "Keuruu", 'keski-suomi', 9128, 27.6, 37.1, 4.3, 0.1, 74.9, 82.6, 71.1],
  ['256', "Kinnula", 'keski-suomi', 1492, 25.7, 36.3, 1.2, 0.1, 75.9, 84.2, 85.7],
  ['265', "Kivijärvi", 'keski-suomi', 1011, 25.2, 40.2, 2.2, 0, 72.7, 88.4, 66.0],
  ['275', "Konnevesi", 'keski-suomi', 2441, 27.5, 36.8, 2.3, 0, 77.3, 84.7, 65.5],
  ['312', "Kyyjärvi", 'keski-suomi', 1155, 26.6, 41, 2.5, 0.1, 76.0, 87.5, 64.0],
  ['410', "Laukaa", 'keski-suomi', 18878, 29.6, 22.2, 2.4, 0.1, 79.0, 85.0, 73.4],
  ['435', "Luhanka", 'keski-suomi', 711, 30.6, 44.9, 0.7, 0, 78.8, 88.9, 80.6],
  ['495', "Multia", 'keski-suomi', 1393, 27.9, 41.5, 2.4, 0.1, 70.2, 83.8, 71.0],
  ['500', "Muurame", 'keski-suomi', 10614, 33.1, 20.6, 2.4, 0.2, 80.8, 84.7, 76.8],
  ['592', "Petäjävesi", 'keski-suomi', 3552, 29.2, 26.7, 1.9, 0.2, 74.6, 85.3, 66.5],
  ['601', "Pihtipudas", 'keski-suomi', 3692, 26.8, 35.3, 1.6, 0, 76.3, 81.1, 60.8],
  ['729', "Saarijärvi", 'keski-suomi', 8858, 27.0, 36.4, 2.8, 0.1, 73.3, 84.5, 64.7],
  ['850', "Toivakka", 'keski-suomi', 2349, 29.4, 30.1, 2.4, 0.1, 78.1, 86.9, 68.0],
  ['892', "Uurainen", 'keski-suomi', 3657, 28.6, 21.1, 1.6, 0.1, 74.5, 84.7, 64.7],
  ['931', "Viitasaari", 'keski-suomi', 5764, 27.4, 40.1, 2.5, 0.1, 75.0, 88.6, 68.9],
  ['992', "Äänekoski", 'keski-suomi', 17740, 28.3, 30.4, 3.4, 0.1, 73.9, 85.9, 69.5],
  ['106', "Hyvinkää", 'keski-uusimaa', 47031, 31.9, 24.4, 8.7, 0.9, 74.0, 80.2, 75.6],
  ['186', "Järvenpää", 'keski-uusimaa', 46871, 32.8, 20.4, 9.5, 1, 74.4, 81.2, 75.7],
  ['505', "Mäntsälä", 'keski-uusimaa', 20934, 32.4, 21.3, 5.9, 0.7, 72.8, 80.8, 71.0],
  ['543', "Nurmijärvi", 'keski-uusimaa', 45048, 34.4, 18.4, 8.1, 1.3, 72.8, 78.1, 77.4],
  ['611', "Pornainen", 'keski-uusimaa', 4961, 35.2, 19.5, 3.9, 2.4, 77.5, 85.2, 66.1],
  ['858', "Tuusula", 'keski-uusimaa', 42225, 34.9, 19.1, 8.6, 1.4, 75.1, 81.9, 78.5],
  ['075', "Hamina", 'kymenlaakso', 19311, 29.4, 31.9, 8.5, 0.3, 70.4, 80.4, 77.7],
  ['285', "Kotka", 'kymenlaakso', 50210, 28.7, 29.5, 11.1, 1, 66.7, 80.2, 74.3],
  ['286', "Kouvola", 'kymenlaakso', 78386, 29.6, 30.6, 5.9, 0.4, 71.9, 83.6, 77.7],
  ['489', "Miehikkälä", 'kymenlaakso', 1703, 28.3, 39.3, 6.4, 0.4, 66.1, 80.3, 68.0],
  ['624', "Pyhtää", 'kymenlaakso', 5001, 32.4, 28.5, 4.9, 6.6, 71.4, 83.3, 81.0],
  ['935', "Virolahti", 'kymenlaakso', 2831, 28.5, 36.8, 6.8, 0.5, 69.8, 81.5, 74.7],
  ['049', "Espoo", 'lansi-uusimaa', 320931, 36.2, 15.2, 25, 6.3, 71.4, 74.6, 73.0],
  ['078', "Hanko", 'lansi-uusimaa', 7702, 30.9, 35.4, 6.3, 41.4, 74.6, 80.7, 69.7],
  ['149', "Ingå", 'lansi-uusimaa', 5402, 35.2, 27.4, 5.2, 51, 71.7, 75.3, 77.4],
  ['224', "Karkkila", 'lansi-uusimaa', 8440, 29.4, 28.9, 9, 0.7, 72.5, 80.8, 74.7],
  ['235', "Kauniainen", 'lansi-uusimaa', 10253, 49.7, 23.5, 11.1, 30.6, 75.9, 74.6, 77.6],
  ['257', "Kirkkonummi", 'lansi-uusimaa', 41635, 35.8, 18.2, 12.9, 14.6, 70.4, 75.3, 75.1],
  ['444', "Lohja", 'lansi-uusimaa', 45687, 31.7, 26.7, 6.8, 3.4, 72.3, 78.7, 73.5],
  ['710', "Raseborg", 'lansi-uusimaa', 27036, 30.0, 29, 6.2, 63.4, 71.0, 81.1, 75.7],
  ['755', "Siuntio", 'lansi-uusimaa', 6182, 35.1, 21.8, 8.6, 26.2, 66.8, 74.7, 75.9],
  ['927', "Vihti", 'lansi-uusimaa', 28799, 33.8, 21.9, 7.3, 1.7, 70.8, 79.3, 75.1],
  ['047', "Enontekiö", 'lappi', 1762, 29.0, 31.7, 3.7, 1.1, 70.8, 86.4, 80.2],
  ['148', "Inari", 'lappi', 7224, 31.9, 28, 5.8, 0.4, 71.3, 80.6, 85.4],
  ['240', "Kemi", 'lappi', 19402, 28.0, 31, 7, 0.2, 68.6, 82.1, 82.4],
  ['320', "Kemijärvi", 'lappi', 6954, 28.2, 41.9, 5.2, 0.1, 76.0, 86.2, 82.5],
  ['241', "Keminmaa", 'lappi', 7604, 32.3, 28.5, 1.4, 0.1, 75.2, 83.9, 73.5],
  ['261', "Kittilä", 'lappi', 6837, 32.4, 22, 5.5, 0.4, 73.5, 84.7, 80.5],
  ['273', "Kolari", 'lappi', 3987, 29.9, 28.2, 2.9, 0.7, 77.5, 80.9, 78.5],
  ['498', "Muonio", 'lappi', 2313, 30.9, 27.8, 4.6, 0.6, 76.2, 79.3, 77.9],
  ['583', "Pelkosenniemi", 'lappi', 910, 30.6, 40.9, 2, 0, 78.2, 79.3, 80.7],
  ['854', "Pello", 'lappi', 3191, 28.7, 44.4, 2.6, 0.8, 74.7, 87.5, 85.9],
  ['614', "Posio", 'lappi', 2878, 27.5, 45.2, 2.4, 0.1, 76.1, 80.0, 63.8],
  ['683', "Ranua", 'lappi', 3570, 27.2, 33.4, 2, 0.2, 72.1, 83.2, 80.1],
  ['698', "Rovaniemi", 'lappi', 65722, 30.0, 21.4, 5.5, 0.2, 74.0, 84.4, 79.0],
  ['732', "Salla", 'lappi', 3285, 28.8, 42.5, 4.2, 0.3, 75.8, 78.1, 72.5],
  ['742', "Savukoski", 'lappi', 964, 27.9, 37.1, 2.4, 0.3, 67.4, 68.1, 63.8],
  ['751', "Simo", 'lappi', 2778, 30.2, 37.3, 1, 0.4, 72.6, 85.5, 78.3],
  ['758', "Sodankylä", 'lappi', 8127, 31.4, 30.3, 2.7, 0.1, 75.7, 86.0, 80.5],
  ['845', "Tervola", 'lappi', 2826, 29.8, 31.9, 3.4, 0.1, 72.5, 79.3, 83.7],
  ['851', "Tornio", 'lappi', 20959, 30.9, 26.4, 4.1, 0.5, 76.1, 86.6, 81.7],
  ['890', "Utsjoki", 'lappi', 1137, 30.4, 32.2, 4.1, 0.2, 59.5, 73.2, 73.5],
  ['976', "Ylitornio", 'lappi', 3721, 28.9, 41.3, 4, 0.7, 74.3, 85.0, 86.0],
  ['016', "Asikkala", 'paijat-hame', 7889, 29.4, 35.7, 3.5, 0.2, 77.2, 82.1, 71.9],
  ['081', "Hartola", 'paijat-hame', 2482, 26.8, 44.7, 3.7, 0.1, 73.1, 70.0, 65.8],
  ['111', "Heinola", 'paijat-hame', 17829, 28.1, 38.1, 5.5, 0.2, 76.8, 79.5, 70.5],
  ['098', "Hollola", 'paijat-hame', 22849, 31.6, 27.4, 3.5, 0.4, 77.5, 83.5, 75.3],
  ['142', "Iitti", 'paijat-hame', 6401, 28.9, 34.2, 2.5, 0.2, 69.8, 78.9, 71.4],
  ['316', "Kärkölä", 'paijat-hame', 4093, 29.0, 30, 5.5, 0.5, 68.6, 78.9, 62.1],
  ['398', "Lahti", 'paijat-hame', 121337, 28.5, 25.6, 10.3, 0.4, 75.3, 82.8, 67.8],
  ['560', "Orimattila", 'paijat-hame', 15651, 29.5, 27.2, 4.6, 0.6, 73.6, 80.3, 67.5],
  ['576', "Padasjoki", 'paijat-hame', 2676, 27.4, 44, 3, 0.3, 78.5, 80.0, 62.6],
  ['781', "Sysmä", 'paijat-hame', 3428, 28.1, 46.2, 3.4, 0.3, 72.8, 80.1, 65.9],
  ['020', "Akaa", 'pirkanmaa', 16387, 29.6, 25.8, 3.2, 0.2, 72.2, 81.1, 68.4],
  ['108', "Hämeenkyrö", 'pirkanmaa', 10348, 30.2, 25.7, 2.2, 0.2, 77.2, 81.7, 67.7],
  ['143', "Ikaalinen", 'pirkanmaa', 6758, 27.9, 33.6, 4.8, 0.1, 71.9, 74.3, 65.6],
  ['177', "Juupajoki", 'pirkanmaa', 1668, 29.7, 35.5, 2, 0.2, 72.3, 77.5, 61.9],
  ['211', "Kangasala", 'pirkanmaa', 33951, 31.9, 21.4, 3.6, 0.3, 75.7, 87.0, 76.2],
  ['250', "Kihniö", 'pirkanmaa', 1703, 27.3, 38.3, 2.1, 0, 75.7, 84.7, 65.9],
  ['291', "Kuhmoinen", 'pirkanmaa', 2038, 27.5, 47.4, 2.4, 0.5, 79.2, 74.3, 76.2],
  ['418', "Lempäälä", 'pirkanmaa', 24854, 33.4, 17.8, 3.2, 0.3, 75.1, 86.0, 77.6],
  ['508', "Mänttä-Vilppula", 'pirkanmaa', 9270, 27.9, 38.2, 5.1, 0.2, 74.2, 81.0, 68.8],
  ['536', "Nokia", 'pirkanmaa', 36176, 31.7, 21.4, 3.9, 0.3, 73.3, 86.1, 75.1],
  ['562', "Orivesi", 'pirkanmaa', 8869, 29.4, 32, 2.6, 0.2, 76.6, 81.5, 67.1],
  ['581', "Parkano", 'pirkanmaa', 6069, 27.4, 35.6, 3.4, 0.2, 75.1, 82.2, 64.8],
  ['604', "Pirkkala", 'pirkanmaa', 21042, 34.9, 18.4, 4.8, 0.4, 77.6, 85.5, 78.6],
  ['619', "Punkalaidun", 'pirkanmaa', 2607, 27.2, 38.4, 3.4, 0.1, 74.7, 84.4, 65.8],
  ['635', "Pälkäne", 'pirkanmaa', 6238, 30.0, 31.5, 4, 0.4, 70.9, 81.5, 72.2],
  ['702', "Ruovesi", 'pirkanmaa', 4039, 27.6, 40.9, 3.6, 0.3, 70.5, 80.3, 64.0],
  ['790', "Sastamala", 'pirkanmaa', 23464, 29.0, 32.1, 3.8, 0.2, 75.4, 84.2, 71.0],
  ['837', "Tampere", 'pirkanmaa', 260180, 29.1, 18.9, 11.4, 0.5, 73.7, 83.2, 69.9],
  ['887', "Urjala", 'pirkanmaa', 4493, 27.8, 35.1, 3.4, 0.3, 70.0, 73.8, 68.1],
  ['908', "Valkeakoski", 'pirkanmaa', 20847, 30.2, 28.4, 6.2, 0.2, 74.4, 82.3, 71.5],
  ['922', "Vesilahti", 'pirkanmaa', 4511, 34.0, 20, 2.3, 0.4, 78.9, 90.1, 75.3],
  ['936', "Virrat", 'pirkanmaa', 6190, 27.7, 38.7, 3.9, 0.2, 75.7, 82.3, 66.3],
  ['980', "Ylöjärvi", 'pirkanmaa', 33704, 32.4, 20.5, 3.3, 0.4, 74.8, 84.7, 74.9],
  ['598', "Jakobstad", 'pohjanmaa', 19576, 29.3, 25.7, 16.1, 53.5, 75.0, 84.7, 68.1],
  ['231', "Kaskinen", 'pohjanmaa', 1241, 28.6, 41.2, 17.1, 27.6, 65.2, 76.3, 45.7],
  ['499', "Korsholm", 'pohjanmaa', 19738, 33.3, 23.5, 3.5, 68, 75.9, 86.6, 80.8],
  ['280', "Korsnäs", 'pohjanmaa', 1986, 29.3, 31, 13, 83.4, 79.0, 81.6, 68.9],
  ['287', "Kristinestad", 'pohjanmaa', 6121, 29.3, 38.6, 7.3, 52.6, 77.7, 82.5, 68.6],
  ['288', "Kronoby", 'pohjanmaa', 6342, 30.7, 27.1, 5.2, 75.4, 72.2, 82.2, 66.0],
  ['399', "Laihia", 'pohjanmaa', 7656, 31.6, 25.3, 2.2, 1.1, 78.2, 83.7, 79.1],
  ['440', "Larsmo", 'pohjanmaa', 5884, 29.3, 14.4, 3.5, 91.8, 82.4, 92.4, 72.2],
  ['475', "Malax", 'pohjanmaa', 5415, 30.9, 29.8, 5.9, 84.8, 75.3, 85.7, 78.4],
  ['893', "Nykarleby", 'pohjanmaa', 7439, 29.7, 26.3, 9.8, 83.7, 75.8, 83.1, 69.7],
  ['545', "Närpes", 'pohjanmaa', 9554, 29.1, 28, 21.8, 73.3, 80.1, 82.1, 69.4],
  ['599', "Pedersöre", 'pohjanmaa', 11226, 30.0, 19.5, 3.6, 88.4, 78.7, 89.5, 75.9],
  ['905', "Vaasa", 'pohjanmaa', 70361, 29.5, 20.5, 13.8, 23, 75.2, 84.7, 71.6],
  ['946', "Vörå", 'pohjanmaa', 6210, 30.5, 28.6, 6.7, 81.5, 71.8, 87.0, 70.8],
  ['090', "Heinävesi", 'pohjois-karjala', 2929, 27.7, 44.7, 4.4, 0.3, 69.5, 82.4, 63.5],
  ['146', "Ilomantsi", 'pohjois-karjala', 4382, 26.5, 46.6, 5.1, 0.3, 74.1, 87.5, 76.9],
  ['167', "Joensuu", 'pohjois-karjala', 78741, 27.1, 23.6, 8.5, 0.1, 74.8, 85.1, 68.4],
  ['176', "Juuka", 'pohjois-karjala', 4160, 26.0, 42, 3.6, 0, 69.8, 73.4, 71.6],
  ['260', "Kitee", 'pohjois-karjala', 9566, 26.8, 41, 8.5, 0, 73.7, 85.1, 69.6],
  ['276', "Kontiolahti", 'pohjois-karjala', 15071, 31.3, 19.5, 2.4, 0.1, 74.6, 83.5, 70.8],
  ['422', "Lieksa", 'pohjois-karjala', 10049, 26.5, 42.1, 6.5, 0.1, 72.4, 88.0, 64.4],
  ['426', "Liperi", 'pohjois-karjala', 11913, 29.3, 24.7, 2.7, 0, 72.8, 87.6, 70.4],
  ['541', "Nurmes", 'pohjois-karjala', 8980, 26.4, 38.5, 3.9, 0.1, 72.2, 84.1, 59.5],
  ['309', "Outokumpu", 'pohjois-karjala', 6444, 26.0, 35.1, 8.5, 0.1, 69.9, 78.2, 62.5],
  ['607', "Polvijärvi", 'pohjois-karjala', 3999, 27.1, 37.5, 1.5, 0.1, 64.1, 80.2, 64.8],
  ['707', "Rääkkylä", 'pohjois-karjala', 1881, 25.8, 48.3, 4.7, 0.1, 74.2, 78.4, 62.6],
  ['848', "Tohmajärvi", 'pohjois-karjala', 3976, 27.5, 37.2, 6.3, 0.3, 73.3, 76.2, 70.3],
  ['009', "Alavieska", 'pohjois-pohjanmaa', 2410, 27.3, 27, 2, 0.2, 75.9, 89.2, 78.9],
  ['069', "Haapajärvi", 'pohjois-pohjanmaa', 6492, 27.3, 28.6, 2.1, 0, 73.8, 80.6, 69.0],
  ['071', "Haapavesi", 'pohjois-pohjanmaa', 6365, 27.7, 26.5, 3.7, 0, 74.3, 86.8, 70.9],
  ['072', "Hailuoto", 'pohjois-pohjanmaa', 927, 29.9, 42.3, 1.5, 0, 77.3, 83.6, 67.4],
  ['139', "Ii", 'pohjois-pohjanmaa', 9806, 28.6, 23, 1, 0.2, 74.4, 86.1, 77.9],
  ['208', "Kalajoki", 'pohjois-pohjanmaa', 12271, 28.6, 28.3, 4, 0.4, 75.9, 85.6, 71.2],
  ['244', "Kempele", 'pohjois-pohjanmaa', 19657, 31.9, 17.2, 1.5, 0.2, 79.3, 88.2, 77.2],
  ['305', "Kuusamo", 'pohjois-pohjanmaa', 14876, 28.5, 31, 4.4, 0.3, 75.3, 85.4, 78.8],
  ['317', "Kärsämäki", 'pohjois-pohjanmaa', 2373, 27.2, 30.9, 1.4, 0.1, 77.0, 84.9, 66.3],
  ['425', "Liminka", 'pohjois-pohjanmaa', 10190, 30.3, 11.4, 1, 0.1, 78.1, 86.4, 81.3],
  ['436', "Lumijoki", 'pohjois-pohjanmaa', 2008, 27.3, 20.1, 4.4, 0.2, 74.6, 88.3, 62.6],
  ['483', "Merijärvi", 'pohjois-pohjanmaa', 1059, 25.1, 25.6, 0.4, 0.3, 76.3, 84.2, 76.3],
  ['494', "Muhos", 'pohjois-pohjanmaa', 8749, 28.3, 20.6, 1.5, 0.1, 71.6, 79.4, 67.5],
  ['535', "Nivala", 'pohjois-pohjanmaa', 10378, 27.6, 24.1, 1.8, 0.1, 75.3, 87.0, 71.0],
  ['563', "Oulainen", 'pohjois-pohjanmaa', 6912, 27.2, 30.4, 2.7, 0.1, 74.8, 82.8, 66.6],
  ['564', "Oulu", 'pohjois-pohjanmaa', 216152, 29.8, 17.6, 6.5, 0.2, 76.4, 86.0, 74.9],
  ['615', "Pudasjärvi", 'pohjois-pohjanmaa', 7304, 26.2, 36.4, 2.2, 0.2, 74.7, 84.1, 72.5],
  ['625', "Pyhäjoki", 'pohjois-pohjanmaa', 2976, 30.2, 30.4, 4.3, 0.2, 73.7, 83.3, 64.5],
  ['626', "Pyhäjärvi", 'pohjois-pohjanmaa', 4702, 27.3, 38.3, 3.1, 0.2, 74.9, 87.3, 67.1],
  ['630', "Pyhäntä", 'pohjois-pohjanmaa', 1641, 27.0, 25.3, 9, 0, 76.3, 84.0, 53.4],
  ['678', "Raahe", 'pohjois-pohjanmaa', 23571, 29.4, 28.2, 4.4, 0.1, 73.0, 84.8, 68.8],
  ['691', "Reisjärvi", 'pohjois-pohjanmaa', 2556, 28.0, 30.2, 0.5, 0, 76.6, 85.0, 65.5],
  ['746', "Sievi", 'pohjois-pohjanmaa', 4603, 26.1, 21.4, 4, 0.2, 72.5, 87.4, 69.6],
  ['748', "Siikajoki", 'pohjois-pohjanmaa', 4804, 29.1, 27.9, 1.9, 0, 74.9, 87.3, 59.6],
  ['791', "Siikalatva", 'pohjois-pohjanmaa', 4938, 27.6, 33.5, 2, 0.1, 69.0, 82.3, 80.0],
  ['832', "Taivalkoski", 'pohjois-pohjanmaa', 3657, 27.0, 34.8, 2.4, 0.1, 77.5, 86.1, 81.8],
  ['859', "Tyrnävä", 'pohjois-pohjanmaa', 6501, 27.3, 15.5, 1.1, 0.2, 73.8, 83.0, 70.4],
  ['889', "Utajärvi", 'pohjois-pohjanmaa', 2466, 27.0, 33.8, 3.1, 0, 73.6, 82.1, 69.9],
  ['785', "Vaala", 'pohjois-pohjanmaa', 2581, 27.3, 40.5, 2.4, 0, 70.9, 78.9, 63.3],
  ['977', "Ylivieska", 'pohjois-pohjanmaa', 15406, 28.4, 22.6, 2.4, 0.2, 78.5, 87.3, 70.6],
  ['140', "Iisalmi", 'pohjois-savo', 20463, 28.6, 29.9, 4.6, 0, 76.3, 85.6, 80.5],
  ['171', "Joroinen", 'pohjois-savo', 4552, 29.0, 34.1, 6.7, 0.4, 75.6, 87.6, 70.8],
  ['204', "Kaavi", 'pohjois-savo', 2589, 27.0, 39.2, 2.5, 0.2, 73.0, 85.5, 66.7],
  ['239', "Keitele", 'pohjois-savo', 1985, 27.6, 42.4, 3.6, 0.2, 72.1, 82.2, 69.6],
  ['263', "Kiuruvesi", 'pohjois-savo', 7354, 27.0, 34.1, 2.1, 0, 73.1, 81.0, 84.9],
  ['297', "Kuopio", 'pohjois-savo', 125666, 29.5, 22.6, 6.7, 0.1, 76.1, 84.5, 67.6],
  ['402', "Lapinlahti", 'pohjois-savo', 8865, 28.5, 31.2, 3.1, 0.1, 75.7, 85.7, 65.7],
  ['420', "Leppävirta", 'pohjois-savo', 8971, 30.3, 34.1, 3, 0.1, 76.3, 84.7, 81.1],
  ['595', "Pielavesi", 'pohjois-savo', 3980, 26.3, 40.8, 2.2, 0.3, 72.8, 84.4, 58.3],
  ['686', "Rautalampi", 'pohjois-savo', 2935, 26.6, 37.4, 4.2, 0.1, 76.4, 87.3, 65.8],
  ['687', "Rautavaara", 'pohjois-savo', 1413, 24.8, 43.2, 2.5, 0, 71.2, 79.6, 81.2],
  ['749', "Siilinjärvi", 'pohjois-savo', 21269, 31.1, 23.3, 2.4, 0.1, 78.6, 87.7, 67.6],
  ['762', "Sonkajärvi", 'pohjois-savo', 3570, 28.0, 38.4, 1.7, 0.1, 74.0, 85.9, 81.2],
  ['778', "Suonenjoki", 'pohjois-savo', 6632, 27.8, 34.5, 4.2, 0.2, 74.1, 85.8, 69.1],
  ['844', "Tervo", 'pohjois-savo', 1388, 28.1, 44.9, 2.6, 0.1, 78.9, 82.8, 71.8],
  ['857', "Tuusniemi", 'pohjois-savo', 2311, 27.6, 41.8, 2.6, 0.2, 70.2, 79.7, 54.8],
  ['915', "Varkaus", 'pohjois-savo', 19669, 28.0, 34.2, 6.2, 0.2, 72.5, 87.5, 70.5],
  ['921', "Vesanto", 'pohjois-savo', 1851, 26.9, 43.8, 3.2, 0.1, 70.9, 86.3, 52.7],
  ['925', "Vieremä", 'pohjois-savo', 3352, 28.9, 29.6, 4.7, 0.2, 73.3, 84.8, 83.3],
  ['050', "Eura", 'satakunta', 11084, 30.3, 29.8, 4.6, 0.2, 73.3, 85.7, 83.0],
  ['051', "Eurajoki", 'satakunta', 9052, 33.3, 27.6, 3.6, 0.3, 71.0, 83.2, 83.4],
  ['079', "Harjavalta", 'satakunta', 6647, 28.8, 33.6, 5.4, 0.2, 66.8, 85.7, 74.0],
  ['102', "Huittinen", 'satakunta', 9555, 28.6, 31.5, 5.8, 0.2, 74.3, 75.3, 64.8],
  ['181', "Jämijärvi", 'satakunta', 1658, 28.4, 32.8, 3.1, 0.2, 77.6, 92.5, 80.2],
  ['214', "Kankaanpää", 'satakunta', 12478, 27.5, 31.4, 7, 0.1, 72.1, 83.0, 80.1],
  ['230', "Karvia", 'satakunta', 2170, 27.6, 36.5, 5.3, 0, 74.0, 80.0, 72.5],
  ['271', "Kokemäki", 'satakunta', 6668, 28.1, 33.2, 3.6, 0.3, 71.3, 87.6, 80.8],
  ['484', "Merikarvia", 'satakunta', 2904, 28.3, 36.9, 4, 0.4, 75.3, 80.5, 72.2],
  ['531', "Nakkila", 'satakunta', 4939, 29.6, 30.5, 2.2, 0.6, 71.0, 86.4, 76.5],
  ['608', "Pomarkku", 'satakunta', 1931, 27.4, 34.4, 1.8, 0.1, 72.6, 83.2, 73.5],
  ['609', "Pori", 'satakunta', 83305, 28.8, 27.1, 5.8, 0.6, 71.7, 85.9, 65.9],
  ['684', "Rauma", 'satakunta', 38968, 30.9, 27.3, 9.4, 0.3, 74.0, 83.5, 72.9],
  ['747', "Siikainen", 'satakunta', 1264, 26.7, 41.1, 1.6, 0.2, 70.6, 84.6, 90.4],
  ['783', "Säkylä", 'satakunta', 6256, 30.0, 33.7, 5.3, 0.3, 74.3, 86.6, 84.0],
  ['886', "Ulvila", 'satakunta', 12382, 30.0, 28.2, 3.1, 0.3, 75.3, 89.6, 61.8],
  ['245', "Kerava", 'vantaa-kerava', 38461, 31.4, 21, 17.3, 1.2, 73.9, 79.0, 72.6],
  ['092', "Vantaa", 'vantaa-kerava', 251269, 31.3, 15.8, 28.7, 2.1, 70.8, 76.4, 70.4],
  ['019', "Aura", 'varsinais-suomi', 3966, 30.7, 23.2, 2.8, 0.5, 74.4, 84.0, 74.6],
  ['202', "Kaarina", 'varsinais-suomi', 36551, 34.3, 21.8, 6.7, 5.1, 77.2, 87.1, 83.5],
  ['322', "Kimitoön", 'varsinais-suomi', 6371, 29.8, 37.1, 4.4, 66, 74.4, 76.0, 72.6],
  ['284', "Koski Tl", 'varsinais-suomi', 2186, 29.2, 34.1, 4.6, 0.4, 68.6, 81.2, 78.3],
  ['304', "Kustavi", 'varsinais-suomi', 970, 32.5, 43.1, 5.2, 1.9, 75.9, 83.5, 86.4],
  ['400', "Laitila", 'varsinais-suomi', 8479, 29.0, 26.1, 13.1, 0.3, 77.1, 85.8, 75.8],
  ['423', "Lieto", 'varsinais-suomi', 20666, 34.2, 21.1, 4.7, 1.5, 78.8, 89.2, 84.6],
  ['430', "Loimaa", 'varsinais-suomi', 15295, 28.0, 33.1, 6.1, 0.2, 72.2, 80.4, 81.1],
  ['480', "Marttila", 'varsinais-suomi', 1910, 30.0, 29, 3.1, 1, 71.8, 77.2, 82.8],
  ['481', "Masku", 'varsinais-suomi', 9592, 34.6, 20, 3, 1.3, 76.6, 83.4, 79.1],
  ['503', "Mynämäki", 'varsinais-suomi', 7477, 31.0, 29.2, 4.1, 0.9, 77.6, 77.4, 74.8],
  ['529', "Naantali", 'varsinais-suomi', 20129, 34.4, 28.5, 4.2, 1.3, 75.9, 81.4, 77.9],
  ['538', "Nousiainen", 'varsinais-suomi', 4659, 32.9, 21.8, 3.6, 0.8, 77.1, 82.3, 80.4],
  ['561', "Oripää", 'varsinais-suomi', 1304, 30.1, 28.2, 9.5, 0.5, 64.2, 86.5, 78.6],
  ['577', "Paimio", 'varsinais-suomi', 11221, 32.3, 23.4, 5.1, 0.9, 76.4, 84.4, 74.9],
  ['445', "Pargas", 'varsinais-suomi', 14868, 32.5, 30, 4.7, 53.9, 73.8, 77.7, 74.5],
  ['631', "Pyhäranta", 'varsinais-suomi', 1919, 30.6, 31.4, 3.3, 0.5, 75.7, 91.5, 78.4],
  ['636', "Pöytyä", 'varsinais-suomi', 8011, 29.2, 27.2, 5.4, 0.5, 72.4, 78.2, 75.6],
  ['680', "Raisio", 'varsinais-suomi', 25738, 31.3, 23.9, 13.6, 1.4, 74.9, 80.9, 79.0],
  ['704', "Rusko", 'varsinais-suomi', 6418, 34.2, 21.3, 3.2, 1.6, 81.9, 85.4, 81.5],
  ['734', "Salo", 'varsinais-suomi', 50870, 29.2, 29.7, 9.2, 1.2, 71.9, 82.8, 77.8],
  ['738', "Sauvo", 'varsinais-suomi', 2965, 30.7, 28, 6.7, 2.3, 75.4, 83.8, 77.7],
  ['761', "Somero", 'varsinais-suomi', 8429, 29.2, 35, 6.7, 0.6, 74.1, 85.9, 76.9],
  ['833', "Taivassalo", 'varsinais-suomi', 1692, 30.6, 37, 7.8, 0.9, 76.0, 78.0, 78.1],
  ['853', "Turku", 'varsinais-suomi', 206073, 28.1, 20.3, 16.7, 5.4, 70.9, 82.5, 75.6],
  ['895', "Uusikaupunki", 'varsinais-suomi', 14814, 29.3, 31.7, 8.8, 0.4, 74.0, 81.8, 76.3],
  ['918', "Vehmaa", 'varsinais-suomi', 2246, 28.4, 30.6, 6.5, 0.6, 70.0, 80.4, 77.0],
]

export const TOWNS: Town[] = RAW.map(([code, name, county, population, income, share65, foreign, swedish, bowel, breast, cervical]) => ({
  id: `KU${code}`, name, county, population, income, share65, foreign, swedish, turnout: { bowel, breast, cervical },
}))

// ---------- linear model: turnout ~ income + share65 + foreign + swedish ----------
export const FEATURES = [
  { key: 'income', label: 'income k€' },
  { key: 'share65', label: '65+ %' },
  { key: 'foreign', label: 'foreign-lang %' },
  { key: 'swedish', label: 'Swedish %' },
] as const

function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}

export interface Fit {
  coef: number[] // intercept, then FEATURES order
  r2: number
  sd: number
  predicted: Map<string, number>
  formula: string
}

export function fitModel(p: Programme): Fit {
  const X = TOWNS.map((t) => [1, ...FEATURES.map((f) => t[f.key])])
  const y = TOWNS.map((t) => t.turnout[p])
  const k = X[0].length
  const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0)))
  const Xty = Array.from({ length: k }, (_, i) => X.reduce((s, row, r) => s + row[i] * y[r], 0))
  const coef = solve(XtX, Xty)
  const pred = X.map((row) => row.reduce((s, x, i) => s + x * coef[i], 0))
  const mean = y.reduce((a, b) => a + b, 0) / y.length
  const ssr = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0)
  const sst = y.reduce((s, v) => s + (v - mean) ** 2, 0)
  const sd = Math.sqrt(ssr / (y.length - k))
  const terms = FEATURES.map((f, i) => `${coef[i + 1] >= 0 ? '+' : '−'} ${Math.abs(coef[i + 1]).toFixed(2)}×${f.label}`)
  return {
    coef,
    r2: 1 - ssr / sst,
    sd,
    predicted: new Map(TOWNS.map((t, i) => [t.id, pred[i]])),
    formula: `turnout = ${coef[0].toFixed(1)} ${terms.join(' ')}`,
  }
}

export type Verdict = 'help' | 'copy' | 'ok'
export const verdict = (actual: number, predicted: number, sd: number): Verdict =>
  actual - predicted < -1.5 * sd ? 'help' : actual - predicted > 1.5 * sd ? 'copy' : 'ok'
