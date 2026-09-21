export default {
  id: 9,
  cefr: "A1",
  slug: "freizeit",
  title: "Freizeit & Hobbys",
  titleRu: "Свободное время и хобби",
  emoji: "⚽",
  color: "#fd7e14",
  intro:
    "В этом уровне ты научишься рассказывать о хобби и спорте, приглашать друзей и отвечать на приглашения. Главная грамматика — модальные глаголы können, müssen, wollen.",
  goals: [
    "Рассказать о своих хобби и о том, как часто ты занимаешься спортом",
    "Использовать können, müssen, wollen в правильной форме и на правильном месте",
    "Спросить «У тебя есть время / желание?» и пригласить друга",
    "Принять приглашение или вежливо отказаться"
  ],

  vocab: [
    { de: "das Hobby", ru: "хобби", plural: "die Hobbys", example: "Mein Hobby ist Fußball.", exampleRu: "Моё хобби — футбол." },
    { de: "die Freizeit", ru: "свободное время", example: "Ich habe am Wochenende viel Freizeit.", exampleRu: "На выходных у меня много свободного времени." },
    { de: "der Sport", ru: "спорт", example: "Emil macht gern Sport.", exampleRu: "Эмиль любит заниматься спортом." },
    { de: "der Fußball", ru: "футбол", example: "Ich spiele jeden Samstag Fußball.", exampleRu: "Я играю в футбол каждую субботу." },
    { de: "spielen", ru: "играть", example: "Spielst du Fußball?", exampleRu: "Ты играешь в футбол?" },
    { de: "schwimmen", ru: "плавать", example: "Ich schwimme jeden Tag.", exampleRu: "Я плаваю каждый день." },
    { de: "laufen", ru: "бегать", example: "Mia läuft oft im Park.", exampleRu: "Мия часто бегает в парке." },
    { de: "Rad fahren", ru: "кататься на велосипеде", example: "Am Sonntag fahren wir Rad.", exampleRu: "В воскресенье мы катаемся на велосипеде." },
    { de: "Musik hören", ru: "слушать музыку", example: "Emil hört oft Musik.", exampleRu: "Эмиль часто слушает музыку." },
    { de: "lesen", ru: "читать", example: "Mia liest gern.", exampleRu: "Мия любит читать." },
    { de: "kochen", ru: "готовить", example: "Emil kocht gern.", exampleRu: "Эмиль любит готовить." },
    { de: "tanzen", ru: "танцевать", example: "Ich kann nicht gut tanzen.", exampleRu: "Я не очень хорошо умею танцевать." },
    { de: "reisen", ru: "путешествовать", example: "Wir reisen gern.", exampleRu: "Мы любим путешествовать." },
    { de: "ins Kino gehen", ru: "ходить в кино", example: "Wollen wir ins Kino gehen?", exampleRu: "Пойдём в кино?" },
    { de: "das Konzert", ru: "концерт", plural: "die Konzerte", example: "Das Konzert beginnt um acht Uhr.", exampleRu: "Концерт начинается в восемь часов." },
    { de: "die Party", ru: "вечеринка", plural: "die Partys", example: "Die Party ist am Samstag.", exampleRu: "Вечеринка в субботу." },
    { de: "die Zeit", ru: "время", example: "Ich habe keine Zeit.", exampleRu: "У меня нет времени." },
    { de: "die Lust", ru: "желание, охота", example: "Hast du Lust auf Fußball?", exampleRu: "Хочешь поиграть в футбол?" },
    { de: "das Fitnessstudio", ru: "фитнес-клуб", plural: "die Fitnessstudios", example: "Ich gehe oft ins Fitnessstudio.", exampleRu: "Я часто хожу в фитнес-клуб." },
    { de: "die Mannschaft", ru: "команда", plural: "die Mannschaften", example: "Unsere Mannschaft ist sehr gut.", exampleRu: "Наша команда очень хорошая." },
    { de: "gewinnen", ru: "выигрывать", example: "Unsere Mannschaft gewinnt oft.", exampleRu: "Наша команда часто выигрывает." },
    { de: "einladen", ru: "приглашать", example: "Mia lädt Emil ein.", exampleRu: "Мия приглашает Эмиль." },
    { de: "die Einladung", ru: "приглашение", plural: "die Einladungen", example: "Danke für die Einladung!", exampleRu: "Спасибо за приглашение!" },
    { de: "leider", ru: "к сожалению", example: "Ich habe leider keine Zeit.", exampleRu: "К сожалению, у меня нет времени." },
    { de: "vielleicht", ru: "может быть", example: "Vielleicht am Sonntag?", exampleRu: "Может быть, в воскресенье?" },
    { de: "können", ru: "мочь, уметь", example: "Ich kann gut schwimmen.", exampleRu: "Я хорошо умею плавать." },
    { de: "müssen", ru: "должен, надо", example: "Ich muss am Montag arbeiten.", exampleRu: "Я должен работать в понедельник." },
    { de: "wollen", ru: "хотеть", example: "Ich will Fußball spielen.", exampleRu: "Я хочу играть в футбол." },
    { de: "oft", ru: "часто", example: "Wir gehen oft ins Kino.", exampleRu: "Мы часто ходим в кино." },
    { de: "manchmal", ru: "иногда", example: "Manchmal gehe ich tanzen.", exampleRu: "Иногда я хожу танцевать." },
    { de: "nie", ru: "никогда", example: "Ich tanze nie.", exampleRu: "Я никогда не танцую." },
    { de: "gern", ru: "охотно, с удовольствием", example: "Ich lese gern.", exampleRu: "Я люблю читать." }
  ],

  grammar: [
    {
      title: "Модальные глаголы können, müssen, wollen",
      body:
        "können = мочь, уметь; müssen = быть должным (надо); wollen = хотеть.\nВ формах ich и er/sie/es у них нет окончания, и меняется гласная: ich kann, ich muss, ich will.\nВажно: модальный глагол стоит на втором месте, а второй глагол — в инфинитиве в самом конце предложения. Это называется «рамка»: Ich kann heute nicht kommen. В вопросе модальный глагол стоит первым: Kannst du schwimmen?",
      table: {
        headers: ["Лицо", "können", "müssen", "wollen"],
        rows: [
          ["ich", "kann", "muss", "will"],
          ["du", "kannst", "musst", "willst"],
          ["er/sie/es", "kann", "muss", "will"],
          ["wir", "können", "müssen", "wollen"],
          ["ihr", "könnt", "müsst", "wollt"],
          ["sie/Sie", "können", "müssen", "wollen"]
        ]
      },
      examples: [
        { de: "Ich kann heute nicht kommen.", ru: "Я не могу сегодня прийти." },
        { de: "Emil muss am Montag arbeiten.", ru: "Эмиль должен работать в понедельник." },
        { de: "Wir wollen ins Kino gehen.", ru: "Мы хотим пойти в кино." },
        { de: "Kannst du gut schwimmen?", ru: "Ты хорошо умеешь плавать?" }
      ]
    },
    {
      title: "Приглашение: Hast du Zeit? Hast du Lust? gern + глагол",
      body:
        "Чтобы пригласить друга, спроси: Hast du Zeit? (У тебя есть время?) или Hast du Lust? (Хочешь? Есть желание?). После Lust идёт auf + Akkusativ: Hast du Lust auf ein Konzert?\nЧтобы сказать, что ты любишь что-то делать, поставь gern после глагола: Ich spiele gern Fußball.\nПринять приглашение: Ja, gern! Отказаться вежливо: Leider kann ich nicht. Ich muss arbeiten. Предложить другой день: Vielleicht am Samstag?",
      table: {
        headers: ["Фраза", "Перевод"],
        rows: [
          ["Hast du heute Zeit?", "У тебя есть сегодня время?"],
          ["Hast du Lust auf Kino?", "Хочешь в кино?"],
          ["Ja, gern!", "Да, с удовольствием!"],
          ["Leider kann ich nicht.", "К сожалению, я не могу."],
          ["Vielleicht am Sonntag?", "Может быть, в воскресенье?"]
        ]
      },
      examples: [
        { de: "Hast du am Freitag Zeit?", ru: "У тебя есть время в пятницу?" },
        { de: "Ich habe Lust auf eine Party.", ru: "Мне хочется на вечеринку." },
        { de: "Emil schwimmt gern.", ru: "Эмиль любит плавать." }
      ]
    },
    {
      title: "Как часто? immer, oft, manchmal, nie, jeden Tag",
      body:
        "Эти слова отвечают на вопрос Wie oft? (Как часто?). Обычно они стоят сразу после глагола: Ich spiele oft Fußball. Их можно поставить и в начало — тогда глагол идёт вторым, а «я» после него: Manchmal spiele ich Fußball.\nnie уже содержит отрицание, поэтому nicht не нужно: Ich tanze nie.",
      table: {
        headers: ["Слово", "Перевод", "Как часто"],
        rows: [
          ["immer", "всегда", "100 %"],
          ["jeden Tag", "каждый день", "регулярно"],
          ["oft", "часто", "много раз"],
          ["manchmal", "иногда", "время от времени"],
          ["nie", "никогда", "0 %"]
        ]
      },
      examples: [
        { de: "Ich spiele oft Fußball.", ru: "Я часто играю в футбол." },
        { de: "Emil geht jeden Tag ins Fitnessstudio.", ru: "Эмиль каждый день ходит в фитнес-клуб." },
        { de: "Mia tanzt nie.", ru: "Мия никогда не танцует." }
      ]
    }
  ],

  exercises: [
    {
      type: "match",
      pairs: [
        { de: "das Hobby", ru: "хобби" },
        { de: "die Freizeit", ru: "свободное время" },
        { de: "der Sport", ru: "спорт" },
        { de: "die Party", ru: "вечеринка" },
        { de: "das Konzert", ru: "концерт" }
      ]
    },
    {
      type: "choice",
      q: "Как сказать «хобби» по-немецки?",
      options: ["das Hobby", "die Freizeit", "der Sport"],
      answer: 0,
      explain: "das Hobby — хобби, die Freizeit — свободное время."
    },
    {
      type: "choice",
      q: "Что значит «Rad fahren»?",
      options: ["бегать", "кататься на велосипеде", "плавать"],
      answer: 1,
      explain: "das Rad — велосипед, fahren — ехать."
    },
    {
      type: "match",
      pairs: [
        { de: "schwimmen", ru: "плавать" },
        { de: "tanzen", ru: "танцевать" },
        { de: "kochen", ru: "готовить" },
        { de: "lesen", ru: "читать" },
        { de: "reisen", ru: "путешествовать" },
        { de: "laufen", ru: "бегать" }
      ]
    },
    {
      type: "fill",
      sentence: "Ich spiele gern ___.",
      answers: ["Fußball"],
      options: ["Fußball", "Sport", "Party"],
      ru: "Я люблю играть в футбол.",
      explain: "Fußball spielen — играть в футбол; Sport — machen, а не spielen."
    },
    { type: "speak", text: "Hast du heute Zeit?", ru: "У тебя есть сегодня время?" },
    {
      type: "choice",
      q: "Ich ___ gut schwimmen.",
      options: ["kann", "kannst", "können"],
      answer: 0,
      explain: "ich → kann (без окончания)."
    },
    {
      type: "fill",
      sentence: "Mia ___ sehr gut tanzen.",
      answers: ["kann"],
      options: ["kann", "kannst", "können"],
      ru: "Мия очень хорошо умеет танцевать.",
      explain: "sie (Mia) → kann."
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Я люблю плавать.",
      answers: ["Ich schwimme gern.", "Ich schwimme gerne.", "Ich gehe gern schwimmen.", "Ich gehe gerne schwimmen."],
      hint: "gern после глагола"
    },
    {
      type: "choice",
      q: "Emil ___ heute arbeiten.",
      options: ["muss", "musst", "müssen"],
      answer: 0,
      explain: "er (Emil) → muss."
    },
    {
      type: "fill",
      sentence: "Ihr ___ heute nicht kochen.",
      answers: ["müsst"],
      options: ["müsst", "musst", "müssen"],
      ru: "Вам не нужно сегодня готовить.",
      explain: "ihr → müsst."
    },
    {
      type: "choice",
      q: "Wir ___ ins Kino gehen.",
      options: ["will", "wollt", "wollen"],
      answer: 2,
      explain: "wir → wollen."
    },
    {
      type: "fill",
      sentence: "Ich ___ am Wochenende reisen.",
      answers: ["will"],
      options: ["will", "willst", "wollen"],
      ru: "Я хочу путешествовать на выходных.",
      explain: "ich → will."
    },
    {
      type: "order",
      words: ["gern", "Ich", "Musik", "höre"],
      answer: "Ich höre gern Musik.",
      ru: "Я люблю слушать музыку."
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Ты умеешь готовить?",
      answers: ["Kannst du kochen?", "Kannst du gut kochen?"],
      hint: "können + kochen"
    },
    {
      type: "choice",
      q: "Какое предложение построено правильно?",
      options: ["Ich kann kommen heute nicht.", "Ich kann heute nicht kommen.", "Ich heute kann nicht kommen."],
      answer: 1,
      explain: "Модальный глагол на втором месте, инфинитив в конце."
    },
    {
      type: "order",
      words: ["kann", "Emil", "nicht", "heute", "kommen"],
      answer: "Emil kann heute nicht kommen.",
      alt: ["Heute kann Emil nicht kommen."],
      ru: "Эмиль не может сегодня прийти."
    },
    {
      type: "fill",
      sentence: "Ich lade Mia zur Party ___.",
      answers: ["ein"],
      options: ["ein", "auf", "an"],
      ru: "Я приглашаю Мию на вечеринку.",
      explain: "einladen — глагол с отделяемой приставкой: ich lade … ein."
    },
    {
      type: "choice",
      q: "Как спросить «У тебя есть время?»",
      options: ["Hast du Zeit?", "Hast du Lust?", "Hast du Geld?"],
      answer: 0,
      explain: "die Zeit — время, die Lust — желание, das Geld — деньги."
    },
    {
      type: "listen",
      text: "Hast du am Freitag Lust auf ein Konzert?",
      mode: "choice",
      q: "Куда приглашают?",
      options: ["в кино", "на концерт", "на вечеринку"],
      answer: 1,
      ru: "Хочешь в пятницу на концерт?"
    },
    {
      type: "fill",
      sentence: "Ich habe Lust ___ ein Konzert.",
      answers: ["auf"],
      options: ["auf", "in", "zu"],
      ru: "Мне хочется на концерт.",
      explain: "Lust auf + Akkusativ."
    },
    { type: "speak", text: "Ich habe Lust auf Kino.", ru: "Мне хочется в кино." },
    {
      type: "choice",
      q: "Как вежливо отказаться от приглашения?",
      options: ["Ja, gern!", "Leider kann ich nicht.", "Vielleicht!"],
      answer: 1,
      explain: "leider — к сожалению; так вежливо говорят «нет»."
    },
    {
      type: "translate",
      dir: "de-ru",
      text: "Ich kann leider nicht kommen.",
      answers: ["К сожалению, я не могу прийти.", "Я, к сожалению, не могу прийти.", "Я не могу прийти, к сожалению.", "К сожалению, я не могу приехать."],
      hint: "leider = к сожалению"
    },
    { type: "speak", text: "Leider kann ich nicht.", ru: "К сожалению, я не могу." },
    {
      type: "order",
      words: ["ins", "Wir", "gehen", "Kino", "wollen", "heute"],
      answer: "Wir wollen heute ins Kino gehen.",
      alt: ["Heute wollen wir ins Kino gehen."],
      ru: "Мы хотим сегодня пойти в кино."
    },
    {
      type: "match",
      pairs: [
        { de: "immer", ru: "всегда" },
        { de: "oft", ru: "часто" },
        { de: "manchmal", ru: "иногда" },
        { de: "nie", ru: "никогда" },
        { de: "leider", ru: "к сожалению" },
        { de: "vielleicht", ru: "может быть" }
      ]
    },
    {
      type: "choice",
      q: "Ich gehe ___ ins Fitnessstudio: am Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag und Sonntag.",
      options: ["nie", "manchmal", "jeden Tag"],
      answer: 2,
      explain: "Все семь дней недели — значит, jeden Tag (каждый день)."
    },
    {
      type: "fill",
      sentence: "Emil tanzt ___. Er kann nicht tanzen.",
      answers: ["nie"],
      options: ["nie", "immer", "oft"],
      ru: "Эмиль никогда не танцует. Он не умеет танцевать.",
      explain: "nie — никогда; nicht после nie не нужно."
    },
    {
      type: "listen",
      text: "Ich spiele oft Fußball. Meine Mannschaft ist sehr gut.",
      mode: "choice",
      q: "Как часто он играет в футбол?",
      options: ["никогда", "иногда", "часто"],
      answer: 2,
      ru: "Я часто играю в футбол. Моя команда очень хорошая."
    },
    {
      type: "order",
      words: ["jeden", "Emil", "Rad", "fährt", "Tag"],
      answer: "Emil fährt jeden Tag Rad.",
      alt: ["Jeden Tag fährt Emil Rad."],
      ru: "Эмиль каждый день катается на велосипеде."
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Мы хотим выиграть.",
      answers: ["Wir wollen gewinnen.", "Wir möchten gewinnen."],
      hint: "wollen + gewinnen"
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Я должен сегодня работать.",
      answers: ["Ich muss heute arbeiten.", "Heute muss ich arbeiten."],
      hint: "müssen + arbeiten"
    },
    {
      type: "listen",
      text: "Ich gehe manchmal ins Fitnessstudio.",
      mode: "type",
      answers: ["Ich gehe manchmal ins Fitnessstudio."],
      ru: "Я иногда хожу в фитнес-клуб."
    }
  ],

  dialogue: {
    title: "Eine Einladung",
    titleRu: "Приглашение",
    lines: [
      { speaker: "Mia", de: "Hallo Emil! Was machst du in der Freizeit?", ru: "Привет, Эмиль! Что ты делаешь в свободное время?" },
      { speaker: "Emil", de: "Ich spiele oft Fußball und ich gehe ins Fitnessstudio.", ru: "Я часто играю в футбол и хожу в фитнес-клуб." },
      { speaker: "Mia", de: "Super! Ich laufe jeden Tag im Park.", ru: "Здорово! Я каждый день бегаю в парке." },
      { speaker: "Emil", de: "Kannst du auch schwimmen?", ru: "Ты тоже умеешь плавать?" },
      { speaker: "Mia", de: "Ja, aber nicht sehr gut. Sag mal, hast du am Samstag Zeit?", ru: "Да, но не очень хорошо. Скажи, у тебя есть время в субботу?" },
      { speaker: "Emil", de: "Am Samstag? Ja, vielleicht. Was ist am Samstag?", ru: "В субботу? Да, возможно. А что в субботу?" },
      { speaker: "Mia", de: "Ich mache eine Party. Ich lade dich ein!", ru: "Я устраиваю вечеринку. Я приглашаю тебя!" },
      { speaker: "Emil", de: "Danke für die Einladung! Wann beginnt die Party?", ru: "Спасибо за приглашение! Когда начинается вечеринка?" },
      { speaker: "Mia", de: "Um acht Uhr. Hast du Lust?", ru: "В восемь часов. Хочешь?" },
      { speaker: "Emil", de: "Ja, gern! Aber ich muss um elf Uhr nach Hause gehen.", ru: "Да, с удовольствием! Но в одиннадцать мне нужно идти домой." },
      { speaker: "Mia", de: "Kein Problem. Bis Samstag!", ru: "Не проблема. До субботы!" },
      { speaker: "Emil", de: "Bis Samstag, Mia!", ru: "До субботы, Мия!" }
    ]
  },

  speaking: {
    title: "Приглашение в кино",
    scenario:
      "Ты встречаешь Мию после курсов. Она спрашивает о твоих хобби и приглашает тебя в кино. Расскажи, что ты любишь делать в свободное время, ответь, есть ли у тебя время, прими приглашение или предложи другой день, скажи, как часто ты занимаешься спортом.",
    tutorBrief:
      "Mia meets Emil after the language course. Ask what he likes doing in his free time, whether he has time on Friday, invite him to the cinema (Hast du Lust?), ask if 7 o'clock works, ask about his weekend plans and how often he does sport. Target structures: gern + verb, Hast du Zeit/Lust?, ich kann/muss/will + infinitive at the end, Lust auf, frequency adverbs oft/manchmal/nie/immer/jeden Tag, leider, vielleicht. Keep to A1 vocab from the hobbies and free-time topic; no past tense.",
    phrases: [
      { de: "Ich spiele gern Fußball.", ru: "Я люблю играть в футбол." },
      { de: "Hast du am Freitag Zeit?", ru: "У тебя есть время в пятницу?" },
      { de: "Ja, gern!", ru: "Да, с удовольствием!" },
      { de: "Leider kann ich nicht.", ru: "К сожалению, я не могу." },
      { de: "Ich muss arbeiten.", ru: "Я должен работать." },
      { de: "Vielleicht am Samstag?", ru: "Может быть, в субботу?" },
      { de: "Ich mache oft Sport.", ru: "Я часто занимаюсь спортом." }
    ],
    script: [
      {
        say: "Hallo Emil! Was machst du gern in der Freizeit?",
        sayRu: "Привет, Эмиль! Что ты любишь делать в свободное время?",
        hint: "Ich spiele gern … / Ich höre gern Musik.",
        expect: ["gern", "spiele", "höre", "hobby", "sport", "fußball", "fussball", "schwimme", "lese"]
      },
      {
        say: "Schön! Hast du am Freitag Zeit?",
        sayRu: "Здорово! У тебя есть время в пятницу?",
        hint: "Ja, ich habe Zeit. / Nein, leider nicht.",
        expect: ["ja", "zeit", "nein", "leider", "nicht"]
      },
      {
        say: "Ich will ins Kino gehen. Hast du Lust?",
        sayRu: "Я хочу пойти в кино. Хочешь?",
        hint: "Ja, gern! / Ja, ich habe Lust.",
        expect: ["gern", "lust", "ja", "gut"]
      },
      {
        say: "Super! Kannst du um sieben Uhr kommen?",
        sayRu: "Отлично! Ты можешь прийти в семь часов?",
        hint: "Ja, ich kann um sieben kommen. / Nein, ich muss arbeiten.",
        expect: ["kann", "sieben", "muss", "ja", "nein", "vielleicht"]
      },
      {
        say: "Okay. Und was machst du am Wochenende?",
        sayRu: "Хорошо. А что ты делаешь на выходных?",
        hint: "Am Wochenende spiele ich Fußball. / Ich gehe ins Fitnessstudio.",
        expect: ["wochenende", "spiele", "gehe", "fahre", "schwimme", "laufe", "lese", "koche"]
      },
      {
        say: "Wie oft machst du Sport?",
        sayRu: "Как часто ты занимаешься спортом?",
        hint: "Ich mache oft / manchmal / jeden Tag Sport.",
        expect: ["oft", "manchmal", "jeden", "immer", "nie", "tag"]
      },
      {
        say: "Toll, Emil! Dann bis Freitag um sieben. Tschüss!",
        sayRu: "Здорово, Эмиль! Тогда до пятницы, в семь. Пока!",
        hint: "Bis Freitag, Mia! Tschüss!",
        expect: ["tschüss", "tschuss", "bis", "freitag", "ciao"]
      }
    ]
  },

  exam: [
    {
      type: "choice",
      q: "Emil und Mia ___ am Samstag Fußball spielen.",
      options: ["will", "wollt", "wollen"],
      answer: 2,
      explain: "Emil und Mia = sie (они) → wollen."
    },
    {
      type: "fill",
      sentence: "Kannst du gut ___? – Nein, ich tanze nie.",
      answers: ["tanzen"],
      options: ["tanzen", "tanzt", "tanze"],
      ru: "Ты хорошо умеешь танцевать? – Нет, я никогда не танцую.",
      explain: "После модального глагола — инфинитив: tanzen."
    },
    {
      type: "order",
      words: ["muss", "Leider", "ich", "heute", "arbeiten"],
      answer: "Leider muss ich heute arbeiten.",
      alt: ["Ich muss heute leider arbeiten.","Heute muss ich leider arbeiten."],
      ru: "К сожалению, я должен сегодня работать."
    },
    {
      type: "translate",
      dir: "ru-de",
      text: "Ты хочешь пойти в кино?",
      answers: ["Willst du ins Kino gehen?", "Möchtest du ins Kino gehen?"],
      hint: "wollen + ins Kino gehen"
    },
    {
      type: "match",
      pairs: [
        { de: "die Einladung", ru: "приглашение" },
        { de: "einladen", ru: "приглашать" },
        { de: "gewinnen", ru: "выигрывать" },
        { de: "die Mannschaft", ru: "команда" },
        { de: "das Fitnessstudio", ru: "фитнес-клуб" }
      ]
    },
    {
      type: "choice",
      q: "Danke für die Einladung! Ich komme ___.",
      options: ["gern", "nie", "leider"],
      answer: 0,
      explain: "Ich komme gern — я с удовольствием приду."
    },
    {
      type: "fill",
      sentence: "Ich habe ___ Zeit. Ich arbeite jeden Tag.",
      answers: ["nie"],
      options: ["nie", "immer", "oft"],
      ru: "У меня никогда нет времени. Я работаю каждый день.",
      explain: "Работает каждый день — значит, времени нет никогда: nie."
    },
    {
      type: "listen",
      text: "Hallo Emil, hast du am Sonntag Lust auf Fußball? Unsere Mannschaft spielt um drei Uhr.",
      mode: "choice",
      q: "Когда играет команда?",
      options: ["в два часа", "в три часа", "в четыре часа"],
      answer: 1,
      ru: "Привет, Эмиль, хочешь в воскресенье поиграть в футбол? Наша команда играет в три часа."
    },
    {
      type: "translate",
      dir: "de-ru",
      text: "Hast du Lust auf ein Konzert?",
      answers: ["Хочешь на концерт?", "Ты хочешь на концерт?", "Тебе хочется на концерт?", "Хочешь пойти на концерт?", "Ты хочешь пойти на концерт?", "Есть желание сходить на концерт?"],
      hint: "Lust auf = хотеть чего-то"
    },
    {
      type: "choice",
      q: "Какое предложение построено правильно?",
      options: ["Ich will heute nicht kochen.", "Ich will kochen heute nicht.", "Ich will nicht kochen heute."],
      answer: 0,
      explain: "Инфинитив kochen стоит в самом конце предложения."
    }
  ]
};
