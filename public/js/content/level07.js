export default {
  id: 7,
  cefr: "A1",
  slug: "einkaufen",
  title: "Einkaufen & Kleidung",
  titleRu: "Покупки и одежда",
  emoji: "🛍️",
  color: "#f06595",
  intro: "В этом уровне ты научишься делать покупки в супермаркете и в магазине одежды: спрашивать цену, называть количество, цвет и размер. Ты узнаешь, как образуется множественное число, как сказать «этот / эту / это» и как сказать, что тебе что-то нравится.",
  goals: [
    "Спросить и назвать цену (Wie viel kostet…? Das kostet…)",
    "Назвать одежду, цвета и размер",
    "Сказать «Мне нравится» и «Это подходит»",
    "Образовать множественное число существительных"
  ],

  vocab: [
    { de: "der Supermarkt", ru: "супермаркет", plural: "die Supermärkte", example: "Emil kauft im Supermarkt ein.", exampleRu: "Эмиль делает покупки в супермаркете." },
    { de: "das Geschäft", ru: "магазин", plural: "die Geschäfte", example: "Das Geschäft ist sehr groß.", exampleRu: "Магазин очень большой." },
    { de: "kaufen", ru: "покупать", example: "Ich kaufe eine Hose.", exampleRu: "Я покупаю брюки." },
    { de: "kosten", ru: "стоить", example: "Was kostet das Hemd?", exampleRu: "Сколько стоит рубашка?" },
    { de: "der Preis", ru: "цена", plural: "die Preise", example: "Der Preis ist gut.", exampleRu: "Цена хорошая." },
    { de: "das Geld", ru: "деньги", example: "Ich habe nicht viel Geld.", exampleRu: "У меня немного денег." },
    { de: "der Euro", ru: "евро", plural: "die Euro", example: "Das kostet zehn Euro fünfzig.", exampleRu: "Это стоит десять евро пятьдесят." },
    { de: "suchen", ru: "искать", example: "Ich suche eine Jacke.", exampleRu: "Я ищу куртку." },
    { de: "die Kasse", ru: "касса", plural: "die Kassen", example: "Die Kasse ist dort vorne.", exampleRu: "Касса там впереди." },
    { de: "die Tüte", ru: "пакет", plural: "die Tüten", example: "Möchten Sie eine Tüte?", exampleRu: "Хотите пакет?" },
    { de: "das Kilo", ru: "килограмм", plural: "die Kilo", example: "Ein Kilo Äpfel, bitte.", exampleRu: "Килограмм яблок, пожалуйста." },
    { de: "die Flasche", ru: "бутылка", plural: "die Flaschen", example: "Eine Flasche Wasser kostet einen Euro.", exampleRu: "Бутылка воды стоит один евро." },
    { de: "das Stück", ru: "кусок, штука", plural: "die Stücke", example: "Ein Stück Käse, bitte.", exampleRu: "Кусок сыра, пожалуйста." },
    { de: "die Hose", ru: "брюки", plural: "die Hosen", example: "Die Hose ist blau.", exampleRu: "Брюки синие." },
    { de: "das Hemd", ru: "рубашка", plural: "die Hemden", example: "Das Hemd ist zu klein.", exampleRu: "Рубашка слишком маленькая." },
    { de: "die Jacke", ru: "куртка", plural: "die Jacken", example: "Emil kauft eine Jacke.", exampleRu: "Эмиль покупает куртку." },
    { de: "der Schuh", ru: "ботинок, туфля", plural: "die Schuhe", example: "Die Schuhe sind schwarz.", exampleRu: "Туфли чёрные." },
    { de: "das T-Shirt", ru: "футболка", plural: "die T-Shirts", example: "Das T-Shirt kostet neun Euro.", exampleRu: "Футболка стоит девять евро." },
    { de: "das Kleid", ru: "платье", plural: "die Kleider", example: "Das Kleid ist rot.", exampleRu: "Платье красное." },
    { de: "der Mantel", ru: "пальто", plural: "die Mäntel", example: "Der Mantel ist teuer.", exampleRu: "Пальто дорогое." },
    { de: "der Pullover", ru: "свитер", plural: "die Pullover", example: "Ich nehme den Pullover.", exampleRu: "Я беру свитер." },
    { de: "die Größe", ru: "размер", plural: "die Größen", example: "Welche Größe haben Sie?", exampleRu: "Какой у вас размер?" },
    { de: "die Farbe", ru: "цвет", plural: "die Farben", example: "Welche Farbe hat die Jacke?", exampleRu: "Какого цвета куртка?" },
    { de: "rot", ru: "красный", example: "Die Jacke ist rot.", exampleRu: "Куртка красная." },
    { de: "blau", ru: "синий", example: "Mein Hemd ist blau.", exampleRu: "Моя рубашка синяя." },
    { de: "grün", ru: "зелёный", example: "Der Apfel ist grün.", exampleRu: "Яблоко зелёное." },
    { de: "schwarz", ru: "чёрный", example: "Der Mantel ist schwarz.", exampleRu: "Пальто чёрное." },
    { de: "weiß", ru: "белый", example: "Das T-Shirt ist weiß.", exampleRu: "Футболка белая." },
    { de: "gelb", ru: "жёлтый", example: "Die Tüte ist gelb.", exampleRu: "Пакет жёлтый." },
    { de: "anprobieren", ru: "примерять", example: "Ich probiere die Hose an.", exampleRu: "Я примеряю брюки." },
    { de: "passen", ru: "подходить (по размеру)", example: "Die Hose passt gut.", exampleRu: "Брюки хорошо сидят." },
    { de: "gefallen", ru: "нравиться", example: "Das Kleid gefällt mir.", exampleRu: "Платье мне нравится." }
  ],

  grammar: [
    {
      title: "Множественное число существительных",
      body: "Во множественном числе артикль всегда die. Окончание нужно запоминать вместе со словом: -e, -(e)n, -er, -s, иногда добавляется умлаут (a → ä, o → ö, u → ü), а некоторые слова не меняются совсем. Слова на -e (die Hose, die Jacke) почти всегда получают -n. Иностранные слова (das T-Shirt) получают -s. Учи слово сразу с множественным числом: der Schuh – die Schuhe.",
      table: {
        headers: ["Окончание", "Ед. число", "Мн. число"],
        rows: [
          ["-e", "der Schuh", "die Schuhe"],
          ["-(e)n", "die Hose / die Jacke", "die Hosen / die Jacken"],
          ["-er", "das Kleid", "die Kleider"],
          ["-s", "das T-Shirt", "die T-Shirts"],
          ["умлаут", "der Mantel", "die Mäntel"],
          ["умлаут + -e", "der Supermarkt", "die Supermärkte"],
          ["без изменений", "der Pullover", "die Pullover"]
        ]
      },
      examples: [
        { de: "Emil kauft zwei Hemden.", ru: "Эмиль покупает две рубашки." },
        { de: "Die Schuhe sind schwarz.", ru: "Туфли чёрные." },
        { de: "Die Mäntel sind teuer.", ru: "Пальто (мн. ч.) дорогие." }
      ]
    },
    {
      title: "Akkusativ: den Pullover, diesen Pullover",
      body: "После глаголов kaufen, nehmen, suchen, anprobieren, möchten стоит Akkusativ (вопрос «кого? что?»). Меняется только мужской род: der → den, dieser → diesen. Женский, средний род и множественное число остаются как в Nominativ. Слово dieser / diese / dieses («этот / эта / это») имеет те же окончания, что и der / die / das.",
      table: {
        headers: ["Род", "Nominativ", "Akkusativ"],
        rows: [
          ["мужской (Pullover)", "der / dieser", "den / diesen"],
          ["женский (Hose)", "die / diese", "die / diese"],
          ["средний (Hemd)", "das / dieses", "das / dieses"],
          ["мн. число (Schuhe)", "die / diese", "die / diese"]
        ]
      },
      examples: [
        { de: "Ich nehme den Pullover.", ru: "Я беру свитер." },
        { de: "Emil probiert diesen Mantel an.", ru: "Эмиль примеряет это пальто." },
        { de: "Dieses Hemd ist zu klein.", ru: "Эта рубашка слишком маленькая." },
        { de: "Diese Schuhe kosten fünfzig Euro.", ru: "Эти туфли стоят пятьдесят евро." }
      ]
    },
    {
      title: "gefallen и passen + Dativ (mir, dir, Ihnen)",
      body: "«Мне нравится» по-немецки — Das gefällt mir (дословно: это нравится мне). Вещь стоит в Nominativ, а человек — в Dativ: mir (мне), dir (тебе), Ihnen (Вам). Если вещей несколько, глагол во множественном числе: Die Schuhe gefallen mir. Так же работает passen: Die Hose passt mir (брюки мне подходят по размеру). Цвет говорим через sein: Die Jacke ist grün. Слово zu перед прилагательным значит «слишком»: Die Hose ist zu klein (слишком маленькие), der Mantel ist zu teuer (слишком дорогое).",
      table: {
        headers: ["Кому?", "Dativ", "Пример"],
        rows: [
          ["ich", "mir", "Das Kleid gefällt mir."],
          ["du", "dir", "Gefällt dir die Jacke?"],
          ["Sie", "Ihnen", "Passt Ihnen die Hose?"]
        ]
      },
      examples: [
        { de: "Der Mantel gefällt mir gut.", ru: "Пальто мне нравится." },
        { de: "Gefällt dir das T-Shirt, Emil?", ru: "Тебе нравится футболка, Эмиль?" },
        { de: "Die Schuhe passen mir nicht.", ru: "Туфли мне не подходят." }
      ]
    }
  ],

  exercises: [
    { type: "match", pairs: [
      { de: "rot", ru: "красный" },
      { de: "blau", ru: "синий" },
      { de: "grün", ru: "зелёный" },
      { de: "schwarz", ru: "чёрный" },
      { de: "weiß", ru: "белый" },
      { de: "gelb", ru: "жёлтый" }
    ] },
    { type: "choice", q: "Как сказать «брюки»?", options: ["die Hose", "das Hemd", "die Jacke"], answer: 0, explain: "die Hose — брюки, das Hemd — рубашка, die Jacke — куртка." },
    { type: "choice", q: "Что значит «das Kleid»?", options: ["платье", "пальто", "рубашка"], answer: 0, explain: "das Kleid — платье, der Mantel — пальто." },
    { type: "match", pairs: [
      { de: "der Supermarkt", ru: "супермаркет" },
      { de: "die Kasse", ru: "касса" },
      { de: "die Tüte", ru: "пакет" },
      { de: "das Geld", ru: "деньги" },
      { de: "der Preis", ru: "цена" },
      { de: "das Geschäft", ru: "магазин" }
    ] },
    { type: "speak", text: "Wie viel kostet das?", ru: "Сколько это стоит?" },
    { type: "fill", sentence: "Wie viel ___ die Jacke?", answers: ["kostet"], options: ["kostet", "kosten", "kaufe"], ru: "Сколько стоит куртка?", explain: "die Jacke — она (3-е лицо, ед. число) → kostet." },
    { type: "choice", q: "Das kostet 12,50 €. Как это сказать?", options: ["zwölf Euro fünfzig", "zwölf Cent fünfzig", "fünfzig Euro zwölf"], answer: 0, explain: "Сначала евро, потом центы: zwölf Euro fünfzig." },
    { type: "listen", text: "Das Hemd in Größe L kostet neunzehn Euro neunzig.", mode: "choice", q: "Сколько стоит рубашка?", options: ["19,90 €", "9,90 €", "90,19 €"], answer: 0, ru: "Рубашка размера L стоит 19 евро 90 центов." },
    { type: "choice", q: "Eine ___ Wasser, bitte.", options: ["Flasche", "Kilo", "Stück"], answer: 0, explain: "Вода — в бутылке: eine Flasche Wasser. Ein Kilo Äpfel, ein Stück Käse." },
    { type: "translate", dir: "ru-de", text: "Кусок сыра, пожалуйста.", answers: ["Ein Stück Käse, bitte.", "Ein Stück Käse bitte."], hint: "das Stück" },
    { type: "choice", q: "Множественное число от «der Schuh»?", options: ["die Schuhe", "die Schuhen", "die Schuhs"], answer: 0, explain: "der Schuh → die Schuhe (окончание -e)." },
    { type: "choice", q: "Множественное число от «der Mantel»?", options: ["die Mantel", "die Mäntel", "die Mantels"], answer: 1, explain: "Умлаут без окончания: der Mantel → die Mäntel." },
    { type: "fill", sentence: "Emil kauft zwei ___.", answers: ["Hosen"], options: ["Hosen", "Hose", "Hosens"], ru: "Эмиль покупает двое брюк.", explain: "die Hose → die Hosen: слова на -e получают -n." },
    { type: "match", pairs: [
      { de: "die Kleider", ru: "платья" },
      { de: "die Mäntel", ru: "пальто (мн. ч.)" },
      { de: "die Hemden", ru: "рубашки" },
      { de: "die Jacken", ru: "куртки" },
      { de: "die Tüten", ru: "пакеты" }
    ] },
    { type: "order", words: ["sind", "Die", "grün", "Jacken"], answer: "Die Jacken sind grün.", ru: "Куртки зелёные." },
    { type: "fill", sentence: "Welche ___ hat das T-Shirt? – Es ist weiß.", answers: ["Farbe"], options: ["Farbe", "Größe", "Kasse"], ru: "Какого цвета футболка? – Она белая.", explain: "die Farbe — цвет, die Größe — размер." },
    { type: "listen", text: "Die Hosen sind blau und die Hemden sind weiß.", mode: "choice", q: "Какого цвета рубашки?", options: ["синие", "белые", "красные"], answer: 1, ru: "Брюки синие, а рубашки белые." },
    { type: "translate", dir: "de-ru", text: "Das Hemd ist gelb.", answers: ["Рубашка жёлтая.", "Эта рубашка жёлтая.", "Рубашка жёлтого цвета."], hint: "gelb = жёлтый" },
    { type: "speak", text: "Wo ist die Kasse, bitte?", ru: "Скажите, пожалуйста, где касса?" },
    { type: "order", words: ["kostet", "Ein", "drei", "Äpfel", "Kilo", "Euro"], answer: "Ein Kilo Äpfel kostet drei Euro.", ru: "Килограмм яблок стоит три евро." },
    { type: "choice", q: "Ich nehme ___ Pullover.", options: ["der", "den", "dem"], answer: 1, explain: "der Pullover — мужской род; после nehmen стоит Akkusativ: der → den." },
    { type: "fill", sentence: "Emil kauft ___ Mantel.", answers: ["den"], options: ["den", "der", "das"], ru: "Эмиль покупает пальто.", explain: "der Mantel → Akkusativ: den Mantel." },
    { type: "fill", sentence: "Ich probiere ___ Jacke an.", answers: ["die"], options: ["die", "den", "der"], ru: "Я примеряю куртку.", explain: "Женский род не меняется: die Jacke → die Jacke." },
    { type: "order", words: ["das", "an", "Ich", "Hemd", "probiere"], answer: "Ich probiere das Hemd an.", ru: "Я примеряю рубашку." },
    { type: "choice", q: "___ Hose ist zu groß.", options: ["Dieser", "Diese", "Dieses"], answer: 1, explain: "die Hose → diese Hose (женский род)." },
    { type: "fill", sentence: "Ich möchte ___ Pullover in Größe M.", answers: ["diesen"], options: ["diesen", "dieser", "dieses"], ru: "Я хотел бы этот свитер размера M.", explain: "möchten + Akkusativ: dieser → diesen (мужской род)." },
    { type: "translate", dir: "ru-de", text: "Сколько стоит платье?", answers: ["Wie viel kostet das Kleid?", "Was kostet das Kleid?"], hint: "kosten, das Kleid" },
    { type: "speak", text: "Ich nehme diese Jacke.", ru: "Я беру эту куртку." },
    { type: "choice", q: "Das Kleid ___ mir.", options: ["gefällt", "gefallen", "gefällst"], answer: 0, explain: "das Kleid — ед. число: gefällt (с умлаутом)." },
    { type: "fill", sentence: "Gefällt ___ die Jacke, Emil?", answers: ["dir"], options: ["dir", "du", "mir"], ru: "Тебе нравится куртка, Эмиль?", explain: "Вопрос к Эмиль → dir (тебе)." },
    { type: "choice", q: "Die Schuhe ___ mir nicht.", options: ["gefällt", "gefallen", "gefalle"], answer: 1, explain: "die Schuhe — мн. число → gefallen." },
    { type: "order", words: ["mir", "Diese", "gut", "Hose", "gefällt"], answer: "Diese Hose gefällt mir gut.", alt: ["Mir gefällt diese Hose gut."], ru: "Эти брюки мне очень нравятся." },
    { type: "listen", text: "Die Jacke gefällt mir sehr.", mode: "type", answers: ["Die Jacke gefällt mir sehr."], ru: "Куртка мне очень нравится." },
    { type: "translate", dir: "ru-de", text: "Это мне нравится.", answers: ["Das gefällt mir.", "Es gefällt mir.", "Das gefällt mir gut."], hint: "gefallen + mir" },
    { type: "translate", dir: "de-ru", text: "Die Hose passt nicht.", answers: ["Брюки не подходят.", "Брюки не по размеру.", "Брюки не подходят по размеру.", "Эти брюки не подходят.", "Брюки не сидят."], hint: "passen = подходить по размеру" }
  ],

  dialogue: {
    title: "Im Kleidungsgeschäft",
    titleRu: "В магазине одежды",
    lines: [
      { speaker: "Verkäuferin", de: "Guten Tag! Was suchen Sie?", ru: "Добрый день! Что вы ищете?" },
      { speaker: "Emil", de: "Guten Tag. Ich suche eine Jacke.", ru: "Добрый день. Я ищу куртку." },
      { speaker: "Verkäuferin", de: "Welche Größe haben Sie?", ru: "Какой у вас размер?" },
      { speaker: "Emil", de: "Größe M. Und ich möchte sie in Blau.", ru: "Размер M. И я хочу её синего цвета." },
      { speaker: "Verkäuferin", de: "Hier ist eine Jacke in Blau. Gefällt sie Ihnen?", ru: "Вот синяя куртка. Она вам нравится?" },
      { speaker: "Emil", de: "Ja, sie gefällt mir. Ich probiere sie an.", ru: "Да, она мне нравится. Я её примерю." },
      { speaker: "Verkäuferin", de: "Und? Passt die Jacke?", ru: "Ну как? Куртка подходит?" },
      { speaker: "Emil", de: "Ja, sie passt gut. Wie viel kostet sie?", ru: "Да, она хорошо сидит. Сколько она стоит?" },
      { speaker: "Verkäuferin", de: "Sie kostet neunundvierzig Euro neunzig.", ru: "Она стоит 49 евро 90 центов." },
      { speaker: "Emil", de: "Gut, ich nehme die Jacke. Wo ist die Kasse?", ru: "Хорошо, я беру куртку. Где касса?" },
      { speaker: "Verkäuferin", de: "Die Kasse ist dort vorne. Möchten Sie eine Tüte?", ru: "Касса там впереди. Хотите пакет?" },
      { speaker: "Emil", de: "Ja, bitte. Danke schön!", ru: "Да, пожалуйста. Большое спасибо!" }
    ]
  },

  speaking: {
    title: "Покупка свитера",
    scenario: "Ты с Мией в магазине одежды в Берлине. Ты ищешь свитер. Скажи, что ты ищешь, какой цвет тебе нравится и какой у тебя размер. Примерь свитер, скажи, подходит ли он и нравится ли тебе, и реши, берёшь ли ты его.",
    tutorBrief: "Mia is helping Emil shop for a pullover in a clothes shop. Ask what he is looking for, which colour he likes, his size, whether the pullover fits and whether he likes it, and whether he takes it at thirty euros. Target structures: ich suche einen/eine/ein…, Größe M, die Farbe … gefällt mir, er passt (nicht), ich nehme den Pullover, das ist zu teuer, wie viel kostet…, plural forms. Keep to A1 vocabulary of shopping and clothes; no modal verbs, no Imperativ, no past tense.",
    phrases: [
      { de: "Ich suche einen Pullover.", ru: "Я ищу свитер." },
      { de: "Ich habe Größe M.", ru: "У меня размер M." },
      { de: "Blau gefällt mir.", ru: "Мне нравится синий." },
      { de: "Wie viel kostet der Pullover?", ru: "Сколько стоит свитер?" },
      { de: "Er passt gut.", ru: "Он хорошо сидит." },
      { de: "Er ist zu klein.", ru: "Он слишком маленький." },
      { de: "Ich nehme den Pullover.", ru: "Я беру свитер." },
      { de: "Das ist zu teuer.", ru: "Это слишком дорого." }
    ],
    script: [
      { say: "Hallo Emil! Wir sind im Geschäft. Was suchst du heute?", sayRu: "Привет, Эмиль! Мы в магазине. Что ты сегодня ищешь?", hint: "Ich suche einen Pullover.", expect: ["suche", "pullover", "hose", "hemd", "jacke", "mantel", "schuhe", "shirt", "kleid"] },
      { say: "Hier ist ein Pullover in Blau und ein Pullover in Grün. Welche Farbe gefällt dir?", sayRu: "Вот свитер синего цвета и свитер зелёного цвета. Какой цвет тебе нравится?", hint: "Blau gefällt mir. / Grün gefällt mir.", expect: ["blau", "grün", "grun", "gruen", "gefällt", "gefallt", "gefaellt"] },
      { say: "Gut. Und welche Größe hast du?", sayRu: "Хорошо. А какой у тебя размер?", hint: "Ich habe Größe M.", expect: ["größe", "grosse", "groesse", "habe"] },
      { say: "Hier, bitte. Probierst du den Pullover an? Passt er?", sayRu: "Вот, пожалуйста. Примеришь свитер? Он подходит?", hint: "Ja, er passt gut. / Nein, er ist zu klein.", expect: ["passt", "klein", "groß", "gross", "gut", "ja", "nein"] },
      { say: "Und gefällt dir der Pullover?", sayRu: "А свитер тебе нравится?", hint: "Ja, er gefällt mir. / Nein, er gefällt mir nicht.", expect: ["gefällt", "gefallt", "gefaellt", "mir", "ja", "nein"] },
      { say: "Er kostet dreißig Euro. Nimmst du den Pullover?", sayRu: "Он стоит тридцать евро. Ты берёшь свитер?", hint: "Ja, ich nehme den Pullover. / Nein, das ist zu teuer.", expect: ["nehme", "kaufe", "teuer", "ja", "nein"] },
      { say: "Prima, Emil! Die Kasse ist dort vorne. Das war sehr gut. Tschüss!", sayRu: "Отлично, Эмиль! Касса там впереди. Это было очень хорошо. Пока!", hint: "Danke, Mia! Tschüss!", expect: ["tschüss", "tschuss", "danke", "bis", "ciao"] }
    ]
  },

  exam: [
    { type: "choice", q: "Wie viel ___ die Schuhe?", options: ["kostet", "kosten", "kostest"], answer: 1, explain: "die Schuhe — мн. число → kosten." },
    { type: "choice", q: "Множественное число от «das Kleid»?", options: ["die Kleide", "die Kleider", "die Kleids"], answer: 1, explain: "das Kleid → die Kleider (окончание -er)." },
    { type: "match", pairs: [
      { de: "die Größe", ru: "размер" },
      { de: "die Farbe", ru: "цвет" },
      { de: "anprobieren", ru: "примерять" },
      { de: "passen", ru: "подходить по размеру" },
      { de: "kaufen", ru: "покупать" },
      { de: "das Geld", ru: "деньги" }
    ] },
    { type: "fill", sentence: "Ich kaufe ___ Pullover. (der)", answers: ["den"], ru: "Я покупаю свитер.", explain: "Akkusativ мужского рода: der → den." },
    { type: "listen", text: "Die Jacke kostet fünfundvierzig Euro und die Hose kostet dreißig Euro.", mode: "choice", q: "Сколько стоит куртка?", options: ["30 €", "45 €", "54 €"], answer: 1, ru: "Куртка стоит 45 евро, а брюки стоят 30 евро." },
    { type: "order", words: ["haben", "Größe", "Welche", "Sie"], answer: "Welche Größe haben Sie?", ru: "Какой у вас размер?" },
    { type: "choice", q: "___ Kleid ist teuer.", options: ["Dieser", "Diese", "Dieses"], answer: 2, explain: "das Kleid → dieses Kleid (средний род)." },
    { type: "fill", sentence: "Größe 40 ___ mir gut.", answers: ["passt"], options: ["passt", "passen", "passe"], ru: "Размер 40 мне хорошо подходит.", explain: "Größe 40 — ед. число, 3-е лицо → passt." },
    { type: "translate", dir: "ru-de", text: "Эти туфли мне нравятся.", answers: ["Diese Schuhe gefallen mir.", "Die Schuhe gefallen mir.", "Diese Schuhe gefallen mir gut."], hint: "gefallen — мн. число, mir" },
    { type: "translate", dir: "de-ru", text: "Der Mantel ist zu teuer.", answers: ["Пальто слишком дорогое.", "Это пальто слишком дорогое.", "Пальто слишком дорого."], hint: "zu teuer = слишком дорого" }
  ]
};
