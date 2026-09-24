// Список голосов на сервере и выбор голосов на сайте не должны разъезжаться.
//
//   node tools/test-voices.mjs
//
// Функция /api/tts принимает голос не любой, а из списка — иначе поле `voice` из запроса это
// способ гонять чужой сервис по голосам всех языков мира за счёт владельца. Но если в кабинет
// добавить голос и забыть про этот список, поломка будет тихой: сервер подставит Серафину,
// человек выберет «Katja», услышит не её и ничего не поймёт.
// speech.js — модуль браузера и создаёт объект прямо при загрузке, так что ему нужен хотя бы
// намёк на окно. Заодно это проверка сама по себе: файл обязан грузиться без единой ошибки.
globalThis.window = { speechSynthesis: null, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.document = { addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, append() {} }), documentElement: {} };
Object.defineProperty(globalThis, "navigator", { value: { language: "ru-RU", userAgent: "node", permissions: null }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const { VOICES: ALLOWED, LOCALES } = await import("../netlify/functions/tts.mjs");
const { NEURAL_CHOICES: OFFERED, MIA_VOICE, FALLBACK_VOICE_RU, FALLBACK_VOICE_AZ } = await import("../public/js/speech.js");

let failed = 0;
const fail = (msg) => { failed++; console.log("ПРОВАЛ " + msg); };

for (const v of OFFERED) {
  if (!ALLOWED.has(v.id)) fail(`голос «${v.id}» есть в кабинете, но сервер его не примет — добавь в VOICES в netlify/functions/tts.mjs`);
}
for (const v of [MIA_VOICE, FALLBACK_VOICE_RU, FALLBACK_VOICE_AZ]) {
  if (!ALLOWED.has(v)) fail(`запасной голос «${v}» сервер не примет`);
}
// В обратную сторону — не ошибка, а мусор: разрешено то, что никто не попросит.
const offered = new Set([...OFFERED.map((v) => v.id), MIA_VOICE, FALLBACK_VOICE_RU, FALLBACK_VOICE_AZ]);
for (const v of ALLOWED) {
  if (!offered.has(v)) console.log(`      (лишний в списке сервера, никто не попросит: ${v})`);
}

// Локали, которые строит plan(): "" для немецкого, ru-RU и az-AZ для родного.
for (const loc of ["", "ru-RU", "az-AZ"]) {
  if (!LOCALES.has(loc)) fail(`локаль «${loc}» сайт присылает, а сервер не принимает`);
}

console.log(failed ? `\n${failed} FAILURES` : `Голоса сервера и сайта совпадают (${ALLOWED.size} разрешено, ${offered.size} используется)`);
process.exit(failed ? 1 : 0);
