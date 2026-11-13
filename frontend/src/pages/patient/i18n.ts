// Patient-page dictionary. Order in every tuple: en, fi, sv, ru, so.
import { useStore, type Lang } from '../../lib/store'

type T5 = readonly [string, string, string, string, string]

const D = {
  // tabs + headings ("a|b" = display line + italic line)
  'tab.today': ['Today', 'Tänään', 'Idag', 'Сегодня', 'Maanta'],
  'tab.diary': ['Diary', 'Päiväkirja', 'Dagbok', 'Дневник', 'Xusuusqor'],
  'tab.risk': ['Lung risk', 'Keuhkoriski', 'Lungrisk', 'Риск лёгких', 'Khatarta sambabka'],
  'tab.pathway': ['Pathway', 'Hoitopolku', 'Vårdkedja', 'Маршрут', 'Socodka'],
  'tab.screening': ['Screening', 'Seulonnat', 'Screening', 'Скрининг', 'Baaritaan'],
  'tab.settings': ['Privacy', 'Yksityisyys', 'Integritet', 'Приватность', 'Asturnaan'],
  'h.today': ['Your|today', 'Sinun|päiväsi', 'Din|dag', 'Ваш|день', 'Maanta|adiga'],
  'h.diary': ['Symptom|diary', 'Oire|päiväkirja', 'Symtom|dagbok', 'Дневник|симптомов', 'Xusuusqorka|calaamadaha'],
  'h.risk': ['Lung|risk', 'Keuhko|riski', 'Lung|risk', 'Риск|для лёгких', 'Khatarta|sambabka'],
  'h.pathway': ['Your|pathway', 'Sinun|hoitopolkusi', 'Din|vårdkedja', 'Ваш|маршрут', 'Socodkaaga|daryeelka'],
  'h.screening': ['Screening|invites', 'Seulonta|kutsut', 'Screening|kallelser', 'Приглашения|на скрининг', 'Martiqaadka|baaritaanka'],
  'h.settings': ['Your|data', 'Sinun|tietosi', 'Dina|uppgifter', 'Ваши|данные', 'Xogtaada|adiga'],
  'h.summary': ['Symptom|summary', 'Oire|yhteenveto', 'Symtom|sammanfattning', 'Сводка|симптомов', 'Soo koobidda|calaamadaha'],

  // symptoms
  'sym.cough': ['Cough', 'Yskä', 'Hosta', 'Кашель', 'Qufac'],
  'sym.weight-loss': ['Weight loss', 'Laihtuminen', 'Viktnedgång', 'Потеря веса', 'Miisaan dhimis'],
  'sym.blood-cough': ['Blood when coughing', 'Veriyskä', 'Blod i hostan', 'Кровь при кашле', 'Dhiig qufaca'],
  'sym.blood-stool': ['Blood in stool', 'Verta ulosteessa', 'Blod i avföringen', 'Кровь в стуле', 'Dhiig saxarada'],
  'sym.blood': ['Blood', 'Verta', 'Blod', 'Кровь', 'Dhiig'],
  'sym.breathless': ['Breathlessness', 'Hengenahdistus', 'Andfåddhet', 'Одышка', 'Neef ku dheg'],
  'sym.chest-pain': ['Chest pain', 'Rintakipu', 'Bröstsmärta', 'Боль в груди', 'Xanuun laabta'],
  'sym.fatigue': ['Fatigue', 'Väsymys', 'Trötthet', 'Усталость', 'Daal'],
  'sym.bowel-change': ['Bowel change', 'Suolen muutos', 'Ändrad avföring', 'Изменение стула', 'Isbeddel saxarada'],
  'sym.jaundice': ['Yellow skin/eyes', 'Keltaisuus', 'Gulsot', 'Желтуха', 'Cagaarshow'],
  'sym.abdominal-pain': ['Abdominal pain', 'Vatsakipu', 'Buksmärta', 'Боль в животе', 'Calool xanuun'],
  'sym.hoarse': ['Hoarse voice', 'Käheys', 'Heshet', 'Осиплость', 'Cod xabeeb'],
  'sym.smoking': ['Smoking', 'Tupakointi', 'Rökning', 'Курение', 'Sigaar'],

  // bot
  'bot.hello': ["What's bothering you? Tell me in your own words.", 'Mikä vaivaa? Kerro omin sanoin.', 'Vad besvärar dig? Berätta med egna ord.', 'Что вас беспокоит? Расскажите своими словами.', 'Maxaa ku dhibaya? Erayadaada ku sheeg.'],
  'bot.noted': ['Noted: {syms}.', 'Kirjattu: {syms}.', 'Antecknat: {syms}.', 'Записано: {syms}.', 'Waa la qoray: {syms}.'],
  'bot.since': ['Since when?', 'Mistä lähtien?', 'Sedan när?', 'С какого времени?', 'Goorma ayuu bilaabmay?'],
  'bot.unclear': ["I didn't catch a symptom. Try: cough, tiredness, pain, weight loss…", 'En tunnistanut oiretta. Kokeile: yskä, väsymys, kipu, laihtuminen…', 'Jag hittade inget symtom. Prova: hosta, trötthet, smärta, viktnedgång…', 'Не распознал симптом. Например: кашель, усталость, боль, похудение…', 'Calaamad ma garan. Isku day: qufac, daal, xanuun, miisaan dhimis…'],
  'bot.saved': ['Saved · {date}.', 'Tallennettu · {date}.', 'Sparat · {date}.', 'Сохранено · {date}.', 'Waa la keydiyay · {date}.'],
  'bot.anything': ['Anything else?', 'Muuta?', 'Något mer?', 'Что-нибудь ещё?', 'Wax kale?'],
  'bot.q.blood-cough': ['Any blood when you cough?', 'Onko yskässä verta?', 'Har du blod när du hostar?', 'Есть ли кровь при кашле?', 'Dhiig ma ku jiraa qufaca?'],
  'bot.q.breathless': ['Do you get out of breath more easily?', 'Hengästytkö aiempaa helpommin?', 'Blir du andfådd lättare än förut?', 'Одышка появляется быстрее, чем раньше?', 'Neeftu ma kaa dhakhsaa?'],
  'bot.q.bowel-change': ['Any change in bowel habits?', 'Onko suolen toiminnassa muutosta?', 'Har dina avföringsvanor ändrats?', 'Изменился ли стул?', 'Isbeddel ma ku yimid saxarada?'],
  'bot.q.bloodWhere': ['Where did you notice blood?', 'Missä huomasit verta?', 'Var såg du blod?', 'Где вы заметили кровь?', 'Xaggee ku aragtay dhiigga?'],
  'bot.q.kg': ['About how many kilos?', 'Noin montako kiloa?', 'Ungefär hur många kilo?', 'Примерно сколько кг?', 'Qiyaas ahaan imisa kiilo?'],
  'bot.q.smoke': ['Do you smoke, or have you smoked?', 'Tupakoitko tai oletko tupakoinut?', 'Röker du eller har du rökt?', 'Вы курите или курили?', 'Sigaar ma cabtaa ama ma cabi jirtay?'],
  'bot.q.smokeHow': ["How much, how long? e.g. '20 a day for 30 years'", "Kuinka paljon, kuinka kauan? esim. '20 päivässä 30 vuotta'", "Hur mycket, hur länge? t.ex. '20 om dagen i 30 år'", "Сколько и как долго? напр. '20 в день 30 лет'", "Intee, muddo intee? tusaale '20 maalintii 30 sano'"],
  'bot.smokeSaved': ['Smoking: {cpd}/day · {yrs} years · {py} pack-years.', 'Tupakointi: {cpd}/pv · {yrs} v · {py} askivuotta.', 'Rökning: {cpd}/dag · {yrs} år · {py} paketår.', 'Курение: {cpd}/день · {yrs} лет · {py} пачка-лет.', 'Sigaar: {cpd}/maalin · {yrs} sano · {py} baako-sano.'],
  'bot.checkin': ['Hi, {ago} you mentioned {sym}. Is it still there? Has anything changed?', 'Hei, {ago} mainitsit: {sym}. Onko se vielä? Onko jokin muuttunut?', 'Hej, {ago} nämnde du {sym}. Finns det kvar? Har något ändrats?', 'Здравствуйте, {ago} вы упоминали: {sym}. Ещё беспокоит? Что-то изменилось?', 'Salaan, {ago} waxaad sheegtay {sym}. Weli ma jiraa? Wax isbeddelay?'],
  'bot.checkinGeneric': ['Hi, just checking in. How are you feeling?', 'Hei, mitä kuuluu? Miten voit?', 'Hej, hur mår du idag?', 'Здравствуйте, как вы себя чувствуете?', 'Salaan, sidee tahay maanta?'],
  'bot.thanks': ['Thank you. Saved to your diary.', 'Kiitos. Tallennettu päiväkirjaan.', 'Tack. Sparat i din dagbok.', 'Спасибо. Сохранено в дневнике.', 'Mahadsanid. Waa la keydiyay.'],
  'ago.days': ['{n} days ago', '{n} päivää sitten', 'för {n} dagar sedan', '{n} дн. назад', '{n} maalmood ka hor'],
  'ago.today': ['today', 'tänään', 'idag', 'сегодня', 'maanta'],

  // chips
  'c.today': ['Today', 'Tänään', 'Idag', 'Сегодня', 'Maanta'],
  'c.1w': ['1 week ago', 'Viikko sitten', 'En vecka sedan', 'Неделю назад', 'Toddobaad ka hor'],
  'c.2w': ['2 weeks ago', '2 viikkoa sitten', '2 veckor sedan', '2 недели назад', '2 toddobaad ka hor'],
  'c.1m': ['1 month ago', 'Kuukausi sitten', 'En månad sedan', 'Месяц назад', 'Bil ka hor'],
  'c.3m': ['3 months ago', '3 kk sitten', '3 mån sedan', '3 мес. назад', '3 bilood ka hor'],
  'c.yes': ['Yes', 'Kyllä', 'Ja', 'Да', 'Haa'],
  'c.no': ['No', 'Ei', 'Nej', 'Нет', 'Maya'],
  'c.cough': ['When coughing', 'Yskiessä', 'När jag hostar', 'При кашле', 'Marka aan qufaco'],
  'c.stool': ['In stool', 'Ulosteessa', 'I avföringen', 'В стуле', 'Saxarada'],
  'c.elsewhere': ['Elsewhere', 'Muualla', 'Annat', 'Другое', 'Meel kale'],
  'c.never': ['Never', 'En koskaan', 'Aldrig', 'Никогда', 'Weligay'],
  'c.current': ['I smoke', 'Tupakoin', 'Jag röker', 'Курю', 'Waan cabaa'],
  'c.former': ['I used to', 'Lopetin', 'Har slutat', 'Бросил(а)', 'Waan joojiyay'],
  'c.still': ['Still there', 'Yhä', 'Kvar', 'Ещё есть', 'Weli wuu jiraa'],
  'c.better': ['Better', 'Parempi', 'Bättre', 'Лучше', 'Wuu fiicnaaday'],
  'c.worse': ['Worse', 'Pahempi', 'Värre', 'Хуже', 'Wuu sii xumaaday'],
  'c.gone': ['Gone', 'Ohi', 'Borta', 'Прошло', 'Wuu tegay'],
  'c.skip': ['Skip', 'Ohita', 'Hoppa över', 'Пропустить', 'Ka bood'],

  // diary
  'd.placeholder': ['Type how you feel…', 'Kirjoita miltä tuntuu…', 'Skriv hur du mår…', 'Опишите самочувствие…', 'Qor sida aad dareemayso…'],
  'd.send': ['Send', 'Lähetä', 'Skicka', 'Отправить', 'Dir'],
  'd.chat': ['Chat', 'Keskustelu', 'Chatt', 'Чат', 'Wada-hadal'],
  'd.timeline': ['Timeline', 'Aikajana', 'Tidslinje', 'Хронология', 'Jadwal'],
  'd.summary': ['Summary', 'Yhteenveto', 'Sammanfattning', 'Сводка', 'Soo koobid'],
  'd.flag': ['See a doctor within 2 weeks', 'Lääkäriin 2 viikon sisällä', 'Till läkare inom 2 veckor', 'К врачу в течение 2 недель', 'Dhakhtar 2 toddobaad gudahood'],
  'd.noflag': ['Keep logging', 'Jatka kirjaamista', 'Fortsätt anteckna', 'Продолжайте записи', 'Sii wad qoritaanka'],
  'd.notDiagnosis': ['Not a diagnosis', 'Ei diagnoosi', 'Ingen diagnos', 'Не диагноз', 'Ma aha ogaansho'],
  'd.print': ['Print', 'Tulosta', 'Skriv ut', 'Печать', 'Daabac'],
  'd.share': ['Share with health centre', 'Jaa terveysasemalle', 'Dela med vårdcentralen', 'Отправить в поликлинику', 'La wadaag xarunta caafimaadka'],
  'd.shared': ['Shared with health centre', 'Jaettu terveysasemalle', 'Delat med vårdcentralen', 'Отправлено в поликлинику', 'Waa la wadaagay'],
  'd.empty': ['Nothing logged yet', 'Ei vielä merkintöjä', 'Inget antecknat än', 'Записей пока нет', 'Weli waxba lama qorin'],
  'd.entries': ['Entries', 'Merkinnät', 'Anteckningar', 'Записи', 'Qoraallo'],
  'd.symptoms': ['Symptoms', 'Oireet', 'Symtom', 'Симптомы', 'Calaamadaha'],
  'd.since': ['Since', 'Alkaen', 'Sedan', 'С', 'Laga bilaabo'],
  'd.prepared': ['Prepared', 'Laadittu', 'Upprättad', 'Составлено', 'La diyaariyay'],
  'd.delete': ['Delete', 'Poista', 'Ta bort', 'Удалить', 'Tirtir'],
  'd.checkin': ['Check-in', 'Kuulumiset', 'Uppföljning', 'Опрос', 'La-socod'],
  'd.pickDate': ['Pick a date', 'Valitse päivä', 'Välj datum', 'Выбрать дату', 'Dooro taariikh'],
  'd.notes': ['In your words', 'Omin sanoin', 'Med egna ord', 'Вашими словами', 'Erayadaada'],

  // risk
  'r.age': ['Age', 'Ikä', 'Ålder', 'Возраст', "Da'da"],
  'r.height': ['Height cm', 'Pituus cm', 'Längd cm', 'Рост, см', 'Dherer cm'],
  'r.weight': ['Weight kg', 'Paino kg', 'Vikt kg', 'Вес, кг', 'Miisaan kg'],
  'r.edu': ['Education', 'Koulutus', 'Utbildning', 'Образование', 'Waxbarasho'],
  'r.edu1': ['No high school', 'Perusaste', 'Grundskola', 'Неполное среднее', 'Dugsi hoose'],
  'r.edu2': ['High school', 'Lukio', 'Gymnasium', 'Среднее', 'Dugsi sare'],
  'r.edu3': ['Vocational', 'Ammattikoulu', 'Yrkesutbildning', 'Профессиональное', 'Xirfad'],
  'r.edu4': ['Some college', 'Opistotaso', 'Viss högskola', 'Неоконч. высшее', 'Jaamacad qayb'],
  'r.edu5': ['Degree', 'Korkeakoulu', 'Examen', 'Высшее', 'Shahaado'],
  'r.edu6': ['Postgraduate', 'Jatkotutkinto', 'Forskarnivå', 'Учёная степень', 'Masters+'],
  'r.smoke': ['Smoking', 'Tupakointi', 'Rökning', 'Курение', 'Sigaar'],
  'r.cpd': ['Cigarettes / day', 'Savukkeita / pv', 'Cigaretter / dag', 'Сигарет в день', 'Sigaar / maalin'],
  'r.years': ['Years smoked', 'Tupakointivuodet', 'År som rökare', 'Лет курения', 'Sanado cabid'],
  'r.quit': ['Years since quitting', 'Vuotta lopettamisesta', 'År sedan du slutade', 'Лет без курения', 'Sanado laga joojiyay'],
  'r.copd': ['COPD', 'Keuhkoahtaumatauti', 'KOL', 'ХОБЛ', 'COPD'],
  'r.pcancer': ['Had cancer before', 'Aiempi syöpä', 'Tidigare cancer', 'Рак в прошлом', 'Kansar hore'],
  'r.family': ['Lung cancer in family', 'Keuhkosyöpä suvussa', 'Lungcancer i släkten', 'Рак лёгких у родных', 'Kansar sambab qoyska'],
  'r.eth': ['Ethnicity (model term)', 'Etninen tausta (mallissa)', 'Etnicitet (i modellen)', 'Этничность (в модели)', 'Asal (moodeelka)'],
  'eth.white': ['White', 'Valkoinen', 'Vit', 'Белый', 'Cadaan'],
  'eth.black': ['Black', 'Musta', 'Svart', 'Чёрный', 'Madow'],
  'eth.hispanic': ['Hispanic', 'Latinalaisamer.', 'Latinamerikansk', 'Латиноамер.', 'Laatiin'],
  'eth.asian': ['Asian', 'Aasialainen', 'Asiatisk', 'Азиатский', 'Aasiyaan'],
  'eth.other': ['Other', 'Muu', 'Annan', 'Другое', 'Kale'],
  'r.sixYear': ['6-year risk', '6 vuoden riski', '6-årsrisk', 'Риск за 6 лет', 'Khatarta 6 sano'],
  'r.threshold': ['Threshold', 'Raja', 'Gräns', 'Порог', 'Xadka'],
  'r.high': ['Worth discussing lung screening with a doctor', 'Keuhkoseulonnasta kannattaa puhua lääkärin kanssa', 'Värt att prata med läkare om lungscreening', 'Стоит обсудить с врачом скрининг лёгких', 'Mudan inaad dhakhtar kala hadasho baaritaanka sambabka'],
  'r.low': ['Below the screening threshold', 'Alle seulontarajan', 'Under screeninggränsen', 'Ниже порога скрининга', 'Ka hooseeya xadka baaritaanka'],
  'r.stampHigh': ['Discuss screening', 'Puhu seulonnasta', 'Prata om screening', 'Обсудить скрининг', 'Ka hadal baaritaan'],
  'r.stampLow': ['Below threshold', 'Alle rajan', 'Under gränsen', 'Ниже порога', 'Ka hooseeya'],
  'r.never': ['The model is for people who smoke or used to. Symptoms still count: use the diary.', 'Malli koskee tupakoivia ja lopettaneita. Oireet ovat silti tärkeitä: käytä päiväkirjaa.', 'Modellen gäller den som röker eller har rökt. Symtom räknas ändå: använd dagboken.', 'Модель для курящих и бросивших. Симптомы всё равно важны: ведите дневник.', 'Moodeelku waa kuwa sigaar cabba ama cabi jiray. Calaamaduhu weli waa muhiim.'],
  'r.packYears': ['Pack-years', 'Askivuodet', 'Paketår', 'Пачка-лет', 'Baako-sano'],

  // pathway
  'p.cancer': ['Cancer type', 'Syöpätyyppi', 'Cancertyp', 'Тип рака', 'Nooca kansarka'],
  'cancer.lung': ['Lung', 'Keuhko', 'Lunga', 'Лёгкие', 'Sambab'],
  'cancer.bowel': ['Bowel', 'Suolisto', 'Tarm', 'Кишечник', 'Mindhicir'],
  'cancer.pancreas': ['Pancreas', 'Haima', 'Bukspott', 'Поджелудочная', 'Beer-yar'],
  'cancer.liver': ['Liver', 'Maksa', 'Lever', 'Печень', 'Beer'],
  'cancer.other': ['Other', 'Muu', 'Annan', 'Другое', 'Kale'],
  'step.gp': ['First doctor visit', 'Ensimmäinen lääkärikäynti', 'Första läkarbesöket', 'Первый визит к врачу', 'Booqashada koowaad'],
  'step.referral': ['Referral sent', 'Lähete lähetetty', 'Remiss skickad', 'Направление отправлено', 'Gudbin la diray'],
  'step.scan': ['Scan / specialist', 'Kuvaus / erikoislääkäri', 'Röntgen / specialist', 'Обследование', 'Sawir / takhasusle'],
  'step.diagnosis': ['Diagnosis', 'Diagnoosi', 'Diagnos', 'Диагноз', 'Ogaanshaha'],
  'step.mdt': ['Treatment planning', 'Hoidon suunnittelu', 'Behandlingsplanering', 'План лечения', 'Qorshaynta daaweynta'],
  'step.treatment': ['Treatment start', 'Hoito alkaa', 'Behandlingsstart', 'Начало лечения', 'Bilowga daaweynta'],
  'expect.gp': ['Bring your symptom summary.', 'Ota oireyhteenveto mukaan.', 'Ta med symtomsammanfattningen.', 'Возьмите сводку симптомов.', 'Soo qaado soo koobidda.'],
  'expect.referral': ['Health centre sends a referral to the hospital.', 'Terveysasema lähettää lähetteen sairaalaan.', 'Vårdcentralen skickar remiss till sjukhuset.', 'Поликлиника отправит направление в больницу.', 'Xaruntu waxay u dirtaa gudbin isbitaalka.'],
  'expect.scan': ['Hospital calls or sends a letter with a time.', 'Sairaala soittaa tai lähettää kutsukirjeen.', 'Sjukhuset ringer eller skickar kallelse.', 'Больница позвонит или пришлёт письмо.', 'Isbitaalku wuu soo wacayaa ama warqad soo dirayaa.'],
  'expect.diagnosis': ['A doctor goes through the results with you.', 'Lääkäri käy tulokset läpi kanssasi.', 'En läkare går igenom resultaten.', 'Врач обсудит с вами результаты.', 'Dhakhtar ayaa kula eegaya natiijada.'],
  'expect.mdt': ['Specialists agree a plan together.', 'Erikoislääkärit sopivat suunnitelmasta.', 'Specialister gör upp en plan.', 'Специалисты составят план.', 'Takhasusleyaal ayaa go’aaminaya qorshe.'],
  'expect.treatment': ['First surgery, radiotherapy or medicine.', 'Leikkaus, sädehoito tai lääke alkaa.', 'Operation, strålning eller medicin.', 'Операция, облучение или лекарства.', 'Qalliin, shucaac ama daawo.'],
  'p.now': ['Now', 'Nyt', 'Nu', 'Сейчас', 'Hadda'],
  'p.next': ['Next', 'Seuraavaksi', 'Härnäst', 'Далее', 'Xiga'],
  'p.then': ['Then', 'Sitten', 'Sedan', 'Потом', 'Kadib'],
  'p.target': ['Target {n} d', 'Tavoite {n} pv', 'Mål {n} d', 'Цель {n} дн.', 'Hadaf {n} m'],
  'p.since': ['Days since: {step}', 'Päivää: {step}', 'Dagar sedan: {step}', 'Дней после: {step}', 'Maalmood: {step}'],
  'p.overdue': ['Overdue · {n} days', 'Myöhässä · {n} pv', 'Försenad · {n} d', 'Просрочено · {n} дн.', 'Dib u dhac · {n} m'],
  'p.ontime': ['On time', 'Aikataulussa', 'I tid', 'В срок', 'Waqtigii'],
  'p.dueIn': ['Due in {n} d', '{n} pv jäljellä', 'Om {n} d', 'Через {n} дн.', '{n} m ka dib'],
  'p.done': ['Done', 'Valmis', 'Klar', 'Завершено', 'Dhammaaday'],
  'p.start': ['Add your first doctor visit', 'Lisää ensimmäinen lääkärikäynti', 'Lägg till första läkarbesöket', 'Добавьте первый визит к врачу', 'Ku dar booqashada koowaad'],
  'p.contact': ['Contact', 'Ota yhteyttä', 'Kontakta', 'Связаться', 'La xiriir'],
  'p.day': ['Day', 'Päivä', 'Dag', 'День', 'Maalin'],
  'p.of': ['of {n}', '/ {n}', 'av {n}', 'из {n}', 'ka {n}'],
  'p.copy': ['Copy message', 'Kopioi viesti', 'Kopiera', 'Копировать', 'Koobi'],
  'p.copied': ['Copied', 'Kopioitu', 'Kopierat', 'Скопировано', 'Waa la koobiyay'],
  'p.clear': ['Clear date', 'Tyhjennä', 'Rensa', 'Очистить', 'Tirtir'],
  'p.draft': [
    'Hello. {prev} on {date}. I have not yet heard about the next step: {step}. The target time is {target} days and it has now been {waited} days. Could you tell me when it will be? Thank you.',
    'Hei. {prev} {date}. En ole vielä kuullut seuraavasta vaiheesta: {step}. Tavoiteaika on {target} päivää, ja nyt on kulunut {waited} päivää. Voisitteko kertoa, milloin se on? Kiitos.',
    'Hej. {prev} den {date}. Jag har ännu inte hört något om nästa steg: {step}. Målet är {target} dagar och nu har det gått {waited} dagar. Kan ni berätta när det blir? Tack.',
    'Здравствуйте. {prev}: {date}. О следующем этапе ({step}) я пока ничего не знаю. Целевой срок {target} дн., прошло уже {waited} дн. Подскажите, пожалуйста, когда это будет? Спасибо.',
    'Salaan. {prev}: {date}. Weli waxba kama maqal tallaabada xigta: {step}. Waqtiga hadafku waa {target} maalmood, hadda waxaa dhaafay {waited} maalmood. Fadlan ii sheega goorta? Mahadsanid.',
  ],
  'owner.patient': ['You', 'Sinä', 'Du', 'Вы', 'Adiga'],
  'owner.health centre': ['Health centre', 'Terveysasema', 'Vårdcentralen', 'Поликлиника', 'Xarunta caafimaadka'],
  'owner.hospital': ['Hospital', 'Sairaala', 'Sjukhuset', 'Больница', 'Isbitaalka'],

  // barriers
  'b.ask': ["What's getting in the way?", 'Mikä hidastaa?', 'Vad står i vägen?', 'Что мешает?', 'Maxaa ku hor istaagay?'],
  'barrier.no-contact': ['No word from the hospital', 'Sairaalasta ei kuulu', 'Inget besked från sjukhuset', 'Нет вестей из больницы', 'Isbitaalka waxba kama maqal'],
  'barrier.transport': ["Can't get there", 'En pääse paikalle', 'Kan inte ta mig dit', 'Не могу добраться', 'Ma gaari karo'],
  'barrier.cost': ["Can't afford it", 'Ei ole varaa', 'Har inte råd', 'Не по карману', 'Ma awoodi karo'],
  'barrier.unwell': ['Too unwell', 'Liian huonovointinen', 'För sjuk', 'Слишком плохо', 'Aad baan u xanuunsanahay'],
  'barrier.scared': ['Scared', 'Pelottaa', 'Rädd', 'Страшно', 'Waan baqayaa'],
  'barrier.other': ['Something else', 'Jokin muu', 'Något annat', 'Другое', 'Wax kale'],
  'b.system': ['Not your fault · chase it', 'Ei sinun vikasi · kysy perään', 'Inte ditt fel · hör av dig', 'Не ваша вина · напомните', 'Ma aha qaladkaaga · la soco'],
  'b.personal': ['Help is there', 'Apua on saatavilla', 'Det finns hjälp', 'Помощь есть', 'Caawimaad waa jirtaa'],
  'sup.kela': ['Kela travel reimbursement', 'Kelan matkakorvaus', 'FPA:s reseersättning', 'Компенсация поездок Kela', 'Kela: kharashka safarka'],
  'sup.social': ['Hospital social worker', 'Sairaalan sosiaalityöntekijä', 'Sjukhusets kurator', 'Соцработник больницы', 'Shaqaalaha bulshada'],
  'sup.socialSub': ['Ask your nurse', 'Kysy hoitajalta', 'Fråga din sjuksköterska', 'Спросите медсестру', 'Weydii kalkaalisada'],
  'sup.cancer': ['Cancer Society advice line', 'Syöpäjärjestöjen neuvonta', 'Cancerorganisationernas rådgivning', 'Линия Syöpäjärjestöt', 'Khadka Syöpäjärjestöt'],
  'sup.crisis': ['Crisis line (MIELI)', 'Kriisipuhelin (MIELI)', 'Kristelefon (MIELI)', 'Кризисная линия (MIELI)', 'Khadka xiisadda (MIELI)'],
  'sup.ceiling': ['Payment ceiling', 'Asiakasmaksukatto', 'Avgiftstak', 'Потолок платежей', 'Xadka lacagta'],
  'sup.ceilingSub': ['Fees stop after the yearly cap', 'Maksut loppuvat vuosikaton jälkeen', 'Avgifterna slutar vid årstaket', 'После годового лимита бесплатно', 'Lacagtu way joogsataa xadka kadib'],
  'sup.nurse': ['Call the ward nurse', 'Soita osaston hoitajalle', 'Ring avdelningens sjuksköterska', 'Позвоните медсестре отделения', 'Wac kalkaalisada'],
  'sup.nurseSub': ['They can move or adapt the visit', 'Käyntiä voi siirtää tai muokata', 'Besöket kan flyttas eller anpassas', 'Визит можно перенести', 'Booqashada waa la beddeli karaa'],

  // check-ins
  'ci.title': ['Check-ins', 'Kuulumiset', 'Uppföljning', 'Опросы', 'La-socod'],
  'ci.every': ['Every', 'Joka', 'Var', 'Каждые', 'Kasta'],
  'ci.days': ['{n} d', '{n} pv', '{n} d', '{n} дн.', '{n} m'],
  'ci.next': ['Next', 'Seuraava', 'Nästa', 'Следующий', 'Xiga'],
  'ci.simulate': ['Simulate check-in now', 'Simuloi kysely nyt', 'Simulera nu', 'Имитировать сейчас', 'Hadda tijaabi'],
  'ci.rec': ['Recommended', 'Suositus', 'Rekommenderat', 'Рекомендуется', 'La taliyay'],

  // screening
  's.sex': ['Sex', 'Sukupuoli', 'Kön', 'Пол', 'Jinsi'],
  'sex.f': ['Woman', 'Nainen', 'Kvinna', 'Женщина', 'Naag'],
  'sex.m': ['Man', 'Mies', 'Man', 'Мужчина', 'Nin'],
  'sex.x': ['Other', 'Muu', 'Annat', 'Другое', 'Kale'],
  'prog.bowel': ['Bowel', 'Suolisto', 'Tarm', 'Кишечник', 'Mindhicir'],
  'prog.breast': ['Breast', 'Rinta', 'Bröst', 'Грудь', 'Naas'],
  'prog.cervical': ['Cervical', 'Kohdunkaula', 'Livmoderhals', 'Шейка матки', 'Afka ilmo-galeenka'],
  's.invited': ['Invited', 'Kutsutaan', 'Kallas', 'Приглашают', 'Lagu martiqaaday'],
  's.notInvited': ['Not invited', 'Ei kutsuta', 'Kallas inte', 'Не приглашают', 'Lama martiqaado'],
  's.q.bowel': ['Got a test kit? Sent it back?', 'Saitko testin? Palautitko?', 'Fick du testkit? Skickat?', 'Получили набор? Отправили?', 'Ma heshay qalabka? Ma celisay?'],
  's.q.other': ['Did you take part?', 'Osallistuitko?', 'Deltog du?', 'Вы прошли?', 'Ma ka qayb qaadatay?'],
  's.a.sent': ['Sent back', 'Palautettu', 'Skickat', 'Отправил(а)', 'Waan celiyay'],
  's.a.kit': ['Kit at home', 'Pakkaus kotona', 'Kit hemma', 'Набор дома', 'Qalab guriga'],
  's.a.unsure': ['Not sure', 'En tiedä', 'Vet inte', 'Не знаю', 'Ma hubo'],
  's.nudge.kit': ['Send it back this week', 'Palauta tällä viikolla', 'Skicka den denna vecka', 'Отправьте на этой неделе', 'Celi toddobaadkan'],
  's.nudge.no': ['Ask your health centre for a new invite', 'Pyydä terveysasemalta uusi kutsu', 'Be vårdcentralen om ny kallelse', 'Попросите новое приглашение', 'Codso martiqaad cusub'],
  's.nudge.yes': ['Well done', 'Hienoa', 'Bra gjort', 'Отлично', 'Waa fiican tahay'],
  's.ageFirst': ['Enter your age', 'Syötä ikäsi', 'Ange din ålder', 'Укажите возраст', "Geli da'daada"],

  // privacy
  'pr.hospital': ['Health centre & hospital', 'Terveysasema ja sairaala', 'Vårdcentral & sjukhus', 'Поликлиника и больница', 'Xarunta & isbitaalka'],
  'pr.stats': ['Anonymous statistics', 'Nimettömät tilastot', 'Anonym statistik', 'Анонимная статистика', 'Tirakoob qarsoodi'],
  'pr.statsWhat': ['County totals only', 'Vain maakuntasummat', 'Endast länssummor', 'Только итоги по региону', 'Wadarta gobolka oo kaliya'],
  'pr.confirm': ['Share now?', 'Jaetaanko nyt?', 'Dela nu?', 'Поделиться сейчас?', 'Hadda la wadaag?'],
  'pr.yes': ['Yes, share', 'Kyllä, jaa', 'Ja, dela', 'Да', 'Haa, wadaag'],
  'pr.cancel': ['Cancel', 'Peruuta', 'Avbryt', 'Отмена', 'Jooji'],
  'pr.revoke': ['Revoke', 'Peru', 'Återkalla', 'Отозвать', 'Ka noqo'],
  'pr.since': ['Since {t}', 'Alkaen {t}', 'Sedan {t}', 'С {t}', 'Laga bilaabo {t}'],
  'pr.on': ['On', 'Päällä', 'På', 'Вкл', 'Shidan'],
  'pr.off': ['Off', 'Pois', 'Av', 'Выкл', 'Dansan'],
  'pr.gdpr': ['Designed around GDPR principles', 'Suunniteltu GDPR:n periaatteiden mukaan', 'Utformad efter GDPR:s principer', 'С учётом принципов GDPR', 'Loogu talagalay mabaadi’da GDPR'],
  'pr.local': ['Stored on this device', 'Tallennettu tälle laitteelle', 'Sparas på den här enheten', 'Хранится на этом устройстве', 'Qalabkan ayaa lagu keydiyay'],
  'pr.self': ['You enter everything yourself', 'Syötät kaiken itse', 'Du fyller i allt själv', 'Все данные вводите вы', 'Adiga ayaa wax walba gelinaya'],
  'pr.erase': ['Erase my data', 'Poista tietoni', 'Radera mina uppgifter', 'Удалить мои данные', 'Tirtir xogtayda'],
  'pr.eraseConfirm': ['Erase everything on this page?', 'Poistetaanko kaikki?', 'Radera allt?', 'Удалить всё?', 'Wax walba tirtir?'],
  'pr.erased': ['Erased', 'Poistettu', 'Raderat', 'Удалено', 'Waa la tirtiray'],

  // misc
  'm.seed': ['Load example', 'Lataa esimerkki', 'Ladda exempel', 'Пример', 'Tusaale'],
  'm.seeded': ['Example loaded', 'Esimerkki ladattu', 'Exempel laddat', 'Пример загружен', 'Tusaale la geliyay'],
  'm.saved': ['Saved', 'Tallennettu', 'Sparat', 'Сохранено', 'Waa la keydiyay'],
  'm.open': ['Open', 'Avaa', 'Öppna', 'Открыть', 'Fur'],
  'm.notChecked': ['Not checked', 'Ei tarkistettu', 'Ej gjord', 'Не проверено', 'Lama hubin'],
  'm.notStarted': ['Not started', 'Ei aloitettu', 'Ej påbörjad', 'Не начато', 'Lama bilaabin'],
  'm.lang': ['Language', 'Kieli', 'Språk', 'Язык', 'Luqad'],
  'm.patient': ['Patient', 'Potilas', 'Patient', 'Пациент', 'Bukaan'],
} as const satisfies Record<string, T5>

