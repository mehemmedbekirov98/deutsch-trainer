export default {
  id: 10,
  cefr: "A1",
  slug: "wetter",
  title: "Wetter & Jahreszeiten",
  titleRu: "Погода и времена года",
  emoji: "🌤️",
  color: "#22b8cf",
  intro:
    "В этом уровне ты научишься говорить о погоде, временах года, месяцах и датах. А ещё ты впервые расскажешь о прошлом: что ты делал вчера и на выходных (Perfekt с haben).",
  goals: [
    "Описать погоду: Es regnet, es ist kalt, es sind 20 Grad",
    "Назвать времена года, месяцы и дату (Heute ist der 3. Mai)",
    "Рассказать, что ты делал вчера и на выходных (Perfekt)",
    "Понимать короткий прогноз погоды на слух"
  ],

  vocab: [
    { de: "das Wetter", ru: "погода", example: "Wie ist das Wetter heute?", exampleRu: "Какая сегодня погода?" },
    { de: "die Sonne", ru: "солнце", example: "Die Sonne scheint heute.", exampleRu: "Сегодня светит солнце." },
    { de: "scheinen", ru: "светить (о солнце)", example: "Im Sommer scheint die Sonne oft.", exampleRu: "Летом солнце светит часто." },
    { de: "der Regen", ru: "дождь", example: "Heute gibt es viel Regen.", exampleRu: "Сегодня сильный дождь." },
    { de: "der Schnee", ru: "снег", example: "Im Januar gibt es viel Schnee.", exampleRu: "В январе много снега." },
    { de: "der Wind", ru: "ветер", plural: "die Winde", example: "Der Wind ist heute stark.", exampleRu: "Сегодня сильный ветер." },
    { de: "windig", ru: "ветрено, ветреный", example: "Im Herbst ist es oft windig.", exampleRu: "Осенью часто ветрено." },
    { de: "die Wolke", ru: "облако, туча", plural: "die Wolken", example: "Heute gibt es viele Wolken.", exampleRu: "Сегодня много облаков." },
    { de: "warm", ru: "тёплый, тепло", example: "Im Mai ist es schon warm.", exampleRu: "В мае уже тепло." },
    { de: "kalt", ru: "холодный, холодно", example: "Im Winter ist es sehr kalt.", exampleRu: "Зимой очень холодно." },
    { de: "heiß", ru: "жаркий, жарко", example: "Im Juli ist es oft heiß.", exampleRu: "В июле часто жарко." },
    { de: "kühl", ru: "прохладный, прохладно", example: "Am Abend ist es kühl.", exampleRu: "Вечером прохладно." },
    { de: "sonnig", ru: "солнечно, солнечный", example: "Heute ist es sonnig.", exampleRu: "Сегодня солнечно." },
    { de: "regnen", ru: "идти (о дожде)", example: "Heute regnet es sehr viel.", exampleRu: "Сегодня очень сильный дождь." },
    { de: "schneien", ru: "идти (о снеге)", example: "Im Dezember schneit es oft.", exampleRu: "В декабре часто идёт снег." },
    { de: "der Grad", ru: "градус", example: "Heute sind es zwanzig Grad.", exampleRu: "Сегодня двадцать градусов." },
    { de: "der Frühling", ru: "весна", example: "Im Frühling ist es warm und sonnig.", exampleRu: "Весной тепло и солнечно." },
    { de: "der Sommer", ru: "лето", example: "Im Sommer schwimme ich gern.", exampleRu: "Летом я люблю плавать." },
    { de: "der Herbst", ru: "осень", example: "Im Herbst regnet es viel.", exampleRu: "Осенью много дождей." },
    { de: "der Winter", ru: "зима", example: "Der Winter in Russland ist lang.", exampleRu: "Зима в России длинная." },
    { de: "die Jahreszeit", ru: "время года", plural: "die Jahreszeiten", example: "Es gibt vier Jahreszeiten.", exampleRu: "Есть четыре времени года." },
    { de: "der Monat", ru: "месяц", plural: "die Monate", example: "Ein Jahr hat zwölf Monate.", exampleRu: "В году двенадцать месяцев." },
    { de: "der Januar", ru: "январь", example: "Der Januar ist der erste Monat.", exampleRu: "Январь — первый месяц." },
    { de: "der Mai", ru: "май", example: "Emil hat im Mai Geburtstag.", exampleRu: "У Эмиль день рождения в мае." },
    { de: "der Juli", ru: "июль", example: "Im Juli sind es dreißig Grad.", exampleRu: "В июле тридцать градусов." },
    { de: "der Dezember", ru: "декабрь", example: "Der Dezember ist der letzte Monat.", exampleRu: "Декабрь — последний месяц." },
    { de: "das Datum", ru: "дата, число", example: "Welches Datum ist heute?", exampleRu: "Какое сегодня число?" },
    { de: "der Geburtstag", ru: "день рождения", plural: "die Geburtstage", example: "Wann hast du Geburtstag?", exampleRu: "Когда у тебя день рождения?" },
    { de: "der Regenschirm", ru: "зонт", plural: "die Regenschirme", example: "Ich nehme einen Regenschirm.", exampleRu: "Я беру зонт." },
    { de: "gestern", ru: "вчера", example: "Gestern habe ich gearbeitet.", exampleRu: "Вчера я работал." },
    { de: "heute", ru: "сегодня", example: "Heute ist es kühl.", exampleRu: "Сегодня прохладно." },
    { de: "morgen", ru: "завтра (не путай с der Morgen — утро)", example: "Morgen spiele ich Fußball.", exampleRu: "Завтра я играю в футбол." }
  ],

  grammar: [
    {
      title: "Безличное es: Es regnet, es ist kalt",
      body:
        "О погоде по-немецки говорят с безличным es (оно). В русском мы говорим «холодно», «идёт дождь» — без подлежащего, а в немецком подлежащее es обязательно: Es ist kalt. Es regnet.\nГлагол стоит на втором месте. Если предложение начинается с времени (Heute, Im Winter), es идёт после глагола: Heute regnet es. Im Winter ist es kalt.\nГрадусы: Es sind zwanzig Grad (глагол во множественном числе).",
      table: {
        headers: ["Немецкий", "Русский"],
        rows: [
          ["Es regnet.", "Идёт дождь."],
          ["Es schneit.", "Идёт снег."],
          ["Es ist kalt / warm / heiß / kühl.", "Холодно / тепло / жарко / прохладно."],
          ["Es ist sonnig / windig.", "Солнечно / ветрено."],
          ["Es sind 20 Grad.", "20 градусов."],
          ["Die Sonne scheint.", "Светит солнце."]
        ]
      },
      examples: [
        { de: "Wie ist das Wetter heute? — Es regnet.", ru: "Какая сегодня погода? — Идёт дождь." },
        { de: "Im Winter ist es kalt und es schneit.", ru: "Зимой холодно и идёт снег." },
        { de: "Heute sind es nur zehn Grad.", ru: "Сегодня только десять градусов." }
      ]
    },
    {
      title: "Perfekt с haben: Ich habe gearbeitet",
      body:
        "Чтобы рассказать о прошлом, немцы используют Perfekt: haben (в нужной форме) + Partizip II в конце предложения. Это рамка: Ich habe gestern Fußball gespielt.\nПравильные глаголы образуют Partizip II так: ge- + основа + -t: machen → gemacht, spielen → gespielt. Если основа заканчивается на -t, добавляется -et: arbeiten → gearbeitet.\nНесколько важных глаголов неправильные — их надо запомнить: essen → gegessen, trinken → getrunken, sehen → gesehen.",
      table: {
        headers: ["Инфинитив", "Partizip II", "Пример"],
        rows: [
          ["machen", "gemacht", "Was hast du gemacht?"],
          ["spielen", "gespielt", "Ich habe Fußball gespielt."],
          ["kaufen", "gekauft", "Emil hat Brot gekauft."],
          ["lernen", "gelernt", "Wir haben Deutsch gelernt."],
          ["arbeiten", "gearbeitet", "Er hat viel gearbeitet."],
          ["kochen", "gekocht", "Sie hat Suppe gekocht."],
          ["regnen", "geregnet", "Es hat geregnet."],
          ["essen", "gegessen", "Ich habe Pizza gegessen."],
          ["trinken", "getrunken", "Du hast Tee getrunken."],
          ["sehen", "gesehen", "Wir haben einen Film gesehen."]
        ]
      },
      examples: [
        { de: "Was hast du gestern gemacht?", ru: "Что ты делал вчера?" },
        { de: "Ich habe gestern viel gearbeitet.", ru: "Вчера я много работал." },
        { de: "Am Wochenende hat Emil einen Film gesehen.", ru: "На выходных Эмиль смотрел фильм." },
        { de: "Wir haben Kaffee getrunken.", ru: "Мы пили кофе." }
      ]
    },
    {
      title: "Когда? gestern, letzte Woche, am 3. Mai",
      body:
        "Слова времени для прошлого: gestern (вчера), letzte Woche (на прошлой неделе), am Wochenende (на выходных). Они часто стоят в начале: Gestern habe ich gekocht.\nМесяцы всегда с im: im Januar, im Mai. Вопрос о дате: Der Wievielte ist heute? Ответ: Heute ist der dritte Mai (3. Mai). С предлогом am окончание -en: am dritten Mai, am zwanzigsten Juli.\nПорядковые числа: 1.–19. → -te (der zweite, der vierte; особые: der erste, der dritte, der siebte), с 20. → -ste (der zwanzigste, der dreißigste).",
      table: {
        headers: ["Месяц", "Русский", "Месяц", "Русский"],
        rows: [
          ["der Januar", "январь", "der Juli", "июль"],
          ["der Februar", "февраль", "der August", "август"],
          ["der März", "март", "der September", "сентябрь"],
          ["der April", "апрель", "der Oktober", "октябрь"],
          ["der Mai", "май", "der November", "ноябрь"],
          ["der Juni", "июнь", "der Dezember", "декабрь"]
        ]
      },
      examples: [
        { de: "Der Wievielte ist heute? — Heute ist der dritte Mai.", ru: "Какое сегодня число? — Сегодня третье мая." },
        { de: "Emil hat am fünfzehnten Mai Geburtstag.", ru: "У Эмиль день рождения пятнадцатого мая." },
        { de: "Letzte Woche habe ich viel gelernt.", ru: "На прошлой неделе я много занимался." }
      ]
    }
  ],

  exercises: [
    {
      type: "choice",
      q: "Как спросить «Какая сегодня погода?»",
      options: ["Wie ist das Wetter heute?", "Wo ist das Wetter heute?", "Was ist das Wetter heute?"],
      answer: 0,
      explain: "Wie ist das Wetter? — Какая погода? (дословно: как погода)."
    },
    {
      type: "match",
      pairs: [
        { de: "die Sonne", ru: "солнце" },
        { de: "der Regen", ru: "дождь" },
        { de: "der Schnee", ru: "снег" },
        { de: "der Wind", ru: "ветер" },
        { de: "die Wolke", ru: "облако" }
      ]
    },
    {
      type: "choice",
      q: "«Es regnet.» Что это значит?",
      options: ["Идёт снег.", "Идёт дождь.", "Светит солнце."],
      answer: 1,
      explain: "regnen — идти (о дожде): Es regnet."
    },
    {
      type: "fill",
      sentence: "Im Winter ist es ___.",
      answers: ["kalt"],
      options: ["kalt", "heiß", "warm"],
      ru: "Зимой холодно.",
      explain: "kalt — холодно."
    },
    { type: "speak", text: "Heute ist es sehr kalt.", ru: "Сегодня очень холодно." },
    {
      type: "fill",
      sentence: "Die Sonne ___.",
      answers: ["scheint"],
      options: ["scheint", "schneit", "regnet"],
      ru: "Светит солнце.",
      explain: "scheinen — светить: Die Sonne scheint."
    },
    {
      type: "choice",
      q: "Летом часто жарко. → Im Sommer ist es oft ___.",
      options: ["heiß", "Regen", "Schnee"],
      answer: 0,
      explain: "Летом часто жарко — heiß."
    },
    {
      type: "order",
      words: ["windig", "es", "Heute", "sehr", "ist"],
      answer: "Heute ist es sehr windig.",
      alt: ["Es ist heute sehr windig."],
      ru: "Сегодня очень ветрено."
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Сегодня идёт дождь.",
      answers: ["Heute regnet es.", "Es regnet heute."],
      hint: "regnen, безличное es"
    },
    {
      type: "listen",
      text: "Heute ist es windig und kühl. Es sind nur zehn Grad.",
      mode: "choice",
      q: "Сколько сегодня градусов?",
      options: ["10", "12", "20"],
      answer: 0,
      ru: "Сегодня ветрено и прохладно. Только десять градусов."
    },
    {
      type: "fill",
      sentence: "Es regnet. Ich nehme einen ___.",
      answers: ["Regenschirm"],
      options: ["Regenschirm", "Regen", "Schnee"],
      ru: "Идёт дождь. Я беру зонт.",
      explain: "der Regenschirm — зонт (Regen + Schirm)."
    },
    { type: "speak", text: "Hast du einen Regenschirm?", ru: "У тебя есть зонт?" },
    {
      type: "match",
      pairs: [
        { de: "der Frühling", ru: "весна" },
        { de: "der Sommer", ru: "лето" },
        { de: "der Herbst", ru: "осень" },
        { de: "der Winter", ru: "зима" },
        { de: "die Jahreszeit", ru: "время года" }
      ]
    },
    {
      type: "choice",
      q: "Juni, Juli, August — какое это время года?",
      options: ["der Frühling", "der Sommer", "der Herbst", "der Winter"],
      answer: 1,
      explain: "Июнь, июль, август — лето, der Sommer."
    },
    {
      type: "translate",
      dir: "de-ru",
      text: "Im Herbst regnet es oft.",
      answers: ["Осенью часто идёт дождь.", "Осенью часто идут дожди.", "Осенью часто бывает дождь."],
      hint: "der Herbst = осень"
    },
    {
      type: "match",
      pairs: [
        { de: "der Januar", ru: "январь" },
        { de: "der März", ru: "март" },
        { de: "der Mai", ru: "май" },
        { de: "der Juli", ru: "июль" },
        { de: "der Oktober", ru: "октябрь" },
        { de: "der Dezember", ru: "декабрь" }
      ]
    },
    {
      type: "choice",
      q: "Какой месяц идёт после Juli?",
      options: ["Juni", "August", "September"],
      answer: 1,
      explain: "Juli (июль) → August (август)."
    },
    {
      type: "fill",
      sentence: "Ein Jahr hat zwölf ___.",
      answers: ["Monate"],
      options: ["Monate", "Monat", "Jahreszeiten"],
      ru: "В году двенадцать месяцев.",
      explain: "der Monat → die Monate (множественное число)."
    },
    {
      type: "listen",
      text: "Im Dezember schneit es oft.",
      mode: "type",
      answers: ["Im Dezember schneit es oft."],
      ru: "В декабре часто идёт снег."
    },
    {
      type: "translate",
      dir: "de-ru",
      text: "Morgen ist es warm und sonnig.",
      answers: ["Завтра тепло и солнечно.", "Завтра будет тепло и солнечно.", "Завтра будет тёплая и солнечная погода."],
      hint: "morgen = завтра"
    },
    {
      type: "choice",
      q: "Как сказать «Сегодня третье мая»?",
      options: ["Heute ist der dritte Mai.", "Heute ist der drei Mai.", "Heute ist am dritten Mai."],
      answer: 0,
      explain: "Дата: der + порядковое число: der dritte Mai."
    },
    {
      type: "fill",
      sentence: "Emil hat ___ 15. Mai Geburtstag.",
      answers: ["am"],
      options: ["am", "im", "um"],
      ru: "У Эмиль день рождения 15 мая.",
      explain: "Дата с предлогом am: am fünfzehnten Mai."
    },
    {
      type: "choice",
      q: "Как читается «am 20. Juli»?",
      options: ["am zwanzigte Juli", "am zwanzigsten Juli", "am zwanzig Juli"],
      answer: 1,
      explain: "С 20 и дальше: -ste, после am → -sten: am zwanzigsten."
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Какое сегодня число?",
      answers: ["Der Wievielte ist heute?", "Den Wievielten haben wir heute?", "Welches Datum ist heute?", "Welches Datum haben wir heute?"],
      hint: "der Wievielte / das Datum"
    },
    {
      type: "choice",
      q: "Выбери Partizip II от глагола machen.",
      options: ["gemacht", "machte", "gemachen"],
      answer: 0,
      explain: "Правильный глагол: ge- + mach + -t = gemacht."
    },
    {
      type: "fill",
      sentence: "Gestern habe ich Fußball ___.",
      answers: ["gespielt"],
      options: ["gespielt", "spielen", "spielt"],
      ru: "Вчера я играл в футбол.",
      explain: "Perfekt: habe + gespielt в конце предложения."
    },
    {
      type: "order",
      words: ["gekocht", "Ich", "Suppe", "gestern", "habe"],
      answer: "Ich habe gestern Suppe gekocht.",
      alt: ["Gestern habe ich Suppe gekocht."],
      ru: "Вчера я готовил суп."
    },
    {
      type: "fill",
      sentence: "Am Wochenende ___ Emil viel gelernt.",
      answers: ["hat"],
      options: ["hat", "habe", "haben"],
      ru: "На выходных Эмиль много занимался.",
      explain: "Emil = er → hat."
    },
    {
      type: "choice",
      q: "Was hast du gestern gegessen? Какой ответ правильный?",
      options: ["Ich habe Pizza gegessen.", "Ich esse Pizza gegessen.", "Ich habe Pizza essen."],
      answer: 0,
      explain: "haben + Partizip II: habe … gegessen."
    },
    {
      type: "fill",
      sentence: "Wir haben am Wochenende einen Film ___.",
      answers: ["gesehen"],
      options: ["gesehen", "sehen", "gesieht"],
      ru: "На выходных мы смотрели фильм.",
      explain: "sehen → gesehen (неправильный глагол)."
    },
    {
      type: "order",
      words: ["hat", "Was", "gekauft", "Emil", "gestern"],
      answer: "Was hat Emil gestern gekauft?",
      ru: "Что Эмиль вчера купил?"
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Вчера я много работал.",
      answers: ["Ich habe gestern viel gearbeitet.", "Gestern habe ich viel gearbeitet."],
      hint: "Perfekt: habe … gearbeitet"
    },
    {
      type: "order",
      words: ["Tee", "Emil", "getrunken", "hat", "gestern", "Abend"],
      answer: "Emil hat gestern Abend Tee getrunken.",
      alt: ["Gestern Abend hat Emil Tee getrunken."],
      ru: "Эмиль вчера вечером пил чай."
    },
    {
      type: "listen",
      text: "Letzte Woche habe ich viel gearbeitet. Am Wochenende habe ich einen Film gesehen und Pizza gegessen.",
      mode: "choice",
      q: "Что говорящий делал на выходных?",
      options: ["Много работал", "Смотрел фильм и ел пиццу", "Учил немецкий"],
      answer: 1,
      ru: "На прошлой неделе я много работал. На выходных я смотрел фильм и ел пиццу."
    },
    {
      type: "translate",
      dir: "de-ru",
      text: "Was hast du am Wochenende gemacht?",
      answers: ["Что ты делал на выходных?", "Что ты делал в выходные?", "Чем ты занимался на выходных?", "Что ты делала на выходных?"],
      hint: "machen → gemacht"
    },
    { type: "speak", text: "Gestern habe ich Deutsch gelernt.", ru: "Вчера я учил немецкий." }
  ],

  dialogue: {
    title: "Montagmorgen im Büro",
    titleRu: "Утро понедельника в офисе",
    lines: [
      { speaker: "Mia", de: "Hallo Emil! Was hast du am Wochenende gemacht?", ru: "Привет, Эмиль! Что ты делал на выходных?" },
      { speaker: "Emil", de: "Hallo Mia! Ich habe Fußball gespielt und viel gekocht.", ru: "Привет, Мия! Я играл в футбол и много готовил." },
      { speaker: "Mia", de: "Schön! Und wie ist das Wetter heute?", ru: "Здорово! А какая сегодня погода?" },
      { speaker: "Emil", de: "Es regnet und es ist kühl. Nur zwölf Grad.", ru: "Идёт дождь, и прохладно. Только двенадцать градусов." },
      { speaker: "Mia", de: "Oh nein. Hast du einen Regenschirm?", ru: "О нет. У тебя есть зонт?" },
      { speaker: "Emil", de: "Ja, hier. Gestern hat es nicht geregnet.", ru: "Да, вот. Вчера дождя не было." },
      { speaker: "Mia", de: "Der Herbst ist da. Welches Datum ist heute?", ru: "Осень пришла. Какое сегодня число?" },
      { speaker: "Emil", de: "Heute ist der zwanzigste September.", ru: "Сегодня двадцатое сентября." },
      { speaker: "Mia", de: "Ach ja! Im Oktober ist es oft kalt und windig.", ru: "Ах да! В октябре часто холодно и ветрено." },
      { speaker: "Emil", de: "Der Winter gefällt mir nicht. Der Sommer gefällt mir.", ru: "Зима мне не нравится. Мне нравится лето." },
      { speaker: "Mia", de: "Mir auch! Im Juli ist es warm und sonnig. Bis morgen, Emil!", ru: "Мне тоже! В июле тепло и солнечно. До завтра, Эмиль!" },
      { speaker: "Emil", de: "Bis morgen, Mia!", ru: "До завтра, Мия!" }
    ]
  },

  speaking: {
    title: "Погода и выходные",
    scenario:
      "Ты встречаешь Мию в понедельник. Расскажи ей, какая сегодня погода и сколько градусов, какое время года тебе нравится и что ты делал вчера и на выходных. В конце назови сегодняшнюю дату.",
    tutorBrief:
      "Mia meets Emil on Monday morning. Ask about today's weather and the temperature, which season he likes, what he did yesterday and at the weekend (what he ate), and today's date. Target structures: impersonal es (Es regnet, Es ist kalt, Es sind 15 Grad), Perfekt with haben for regular verbs (gemacht, gespielt, gearbeitet, gelernt, gekauft) and gegessen/getrunken/gesehen, time words gestern, letzte Woche, am Wochenende, dates (Heute ist der dritte Mai). Do NOT use war/hatte, Perfekt with sein, modal sollen/dürfen or subordinate clauses. Keep to A1 vocabulary about weather, seasons, months, hobbies and food.",
    phrases: [
      { de: "Heute regnet es.", ru: "Сегодня идёт дождь." },
      { de: "Es ist kalt und windig.", ru: "Холодно и ветрено." },
      { de: "Es sind fünfzehn Grad.", ru: "Пятнадцать градусов." },
      { de: "Der Sommer gefällt mir.", ru: "Мне нравится лето." },
      { de: "Gestern habe ich gearbeitet.", ru: "Вчера я работал." },
      { de: "Am Wochenende habe ich Pizza gegessen.", ru: "На выходных я ел пиццу." },
      { de: "Heute ist der dritte Mai.", ru: "Сегодня третье мая." }
    ],
    script: [
      {
        say: "Hallo Emil! Wie ist das Wetter heute?",
        sayRu: "Привет, Эмиль! Какая сегодня погода?",
        hint: "Es regnet. / Es ist kalt. / Es ist sonnig.",
        expect: ["regnet", "schneit", "kalt", "warm", "heiß", "heiss", "kühl", "kuhl", "sonnig", "windig", "sonne", "wetter"]
      },
      {
        say: "Und wie viel Grad sind es?",
        sayRu: "А сколько градусов?",
        hint: "Es sind … Grad.",
        expect: ["grad", "null", "fünf", "funf", "zehn", "fünfzehn", "zwanzig", "dreißig", "dreissig", "minus"]
      },
      {
        say: "Welche Jahreszeit gefällt dir?",
        sayRu: "Какое время года тебе нравится?",
        hint: "Der Sommer gefällt mir.",
        expect: ["sommer", "winter", "frühling", "fruhling", "herbst", "gefällt", "gefallt"]
      },
      {
        say: "Und was hast du gestern gemacht?",
        sayRu: "А что ты делал вчера?",
        hint: "Ich habe gestern … gearbeitet / gespielt / gelernt.",
        expect: ["habe", "gemacht", "gearbeitet", "gespielt", "gelernt", "gekocht", "gekauft", "gesehen", "getrunken"]
      },
      {
        say: "Interessant! Was hast du am Wochenende gegessen?",
        sayRu: "Интересно! Что ты ел на выходных?",
        hint: "Ich habe … gegessen.",
        expect: ["gegessen", "habe", "pizza", "suppe", "salat", "brot"]
      },
      {
        say: "Und der Wievielte ist heute?",
        sayRu: "А какое сегодня число?",
        hint: "Heute ist der … (dritte Mai).",
        expect: ["erste", "zweite", "dritte", "vierte", "fünfte", "zehnte", "zwanzigste", "januar", "februar", "märz", "marz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"]
      },
      {
        say: "Super, Emil! Das hast du sehr gut gemacht. Bis morgen!",
        sayRu: "Отлично, Эмиль! Ты очень хорошо справился. До завтра!",
        hint: "Bis morgen, Mia!",
        expect: ["bis", "tschüss", "tschuss", "ciao", "morgen"]
      }
    ]
  },

  exam: [
    {
      type: "choice",
      q: "Wie ist das Wetter im Winter? Выбери верный ответ.",
      options: ["Es ist heiß.", "Es schneit und es ist kalt.", "Die Sonne scheint und es sind 30 Grad."],
      answer: 1,
      explain: "Зимой идёт снег и холодно."
    },
    {
      type: "fill",
      sentence: "Heute ___ es. Ich nehme einen Regenschirm.",
      answers: ["regnet"],
      ru: "Сегодня идёт дождь. Я беру зонт.",
      explain: "regnen → es regnet."
    },
    {
      type: "match",
      pairs: [
        { de: "sonnig", ru: "солнечно" },
        { de: "windig", ru: "ветрено" },
        { de: "kühl", ru: "прохладно" },
        { de: "heiß", ru: "жарко" },
        { de: "der Regenschirm", ru: "зонт" }
      ]
    },
    {
      type: "choice",
      q: "Wann ist es in Deutschland oft heiß?",
      options: ["im Januar", "im Juli", "im Dezember"],
      answer: 1,
      explain: "В июле (im Juli) в Германии часто жарко."
    },
    {
      type: "order",
      words: ["ist", "Heute", "Oktober", "der", "erste"],
      answer: "Heute ist der erste Oktober.",
      ru: "Сегодня первое октября."
    },
    {
      type: "fill",
      sentence: "Emil hat am ___ Mai Geburtstag.",
      answers: ["dritten"],
      options: ["dritten", "dritte", "drei"],
      ru: "У Эмиль день рождения третьего мая.",
      explain: "После am окончание -en: am dritten Mai."
    },
    {
      type: "choice",
      q: "Выбери правильное предложение в Perfekt.",
      options: ["Emil hat gestern Deutsch gelernt.", "Emil hat gestern Deutsch lernen.", "Emil gelernt gestern Deutsch hat."],
      answer: 0,
      explain: "haben на втором месте, Partizip II (gelernt) в конце."
    },
    {
      type: "fill",
      sentence: "Wir haben am Wochenende Pizza ___.",
      answers: ["gegessen"],
      ru: "На выходных мы ели пиццу.",
      explain: "essen → gegessen."
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Что ты вчера купил?",
      answers: ["Was hast du gestern gekauft?", "Was hast du gestern eingekauft?"],
      hint: "kaufen → gekauft"
    },
    {
      type: "listen",
      text: "Letzte Woche hat es jeden Tag geregnet. Aber heute ist es sonnig und warm. Es sind zwanzig Grad.",
      mode: "choice",
      q: "Какая погода сегодня?",
      options: ["Идёт дождь", "Солнечно и тепло", "Идёт снег"],
      answer: 1,
      ru: "На прошлой неделе каждый день шёл дождь. Но сегодня солнечно и тепло. Двадцать градусов."
    }
  ]
};
