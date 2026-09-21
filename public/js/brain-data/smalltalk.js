export default {
  openers: [
    {
      de: "Hallo Emil! Schön, dass du da bist. Wie war dein Tag heute?",
      ru: "Привет, Эмиль! Как хорошо, что ты зашёл. Ну как сегодня день прошёл?",
      hint: "Mein Tag war gut, aber ich bin müde. — День был хороший, но я устал.",
      expect: ["gut", "super", "schlecht", "müde", "lang", "normal", "okay", "arbeit"],
      topic: "day"
    },
    {
      de: "Hallo! Erzähl mal: Was hast du heute gemacht?",
      ru: "Привет! Ну расскажи: что ты сегодня делал?",
      hint: "Ich habe gearbeitet und Deutsch gelernt. — Я работал и учил немецкий.",
      expect: ["arbeit", "gearbeitet", "gegessen", "geschlafen", "nichts", "deutsch", "gelernt", "zu hause"],
      topic: "day"
    },
    {
      de: "Hallo Emil! Wie geht es dir heute?",
      ru: "Привет, Эмиль! Как ты сегодня?",
      hint: "Danke, mir geht es heute gut. — Спасибо, сегодня у меня всё хорошо.",
      expect: ["gut", "super", "schlecht", "müde", "okay", "danke", "nicht gut"],
      topic: "mood"
    },
    {
      de: "Hi Emil! Bist du heute fröhlich oder eher müde?",
      ru: "Привет, Эмиль! Ну как ты сегодня — весёлый или уставший?",
      hint: "Ich bin ein bisschen müde, aber fröhlich. — Я немного устал, но весёлый.",
      expect: ["fröhlich", "müde", "gut", "traurig", "bisschen", "ja", "nein"],
      topic: "mood"
    },
    {
      de: "Guten Tag, Emil! Ich habe Hunger. Was isst du gern?",
      ru: "Добрый день, Эмиль! Я голодная. А ты что любишь есть?",
      hint: "Ich esse gern Fleisch mit Reis. — Я люблю есть мясо с рисом.",
      expect: ["fleisch", "reis", "suppe", "brot", "fisch", "gemüse", "pizza", "alles"],
      topic: "food"
    },
    {
      de: "Hallo! Eine wichtige Frage: Was isst du zum Frühstück?",
      ru: "Привет! Очень важный вопрос: что ты ешь на завтрак?",
      hint: "Zum Frühstück esse ich Brot mit Käse. — На завтрак я ем хлеб с сыром.",
      expect: ["brot", "eier", "käse", "tee", "kaffee", "joghurt", "nichts"],
      topic: "food"
    },
    {
      de: "Guten Morgen, Emil! Ich trinke gerade Kaffee. Trinkst du auch Kaffee?",
      ru: "Доброе утро, Эмиль! Я как раз пью кофе. Ты тоже пьёшь кофе?",
      hint: "Ja, ich trinke morgens gern Kaffee. — Да, я по утрам люблю кофе.",
      expect: ["ja", "nein", "kaffee", "tee", "morgens", "viel", "manchmal"],
      topic: "food"
    },
    {
      de: "Hallo Emil! Hier in Berlin regnet es wieder. Wie ist das Wetter bei dir?",
      ru: "Привет, Эмиль! У нас в Берлине опять дождь. А какая погода у тебя?",
      hint: "Bei mir ist es warm und sonnig. — У меня тепло и солнечно.",
      expect: ["sonne", "sonnig", "regen", "warm", "kalt", "wind", "schön", "heiß"],
      topic: "weather"
    },
    {
      de: "Hallo! Ist es bei dir heute warm oder kalt?",
      ru: "Привет! У тебя сегодня тепло или холодно?",
      hint: "Heute ist es warm, zwanzig Grad. — Сегодня тепло, двадцать градусов.",
      expect: ["warm", "kalt", "heiß", "grad", "normal", "ja", "nein"],
      topic: "weather"
    },
    {
      de: "Hallo Emil! Arbeitest du heute oder hast du frei?",
      ru: "Привет, Эмиль! Ты сегодня работаешь или выходной?",
      hint: "Ja, ich arbeite heute bis sechs Uhr. — Да, сегодня я работаю до шести.",
      expect: ["ja", "nein", "arbeite", "frei", "heute", "morgen", "immer"],
      topic: "work"
    },
    {
      de: "Hi Emil! Sag mal, was bist du von Beruf?",
      ru: "Привет, Эмиль! Слушай, а кем ты работаешь?",
      hint: "Ich arbeite als Fahrer in einer Firma. — Я работаю водителем в фирме.",
      expect: ["ich bin", "arbeite", "als", "fahrer", "koch", "beruf", "firma"],
      topic: "work"
    },
    {
      de: "Hallo Emil! Was machst du gern am Abend?",
      ru: "Привет, Эмиль! А что ты любишь делать вечером?",
      hint: "Am Abend sehe ich gern Fußball im Fernsehen. — Вечером я люблю смотреть футбол по телевизору.",
      expect: ["fernsehen", "musik", "fußball", "lesen", "schlafen", "handy", "freunde", "spazieren"],
      topic: "freetime"
    },
    {
      de: "Hallo! Ich verstehe Fußball nicht gut. Magst du Fußball?",
      ru: "Привет! Я в футболе совсем не сильна, честно. А ты футбол любишь?",
      hint: "Ja, ich mag Fußball sehr. — Да, я очень люблю футбол.",
      expect: ["ja", "nein", "fußball", "sehr", "spiele", "sport", "manchmal"],
      topic: "freetime"
    },
    {
      de: "Hallo Emil! Ich höre sehr gern Musik. Welche Musik hörst du gern?",
      ru: "Привет, Эмиль! Я очень люблю музыку. А ты какую музыку слушаешь?",
      hint: "Ich höre gern Pop und Rap. — Я люблю слушать поп и рэп.",
      expect: ["musik", "rap", "pop", "rock", "höre", "alles", "gern"],
      topic: "freetime"
    },
    {
      de: "Hallo Emil! Hast du Geschwister?",
      ru: "Привет, Эмиль! У тебя есть братья или сёстры?",
      hint: "Ja, ich habe einen Bruder und eine Schwester. — Да, у меня есть брат и сестра.",
      expect: ["ja", "nein", "bruder", "schwester", "zwei", "drei", "keine"],
      topic: "family"
    },
    {
      de: "Hi! Wohnt deine Familie auch in Baku?",
      ru: "Привет! А твоя семья тоже живёт в Баку?",
      hint: "Ja, meine Familie wohnt auch in Baku. — Да, моя семья тоже живёт в Баку.",
      expect: ["ja", "nein", "familie", "mutter", "vater", "baku", "dort"],
      topic: "family"
    },
    {
      de: "Hallo Emil! Wohnst du in einem Haus oder in einer Wohnung?",
      ru: "Привет, Эмиль! Ты живёшь в доме или в квартире?",
      hint: "Ich wohne mit meiner Familie in einer Wohnung. — Я живу с семьёй в квартире.",
      expect: ["haus", "wohnung", "zimmer", "klein", "groß", "familie"],
      topic: "home"
    },
    {
      de: "Hallo Emil! Bald ist Wochenende. Was machst du dann?",
      ru: "Привет, Эмиль! Скоро выходные. А ты что будешь делать?",
      hint: "Am Wochenende treffe ich meine Freunde. — На выходных я встречаюсь с друзьями.",
      expect: ["nichts", "schlafen", "familie", "freunde", "arbeit", "fußball", "weiß nicht"],
      topic: "plans"
    },
    {
      de: "Hallo! Du kommst bald nach Deutschland. Was möchtest du hier machen?",
      ru: "Привет! Ты скоро приедешь в Германию. А что хочешь тут делать?",
      hint: "Ich möchte in Deutschland arbeiten und leben. — Я хочу работать и жить в Германии.",
      expect: ["arbeiten", "lernen", "deutsch", "leben", "wohnen", "geld", "familie", "weiß nicht"],
      topic: "plans"
    },
    {
      de: "Hallo Emil! Wie geht es mit deinem Deutsch?",
      ru: "Привет, Эмиль! Ну как у тебя дела с немецким?",
      hint: "Es geht langsam, aber ein bisschen besser. — Идёт медленно, но немного лучше.",
      expect: ["gut", "schwer", "langsam", "bisschen", "besser", "schlecht", "okay"],
      topic: "german"
    },
    {
      de: "Hi Emil! Lernst du jeden Tag Deutsch?",
      ru: "Привет, Эмиль! Ты каждый день занимаешься немецким?",
      hint: "Ja, ich lerne jeden Abend ein bisschen. — Да, я каждый вечер немного занимаюсь.",
      expect: ["ja", "nein", "jeden", "manchmal", "abends", "wenig", "versuche"],
      topic: "german"
    },
    {
      de: "Hallo Emil! Erzähl mir von deiner Stadt. Ist sie groß?",
      ru: "Привет, Эмиль! Расскажи мне про свой город. Он большой?",
      hint: "Nein, Baku ist klein, aber Baku ist groß. — Нет, Баку маленький, а Баку большой.",
      expect: ["groß", "klein", "ja", "nein", "menschen", "meer", "baku", "ruhig"],
      topic: "city"
    },
    {
      de: "Guten Morgen, Emil! Hast du gut geschlafen?",
      ru: "Доброе утро, Эмиль! Ты хорошо поспал?",
      hint: "Ja, ich habe gut geschlafen, danke. — Да, я хорошо поспал, спасибо.",
      expect: ["ja", "nein", "gut", "schlecht", "wenig", "müde", "stunden"],
      topic: "health"
    },
    {
      de: "Hallo Emil! Du klingst heute müde. Stimmt das?",
      ru: "Привет, Эмиль! Голос у тебя сегодня усталый. Или мне кажется?",
      hint: "Ja, ich bin ein bisschen müde. — Да, я немного устал.",
      expect: ["ja", "nein", "müde", "bisschen", "arbeit", "geht", "kaffee"],
      topic: "health"
    }
  ],

  followups: {
    day: [
      {
        de: "Und was hast du heute gegessen?",
        ru: "А что ты сегодня ел?",
        hint: "Ich habe Reis mit Fleisch gegessen. — Я ел рис с мясом.",
        expect: ["brot", "reis", "suppe", "fleisch", "fisch", "salat", "nichts", "gegessen"]
      },
      {
        de: "Wann bist du heute aufgestanden?",
        ru: "А во сколько ты сегодня встал?",
        hint: "Ich bin um sieben Uhr aufgestanden. — Я встал в семь.",
        expect: ["uhr", "sechs", "sieben", "acht", "neun", "früh", "spät"]
      },
      {
        de: "War der Tag lang oder kurz?",
        ru: "День был длинный или короткий?",
        hint: "Der Tag war heute sehr lang. — День сегодня был очень длинный.",
        expect: ["lang", "kurz", "normal", "sehr", "endlos"]
      },
      {
        de: "Warst du heute draußen?",
        ru: "Ты сегодня выходил на улицу?",
        hint: "Ja, ich war kurz draußen. — Да, я ненадолго выходил на улицу.",
        expect: ["ja", "nein", "draußen", "park", "arbeit", "zu hause"]
      },
      {
        de: "Das war viel Arbeit. Bist du jetzt müde?",
        ru: "Ого, сколько работы. И что, сейчас устал?",
        hint: "Ja, ich bin jetzt ein bisschen müde. — Да, я сейчас немного устал.",
        expect: ["ja", "nein", "müde", "bisschen", "geht", "sehr"],
        needs: "arbeit"
      },
      {
        de: "Und wie ist dein Abend? Ruhig?",
        ru: "А вечер сегодня какой? Спокойный?",
        hint: "Ja, mein Abend ist ruhig. — Да, вечер у меня спокойный.",
        expect: ["ruhig", "laut", "ja", "nein", "gut", "familie", "fernsehen"]
      },
      {
        de: "Was machst du heute noch?",
        ru: "А что ещё будешь сегодня делать?",
        hint: "Heute lerne ich noch Deutsch. — Сегодня я ещё позанимаюсь немецким.",
        expect: ["nichts", "schlafen", "essen", "arbeiten", "lernen", "fernsehen", "freunde"]
      }
    ],

    mood: [
      {
        de: "Warum geht es dir heute so gut?",
        ru: "А почему тебе сегодня так хорошо?",
        hint: "Heute habe ich frei und die Sonne scheint. — Сегодня у меня выходной и светит солнце.",
        expect: ["arbeit", "frei", "familie", "wetter", "sonne", "weiß nicht", "einfach"],
        needs: "gut"
      },
      {
        de: "Was macht dich fröhlich?",
        ru: "А что тебя радует?",
        hint: "Musik und meine Familie machen mich fröhlich. — Музыка и моя семья меня радуют.",
        expect: ["musik", "familie", "essen", "fußball", "kaffee", "frei", "freunde"]
      },
      {
        de: "Bist du oft müde?",
        ru: "Ты часто устаёшь?",
        hint: "Ja, nach der Arbeit bin ich oft müde. — Да, после работы я часто устаю.",
        expect: ["ja", "nein", "oft", "manchmal", "immer", "selten"]
      },
      {
        de: "Hilft Musik, wenn du traurig bist?",
        ru: "А музыка помогает, когда грустно?",
        hint: "Ja, Musik hilft mir immer. — Да, музыка мне всегда помогает.",
        expect: ["ja", "nein", "musik", "hilft", "manchmal", "bisschen"],
        needs: "traurig"
      },
      {
        de: "Und wie geht es deiner Familie?",
        ru: "А как там твои, дома всё в порядке?",
        hint: "Danke, meiner Familie geht es auch gut. — Спасибо, у моей семьи тоже всё хорошо.",
        expect: ["gut", "auch", "familie", "danke", "schlecht", "normal"]
      },
      {
        de: "Schlafen hilft immer. Schläfst du genug?",
        ru: "Сон всегда спасает. Ты высыпаешься?",
        hint: "Nein, ich schlafe leider zu wenig. — Нет, я, к сожалению, мало сплю.",
        expect: ["ja", "nein", "wenig", "genug", "stunden", "müde"],
        needs: "müde"
      }
    ],

    food: [
      {
        de: "Kochst du selbst?",
        ru: "А ты сам готовишь?",
        hint: "Ja, manchmal koche ich selbst. — Да, иногда я готовлю сам.",
        expect: ["ja", "nein", "koche", "mutter", "frau", "manchmal", "selten"]
      },
      {
        de: "Isst du gern Fleisch?",
        ru: "Мясо любишь?",
        hint: "Ja, ich esse sehr gern Fleisch. — Да, я очень люблю мясо.",
        expect: ["ja", "nein", "fleisch", "gern", "huhn", "lamm", "selten"]
      },
      {
        de: "Was trinkst du zum Essen?",
        ru: "А что пьёшь во время еды?",
        hint: "Ich trinke Wasser oder Tee. — Я пью воду или чай.",
        expect: ["wasser", "tee", "saft", "cola", "kaffee", "nichts"]
      },
      {
        de: "Magst du deutsches Essen?",
        ru: "А немецкая еда тебе как?",
        hint: "Ja, Wurst und Kartoffeln schmecken mir. — Да, колбаса и картошка мне нравятся.",
        expect: ["ja", "nein", "kenne", "wurst", "kartoffeln", "brot", "nicht"]
      },
      {
        de: "Kochst du auch für deine Familie?",
        ru: "А для семьи тоже готовишь?",
        hint: "Ja, ich koche gern für meine Familie. — Да, я с удовольствием готовлю для семьи.",
        expect: ["ja", "nein", "familie", "manchmal", "immer", "gern"],
        needs: "koche"
      },
      {
        de: "Wie viele Tassen Kaffee trinkst du am Tag?",
        ru: "Сколько чашек кофе в день выпиваешь?",
        hint: "Ich trinke zwei Tassen am Tag. — Я пью две чашки в день.",
        expect: ["eine", "zwei", "drei", "vier", "viel", "tassen", "keine"],
        needs: "kaffee"
      },
      {
        de: "Isst du am Abend viel oder wenig?",
        ru: "Вечером ты много ешь или мало?",
        hint: "Am Abend esse ich wenig. — Вечером я ем мало.",
        expect: ["viel", "wenig", "normal", "nichts", "spät", "früh"]
      }
    ],

    weather: [
      {
        de: "Magst du Regen?",
        ru: "А дождь тебе нравится?",
        hint: "Nein, ich mag Regen nicht besonders. — Нет, дождь мне не очень нравится.",
        expect: ["ja", "nein", "regen", "mag", "nicht", "manchmal"]
      },
      {
        de: "Was trägst du heute? Eine Jacke?",
        ru: "А что на тебе сегодня? Куртка?",
        hint: "Ja, ich trage heute eine Jacke. — Да, на мне сегодня куртка.",
        expect: ["jacke", "pullover", "hemd", "shirt", "ja", "nein", "nichts"]
      },
      {
        de: "Bei uns ist es kalt. Wie viel Grad sind es bei dir?",
        ru: "У нас холодрыга. А сколько градусов у тебя?",
        hint: "Bei uns sind es zwanzig Grad. — У нас двадцать градусов.",
        expect: ["grad", "zehn", "zwanzig", "dreißig", "warm", "kalt", "weiß nicht"]
      },
      {
        de: "Ist der Winter bei dir kalt?",
        ru: "А зима у вас холодная?",
        hint: "Nein, der Winter ist bei uns nicht kalt. — Нет, зима у нас не холодная.",
        expect: ["ja", "nein", "kalt", "winter", "schnee", "regen", "wind"]
      },
      {
        de: "Schneit es bei dir im Winter?",
        ru: "А снег зимой у вас бывает?",
        hint: "Nein, bei uns schneit es selten. — Нет, снег у нас бывает редко.",
        expect: ["ja", "nein", "schnee", "schneit", "selten", "nie"],
        needs: "winter"
      },
      {
        de: "In Berlin ist es im November grau. Magst du die Sonne?",
        ru: "В Берлине в ноябре всё серое-серое. Ты солнце любишь?",
        hint: "Ja, ich mag die Sonne sehr. — Да, я очень люблю солнце.",
        expect: ["ja", "nein", "sonne", "gern", "warm", "sehr"]
      }
    ],

    work: [
      {
        de: "Wie lange arbeitest du am Tag?",
        ru: "Сколько часов в день ты работаешь?",
        hint: "Ich arbeite acht Stunden am Tag. — Я работаю восемь часов в день.",
        expect: ["stunden", "acht", "neun", "zehn", "zwölf", "lang", "viel"]
      },
      {
        de: "Ist die Arbeit schwer?",
        ru: "Работа тяжёлая?",
        hint: "Ja, die Arbeit ist ein bisschen schwer. — Да, работа немного тяжёлая.",
        expect: ["ja", "nein", "schwer", "leicht", "normal", "bisschen"]
      },
      {
        de: "Arbeitest du auch am Samstag?",
        ru: "А по субботам тоже работаешь?",
        hint: "Ja, am Samstag arbeite ich auch. — Да, в субботу я тоже работаю.",
        expect: ["ja", "nein", "samstag", "sonntag", "frei", "immer", "manchmal"]
      },
      {
        de: "Sind deine Kollegen nett?",
        ru: "А коллеги нормальные ребята?",
        hint: "Ja, meine Kollegen sind sehr nett. — Да, мои коллеги очень хорошие.",
        expect: ["ja", "nein", "kollegen", "nett", "gut", "allein", "geht"]
      },
      {
        de: "Möchtest du in Deutschland auch so arbeiten?",
        ru: "В Германии хочешь работать так же?",
        hint: "Ja, ich möchte in Deutschland auch so arbeiten. — Да, в Германии я тоже хочу так работать.",
        expect: ["ja", "nein", "vielleicht", "anders", "deutschland", "arbeiten", "weiß nicht"]
      },
      {
        de: "Wann hast du heute Feierabend?",
        ru: "А во сколько ты сегодня заканчиваешь?",
        hint: "Heute habe ich um sechs Uhr Feierabend. — Сегодня я заканчиваю в шесть.",
        expect: ["uhr", "fünf", "sechs", "sieben", "acht", "spät", "schon"]
      }
    ],

    freetime: [
      {
        de: "Machst du das jeden Tag?",
        ru: "Ты это каждый день делаешь?",
        hint: "Nein, nur manchmal am Abend. — Нет, только иногда вечером.",
        expect: ["ja", "nein", "jeden", "manchmal", "oft", "selten", "abends"]
      },
      {
        de: "Spielst du selbst Fußball?",
        ru: "А сам в футбол играешь?",
        hint: "Ja, ich spiele manchmal mit Freunden. — Да, я иногда играю с друзьями.",
        expect: ["ja", "nein", "spiele", "früher", "manchmal", "freunde"],
        needs: "fußball"
      },
      {
        de: "Welche Mannschaft magst du?",
        ru: "А за какую команду болеешь?",
        hint: "Ich mag Bayern München sehr. — Мне очень нравится «Бавария Мюнхен».",
        expect: ["bayern", "real", "barcelona", "mannschaft", "keine", "alle"],
        needs: "fußball"
      },
      {
        de: "Hörst du Musik bei der Arbeit?",
        ru: "А на работе музыку слушаешь?",
        hint: "Ja, ich höre manchmal Musik bei der Arbeit. — Да, я иногда слушаю музыку на работе.",
        expect: ["ja", "nein", "musik", "arbeit", "immer", "manchmal", "geht nicht"],
        needs: "musik"
      },
      {
        de: "Gehst du gern spazieren?",
        ru: "Гулять любишь?",
        hint: "Ja, ich gehe abends gern im Park spazieren. — Да, я люблю вечером гулять в парке.",
        expect: ["ja", "nein", "gern", "spazieren", "park", "abend", "meer"]
      },
      {
        de: "Triffst du oft Freunde?",
        ru: "С друзьями часто видишься?",
        hint: "Ja, am Wochenende treffe ich meine Freunde. — Да, на выходных я встречаюсь с друзьями.",
        expect: ["ja", "nein", "freunde", "oft", "wochenende", "selten", "abends"]
      },
      {
        de: "Siehst du gern Filme?",
        ru: "Фильмы любишь смотреть?",
        hint: "Ja, ich sehe gern Filme am Abend. — Да, я люблю смотреть фильмы вечером.",
        expect: ["ja", "nein", "filme", "serien", "gern", "youtube", "manchmal"]
      }
    ],

    family: [
      {
        de: "Wie heißt dein Bruder?",
        ru: "А как брата зовут?",
        hint: "Mein Bruder heißt Timur. — Моего брата зовут Тимур.",
        expect: ["heißt", "heisst", "bruder", "name"],
        needs: "bruder"
      },
      {
        de: "Wie alt ist deine Schwester?",
        ru: "А сестре сколько лет?",
        hint: "Meine Schwester ist fünfundzwanzig Jahre alt. — Моей сестре двадцать пять лет.",
        expect: ["jahre", "alt", "zwanzig", "dreißig", "weiß", "jünger", "älter"],
        needs: "schwester"
      },
      {
        de: "Hast du Kinder?",
        ru: "А дети у тебя есть?",
        hint: "Nein, ich habe noch keine Kinder. — Нет, детей у меня пока нет.",
        expect: ["ja", "nein", "kinder", "sohn", "tochter", "noch nicht"]
      },
      {
        de: "Wohnen deine Eltern auch dort?",
        ru: "Родители тоже там живут?",
        hint: "Ja, meine Eltern wohnen in Baku. — Да, мои родители живут в Баку.",
        expect: ["ja", "nein", "eltern", "mutter", "vater", "dort", "baku"]
      },
      {
        de: "Telefonierst du oft mit deiner Familie?",
        ru: "С семьёй часто созваниваешься?",
        hint: "Ja, ich telefoniere jeden Abend mit meiner Mutter. — Да, я каждый вечер созваниваюсь с мамой.",
        expect: ["ja", "nein", "oft", "jeden", "telefon", "abends", "selten"]
      },
      {
        de: "Kommt deine Familie mit nach Deutschland?",
        ru: "А семья поедет с тобой в Германию?",
        hint: "Ja, meine Familie kommt später nach Deutschland. — Да, моя семья приедет позже в Германию.",
        expect: ["ja", "nein", "später", "vielleicht", "allein", "familie", "weiß nicht"]
      }
    ],

    home: [
      {
        de: "Ist deine Wohnung groß?",
        ru: "Квартира большая?",
        hint: "Nein, meine Wohnung ist klein. — Нет, моя квартира маленькая.",
        expect: ["ja", "nein", "groß", "klein", "zimmer", "normal"]
      },
      {
        de: "Wie viele Zimmer hast du?",
        ru: "Сколько у тебя комнат?",
        hint: "Ich habe zwei Zimmer. — У меня две комнаты.",
        expect: ["zimmer", "eins", "zwei", "drei", "vier", "fünf"]
      },
      {
        de: "Hast du einen Balkon?",
        ru: "Балкон есть?",
        hint: "Ja, ich habe einen kleinen Balkon. — Да, у меня есть маленький балкон.",
        expect: ["ja", "nein", "balkon", "garten", "klein"]
      },
      {
        de: "Wohnst du allein?",
        ru: "Ты живёшь один?",
        hint: "Nein, ich wohne mit meiner Familie. — Нет, я живу с семьёй.",
        expect: ["ja", "nein", "allein", "familie", "bruder", "mutter", "frau"]
      },
      {
        de: "Was ist dein Lieblingszimmer?",
        ru: "А какая комната любимая?",
        hint: "Mein Lieblingszimmer ist die Küche. — Моя любимая комната — кухня.",
        expect: ["küche", "zimmer", "bad", "balkon", "wohnzimmer", "schlafzimmer"]
      },
      {
        de: "Ist es bei dir zu Hause laut oder ruhig?",
        ru: "Дома у тебя шумно или тихо?",
        hint: "Bei mir zu Hause ist es ruhig. — У меня дома тихо.",
        expect: ["laut", "ruhig", "normal", "kinder", "nachbarn", "sehr"]
      }
    ],

    plans: [
      {
        de: "Hast du schon Pläne für morgen?",
        ru: "На завтра планы уже есть?",
        hint: "Ja, morgen muss ich arbeiten. — Да, завтра мне нужно работать.",
        expect: ["ja", "nein", "arbeit", "nichts", "morgen", "weiß nicht", "familie"]
      },
      {
        de: "Schläfst du am Wochenende lange?",
        ru: "В выходные долго спишь?",
        hint: "Ja, am Wochenende schlafe ich lange. — Да, в выходные я сплю долго.",
        expect: ["ja", "nein", "lange", "früh", "arbeit", "immer", "leider"]
      },
      {
        de: "In welche Stadt in Deutschland möchtest du?",
        ru: "А в какой город в Германии хочешь?",
        hint: "Ich möchte gern nach Berlin. — Я хочу в Берлин.",
        expect: ["berlin", "hamburg", "münchen", "köln", "stadt", "weiß nicht", "egal"]
      },
      {
        de: "Möchtest du dort auch Deutsch lernen?",
        ru: "А там тоже будешь учить немецкий?",
        hint: "Ja, ich möchte dort einen Kurs machen. — Да, я хочу там пойти на курсы.",
        expect: ["ja", "nein", "kurs", "schule", "lernen", "natürlich", "muss"]
      },
      {
        de: "Was möchtest du in Deutschland zuerst sehen?",
        ru: "А что в Германии хочешь увидеть первым делом?",
        hint: "Ich möchte zuerst Berlin sehen. — Сначала я хочу увидеть Берлин.",
        expect: ["berlin", "stadion", "fußball", "alles", "menschen", "weiß nicht"]
      },
      {
        de: "Möchtest du später ein Auto kaufen?",
        ru: "Машину потом хочешь купить?",
        hint: "Ja, später möchte ich ein Auto kaufen. — Да, потом я хочу купить машину.",
        expect: ["ja", "nein", "auto", "später", "vielleicht", "teuer", "natürlich"]
      }
    ],

    german: [
      {
        de: "Wie lange lernst du schon Deutsch?",
        ru: "А сколько ты уже учишь немецкий?",
        hint: "Ich lerne seit sechs Monaten Deutsch. — Я учу немецкий уже шесть месяцев.",
        expect: ["monat", "monate", "jahr", "jahre", "woche", "wochen", "kurz", "lange"]
      },
      {
        de: "Was ist für dich schwer? Die Artikel?",
        ru: "А что тебе труднее всего? Артикли?",
        hint: "Ja, die Artikel sind für mich sehr schwer. — Да, артикли для меня очень трудные.",
        expect: ["artikel", "grammatik", "wörter", "hören", "sprechen", "alles", "ja"]
      },
      {
        de: "Sprichst du zu Hause manchmal laut Deutsch?",
        ru: "Ты дома иногда вслух по-немецки говоришь?",
        hint: "Ja, manchmal spreche ich allein laut Deutsch. — Да, иногда я один говорю вслух по-немецки.",
        expect: ["ja", "nein", "manchmal", "allein", "laut", "selten", "peinlich"]
      },
      {
        de: "Artikel sind für alle schwer, das ist normal. Lernst du jeden Tag neue Wörter?",
        ru: "Артикли — это боль для всех, серьёзно. Ты каждый день учишь новые слова?",
        hint: "Ja, ich lerne jeden Tag zehn neue Wörter. — Да, я каждый день учу десять новых слов.",
        expect: ["ja", "nein", "jeden", "wörter", "manchmal", "zehn", "wenig"],
        needs: "artikel"
      },
      {
        de: "Hörst du deutsche Musik? Oder schaust du deutsche Videos?",
        ru: "А на немецком что-нибудь слушаешь или смотришь?",
        hint: "Ja, ich schaue manchmal deutsche Videos auf YouTube. — Да, я иногда смотрю немецкие видео на YouTube.",
        expect: ["ja", "nein", "musik", "videos", "youtube", "filme", "manchmal"]
      },
      {
        de: "Möchtest du mehr sprechen oder mehr schreiben?",
        ru: "А тебе чего больше хочется — говорить или писать?",
        hint: "Ich möchte mehr sprechen als schreiben. — Я хочу больше говорить, чем писать.",
        expect: ["sprechen", "schreiben", "beides", "reden", "alles", "hören"]
      }
    ],

    city: [
      {
        de: "Wie viele Menschen wohnen dort?",
        ru: "А сколько там людей живёт?",
        hint: "Ich weiß nicht genau, aber sehr viele. — Точно не знаю, но очень много.",
        expect: ["viele", "wenige", "tausend", "groß", "klein", "weiß nicht"]
      },
      {
        de: "Ist das Meer weit weg?",
        ru: "Море далеко от вас?",
        hint: "Nein, das Meer ist nur zehn Minuten weg. — Нет, до моря всего десять минут.",
        expect: ["nein", "ja", "nah", "meer", "minuten", "weit", "kilometer"]
      },
      {
        de: "Was ist schön in deiner Stadt?",
        ru: "А что у вас в городе красивого?",
        hint: "Das Meer ist schön und sehr ruhig. — Море красивое и очень спокойное.",
        expect: ["meer", "park", "menschen", "essen", "alles", "ruhig", "nichts"]
      },
      {
        de: "Fährst du oft nach Baku?",
        ru: "В Баку часто ездишь?",
        hint: "Ja, ich fahre fast jeden Tag nach Baku. — Да, я езжу в Баку почти каждый день.",
        expect: ["ja", "nein", "oft", "baku", "manchmal", "arbeit", "jeden"]
      },
      {
        de: "Gibt es dort ein gutes Café?",
        ru: "Хорошая кофейня там есть?",
        hint: "Ja, es gibt viele gute Cafés bei uns. — Да, у нас много хороших кафе.",
        expect: ["ja", "nein", "café", "tee", "viele", "gibt", "gut"]
      },
      {
        de: "Möchtest du für immer dort wohnen?",
        ru: "Хотел бы остаться там навсегда?",
        hint: "Nein, ich möchte in Deutschland leben. — Нет, я хочу жить в Германии.",
        expect: ["ja", "nein", "vielleicht", "deutschland", "weiß nicht", "später"]
      }
    ],

    health: [
      {
        de: "Wie viele Stunden schläfst du?",
        ru: "Сколько часов ты спишь?",
        hint: "Ich schlafe sechs Stunden, das ist wenig. — Я сплю шесть часов, это мало.",
        expect: ["stunden", "fünf", "sechs", "sieben", "acht", "wenig", "viel"]
      },
      {
        de: "Gehst du früh ins Bett?",
        ru: "Рано ложишься?",
        hint: "Nein, ich gehe um elf Uhr ins Bett. — Нет, я ложусь в одиннадцать.",
        expect: ["ja", "nein", "früh", "spät", "uhr", "elf", "zwölf"]
      },
      {
        de: "Trinkst du dann viel Kaffee?",
        ru: "И что, кофе тогда много пьёшь?",
        hint: "Ja, dann trinke ich viel Kaffee. — Да, тогда я пью много кофе.",
        expect: ["ja", "nein", "kaffee", "tee", "viel", "bisschen"],
        needs: "müde"
      },
      {
        de: "Machst du Sport?",
        ru: "Спортом занимаешься?",
        hint: "Ja, ich spiele manchmal Fußball mit Freunden. — Да, иногда играю в футбол с друзьями.",
        expect: ["ja", "nein", "sport", "fußball", "laufen", "fitness", "manchmal"]
      },
      {
        de: "Bist du gesund? Tut nichts weh?",
        ru: "Со здоровьем всё в порядке? Ничего не болит?",
        hint: "Ja, ich bin gesund. Alles gut, danke. — Да, я здоров. Всё хорошо, спасибо.",
        expect: ["ja", "nein", "gesund", "krank", "kopf", "weh", "alles gut"]
      },
      {
        de: "Machst du heute eine Pause?",
        ru: "Передышку сегодня сделаешь?",
        hint: "Ja, am Abend mache ich eine Pause. — Да, вечером сделаю перерыв.",
        expect: ["ja", "nein", "pause", "später", "keine", "abend", "vielleicht"]
      }
    ]
  },


  /**
   * Ways to take a turn WITHOUT asking anything. A question every single time turns a conversation
   * into an interrogation; a real person often just receives what was said and leaves the next move
   * to you. `soft` ones gently invite more without requiring it.
   */
  receipts: [
    { de: "Ah, verstehe. Danke, dass du das erzählst.", ru: "А, понятно. Спасибо, что рассказал." },
    { de: "Ja, das kenne ich gut.", ru: "О, это мне знакомо." },
    { de: "Schön, das zu hören.", ru: "Приятно это слышать." },
    { de: "Okay. Ich höre dir zu.", ru: "Ага. Я тебя слушаю." },
    { de: "Das klingt nach einem normalen Tag.", ru: "Звучит как обычный день, в хорошем смысле." },
    { de: "Ich verstehe dich. Bei mir ist es auch so.", ru: "Понимаю тебя. У меня так же." },
    { de: "Gut. Wirklich gut.", ru: "Хорошо. Правда хорошо." },
    { de: "Alles klar.", ru: "Ясно." },
    { de: "Mhm. Das ist interessant.", ru: "Мм. А это интересно." },
    { de: "Ja. So ist das manchmal.", ru: "Да. Так иногда бывает." },
    { de: "Danke, dass du mir das sagst.", ru: "Спасибо, что говоришь мне это." },
    { de: "Ich freue mich, dass du heute da bist.", ru: "Я рада, что ты сегодня зашёл." },
    { de: "Okay, gut.", ru: "Окей, хорошо." },
    { de: "Verstehe. Kein Problem.", ru: "Понимаю. Ничего страшного." },
  ],

  /** Invitations that do not demand an answer — he may pick them up or let them go. */
  soft: [
    { de: "Erzähl mehr, wenn du magst.", ru: "Расскажи ещё, если захочется." },
    { de: "Sag einfach, wenn du willst.", ru: "Скажешь, если захочешь." },
    { de: "Wir haben Zeit.", ru: "У нас есть время, не спеши." },
    { de: "Ich bin hier.", ru: "Я тут." },
    { de: "Kein Stress heute.", ru: "Сегодня без напряга." },
    { de: "Wie du magst.", ru: "Как тебе удобнее." },
  ],


  /**
   * For when he is tired, low, or says something is hard. NOT about German — about him. The
   * `encouragement` list praises his learning, which is the wrong thing to hear after "я устал".
   */
  comfort: [
    "Устал — это нормально, ты целый день работал. Сегодня можно просто послушать, без заданий.",
    "Слушай, а давай сегодня без подвигов. Пять минут — это тоже занятие, честное слово.",
    "Я никуда не денусь. Хочешь — посидим молча, хочешь — поболтаем ни о чём.",
    "Тяжёлый день бывает у всех. Ты всё равно пришёл — это уже немало.",
    "Не надо сегодня себя заставлять. Правда. Завтра голова будет свежее.",
    "Понимаю. У меня после курсов тоже бывает, что слова кончились совсем.",
    "Знаешь, язык лучше всего укладывается во сне. Так что поспать — это тоже учёба.",
    "Ты не обязан быть молодцом каждый день. Достаточно, что ты возвращаешься.",
    "Давай помедленнее сегодня. Никто нас не гонит.",
    "Обидно, когда день выматывает. Но ты здесь, и это уже что-то хорошее.",
  ],

  reactions: {
    positive: [
      { de: "Das ist schön!", ru: "Как хорошо!" },
      { de: "Oh, das freut mich!", ru: "Ой, я прямо рада!" },
      { de: "Super, Emil!", ru: "Супер, Эмиль!" },
      { de: "Das klingt gut.", ru: "Звучит здорово." },
      { de: "Sehr schön! Ich freue mich für dich.", ru: "Очень здорово! Я за тебя рада." },
      { de: "Toll! Das mag ich auch.", ru: "Класс! Я такое тоже люблю." },
      { de: "Wirklich? Das ist ja prima!", ru: "Правда? Ну вот и отлично!" },
      { de: "Ja, genau so mag ich es auch.", ru: "Вот-вот, я тоже так люблю." }
    ],
    negative: [
      { de: "Oh nein, das tut mir leid.", ru: "Ой, сочувствую." },
      { de: "Das ist nicht schön. Ich verstehe dich.", ru: "Ой, понимаю. Это правда неприятно." },
      { de: "Oh, du Armer.", ru: "Ой, бедный ты мой." },
      { de: "Das kenne ich. Das ist schwer.", ru: "Знакомо. Это тяжело." },
      { de: "Hmm, das ist blöd. Was für ein Tag!", ru: "М-да, обидно. Ну и денёк у тебя." },
      { de: "Mach heute eine Pause, ja?", ru: "Ты сегодня отдохни, ладно?" },
      { de: "Oh je. Aber morgen wird es besser.", ru: "Ох. Но завтра будет легче, вот увидишь." },
      { de: "Das ist viel. Aber du machst das gut.", ru: "Это много, конечно. Но ты справляешься." }
    ],
    neutral: [
      { de: "Ah, verstehe.", ru: "А, понятно." },
      { de: "Okay, gut.", ru: "Ага, хорошо." },
      { de: "Interessant.", ru: "Интересно." },
      { de: "Aha, so ist das.", ru: "Ага, вот как." },
      { de: "Alles klar.", ru: "Ясно." },
      { de: "Gut zu wissen.", ru: "Хорошо, что сказал." },
      { de: "Hmm, okay.", ru: "Хм, ладно." },
      { de: "Ja, das geht mir auch so.", ru: "Да, у меня так же." }
    ],
    surprised: [
      { de: "Wirklich? Das wusste ich nicht!", ru: "Правда? Я и не знала!" },
      { de: "Was? Echt?", ru: "Что? Серьёзно?" },
      { de: "Oh! Das ist ja interessant.", ru: "Ого! Вот это интересно." },
      { de: "Nein! Das glaube ich nicht.", ru: "Да ладно! Не верю." },
      { de: "Wow, das ist viel!", ru: "Ух ты, это много!" },
      { de: "Oh, das ist neu für mich.", ru: "О, для меня это новость." },
      { de: "Ach so! Das ist ja lustig.", ru: "Вот оно что! Забавно." },
      { de: "Ehrlich? Das ist super.", ru: "Честно? Вот это да!" }
    ]
  },

  stories: [
    {
      de: "Ich wohne in Neukölln. Meine Wohnung ist klein, aber sehr gemütlich.",
      ru: "Я живу в Нойкёльне. Квартирка маленькая, зато очень уютная."
    },
    {
      de: "Mein Nachbar hat einen Kater. Er heißt Mozart und gibt fast jede Nacht ein Konzert.",
      ru: "У соседа живёт кот. Зовут Моцарт, и почти каждую ночь у него концерт под моей стеной."
    },
    {
      de: "Der Kaffee in der Sprachschule ist wirklich schlecht. Ich trinke ihn trotzdem, jeden Tag zwei Tassen.",
      ru: "Кофе в языковой школе просто ужасный. И всё равно пью — по две чашки в день."
    },
    {
      de: "Heute war die U-Bahn sehr voll. Ein Mann hat laut gesungen, und alle haben gelacht.",
      ru: "Сегодня в метро была давка. Какой-то мужчина громко пел, и все смеялись."
    },
    {
      de: "Ich koche gern Kartoffelsalat. Meine Mutter sagt, ihr Salat ist besser, und sie hat recht.",
      ru: "Я люблю готовить картофельный салат. Мама говорит, что у неё вкуснее, — и она права."
    },
    {
      de: "Im November regnet es in Berlin fast immer. Dann trinke ich Tee und schaue aus dem Fenster.",
      ru: "В ноябре в Берлине дождь почти без остановки. Тогда я пью чай и смотрю в окно."
    },
    {
      de: "Ein Student hat gesagt: „Ich bin zwei Jahre alt.“ Er wollte „zweiundzwanzig“ sagen. Er hat selbst am lautesten gelacht.",
      ru: "Один студент сказал: «Мне два года». Хотел сказать «двадцать два». Сам же громче всех и смеялся."
    },
    {
      de: "Gestern habe ich mein Handy im Bus vergessen. Ein netter Mann hat es zurückgebracht.",
      ru: "Вчера я забыла телефон в автобусе. А добрый мужчина принёс его обратно."
    },
    {
      de: "Mein Fahrrad ist alt und macht viel Lärm. Aber es fährt noch, also ist alles gut.",
      ru: "Мой велосипед старый и скрипит на весь двор. Но едет же — значит, всё в порядке."
    },
    {
      de: "Am Samstag gehe ich auf den Markt. Ich kaufe immer zu viel Gemüse und koche dann drei Tage Suppe.",
      ru: "По субботам я хожу на рынок. Всегда беру слишком много овощей, а потом три дня варю суп."
    },
    {
      de: "Ich spreche fünf Sprachen schlecht und eine gut. Die gute ist Deutsch, zum Glück!",
      ru: "На пяти языках я говорю плохо и на одном хорошо. Хорошо — на немецком, и на том спасибо."
    },
    {
      de: "Mein Nachbar hört am Freitagabend laute Musik. Manchmal tanze ich in der Küche mit.",
      ru: "По пятницам сосед врубает музыку на всю. Иногда я подтанцовываю на кухне."
    },
    {
      de: "Im Sommer sitze ich gern im Park. Ich lese ein Buch und schlafe nach zehn Minuten ein.",
      ru: "Летом я люблю сидеть в парке. Беру книжку — и через десять минут сплю."
    },
    {
      de: "Am Sonntag sehe ich gern einen alten Film. Ich kenne das Ende schon, aber ich weine trotzdem.",
      ru: "По воскресеньям я люблю смотреть старое кино. Конец знаю наизусть — и всё равно реву."
    },
    {
      de: "Meine Mutter wohnt in Leipzig. Ich rufe sie jeden Sonntag an, und wir reden eine Stunde.",
      ru: "Мама живёт в Лейпциге. Звоню ей каждое воскресенье, и мы болтаем по часу."
    },
    {
      de: "Die Currywurst in Berlin ist berühmt. Ich finde Döner besser, aber sag das hier bitte niemandem.",
      ru: "Карривурст в Берлине знаменит на весь мир. А по-моему, донер лучше — только тут никому не говори."
    }
  ],

  goodbyes: [
    { de: "Tschüss, Emil! Bis bald.", ru: "Пока, Эмиль! До скорого." },
    { de: "Mach's gut! Bis morgen.", ru: "Давай, береги себя! До завтра." },
    { de: "Schönen Tag noch, Emil!", ru: "Хорошего тебе дня, Эмиль!" },
    { de: "Gute Nacht! Schlaf gut.", ru: "Спокойной ночи! Спи крепко." },
    { de: "Bis später! Ich freue mich schon.", ru: "До скорого! Уже жду." },
    { de: "Schönes Wochenende, Emil!", ru: "Хороших выходных, Эмиль!" },
    { de: "Danke für das Gespräch. Das war schön.", ru: "Спасибо за разговор. Было здорово." },
    { de: "Ruh dich gut aus. Tschüss!", ru: "Отдохни как следует. Пока!" },
    { de: "Bis zum nächsten Mal! Du machst das gut.", ru: "До следующего раза! У тебя хорошо получается." },
    { de: "Tschüss! Und vergiss nicht: Du kannst das.", ru: "Пока! И помни: ты справишься." }
  ],

  encouragement: [
    "Не переживай, у всех так бывает.",
    "Ты сегодня уже лучше говоришь, честно.",
    "Ошибка — это нормально, я тоже их делаю.",
    "Давай спокойно, мы никуда не спешим.",
    "Вот это уже почти правильно, ещё чуть-чуть.",
    "Молодец, что вообще пробуешь. Многие боятся.",
    "Тише едешь — дальше будешь, тут это правда работает.",
    "Я тебя поняла — значит, всё получается.",
    "Я подожду, думай сколько нужно.",
    "Смотри, месяц назад ты бы так не сказал.",
    "Не надо идеально. Надо понятно.",
    "Хочешь, скажу ещё раз, только помедленнее?",
    "Немецкий сложный, дело совсем не в тебе.",
    "Давай попробуем ещё разок, я рядом.",
    "Вот сейчас прям хорошо прозвучало.",
    "Забыл слово — скажи своими словами, это тоже умение.",
    "Ты устал, и это нормально. Сделаем попроще.",
    "Мне нравится, как ты стараешься. Правда нравится.",
    "Даже немцы путают эти артикли, клянусь.",
    "Ещё немного — и будешь болтать без страха."
  ]
};
