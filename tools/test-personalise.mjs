// Мия должна звать человека по его имени — и не трогать всё остальное.
//
//   node tools/test-personalise.mjs
//
// Подстановка имени — ровно тот случай, где легко испортить текст молча. Две ловушки, на обеих
// уже спотыкались:
//
//   · `\b` в JavaScript считается по ASCII и перед кириллицей не работает: «\bЭмиль» не совпадёт
//     ни разу, и по-русски подстановка просто не сработает;
//   · слишком жадное правило вырезает имя ВЕЗДЕ — и «Ich heiße Emil und wohne in Berlin.»
//     становится «Ich heiße und wohne in Berlin.». Это сломанный немецкий внутри того самого
//     предложения, которое Мия объясняет. Эмиль ещё и персонаж курса: он ходит на работу и
//     спорит с ведомством в тридцати шести уроках, и там он должен остаться.
//
// Поэтому проверяем и то, что заменилось, и то, что осталось нетронутым, — второго больше.
import { personalise } from "../public/js/utils.js";

let failed = 0;
const eq = (got, want, what) => {
  if (got === want) return;
  failed++;
  console.log(`ПРОВАЛ ${what}\n       получили «${got}»\n       ждали    «${want}»`);
};

/* ============================================ обращение: имя есть — подставляется */
eq(personalise("Привет, Эмиль! Как ты сегодня?", "Руслан"), "Привет, Руслан! Как ты сегодня?", "русское обращение");
eq(personalise("Hallo Emil! Wie geht es dir?", "Руслан"), "Hallo Руслан! Wie geht es dir?", "немецкое приветствие");
eq(personalise("Salam, Emil! Bu gün necəsən?", "Kamran"), "Salam, Kamran! Bu gün necəsən?", "азербайджанское обращение");
eq(personalise("Immer gern, Emil.", "Айдын"), "Immer gern, Айдын.", "в конце фразы");
eq(personalise("Супер, Эмиль!", "Лейла"), "Супер, Лейла!", "похвала");
eq(personalise("Emil, komm bitte her.", "Tural"), "Tural, komm bitte her.", "в начале, с запятой");
eq(personalise("Das war alles, Emil. Du hast das gut gemacht!", "Ali"), "Das war alles, Ali. Du hast das gut gemacht!", "обращение в середине текста");
eq(personalise("Guten Tag, Emil. Wie geht es dir?", "Ali"), "Guten Tag, Ali. Wie geht es dir?", "приветствие с запятой");

/* ============================================ обращение: имени нет — убирается */
eq(personalise("Привет, Эмиль! Как ты сегодня?", ""), "Привет! Как ты сегодня?", "без имени — русское");
eq(personalise("Hallo Emil! Wie geht es dir?", ""), "Hallo! Wie geht es dir?", "без имени — приветствие");
eq(personalise("Immer gern, Emil.", null), "Immer gern.", "без имени — в конце");
eq(personalise("Супер, Эмиль!", "Ученик"), "Супер!", "заглушка «Ученик» — это не имя");
eq(personalise("Hallo Emil!", "Emil"), "Hallo!", "«Emil» как имя — та же заглушка");
eq(personalise("Das war alles, Emil. Weiter so.", ""), "Das war alles. Weiter so.", "без имени — в середине текста");

/* ============================================ УЧЕБНЫЙ ТЕКСТ — не трогать ничего */
const untouched = [
  ["Ich heiße Emil und wohne in Berlin.", "Emil как подлежащее в примере"],
  ["Emil geht jeden Tag zur Arbeit.", "Emil в начале без запятой"],
  ["Emil hat einen Bruder und eine Schwester.", "Emil в упражнении"],
  ["Wie heißt du? — Ich heiße Emil.", "Emil как ответ в диалоге"],
  ["Das ist Emil. Er kommt aus Aserbaidschan.", "Emil после указания"],
  ["Эмиль работает в Берлине.", "Эмиль как подлежащее по-русски"],
  ["Mia fragt Emil nach seiner Adresse.", "Emil как дополнение"],
  ["Эмилия живёт в Берлине.", "Эмилия — другое слово"],
  ["Emilie kommt aus Wien.", "Emilie — другое слово"],
  ["Die E-Mail ist da.", "E-Mail не имя"],
  ["emil@mail.de", "адрес почты из урока"],
  ["Ich heiße Anna.", "фраза без имени вовсе"],
];
for (const [text, what] of untouched) {
  eq(personalise(text, "Руслан"), text, `с именем не тронуто: ${what}`);
  eq(personalise(text, ""), text, `без имени не тронуто: ${what}`);
}

/* ============================================ пунктуация не разъезжается */
eq(personalise("", "Руслан"), "", "пустая строка");
eq(personalise("Gut gemacht, Emil! Weiter so.", "Ali"), "Gut gemacht, Ali! Weiter so.", "две фразы подряд");
eq(personalise("Gut gemacht, Emil! Weiter so.", ""), "Gut gemacht! Weiter so.", "две фразы подряд без имени");
for (const [text, name] of [["Привет, Эмиль! Как дела?", ""], ["Hallo Emil! Und?", ""], ["Immer gern, Emil.", ""]]) {
  const got = personalise(text, name);
  if (/[!?.]\s*[!?,]/.test(got)) { failed++; console.log(`ПРОВАЛ висящая пунктуация: «${got}»`); }
  if (/\s,|,\s*[.!?]/.test(got)) { failed++; console.log(`ПРОВАЛ осиротевшая запятая: «${got}»`); }
}

/* ============================================ где проходит граница
 *
 * Немецкий текст курса через personalise() НЕ проходит — это решает mineNative() в tutor.js, и
 * проверяется оно там же, в tools/test-reply.mjs, на настоящем пути. Здесь проверять было бы
 * нечестно: функция языка не знает и знать не должна, политика живёт на месте вызова.
 */

console.log(failed ? `\n${failed} FAILURES` : "Обращение подставляется, учебный текст не тронут");
process.exit(failed ? 1 : 0);
