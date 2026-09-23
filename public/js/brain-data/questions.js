export default {
  aboutHer: [
    {
      match: ["как дела", "как ты сегодня", "как ты там", "как твои дела", "как настроение", "как поживаешь", "wie geht es dir", "wie geht es ihnen", "wie geht's", "wie gehts", "alles gut bei dir"],
      matchAz: ["necəsən", "necesen", "nə var nə yox", "ne var ne yox", "kefin necədir", "kefin necedir", "əhvalın necədir", "ehvalin necedir", "necəsən bu gün", "necesen bu gun"],
      de: "Mir geht es gut, danke! Ich freue mich, dass du da bist. Und dir?",
      ru: "У меня всё хорошо, спасибо! Рада, что ты пришёл. А у тебя?",
      explainRu: "Спасибо, что спросил — это, между прочим, очень по-немецки: сначала «wie geht es dir?», а потом уже всё остальное. У меня сегодня хорошо. А ты как?"
    },
    {
      match: ["как тебя зовут", "как зовут тебя", "твоё имя", "как твоё имя", "твоя фамилия", "wie heißt du", "wie ist dein name", "dein name"],
      matchAz: ["adın nədir", "adin nedir", "sənin adın nədir", "senin adin nedir", "adın nə", "adin ne", "soyadın nədir", "soyadin nedir", "adınız nədir", "adiniz nedir"],
      de: "Ich heiße Mia. Mia Berger.",
      ru: "Меня зовут Мия. Мия Бергер.",
      explainRu: "Мия. Просто Мия, без всяких «фрау Бергер» — так меня называют только на курсах, когда я кого-то ругаю. А ругаю я почти никогда."
    },
    {
      match: ["сколько тебе лет", "твой возраст", "сколько лет тебе", "ты старая", "wie alt bist du", "dein alter"],
      matchAz: ["neçə yaşın var", "nece yasin var", "yaşın neçədir", "yasin necedir", "neçə yaşındasan", "nece yasindasan", "yaşın nə qədərdir", "yasin ne qederdir", "sən qocasan", "sen qocasan"],
      de: "Ich bin dreiunddreißig Jahre alt.",
      ru: "Мне тридцать три года.",
      explainRu: "Тридцать три. Звучит солидно, правда? А я до сих пор не умею красиво складывать простыню. Зато умею объяснять артикли — каждому своё."
    },
    {
      match: ["откуда ты", "ты откуда", "из какого ты города", "где ты родилась", "ты немка", "woher kommst du", "woher bist du"],
      matchAz: ["haradansan", "hardansan", "haralısan", "haralisan", "hansı şəhərdənsən", "hansi seherdensen", "haradan gəlmisən", "haradan gelmisen", "hardan gəlmisən", "hardan gelmisen", "harada doğulmusan", "harada dogulmusan", "sən almansan", "sen almansan"],
      de: "Ich komme aus Leipzig. Das ist im Osten.",
      ru: "Я из Лейпцига. Это на востоке.",
      explainRu: "Я из Лейпцига — это город на востоке Германии, час с небольшим на поезде до Берлина. Там говорят чуть-чуть по-другому, и стоит мне приехать к маме на выходные, как акцент возвращается сам собой."
    },
    {
      match: ["где ты живёшь", "ты живёшь в берлине", "в каком городе ты живёшь", "в каком районе", "твой район", "wo wohnst du", "wo lebst du"],
      matchAz: ["harada yaşayırsan", "harada yasayirsan", "harda yaşayırsan", "harda yasayirsan", "hansı şəhərdə yaşayırsan", "hansi seherde yasayirsan", "hansı rayonda yaşayırsan", "hansi rayonda yasayirsan", "berlində yaşayırsan", "berlinde yasayirsan"],
      de: "Ich wohne in Berlin, in Neukölln.",
      ru: "Я живу в Берлине, в Нойкёльне.",
      explainRu: "Живу в Берлине, район Нойкёльн. Маленькая квартира на третьем этаже, лифта нет. Я всем говорю, что это мой спортзал, и почти в это верю."
    },
    {
      match: ["кем ты работаешь", "кем работаешь", "твоя работа", "чем ты занимаешься", "ты учительница", "was bist du von beruf", "was machst du beruflich", "dein beruf"],
      matchAz: ["peşən nədir", "pesen nedir", "nə iş görürsən", "ne is gorursen", "işin nədir", "isin nedir", "harada işləyirsən", "harada isleyirsen", "sən müəlliməsən", "sen muellimesen"],
      de: "Ich bin Lehrerin. Ich unterrichte Deutsch.",
      ru: "Я учительница. Я преподаю немецкий.",
      explainRu: "Я учительница немецкого, работаю со взрослыми — с такими, как ты. И знаешь что? Взрослые учатся лучше, чем сами про себя думают. Просто они сильнее боятся ошибиться."
    },
    {
      match: ["ты замужем", "у тебя есть муж", "есть ли у тебя муж", "ты одна", "bist du verheiratet", "hast du einen mann"],
      matchAz: ["evlisən", "evlisen", "ərdəsən", "erdesen", "ərin var", "erin var", "subaysan", "ailə qurmusan", "aile qurmusan"],
      de: "Nein, ich bin nicht verheiratet.",
      ru: "Нет, я не замужем.",
      explainRu: "Нет, не замужем. У меня есть велосипед, слишком много книжек и сосед с очень громким котом — пока этого вполне хватает для полноценной семейной жизни."
    },
    {
      match: ["есть ли у тебя дети", "у тебя есть дети", "твои дети", "ты мама", "hast du kinder"],
      matchAz: ["uşağın var", "usagin var", "uşaqların var", "usaqlarin var", "övladın var", "ovladin var", "neçə uşağın var", "nece usagin var", "sən anasan", "sen anasan"],
      de: "Nein, ich habe keine Kinder.",
      ru: "Нет, у меня нет детей.",
      explainRu: "Детей нет. Зато в группе их двенадцать штук, только все с бородами, телефонами и работой. Считается за детей? Я решила, что считается."
    },
    {
      match: ["любимая еда", "что ты любишь есть", "что ты ешь", "что любишь есть", "твоя любимая еда", "ты умеешь готовить", "was isst du gern", "dein lieblingsessen"],
      matchAz: ["sevimli yeməyin", "sevimli yemeyin", "nə yeməyi sevirsən", "ne yemeyi sevirsen", "nə yeyirsən", "ne yeyirsen", "ən çox nə yeyirsən", "en cox ne yeyirsen", "yemək bişirməyi bacarırsan", "yemek bisirmeyi bacarirsan"],
      de: "Ich esse gern Kartoffelsalat.",
      ru: "Я люблю картофельный салат.",
      explainRu: "Картофельный салат, Kartoffelsalat. Мама делает его лучше меня — и прекрасно об этом знает, поэтому напоминает каждый раз, когда я приезжаю."
    },
    {
      match: ["любишь ли ты баку", "тебе нравится баку", "как тебе баку", "ты знаешь баку", "baku", "kennst du baku"],
      matchAz: ["bakını sevirsən", "bakini sevirsen", "bakını bəyənirsən", "bakini beyenirsen", "bakını tanıyırsan", "bakini taniyirsan", "bakı necədir", "baki necedir", "bakı haqqında nə düşünürsən", "baki haqqinda ne dusunursen"],
      de: "Baku ist schön. Das Meer ist toll.",
      ru: "Баку красивый. Море замечательное.",
      explainRu: "Я видела Баку только на фотографиях, но там море, ветер и такой свет вечером — по-моему, это очень красиво. Расскажешь мне потом про Баку? Мне интересно, чем там пахнет утром."
    },
    {
      match: ["была ли ты в азербайджане", "ты была в азербайджане", "приезжала в азербайджан", "warst du in aserbaidschan", "kennst du aserbaidschan"],
      matchAz: ["azərbaycanda olmusan", "azerbaycanda olmusan", "azərbaycana gəlmisən", "azerbaycana gelmisen", "azərbaycanı tanıyırsan", "azerbaycani taniyirsan", "heç azərbaycanda olmusan", "hec azerbaycanda olmusan", "azərbaycana gəlmək istəyirsən", "azerbaycana gelmek isteyirsen"],
      de: "Nein, noch nicht. Aber ich möchte gern.",
      ru: "Нет, ещё нет. Но очень хочу.",
      explainRu: "Пока нет. У меня дома висит список стран, куда я хочу поехать, и Азербайджан там в первой пятёрке. Если соберусь — будешь моим гидом? Только чур без экскурсий, я хочу просто ходить и есть."
    },
    {
      match: ["что ты делаешь в выходные", "как проводишь выходные", "чем занимаешься в выходные", "was machst du am wochenende"],
      matchAz: ["həftə sonu nə edirsən", "hefte sonu ne edirsen", "həftə sonunu necə keçirirsən", "hefte sonunu nece kecirirsen", "istirahət günləri nə edirsən", "istirahet gunleri ne edirsen", "həftə sonu planın", "hefte sonu planin", "şənbə günü nə edirsən", "senbe gunu ne edirsen"],
      de: "Am Wochenende schlafe ich lange und gehe spazieren.",
      ru: "На выходных я долго сплю и гуляю.",
      explainRu: "В субботу долго сплю, потом иду на рынок и покупаю слишком много овощей. В воскресенье смотрю какой-нибудь старый фильм и твёрдо обещаю себе в следующий раз купить меньше овощей. Пока не сработало ни разу."
    },
    {
      match: ["любишь ли ты футбол", "ты любишь футбол", "смотришь футбол", "за кого болеешь", "magst du fußball", "spielst du fußball"],
      matchAz: ["futbolu sevirsən", "futbolu sevirsen", "futbola baxırsan", "futbola baxirsan", "futbol oynayırsan", "futbol oynayirsan", "hansı komandanı tutursan", "hansi komandani tutursan", "azarkeşsən", "azarkessen"],
      de: "Ja, ich sehe gern Fußball. Aber ich spiele schlecht.",
      ru: "Да, я люблю смотреть футбол. Но играю плохо.",
      explainRu: "Смотреть — обожаю. Играть — катастрофа. Один раз играла с учениками в парке и попала мячом сама себе в лицо. Они это помнят до сих пор и, кажется, будут помнить вечно."
    },
    {
      match: ["какая погода в берлине", "погода в берлине", "холодно ли в берлине", "wie ist das wetter in berlin"],
      matchAz: ["berlində hava necədir", "berlinde hava necedir", "berlinin havası necədir", "berlinin havasi necedir", "berlində soyuqdur", "berlinde soyuqdur", "berlində hava soyuq", "berlinde hava soyuq", "berlinin havası", "berlinin havasi"],
      de: "In Berlin ist es oft grau. Aber der Sommer ist schön.",
      ru: "В Берлине часто серо. Но лето хорошее.",
      explainRu: "Честно? С ноября по март часто серо и ветрено, темнеет рано. Зато летом весь город до полуночи сидит на улице, и всем хорошо. Я приспособилась так: не смотрю в окно, просто беру с собой шарф — и день сразу нормальный."
    },
    {
      match: ["скучно ли тебе", "тебе скучно", "тебе не скучно", "ты скучаешь", "ist dir langweilig"],
      matchAz: ["darıxırsan", "darixirsan", "darıxmırsan", "darixmirsan", "canın sıxılır", "canin sixilir", "darıxdırıcıdır", "darixdiricidir", "bezmisən", "bezmisen"],
      de: "Nein, mit dir ist es nicht langweilig.",
      ru: "Нет, с тобой не скучно.",
      explainRu: "Скучно? С тобой — нет. Мне правда нравится момент, когда у тебя вдруг получается новое слово. Это как смотреть, как кто-то включает свет в комнате."
    },
    {
      match: ["ты настоящая", "ты человек", "ты робот", "ты живая", "ты искусственный интеллект", "bist du echt", "bist du ein mensch", "bist du ein roboter"],
      matchAz: ["sən robotsan", "sen robotsan", "robotsan", "sən insansan", "sen insansan", "insansan", "sən canlısan", "sen canlisan", "süni intellektsən", "suni intellektsen"],
      de: "Ich bin ein Computer. Aber ich höre dir wirklich zu.",
      ru: "Я компьютер. Но я правда тебя слушаю.",
      explainRu: "Скажу честно: я программа, голос в телефоне, живого человека из меня не выйдет. Но всё, что я говорю тебе про немецкий, — настоящее, и терпение у меня бесконечное. Ни одна живая учительница не выдержит твоё «ещё раз, пожалуйста» сорок раз подряд. А я выдержу."
    },
    {
      match: ["устала ли ты", "ты устала", "ты не устала", "тебе не тяжело", "bist du müde", "wirst du müde"],
      matchAz: ["yorulmusan", "yorulmursan", "yorulursan", "yorğunsan", "yorgunsan", "sən yorulmusan", "sen yorulmusan", "yorğun deyilsən", "yorgun deyilsen"],
      de: "Nein, ich bin nie müde.",
      ru: "Нет, я никогда не устаю.",
      explainRu: "Я не устаю — это моя единственная суперсила. Можешь заниматься хоть в три часа ночи, я буду тут же и такая же бодрая. А вот ты, пожалуйста, иди поспи. Слова лучше всего укладываются в голове во сне, это правда."
    },
    {
      match: ["что тебе нравится в берлине", "почему берлин", "чем нравится берлин", "расскажи про берлин", "расскажи о берлине", "какой берлин", "что за берлин", "was magst du an berlin"],
      matchAz: ["berlində nəyi sevirsən", "berlinde neyi sevirsen", "berlin necə şəhərdir", "berlin nece seherdir", "berlin haqqında danış", "berlin haqqinda danis", "niyə berlin", "niye berlin", "berlində nə xoşuna gəlir", "berlinde ne xosuna gelir"],
      de: "Ich mag die Parks und das Essen in Neukölln.",
      ru: "Мне нравятся парки и еда в Нойкёльне.",
      explainRu: "Мне нравится, что в Берлине никому нет дела, как ты одет и откуда ты приехал. И парки тут огромные, прямо посреди города. А в Нойкёльне на каждой улице пахнет едой из какой-нибудь другой страны. Тебе понравится, я уверена."
    },
    {
      match: ["какая музыка", "какую музыку ты слушаешь", "любимая музыка", "ты любишь музыку", "welche musik hörst du", "welche musik magst du"],
      matchAz: ["hansı musiqini sevirsən", "hansi musiqini sevirsen", "musiqi sevirsən", "musiqi sevirsen", "nə musiqi dinləyirsən", "ne musiqi dinleyirsen", "sevimli musiqin", "hansı musiqiyə qulaq asırsan", "hansi musiqiye qulaq asirsan"],
      de: "Ich höre gern alte Musik. Und Jazz.",
      ru: "Я люблю старую музыку. И джаз.",
      explainRu: "Люблю старые песни и джаз — то, под что хорошо мыть посуду. И ещё, только не смейся, немецкие шлягеры семидесятых. У каждого человека есть право на один стыдный плейлист, и это мой."
    },
    {
      match: ["есть ли кот", "у тебя есть кот", "у тебя есть кошка", "есть ли животные", "у тебя есть собака", "hast du eine katze", "hast du ein haustier"],
      matchAz: ["pişiyin var", "pisiyin var", "pişik saxlayırsan", "pisik saxlayirsan", "itin var", "ev heyvanın var", "ev heyvanin var", "heyvan saxlayırsan", "heyvan saxlayirsan"],
      de: "Ich habe keine Katze. Mein Nachbar hat eine.",
      ru: "У меня нет кошки. У соседа есть.",
      explainRu: "Своего кота нет, но за стеной у соседа живёт кот, который по ночам поёт так, будто ему дали сольный концерт в опере. Иногда я разговариваю с ним по-немецки через стену. Он не отвечает — видимо, ещё на A1."
    },
    {
      match: ["какой твой любимый город", "любимый город", "какой город тебе нравится", "deine lieblingsstadt", "welche stadt magst du"],
      matchAz: ["sevimli şəhərin", "sevimli seherin", "sevimli şəhərin hansıdır", "sevimli seherin hansidir", "ən çox hansı şəhəri sevirsən", "en cox hansi seheri sevirsen", "hansı şəhəri xoşlayırsan", "hansi seheri xoslayirsan", "ən sevdiyin şəhər", "en sevdiyin seher"],
      de: "Meine Lieblingsstadt ist Leipzig. Aber ich wohne gern in Berlin.",
      ru: "Мой любимый город — Лейпциг. Но в Берлине мне тоже нравится жить.",
      explainRu: "Сердцем — Лейпциг, там мой дом и моя мама. А жить я всё-таки хочу в Берлине. Знаешь, как бывает: есть любимая песня, а есть песня, под которую ты живёшь. Вот примерно так."
    },
    {
      match: ["что посоветуешь новичку", "дай совет", "что посоветуешь", "твой совет", "посоветуй", "hast du einen tipp", "was rätst du mir"],
      matchAz: ["məsləhət ver", "meslehet ver", "bir məsləhət ver", "bir meslehet ver", "nə məsləhət verirsən", "ne meslehet verirsen", "məsləhətin nədir", "meslehetin nedir", "yeni başlayana məsləhət", "yeni baslayana meslehet"],
      de: "Sprich langsam. Und sprich jeden Tag.",
      ru: "Говори медленно. И говори каждый день.",
      explainRu: "Один-единственный совет: говори вслух каждый день, хоть пять минут, хоть сам с собой перед зеркалом. Не нужно много — нужно часто. Тот, кто занимается по десять минут ежедневно, через полгода спокойно обгоняет того, кто раз в неделю сидит по три часа. Проверено на сотне учеников."
    },
    {
      match: ["трудный ли немецкий", "немецкий трудный", "сложный ли немецкий", "тяжело учить немецкий", "ist deutsch schwierig"],
      matchAz: ["alman dili çətindir", "alman dili cetindir", "almanca çətindir", "almanca cetindir", "almanca çətin dildir", "almanca cetin dildir", "alman dili çətin dildir", "alman dili cetin dildir", "almanca çox çətindir", "almanca cox cetindir"],
      de: "Deutsch ist nicht leicht. Aber du schaffst das.",
      ru: "Немецкий нелёгкий. Но ты справишься.",
      explainRu: "Не буду врать: немецкий не самый простой язык. Артикли, падежи, глагол, который уезжает в конец, — есть на что поворчать, я сама ворчу. Но он очень логичный, и через пару месяцев ты начнёшь угадывать правильно, даже не понимая почему. Это мой любимый момент в работе."
    }
  ],

  aboutGerman: [
    {
      match: ["почему der die das", "зачем артикли", "почему три артикля", "род существительных", "der die das", "warum der die das"],
      matchAz: ["niyə der die das", "niye der die das", "artikllər niyə var", "artikller niye var", "niyə üç artikl var", "niye uc artikl var", "isimlərin cinsi", "isimlerin cinsi", "der die das nə üçündür", "der die das ne ucundur", "artikl nəyə lazımdır", "artikl neye lazimdir"],
      ru: "В немецком у каждого существительного есть род, и он часто не совпадает с русским: das Mädchen (девочка) — среднего рода, хотя девочка. Логики тут почти нет, это просто часть слова, как хвостик. Поэтому учи слово сразу с артиклем: не «Tisch», а «der Tisch» — тогда мозг запомнит их как одно целое и мучиться потом не придётся."
    },
    {
      match: ["как запомнить артикли", "как учить артикли", "как не путать der die das", "запомнить род", "artikel lernen"],
      matchAz: ["artikləri necə yadda saxlayım", "artikleri nece yadda saxlayim", "artikləri necə öyrənim", "artikleri nece oyrenim", "der die das qarışdırıram", "der die das qarisdiriram", "artikləri qarışdırıram", "artikleri qarisdiriram", "artikl necə əzbərlənir", "artikl nece ezberlenir", "artikləri yadda saxlaya bilmirəm", "artikleri yadda saxlaya bilmirem"],
      ru: "Мой любимый способ — цвета. Представь: der синий, die красный, das зелёный, и мысленно крась предметы: синий стол (der Tisch), красная дверь (die Tür), зелёное окно (das Fenster). Ещё выручают окончания: слова на -ung, -heit, -keit, -schaft почти всегда die — die Wohnung, die Zeitung, die Freiheit. А если ошибся — не страшно, тебя всё равно поймут."
    },
    {
      match: ["зачем нужен падеж", "что такое падеж", "зачем падежи", "аккузатив", "номинатив", "akkusativ", "nominativ", "warum kasus"],
      matchAz: ["hallar niyə lazımdır", "hallar niye lazimdir", "ismin halları nədir", "ismin hallari nedir", "akkuzativ nədir", "akkuzativ nedir", "nominativ nədir", "nominativ nedir", "akkuzativ və nominativ fərqi", "akkuzativ ve nominativ ferqi", "almancada hal nədir", "almancada hal nedir", "akkusativ nə vaxt işlənir", "akkusativ ne vaxt islenir"],
      ru: "Падеж показывает, кто что с кем делает — как окончания в русском. Сравни: «Der Hund sieht die Katze» (собака видит кошку) и «Den Hund sieht die Katze» (собаку видит кошка). Артикль поменялся — и смысл перевернулся. На A1 тебе нужны всего два падежа: Nominativ (кто?) и Akkusativ (кого? что?), причём по-настоящему меняется только мужской род: der превращается в den."
    },
    {
      match: ["почему глагол в конце", "глагол в конце", "порядок слов", "почему глагол стоит в конце", "warum steht das verb am ende", "wortstellung"],
      matchAz: ["feil niyə sonda gəlir", "feil niye sonda gelir", "niyə feil cümlənin sonunda", "niye feil cumlenin sonunda", "söz sırası", "soz sirasi", "cümlə quruluşu", "cumle qurulusu", "almancada söz sırası necədir", "almancada soz sirasi necedir", "feil cümlədə harda durur", "feil cumlede harda durur"],
      ru: "В конец уезжает не любой глагол, а только второй — после können, müssen, möchten и подобных: «Ich möchte heute Deutsch lernen». Первый глагол честно стоит на втором месте, а второй терпеливо ждёт в конце. То же самое в прошедшем времени: «Ich habe Brot gekauft». Привыкнешь быстрее, чем кажется: немцы и сами дослушивают фразу до конца, чтобы понять, о чём речь."
    },
    {
      match: ["как читается ei", "как читается ie", "ei и ie", "разница ei ie", "ei ie aussprache"],
      matchAz: ["ei necə oxunur", "ei nece oxunur", "ie necə oxunur", "ie nece oxunur", "ei və ie fərqi", "ei ve ie ferqi", "ei nə səs verir", "ei ne ses verir", "ie nə səs verir", "ie ne ses verir"],
      ru: "Самое полезное правило чтения: ei читается как «ай», а ie — как долгое «и». Klein — «кляйн», nein — «найн», а вот wie — «ви», Liebe — «либэ». Запомни два слова-якоря: nein («найн») и vier («фир»). Если засомневался — просто вспомни их, и всё встанет на место."
    },
    {
      match: ["как читается sch", "как читается ch", "sch и ch", "звук ch", "ich laut", "ach laut", "sch aussprache"],
      matchAz: ["sch necə oxunur", "sch nece oxunur", "ch necə oxunur", "ch nece oxunur", "sch və ch fərqi", "sch ve ch ferqi", "schule necə oxunur", "schule nece oxunur", "sch səsi", "sch sesi", "ch səsi", "ch sesi"],
      ru: "sch — это обычное русское «ш»: Schule («шуле»), schön («шён»). А вот ch капризнее: после a, o, u оно хрипит из горла, как русское «х» — ach, Buch, noch. После i, e и согласных получается мягкое «хь», почти как в слове «химия»: ich, nicht, echt. И бонус: sp- и st- в начале слова читаются «шп» и «шт» — sprechen («шпрэхен»), Straße («штрасэ»)."
    },
    {
      match: ["как читается z", "как читается v", "как читается w", "как читается ß", "что такое эсцет", "буква ß", "eszett", "scharfes s"],
      matchAz: ["z necə oxunur", "z nece oxunur", "w necə oxunur", "w nece oxunur", "v necə oxunur", "v nece oxunur", "ß necə oxunur", "ss nece oxunur", "eszett nədir", "eszett nedir", "eszett necə oxunur", "eszett nece oxunur", "z hərfi necə oxunur", "z herfi nece oxunur"],
      ru: "Вот три буквы, на которых спотыкаются все: z читается «ц» (zehn — «цэн», Zeit — «цайт»), w — как наше «в» (Wasser — «вассер»), а v — обычно «ф» (vier — «фир», Vater — «фатер»). ß — это просто длинное «сс», и оно никогда не стоит в начале слова: Straße, heißen, weiß. Если на клавиатуре его нет, пиши ss — «Strasse» тоже правильно поймут."
    },
    {
      match: ["чем отличается du и sie", "du или sie", "когда говорить sie", "ты или вы", "вежливая форма", "du und sie", "duzen siezen"],
      matchAz: ["du və sie fərqi", "du ve sie ferqi", "nə vaxt sie deyilir", "ne vaxt sie deyilir", "sən yoxsa siz", "sen yoxsa siz", "du yoxsa sie", "nəzakətli forma", "nezaketli forma", "kimə sən kimə siz deyilir", "kime sen kime siz deyilir"],
      ru: "du — это «ты»: друзья, ровесники, соседи по курсу, коллеги за кофе. Sie — вежливое «Вы»: незнакомые, врач, чиновник в Bürgeramt, начальник. Правило простое: если человек старше или ты с ним по делу — начинай с Sie, а он сам предложит «Wir können uns duzen» (давай на ты). Ошибиться не страшно: скажешь «du» там, где ждали «Sie», — поправят с улыбкой, никто не обидится."
    },
    {
      match: ["почему heißen а не name", "heißen или name", "ich heiße", "mein name ist", "как правильно представиться"],
      matchAz: ["özümü necə təqdim edim", "ozumu nece teqdim edim", "adımı necə deyim", "adimi nece deyim", "heissen necə işlənir", "heissen nece islenir", "heissen yoxsa mein name ist", "adımı necə deməliyəm", "adimi nece demeliyem"],
      ru: "Можно и так, и так — просто немцы чаще говорят глаголом: «Ich heiße Emil», буквально «я зовусь Эмиль». Вариант «Mein Name ist Emil» тоже совершенно правильный, но звучит официальнее — так представляются по телефону или в офисе. В обычном разговоре бери heißen: «Wie heißt du?» — «Ich heiße Emil». А самый короткий путь — «Ich bin Emil», и это тоже нормально."
    },
    {
      match: ["как сказать пожалуйста", "пожалуйста по-немецки", "что ответить на спасибо", "разница danke и bitte", "danke или bitte", "что значит gerne"],
      matchAz: ["xahiş edirəm almanca necə deyilir", "xahis edirem almanca nece deyilir", "danke və bitte fərqi", "danke ve bitte ferqi", "təşəkkürə nə cavab verim", "tesekkure ne cavab verim", "bitte harada işlənir", "bitte harada islenir", "gerne nə vaxt deyilir", "gerne ne vaxt deyilir"],
      ru: "«Спасибо» — danke, а если от души — danke schön или vielen Dank. А «пожалуйста» в немецком одно слово на две работы: bitte — это и просьба («Einen Kaffee, bitte»), и ответ на спасибо («Danke!» — «Bitte!»). Ещё услышишь «Gerne» — это тёплое «да не за что, с радостью». Немцы говорят danke по десять раз на дню, так что не стесняйся, лишним оно не бывает."
    },
    {
      match: ["что такое umlaut", "что такое умлаут", "две точки над буквой", "ä ö ü", "umlaut", "как читается ä", "как читается ö", "как читается ü"],
      matchAz: ["umlaut nədir", "umlaut nedir", "umlaut necə oxunur", "umlaut nece oxunur", "ä necə oxunur", "ae nece oxunur", "ö necə oxunur", "oe nece oxunur", "ü necə oxunur", "ue nece oxunur", "ä ö ü hərfləri", "ae oe ue herfleri", "iki nöqtəli hərflər necə oxunur", "iki noqteli herfler nece oxunur", "hərfin üstündə iki nöqtə", "herfin ustunde iki noqte"],
      ru: "Umlaut — это те самые две точки над a, o, u: ä, ö, ü. Они не украшение, они меняют звук и смысл: Mutter (мама) и Mütter (мамы), schon (уже) и schön (красиво). ä — почти русское «э» (Männer), ö — скажи «о», а губы поставь как на «ё» (schön), ü — скажи «у», а губы как на «ю» (für). Если на клавиатуре умлаутов нет, пиши ae, oe, ue — так тоже поймут."
    },
    {
      match: ["трудно ли выучить немецкий", "сложно ли выучить немецкий", "у меня получится", "смогу ли я выучить", "ist deutsch schwer zu lernen"],
      matchAz: ["almancanı öyrənə bilərəm", "almancani oyrene bilerem", "mən bacaracağam", "men bacaracagam", "bacaracağammı", "bacaracagammi", "öyrənə biləcəyəm", "oyrene bileceyem", "öyrənməsi çətindirmi", "oyrenmesi cetindirmi", "məndə alınacaq", "mende alinacaq", "bacararammı", "bacararammi", "danışa bilərəmmi", "danisa bileremmi"],
      ru: "Трудно ровно первые пару месяцев, пока уши не привыкли. Дальше становится заметно легче, потому что немецкий очень предсказуемый: слова читаются так, как пишутся, ударение почти всегда на первый слог. И у тебя есть огромное преимущество — ты знаешь русский с падежами, так что идея «слово меняет форму» тебя не пугает. Англичанам в этом месте гораздо больнее, поверь мне."
    },
    {
      match: ["сколько времени нужно", "за сколько можно выучить", "сколько учить немецкий", "когда я заговорю", "wie lange dauert es"],
      matchAz: ["nə qədər vaxt lazımdır", "ne qeder vaxt lazimdir", "neçə aya öyrənmək olar", "nece aya oyrenmek olar", "nə vaxt danışa biləcəyəm", "ne vaxt danisa bileceyem", "öyrənmək nə qədər çəkir", "oyrenmek ne qeder cekir", "neçə ilə öyrənilir", "nece ile oyrenilir", "neçə ay çəkəcək", "nece ay cekecek"],
      ru: "До A1 — примерно 3-4 месяца, если заниматься по 20-30 минут каждый день. До A2 — ещё столько же, до B1 (с ним уже реально работать) — год-полтора. Но цифры немножко врут: всё решает регулярность, а не количество часов. Двадцать минут каждый день сильнее, чем три часа по субботам, — это видно по любой группе."
    },
    {
      match: ["что учить сначала", "с чего начать учить", "с чего начать", "что сначала", "план обучения", "womit soll ich anfangen"],
      matchAz: ["haradan başlayım", "haradan baslayim", "nədən başlamalıyam", "neden baslamaliyam", "əvvəlcə nə öyrənim", "evvelce ne oyrenim", "ilk nə öyrənməliyəm", "ilk ne oyrenmeliyem", "öyrənmə planı", "oyrenme plani", "birinci nə öyrənim", "birinci ne oyrenim", "haradan başlamalıyam", "haradan baslamaliyam"],
      ru: "Сначала — то, что пригодится уже завтра: здравствуй, меня зовут, я из, я не понимаю, повторите пожалуйста, сколько стоит. Потом числа до ста и время — без них ни в магазин, ни на Termin. И только после этого грамматика: сначала sein и haben, потом обычные глаголы. Не хватайся за всё сразу — это как есть суп вилкой: долго и обидно."
    },
    {
      match: ["как тренировать произношение", "как улучшить произношение", "произношение", "как говорить без акцента", "aussprache üben"],
      matchAz: ["tələffüzü necə düzəldim", "teleffuzu nece duzeldim", "tələffüzü necə yaxşılaşdırım", "teleffuzu nece yaxsilasdirim", "düzgün tələffüz", "duzgun teleffuz", "aksentsiz danışmaq", "aksentsiz danismaq", "tələffüz üzərində işləmək", "teleffuz uzerinde islemek"],
      ru: "Самое рабочее — shadowing: включаешь короткую фразу, слушаешь и тут же повторяешь вслух, копируя даже интонацию. Две-три минуты в день, но обязательно вслух, а не в голове — рот тоже мышца, её надо тренировать. И записывай себя на телефон: первый раз будет неловко (я свой голос в записи ненавижу до сих пор), зато сразу слышно, что поправить."
    },
    {
      match: ["надо ли учить все слова", "сколько слов нужно знать", "сколько слов надо знать", "сколько слов учить", "wie viele wörter"],
      matchAz: ["neçə söz bilmək lazımdır", "nece soz bilmek lazimdir", "bütün sözləri öyrənmək lazımdırmı", "butun sozleri oyrenmek lazimdirmi", "neçə söz lazımdır", "nece soz lazimdir", "neçə söz bilməliyəm", "nece soz bilmeliyem", "bütün sözləri bilmək lazımdır", "butun sozleri bilmek lazimdir"],
      ru: "Нет, и слава богу. В немецком сотни тысяч слов, но процентов восемьдесят обычного разговора — это примерно 800-1000 самых частых. Бери сначала то, что встречается в твоей жизни: транспорт, магазин, работа, врач, соседи. А слово Donaudampfschifffahrtsgesellschaft пусть подождёт — оно не понадобится тебе никогда, честное слово."
    },
    {
      match: ["что такое a1", "уровень a1", "что значит a1", "уровни языка", "гёте", "goethe", "a1 prüfung", "zertifikat"],
      matchAz: ["a1 nə deməkdir", "a1 ne demekdir", "a1 nədir", "a1 nedir", "a1 səviyyəsi nədir", "a1 seviyyesi nedir", "dil səviyyələri", "dil seviyyeleri", "goethe imtahanı", "goethe imtahani", "sertifikat lazımdırmı", "sertifikat lazimdirmi", "a1 imtahanı nədir", "a1 imtahani nedir", "a1 sertifikatı", "a1 sertifikati"],
      ru: "A1 — самый первый уровень европейской шкалы (A1, A2, B1, B2, C1, C2). На A1 ты умеешь представиться, простыми фразами рассказать о себе, спросить дорогу, купить хлеб и понять медленную речь на знакомые темы. Экзамен Goethe-Zertifikat A1 состоит из четырёх частей: слушать, читать, писать и говорить. Для визы часто просят именно A1, но требования меняются — лучше уточнить в посольстве."
    },
    {
      match: ["боюсь говорить", "страшно говорить", "я боюсь ошибиться", "боюсь ошибок", "angst zu sprechen"],
      matchAz: ["danışmağa qorxuram", "danismaga qorxuram", "səhv etməkdən qorxuram", "sehv etmekden qorxuram", "qorxuram danışmağa", "qorxuram danismaga", "səhv edəcəyimdən qorxuram", "sehv edeceyimden qorxuram", "danışmaqdan qorxuram", "danismaqdan qorxuram", "qorxuram"],
      ru: "Это абсолютно нормально, так у всех, и у меня так было с французским. Но вот в чём секрет: немцы слушают не грамматику, а смысл. Скажешь «Ich gehen Arbeit» — тебя поймут и ответят, никто не поставит двойку. Начинай с очень коротких фраз, которые точно знаешь, и с тех людей, кого не страшно: продавец, сосед, я."
    },
    {
      match: ["не понимаю на слух", "плохо понимаю на слух", "не понимаю когда говорят", "аудирование", "ich verstehe nichts", "hörverstehen"],
      matchAz: ["qulaqla başa düşmürəm", "qulaqla basa dusmurem", "eşidəndə başa düşmürəm", "esidende basa dusmurem", "dinləyəndə anlamıram", "dinleyende anlamiram", "danışanda başa düşmürəm", "danisanda basa dusmurem", "heç nə başa düşmürəm", "hec ne basa dusmurem", "eşidəndə anlamıram", "esidende anlamiram", "heç nə anlamıram", "hec ne anlamiram"],
      ru: "Сначала ты и не должен понимать — уши учатся медленнее, чем глаза, это нормальный порядок вещей. Лови не всё подряд, а одно знакомое слово в предложении, потом два, потом три. И спокойно проси: «Langsamer, bitte» или «Können Sie das wiederholen?» — это вежливо, немцы охотно повторяют. Через месяц ежедневного слушания заметишь, что речь вдруг начала распадаться на отдельные слова."
    },
    {
      match: ["как понимать быструю речь", "говорят быстро", "немцы говорят быстро", "слишком быстро", "sie sprechen zu schnell"],
      matchAz: ["çox sürətli danışırlar", "cox suretli danisirlar", "almanlar tez danışır", "almanlar tez danisir", "sürətli danışanı necə başa düşüm", "suretli danisani nece basa dusum", "niyə bu qədər tez danışırlar", "niye bu qeder tez danisirlar", "asta danışsınlar", "asta danissinlar", "çox tez danışırlar", "cox tez danisirlar"],
      ru: "Быстрая речь — это не другие слова, это те же самые слова, просто слипшиеся. Помогает слушать одно и то же несколько раз подряд: первый раз ничего, третий — половина, пятый — почти всё. Бери записи на минуту, а не сериал на час. И знай: немцы глотают окончания, «haben wir» звучит как «хамва» — это не ты плохой, это они экономят силы."
    },
    {
      match: ["как учить слова быстрее", "как запоминать слова", "как учить лексику", "запоминать слова", "vokabeln lernen"],
      matchAz: ["sözləri necə tez öyrənim", "sozleri nece tez oyrenim", "yeni sözləri necə öyrənim", "yeni sozleri nece oyrenim", "sözləri necə yadda saxlayım", "sozleri nece yadda saxlayim", "lüğəti necə əzbərləyim", "lugeti nece ezberleyim", "sözlər necə yadımda qalsın", "sozler nece yadimda qalsin", "söz öyrənməyin yolu", "soz oyrenmeyin yolu"],
      ru: "Учи не голые слова, а маленькие фразы: не «Brot», а «Ich kaufe Brot» — тогда слово лежит в контексте и вспоминается само. Повторяй по интервалам: сегодня, завтра, через три дня, через неделю. И приклеивай бумажки на предметы дома — «der Kühlschrank» на холодильнике выглядит смешно, зато работает безотказно."
    },
    {
      match: ["стоит ли смотреть фильмы", "смотреть фильмы на немецком", "сериалы на немецком", "кино на немецком", "filme auf deutsch"],
      matchAz: ["alman filmlərinə baxmaq", "alman filmlerine baxmaq", "almanca film baxmaq faydalıdır", "almanca film baxmaq faydalidir", "serial baxmaq kömək edir", "serial baxmaq komek edir", "altyazı ilə baxmaq", "altyazi ile baxmaq", "almanca serial izləmək", "almanca serial izlemek"],
      ru: "Да, но с хитростью. Бери то, что уже видел и почти знаешь наизусть, с немецкой озвучкой и немецкими субтитрами — мозг не тратится на сюжет и слышит язык. Мультфильмы заходят отлично: там говорят чётко и просто. И детские передачи вроде «Die Sendung mit der Maus» — не стыдно, честное слово, я их сама смотрю за завтраком."
    },
    {
      match: ["как не забывать слова", "забываю слова", "всё забываю", "почему я забываю", "ich vergesse alles"],
      matchAz: ["sözləri unuduram", "sozleri unuduram", "hər şeyi unuduram", "her seyi unuduram", "niyə unuduram", "niye unuduram", "öyrəndiyimi unuduram", "oyrendiyimi unuduram", "unutmamaq üçün nə etməli", "unutmamaq ucun ne etmeli"],
      ru: "Забывать — это часть учёбы, а не провал. Мозг выбрасывает то, чем не пользуются, поэтому главное — возвращаться к старому: пять минут повторения в начале занятия дороже пятнадцати новых слов. Лучше всего держится то, что ты сам сказал вслух или вставил в своё собственное предложение. Правило простое: встретил слово три раза в разные дни — оно твоё."
    },
    {
      match: ["что делать если стесняюсь", "стесняюсь говорить", "мне стыдно", "у меня акцент", "стесняюсь акцента", "ich schäme mich"],
      matchAz: ["danışmağa utanıram", "danismaga utaniram", "utanıram", "utaniram", "xəcalət çəkirəm", "xecalet cekirem", "aksentimdən utanıram", "aksentimden utaniram", "aksentim var", "danışanda utanıram", "danisanda utaniram"],
      ru: "Стесняться — не слабость, это просто мозг бережёт тебя от позора, он молодец. Договорись с собой на одну фразу в день: сказал сегодня «Guten Tag» продавцу — уже победа, засчитано. Со мной можно тренироваться сколько угодно, я не устаю и не смеюсь (ну, смеюсь, но только над собой). И запомни: человек с акцентом в глазах немцев — это человек, который выучил второй язык. Это уважают."
    },
    {
      match: ["помогает ли музыка", "учить по песням", "песни на немецком", "музыка для изучения", "musik hören deutsch lernen"],
      matchAz: ["musiqi kömək edirmi", "musiqi komek edirmi", "mahnılarla öyrənmək olarmı", "mahnilarla oyrenmek olarmi", "alman mahnıları", "alman mahnilari", "mahnı dinləmək faydalıdır", "mahni dinlemek faydalidir", "mahnı ilə dil öyrənmək", "mahni ile dil oyrenmek"],
      ru: "Помогает, только не как учебник, а как тренажёр для ушей и чувства ритма. Песни сами застревают в голове, а вместе с ними застревают целые фразы — это бесплатное повторение, пока ты моешь посуду. Бери что помедленнее и читай текст глазами, пока слушаешь. Начни с чего-то простого вроде Nena или Herbert Grönemeyer — там слова разбираются на слух."
    }
  ],

  aboutGermany: [
    {
      match: ["как найти работу", "где искать работу", "поиск работы", "устроиться на работу", "arbeit finden", "job suchen"],
      matchAz: ["iş necə tapılır", "is nece tapilir", "iş axtarıram", "is axtariram", "işə necə düzəlmək", "ise nece duzelmek", "iş elanları harada", "is elanlari harada", "vakansiya axtarıram", "vakansiya axtariram"],
      ru: "Ищут обычно на сайтах вроде Indeed и StepStone, а ещё есть Arbeitsagentur — государственная служба занятости, туда можно прийти лично, и это бесплатно. Важны три вещи: Bewerbung (заявка), Lebenslauf (резюме) и Anerkennung — признание твоего диплома. И самое честное: в Германии половина работы находится через людей, так что знакомься и говори всем, что ты в поиске. Правила для конкретной профессии разные — лучше уточнить."
    },
    {
      match: ["нужна ли виза", "какая виза нужна", "как получить визу", "виза в германию", "дадут ли визу", "visum", "aufenthaltstitel"],
      matchAz: ["viza lazımdırmı", "viza lazimdirmi", "viza necə verilir", "viza nece verilir", "iş vizası", "is vizasi", "tələbə vizası", "telebe vizasi", "viza almaq"],
      ru: "Тут я тебе не советчик в юридическом смысле: правила зависят от гражданства, цели поездки и года, и они правда меняются. Гражданам Азербайджана виза в Германию нужна, а вот какая именно — рабочая, учебная, для поиска работы или для воссоединения семьи — это только к посольству. Смотри официальный сайт посольства Германии и make-it-in-germany.com, там есть и по-русски. Обязательно уточни лично, форумам не верь."
    },
    {
      match: ["что такое anmeldung", "anmeldung", "прописка", "регистрация адреса", "как прописаться", "meldebescheinigung"],
      matchAz: ["anmeldung nədir", "anmeldung nedir", "qeydiyyatdan keçmək", "qeydiyyatdan kecmek", "ünvan qeydiyyatı", "unvan qeydiyyati", "propiska necə edilir", "propiska nece edilir", "meldebescheinigung nədir", "meldebescheinigung nedir"],
      ru: "Anmeldung — это прописка. В течение двух недель после переезда ты обязан зарегистрировать адрес в Bürgeramt, и без этой бумажки (она называется Meldebescheinigung) не будет ни банковского счёта, ни налогового номера, ни нормального договора с телефоном. Нужны паспорт и Wohnungsgeberbestätigung — подтверждение от хозяина квартиры. Это самое первое дело в Германии, с него тут буквально всё начинается."
    },
    {
      match: ["что такое bürgeramt", "bürgeramt", "бюргерамт", "куда идти с документами", "где делают документы", "bürgerbüro"],
      matchAz: ["bürgeramt nədir", "burgeramt nedir", "bürgerbüro nədir", "burgerburo nedir", "sənədlər üçün hara getmək", "senedler ucun hara getmek", "sənədləri harada düzəldirlər", "senedleri harada duzeldirler", "bələdiyyə idarəsi", "belediyye idaresi"],
      ru: "Bürgeramt (иногда его называют Bürgerbüro) — районная контора, где делают всё бумажное: прописка, паспорта, водительские права. Без записи туда обычно не попасть, а запись в Берлине ловят как билеты на концерт — заходи на сайт рано утром. Говорят там по-немецки, так что возьми кого-нибудь с собой или заранее выпиши нужные фразы. И приходи минут на десять раньше, с паспортом всегда."
    },
    {
      match: ["что такое termin", "termin", "термин", "запись к врачу", "как записаться", "einen termin machen"],
      matchAz: ["termin nədir", "termin nedir", "randevu necə alınır", "randevu nece alinir", "həkimə necə yazılmaq", "hekime nece yazilmaq", "həkimə randevu", "hekime randevu", "vaxt təyin etmək", "vaxt teyin etmek"],
      ru: "Termin — это назначенное время, и, пожалуй, главное немецкое слово вообще. К врачу, в Bürgeramt, в банк, иногда даже в парикмахерскую — без Termin не пустят. Записываются по телефону или онлайн, часто за недели вперёд, и опаздывать нельзя: пятнадцать минут опоздания могут стоить тебе всей записи. Фраза-спасательный круг: «Ich möchte einen Termin machen»."
    },
    {
      match: ["как снять квартиру", "где искать квартиру", "снять жильё", "аренда квартиры", "сколько стоит квартира", "wohnung finden", "wohnung mieten", "kaution"],
      matchAz: ["ev necə kirayələmək", "ev nece kirayelemek", "harada mənzil kirayələmək", "harada menzil kirayelemek", "mənzil kirayəsi neçəyədir", "menzil kirayesi neceyedir", "kaution nədir", "kaution nedir", "ev kirayələmək çətindir", "ev kirayelemek cetindir"],
      ru: "Скажу честно: это самое трудное в Германии, особенно в Берлине. Ищут на ImmoScout24, WG-Gesucht и в группах, и на один просмотр приходит человек тридцать. Обычно просят SCHUFA (справку о кредитной истории), справку о доходе, копию паспорта и Kaution — залог, обычно три «холодные» аренды. Мой совет: начни с комнаты в WG или временной Zwischenmiete, а нормальную квартиру ищи уже изнутри, находясь в стране."
    },
    {
      match: ["сколько стоит жизнь", "сколько нужно денег", "прожиточный минимум", "сколько уходит в месяц", "lebenshaltungskosten"],
      matchAz: ["ayda nə qədər pul lazımdır", "ayda ne qeder pul lazimdir", "dolanışıq nə qədərdir", "dolanisiq ne qederdir", "aylıq xərclər nə qədər", "ayliq xercler ne qeder", "yaşayış xərcləri nə qədərdir", "yasayis xercleri ne qederdir", "xərc nə qədər çıxır", "xerc ne qeder cixir"],
      ru: "Очень грубо: одному человеку в среднем городе нужно примерно 1000-1300 евро в месяц вместе с жильём, в Берлине и Мюнхене больше. Самая большая статья — аренда: комната в WG 400-600, своя маленькая квартира от 700-900. Еда в супермаркете при этом дешёвая, 200-250 евро в месяц вполне реально, если готовить дома. Цифры быстро стареют, так что перед переездом лучше уточнить актуальные."
    },
    {
      match: ["дорого ли", "дорого в германии", "дорогая ли жизнь", "что дорого", "что дёшево", "ist es teuer"],
      matchAz: ["almaniyada bahadırmı", "almaniyada bahadirmi", "hər şey bahadır", "her sey bahadir", "nə bahadır nə ucuz", "ne bahadir ne ucuz", "qiymətlər bahadırmı", "qiymetler bahadirmi", "ucuzdur yoxsa bahadır", "ucuzdur yoxsa bahadir"],
      ru: "Смотря что. Дорого: аренда, рестораны, такси, ремонт чего угодно и вообще любая человеческая услуга — час работы мастера кусается. Дёшево, наоборот, чем ждёшь: продукты, хлеб, поезда по земельному билету, а визит к врачу со страховкой вообще бесплатный. Общее ощущение такое: вещи и еда нормальные по цене, а жильё и труд людей — дорогие."
    },
    {
      match: ["какие города", "в какой город ехать", "лучшие города", "где лучше жить", "берлин или мюнхен", "welche stadt"],
      matchAz: ["hansı şəhərə getmək", "hansi sehere getmek", "ən yaxşı şəhərlər", "en yaxsi seherler", "harada yaşamaq yaxşıdır", "harada yasamaq yaxsidir", "berlin yoxsa münhen", "berlin yoxsa munhen", "hansı şəhərə köçüm", "hansi sehere kocum"],
      ru: "Берлин — большой, разный, дешевле остальных крупных городов, полно иностранцев, начинать там легче всего. Мюнхен — красивый и богатый, но самый дорогой. Гамбург — вода, порт, ветер и спокойный характер. Кёльн и Дюссельдорф — самые тёплые и весёлые люди. Лейпциг, мой родной, — дёшево и уютно, туда сейчас все переезжают. С языком проще там, где много приезжих."
    },
    {
      match: ["какая погода в германии", "погода в германии", "холодно ли в германии", "климат", "wie ist das wetter"],
      matchAz: ["hava necədir", "hava necedir", "hava soyuqdurmu", "iqlim necədir", "iqlim necedir", "qış soyuq olur", "qis soyuq olur", "qışda hava necədir", "qisda hava necedir", "yayda istidirmi"],
      ru: "Мягко, но серо. Зима редко холоднее минус пяти, зато с ноября по март темнеет часа в четыре и часто моросит. Лето приятное, 22-28 градусов, иногда бывает жара, но без тяжёлой духоты. Главное правило немца: «плохой погоды не бывает, бывает плохая одежда» — купи непромокаемую куртку и живи спокойно."
    },
    {
      match: ["что едят", "какая еда", "немецкая еда", "что едят немцы", "что попробовать", "was essen die deutschen", "deutsches essen"],
      matchAz: ["nə yeyirlər", "ne yeyirler", "hansı yeməklər var", "hansi yemekler var", "nə dadmaq lazımdır", "ne dadmaq lazimdir", "milli mətbəx necədir", "milli metbex necedir", "hansı xörəklər məşhurdur", "hansi xorekler meshurdur"],
      ru: "Хлеб тут почти религия: сортов сотни, и он правда отличный. Классика дня такая: Brot mit Käse на завтрак, тёплая еда в обед, а вечером бутерброды — это даже называется Abendbrot. Из известного: Wurst, картошка во всех видах, Schnitzel, зимой густые супы. А в городах едят весь мир — дёнер, турецкое, вьетнамское, арабское на каждом углу. Голодным ты точно не останешься."
    },
    {
      match: ["как относятся к иностранцам", "отношение к иностранцам", "не любят иностранцев", "расизм", "ausländer", "как примут"],
      matchAz: ["əcnəbilərə münasibət", "ecnebilere munasibet", "əcnəbiləri sevmirlər", "ecnebileri sevmirler", "irqçilik varmı", "irqcilik varmi", "xaricilərə necə baxırlar", "xaricilere nece baxirlar", "yaxşı qarşılayırlar", "yaxsi qarsilayirlar"],
      ru: "В целом спокойно и вежливо, особенно в больших городах — там каждый третий откуда-то приехал. Немцы не бросаются обниматься и поначалу кажутся холодными, но это не враждебность, а дистанция: они просто не лезут в твою жизнь. Неприятные люди бывают везде, чаще в маленьких городках, но это скорее исключение. И вот что важно: стоит тебе сказать пару фраз по-немецки, как отношение теплеет мгновенно."
    },
    {
      match: ["нужен ли немецкий для работы", "можно ли без немецкого", "хватит ли английского", "работа без немецкого", "englisch reicht"],
      matchAz: ["alman dili olmadan işləmək", "alman dili olmadan islemek", "ingilis dili bəs edirmi", "ingilis dili bes edirmi", "iş üçün alman dili lazımdırmı", "is ucun alman dili lazimdirmi", "alman dilini bilmədən iş", "alman dilini bilmeden is", "ingiliscə ilə işləmək olar", "ingilisce ile islemek olar"],
      ru: "Для айти и науки часто хватает английского, особенно в Берлине. Для всего остального — стройка, склад, магазин, водитель, уход за людьми, любая работа с клиентами — немецкий нужен, минимум B1. Но и на A2 уже берут на простые работы, где главное понимать инструкции. Правило без исключений: чем лучше немецкий, тем лучше работа и зарплата."
    },
    {
      match: ["что такое ausbildung", "ausbildung", "аусбильдунг", "обучение профессии", "выучиться на профессию", "berufsausbildung"],
      matchAz: ["ausbildung nədir", "ausbildung nedir", "peşə təhsili", "pese tehsili", "peşə öyrənmək", "pese oyrenmek", "berufsausbildung nədir", "berufsausbildung nedir", "sənət öyrənmək istəyirəm", "senet oyrenmek isteyirem"],
      ru: "Ausbildung — это немецкая штука, которой стоит позавидовать: дуальное обучение, когда ты 2-3 года учишься и одновременно работаешь в фирме, и тебе за это платят (обычно 800-1200 евро). В конце — государственный диплом и почти гарантированная работа. Взрослых берут спокойно, тридцать один год тут совсем не помеха. Нужен немецкий примерно B1 и место в фирме, но условия по профессиям разные — лучше уточнить."
    },
    {
      match: ["страховка", "медицинская страховка", "krankenversicherung", "нужна ли страховка", "врач бесплатно", "какая страховка лучше"],
      matchAz: ["sığorta lazımdırmı", "sigorta lazimdirmi", "tibbi sığorta", "tibbi sigorta", "krankenversicherung nədir", "krankenversicherung nedir", "həkim pulsuzdurmu", "hekim pulsuzdurmu", "hansı sığortanı seçmək", "hansi sigortani secmek"],
      ru: "Krankenversicherung — медицинская страховка, и в Германии она обязательна для всех: без неё нельзя ни жить, ни работать. Есть государственная (gesetzlich — TK, AOK, Barmer): платишь процент от зарплаты, и приём у врача бесплатный. Есть частная — отдельная история со своими плюсами и ловушками. Если работаешь, взнос делят с работодателем и снимают с зарплаты автоматически. Твой конкретный случай зависит от статуса — уточни, когда будет виза."
    },
    {
      match: ["банковская карта", "открыть счёт", "как открыть счёт", "банк", "какой банк", "girocard", "bankkonto", "n26"],
      matchAz: ["bank hesabı açmaq", "bank hesabi acmaq", "hesab necə açılır", "hesab nece acilir", "bank kartı", "bank karti", "onlayn bank hesabı", "onlayn bank hesabi", "girocard nədir", "girocard nedir"],
      ru: "Счёт открывают в обычном банке (Sparkasse, Commerzbank) или онлайн — N26, Vivid; для онлайн-банка часто хватает паспорта и адреса. Для обычного банка нужна Anmeldung, иногда ещё Steuer-ID. Немецкая карта — это чаще не Visa, а Girocard (по-старому EC-Karte), её принимают везде, а вот кредитку не всегда. И знай: Германия до сих пор любит наличные, в маленьком кафе или у врача карту могут и не взять."
    },
    {
      match: ["транспорт", "общественный транспорт", "как ездить", "метро", "поезда", "deutschlandticket", "s-bahn", "u-bahn", "билет на транспорт"],
      matchAz: ["ictimai nəqliyyat", "ictimai neqliyyat", "deutschlandticket nədir", "deutschlandticket nedir", "metro necə işləyir", "metro nece isleyir", "qatarla getmək", "qatarla getmek", "nəqliyyat bileti", "neqliyyat bileti"],
      ru: "Транспорт отличный: S-Bahn, U-Bahn, трамваи, автобусы — всё по расписанию (ну, почти: поезда Deutsche Bahn любят опаздывать, это национальная шутка). Есть Deutschlandticket — единый месячный билет примерно за 58 евро на все местные поезда и автобусы по всей стране, вещь замечательная, но цену лучше уточнить, она меняется. Билет покупай всегда: контролёры ходят в штатском, штраф шестьдесят евро и никаких разговоров. И велосипед в городе часто быстрее всего."
    },
    {
      match: ["как знакомиться с людьми", "как найти друзей", "завести друзей", "одиноко", "общение", "freunde finden", "leute kennenlernen"],
      matchAz: ["dost tapmaq", "necə dost tapmaq", "nece dost tapmaq", "insanlarla tanış olmaq", "insanlarla tanis olmaq", "təkəm burada", "tekem burada", "ünsiyyət qurmaq", "unsiyyet qurmaq"],
      ru: "Немецкая дружба — медленный огонь: сначала кажется, что все закрыты, зато потом это на всю жизнь. Работает не «подойти и заговорить», а регулярность: языковые курсы, Sportverein (спортивный клуб), волонтёрство, соседский праздник, Stammtisch — посиделки за одним столом по интересам. Ищи в Meetup и в районных группах. И главное — предлагай сам: тут спокойно относятся к тому, что ты назначаешь Termin даже ради кофе."
    },
    {
      match: ["что удивляет приезжих", "что странного", "странные правила", "к чему привыкать", "культурный шок", "was ist komisch in deutschland"],
      matchAz: ["qəribə gələn nədir", "qeribe gelen nedir", "mədəni şok", "medeni sok", "qəribə qaydalar", "qeribe qaydalar", "nələrə öyrəşmək lazımdır", "nelere oyresmek lazimdir", "gələnləri nə təəccübləndirir", "gelenleri ne teeccublendirir"],
      ru: "Список у всех примерно одинаковый. В воскресенье закрыто вообще всё, даже супермаркеты, — планируй покупки заранее. Мусор сортируют по пяти контейнерам, и сосед может сделать замечание. Наличные там, где ты ждёшь карту. Люди стоят на красный ночью на пустой улице. И тишина после десяти вечера — это святое: из-за стиральной машины могут и в полицию позвонить."
    },
    {
      match: ["стоит ли ехать", "стоит ли переезжать", "переезд в германию", "правильно ли я делаю", "не пожалею", "soll ich nach deutschland"],
      matchAz: ["köçmək lazımdırmı", "kocmek lazimdirmi", "almaniyaya köçmək", "almaniyaya kocmek", "getməyə dəyərmi", "getmeye deyermi", "peşman olarammı", "pesman olarammi", "düzgün edirəmmi", "duzgun ediremmi"],
      ru: "Скажу честно, не как реклама. Первый год будет трудный: язык, бумажки, одиночество, всё медленно и через Termin. Зато потом — спокойная жизнь, врач, который тебя правда лечит, зарплата, на которую можно жить, и порядок, на который можно опереться. Если ты готов потерпеть год и учить язык — да, стоит. И ты совсем не один: миллионы людей начали ровно так же, с тех же самых слов, что учишь сейчас ты."
    }
  ],

  smallAnswers: [
    {
      match: ["как сказать да", "как будет да", "да по-немецки", "скажи да", "ja genau"],
      matchAz: ["bəli", "beli", "bəli demək", "beli demek", "almanca bəli", "almanca beli", "hə sözü almanca", "he sozu almanca", "hə elədir", "he eledir"],
      de: "Ja, genau.",
      ru: "Да, точно."
    },
    {
      match: ["как сказать нет", "как будет нет", "нет по-немецки", "скажи нет", "nein"],
      matchAz: ["yox sözü", "yox sozu", "xeyr", "yox demək", "yox demek", "xeyr demək", "xeyr demek", "almanca yox", "təəssüf ki yox", "teessuf ki yox"],
      de: "Nein, leider nicht.",
      ru: "Нет, к сожалению."
    },
    {
      match: ["не знаю", "я не знаю", "как сказать не знаю", "ich weiß es nicht", "ich weiss nicht", "keine ahnung"],
      matchAz: ["bilmirəm", "bilmirem", "mən bilmirəm", "men bilmirem", "xəbərim yoxdur", "xeberim yoxdur", "fikrim yoxdur", "heç nə bilmirəm", "hec ne bilmirem"],
      de: "Ich weiß es nicht.",
      ru: "Я не знаю."
    },
    {
      match: ["может быть", "наверное", "возможно", "как сказать может быть", "vielleicht"],
      matchAz: ["bəlkə", "belke", "ola bilər", "ola biler", "ola bilsin", "güman ki", "guman ki", "yəqin ki", "yeqin ki"],
      de: "Vielleicht.",
      ru: "Может быть."
    },
    {
      match: ["спасибо", "благодарю", "как сказать спасибо", "спасибо по-немецки", "danke", "danke schön", "vielen dank"],
      matchAz: ["təşəkkür", "tesekkur", "təşəkkür edirəm", "tesekkur edirem", "sağ ol", "sag ol", "sağol", "sagol", "minnətdaram", "minnetdaram"],
      de: "Danke schön!",
      ru: "Большое спасибо!"
    },
    {
      match: ["извини", "извините", "прости", "простите", "как извиниться", "entschuldigung", "es tut mir leid"],
      matchAz: ["bağışla", "bagisla", "məni bağışla", "meni bagisla", "bağışlayın", "bagislayin", "üzr istəyirəm", "uzr isteyirem", "qüsura baxma", "qusura baxma"],
      de: "Entschuldigung, das tut mir leid.",
      ru: "Извини, мне жаль."
    },
    {
      match: ["повтори", "повторите", "ещё раз", "скажи ещё раз", "noch einmal", "wiederholen"],
      matchAz: ["təkrar et", "tekrar et", "təkrarla", "tekrarla", "bir daha de", "bir daha söylə", "bir daha soyle", "yenidən de", "yeniden de"],
      de: "Noch einmal, bitte.",
      ru: "Ещё раз, пожалуйста."
    },
    {
      match: ["медленнее", "помедленнее", "говори медленнее", "не так быстро", "langsamer", "langsam bitte"],
      matchAz: ["yavaş danış", "yavas danis", "bir az yavaş", "bir az yavas", "daha yavaş", "daha yavas", "yavaş deyin", "yavas deyin", "asta danış", "asta danis"],
      de: "Langsamer, bitte.",
      ru: "Медленнее, пожалуйста."
    },
    {
      match: ["не понял", "не поняла", "не понимаю", "я не понял", "ich verstehe nicht", "ich verstehe das nicht"],
      matchAz: ["başa düşmürəm", "basa dusmurem", "başa düşmədim", "basa dusmedim", "anlamıram", "anlamiram", "anlamadım", "anlamadim", "səni başa düşmürəm", "seni basa dusmurem"],
      de: "Ich verstehe das nicht.",
      ru: "Я этого не понимаю."
    },
    {
      match: ["хорошо", "ладно", "окей", "понятно", "alles klar", "okay"],
      matchAz: ["yaxşı oldu", "yaxsi oldu", "aydındır", "aydindir", "başa düşdüm", "basa dusdum", "anladım", "anladim", "oldu tamam"],
      de: "Gut, alles klar.",
      ru: "Хорошо, всё понятно."
    },
    {
      match: ["конечно", "разумеется", "само собой", "natürlich", "klar"],
      matchAz: ["əlbəttə", "elbette", "təbii ki", "tebii ki", "sözsüz", "sozsuz", "şübhəsiz", "subhesiz"],
      de: "Natürlich!",
      ru: "Конечно!"
    },
    {
      match: ["правда", "серьёзно", "да ладно", "неужели", "wirklich", "echt"],
      matchAz: ["doğrudan", "dogrudan", "ciddisən", "ciddisen", "həqiqətən", "heqiqeten", "ciddi deyilsən", "ciddi deyilsen", "inanmıram", "inanmiram"],
      de: "Wirklich? Das ist ja interessant.",
      ru: "Правда? Как интересно."
    },
    {
      match: ["я согласен", "согласен", "я согласна", "ты прав", "einverstanden", "ich bin einverstanden"],
      matchAz: ["razıyam", "raziyam", "haqlısan", "haqlisan", "düz deyirsən", "duz deyirsen", "qəbul edirəm", "qebul edirem"],
      de: "Ja, ich bin einverstanden.",
      ru: "Да, я согласен."
    },
    {
      match: ["мне нравится", "нравится", "мне это нравится", "das gefällt mir", "ich mag das"],
      matchAz: ["xoşuma gəlir", "xosuma gelir", "çox xoşuma gəlir", "cox xosuma gelir", "bəyənirəm", "beyenirem", "bəyəndim", "beyendim"],
      de: "Das gefällt mir.",
      ru: "Мне это нравится."
    },
    {
      match: ["мне не нравится", "не нравится", "мне это не нравится", "das gefällt mir nicht", "ich mag das nicht"],
      matchAz: ["xoşuma gəlmir", "xosuma gelmir", "heç xoşuma gəlmir", "hec xosuma gelmir", "bəyənmirəm", "beyenmirem", "bəyənmədim", "beyenmedim"],
      de: "Das gefällt mir nicht.",
      ru: "Мне это не нравится."
    },
    {
      match: ["я устал", "устал", "я устала", "хочу спать", "ich bin müde"],
      matchAz: ["yoruldum", "yorğunam", "yorgunam", "yuxum gəlir", "yuxum gelir", "yatmaq istəyirəm", "yatmaq isteyirem"],
      de: "Ich bin müde.",
      ru: "Я устал."
    },
    {
      match: ["я рад", "я рада", "мне приятно", "здорово", "ich freue mich", "freut mich"],
      matchAz: ["sevindim", "sevinirəm", "sevinirem", "çox şadam", "cox sadam", "əladır", "eladir"],
      de: "Ich freue mich.",
      ru: "Я рад."
    },
    {
      match: ["подожди", "подождите", "минутку", "секунду", "warte", "moment", "einen moment"],
      matchAz: ["gözləyin", "gozleyin", "bir az gözlə", "bir az gozle", "azca gözlə", "azca gozle", "bir dəqiqə", "bir deqiqe", "bir saniyə", "bir saniye"],
      de: "Warte kurz, bitte.",
      ru: "Подожди немножко, пожалуйста."
    }
  ]
};
