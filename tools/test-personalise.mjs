// Мия должна звать человека по его имени, а не по чужому.
//
//   node tools/test-personalise.mjs
//
// Подстановка имени — ровно тот случай, где легко испортить текст молча: `\b` в JavaScript
// считается по ASCII и перед кириллицей не работает, а слишком жадное правило съедает
// «Эмилия», «Emilie» и знаки препинания вокруг. Поэтому проверяем и то, что заменилось, и то,
// что осталось нетронутым.
import { personalise } from "../public/js/utils.js";

let failed = 0;
const eq = (got, want, what) => {
  if (got === want) return;
  failed++;
  console.log(`ПРОВАЛ ${what}\n       получили «${got}»\n       ждали    «${want}»`);
};

/* ------------------------------------------------- имя есть: подставляется */
eq(personalise("Привет, Эмиль! Как ты сегодня?", "Руслан"), "Привет, Руслан! Как ты сегодня?", "русское обращение");
eq(personalise("Hallo Emil! Wie geht es dir?", "Руслан"), "Hallo Руслан! Wie geht es dir?", "немецкое обращение");
eq(personalise("Salam, Emil! Bu gün necəsən?", "Kamran"), "Salam, Kamran! Bu gün necəsən?", "азербайджанское обращение");
eq(personalise("Immer gern, Emil.", "Айдын"), "Immer gern, Айдын.", "в конце фразы");
eq(personalise("Супер, Эмиль!", "Лейла"), "Супер, Лейла!", "похвала");
eq(personalise("Emil, komm bitte her.", "Tural"), "Tural, komm bitte her.", "в начале фразы");

/* ------------------------------------------------- имени нет: обращение убирается */
eq(personalise("Привет, Эмиль! Как ты сегодня?", ""), "Привет! Как ты сегодня?", "без имени — русское");
eq(personalise("Hallo Emil! Wie geht es dir?", ""), "Hallo! Wie geht es dir?", "без имени — немецкое");
eq(personalise("Immer gern, Emil.", null), "Immer gern.", "без имени — в конце");
eq(personalise("Супер, Эмиль!", "Ученик"), "Супер!", "заглушка «Ученик» — это не имя");
eq(personalise("Hallo Emil!", "Emil"), "Hallo!", "«Emil» как имя — та же заглушка");

/* ------------------------------------------------- чужие слова не трогаем */
eq(personalise("Эмилия живёт в Берлине.", "Руслан"), "Эмилия живёт в Берлине.", "Эмилия — другое слово");
eq(personalise("Emilie kommt aus Wien.", "Руслан"), "Emilie kommt aus Wien.", "Emilie — другое слово");
eq(personalise("Die E-Mail ist da.", "Руслан"), "Die E-Mail ist да.".replace("да.", "da."), "E-Mail не имя");
eq(personalise("emil@mail.de", "Руслан"), "emil@mail.de", "адрес почты из урока не трогаем");
eq(personalise("Ich heiße Anna.", "Руслан"), "Ich heiße Anna.", "фраза без имени не меняется");
eq(personalise("", "Руслан"), "", "пустая строка");

/* ------------------------------------------------- пунктуация не разъезжается */
eq(personalise("Gut gemacht, Emil! Weiter so.", "Ali"), "Gut gemacht, Ali! Weiter so.", "две фразы подряд");
eq(personalise("Gut gemacht, Emil! Weiter so.", ""), "Gut gemacht! Weiter so.", "две фразы подряд без имени");

console.log(failed ? `\n${failed} FAILURES` : "Подстановка имени работает на всех трёх языках");
process.exit(failed ? 1 : 0);