export type Key = keyof typeof D
const IDX: Record<Lang, number> = { en: 0, fi: 1, sv: 2, ru: 3, so: 4 }
export const LANGS: Lang[] = ['fi', 'sv', 'en', 'ru', 'so']
const LOCALE: Record<Lang, string> = { en: 'en-GB', fi: 'fi-FI', sv: 'sv-SE', ru: 'ru-RU', so: 'so-SO' }

export type Vars = Record<string, string | number>
export function tr(lang: Lang, k: Key | string, vars?: Vars): string {
  const row = (D as Record<string, T5>)[k]
  let s = row ? row[IDX[lang]] || row[0] : k
  if (vars) for (const [n, v] of Object.entries(vars)) s = s.split(`{${n}}`).join(String(v))
  return s
}

export function fmtDate(iso: string | undefined, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  try { return d.toLocaleDateString(LOCALE[lang], opts) } catch { return d.toLocaleDateString('en-GB', opts) }
}

/** t('key', vars) bound to the current language. */
export function useT() {
  const lang = useStore((s) => s.lang)
  const t = (k: Key | string, vars?: Vars) => tr(lang, k, vars)
  return { t, lang, d: (iso?: string, o?: Intl.DateTimeFormatOptions) => fmtDate(iso, lang, o) }
}

/** "a|b" → [a, b] for <Display a b /> */
export const split2 = (s: string) => { const [a, b] = s.split('|'); return { a, b } }
