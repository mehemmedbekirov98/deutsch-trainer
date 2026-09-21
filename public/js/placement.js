// «Не знаю, какой у меня уровень» — самый честный ответ, и его надо обслужить.
//
// Восемнадцать вопросов, по шесть на ступень, от «Wie heißt du?» до Konjunktiv II. Смысл не в
// оценке, а в том, чтобы не заставлять человека, который уже что-то знает, проходить «Hallo, ich
// heiße Emil» — и не бросать новичка сразу в придаточные. Поэтому тест короткий, без таймера и
// без права на ошибку в духе экзамена: ошибся — идём дальше, в конце просто скажем, где начать.
//
// Шкала: ступень засчитана, если из её шести вопросов верны хотя бы четыре, и все предыдущие
// ступени тоже засчитаны. Ошибиться в паре вопросов — нормально, угадать четыре из шести на трёх
// вариантах — маловероятно.
import { t as tr } from "./i18n.js";
import { el, nextTick, shuffle } from "./utils.js";
import { store, CEFR, CEFR_TITLE, CEFR_FIRST } from "./store.js";
import { sfx, confetti, toast } from "./fx.js";
import { speech, RATES } from "./speech.js";

const PASS = 4; // из шести

/** @type {{band: "A1"|"A2"|"B1", q: string, de?: string, options: string[], answer: number, why: string}[]} */
export const QUESTIONS = [
  /* ---------------------------------------------------------------- A1 */
  { band: "A1", q: "Вставь пропуск", de: "Wie ___ du?", options: ["heiße", "heißt", "heißen"], answer: 1,
    why: "du → heißt. «Wie heißt du?» — «Как тебя зовут?»" },
  { band: "A1", q: "Вставь пропуск", de: "Ich komme ___ Aserbaidschan.", options: ["aus", "von", "in"], answer: 0,
    why: "Откуда ты родом — всегда «kommen aus»." },
  { band: "A1", q: "Какой артикль?", de: "___ Frau", options: ["der", "die", "das"], answer: 1,
    why: "die Frau — женщина, женский род." },
  { band: "A1", q: "Вставь пропуск", de: "Wir ___ Deutsch.", options: ["lernst", "lernt", "lernen"], answer: 2,
    why: "wir → lernen. Форма совпадает с инфинитивом." },
  { band: "A1", q: "Вставь пропуск", de: "Ich habe ___ Bruder.", options: ["ein", "einen", "eine"], answer: 1,
    why: "der Bruder в винительном падеже → einen Bruder." },
  { band: "A1", q: "Что значит «die Woche»?", options: ["неделя", "час", "год"], answer: 0,
    why: "die Woche — неделя. Месяц — der Monat, год — das Jahr." },

  /* ---------------------------------------------------------------- A2 */
  { band: "A2", q: "Вставь пропуск", de: "Ich habe gestern viel ___.", options: ["arbeiten", "gearbeitet", "arbeitete"], answer: 1,
    why: "Perfekt: haben + Partizip II. arbeiten → gearbeitet." },
  { band: "A2", q: "Вставь пропуск", de: "Er ist nach Hause ___.", options: ["gegangen", "gegangt", "gehte"], answer: 0,
    why: "gehen — неправильный глагол: ist gegangen, с sein." },
  { band: "A2", q: "Вставь пропуск", de: "Ich bleibe zu Hause, ___ ich krank bin.", options: ["denn", "weil", "deshalb"], answer: 1,
    why: "weil ставит глагол в конец: «… weil ich krank bin»." },
  { band: "A2", q: "Вставь пропуск", de: "Das Buch liegt ___ Tisch.", options: ["auf den", "auf dem", "an den"], answer: 1,
    why: "liegen отвечает на «где?» → Dativ: auf dem Tisch." },
  { band: "A2", q: "Вставь пропуск", de: "Ich interessiere mich ___ Musik.", options: ["für", "auf", "über"], answer: 0,
    why: "sich interessieren für — предлог у глагола фиксированный." },
  { band: "A2", q: "Что значит «die Rechnung»?", options: ["встреча", "счёт", "договор"], answer: 1,
    why: "die Rechnung — счёт. Встреча — der Termin, договор — der Vertrag." },

  /* ---------------------------------------------------------------- B1 */
  { band: "B1", q: "Вставь пропуск", de: "Der Mann, ___ dort steht, ist mein Chef.", options: ["den", "der", "dem"], answer: 1,
    why: "Он подлежащее в придаточном → Nominativ: der." },
  { band: "B1", q: "Вставь пропуск", de: "Die Wohnung ___ letzte Woche renoviert.", options: ["wird", "wurde", "würde"], answer: 1,
    why: "Пассив в прошлом: wurde + Partizip II." },
  { band: "B1", q: "Вставь пропуск", de: "___ ich mehr Zeit hätte, würde ich mehr lesen.", options: ["Wenn", "Als", "Ob"], answer: 0,
    why: "Нереальное условие — всегда wenn." },
  { band: "B1", q: "Вставь пропуск", de: "Ich freue mich ___ das Wochenende.", options: ["über", "auf", "für"], answer: 1,
    why: "sich freuen auf — о том, что впереди. über — о том, что уже случилось." },
  { band: "B1", q: "Вставь пропуск", de: "Er sagte, ___ er später kommt.", options: ["ob", "dass", "wenn"], answer: 1,
    why: "Пересказ утверждения — dass. ob только для вопроса «ли»." },
  { band: "B1", q: "Что значит «die Kündigungsfrist»?", options: ["испытательный срок", "срок расторжения договора", "отпуск"], answer: 1,
    why: "Kündigung — расторжение, Frist — срок. Испытательный срок — die Probezeit." },
];

/** Какой уровень показал этот набор ответов. */
export function gradeAnswers(correctByBand) {
  const a1 = correctByBand.A1 >= PASS;
  const a2 = a1 && correctByBand.A2 >= PASS;
  const b1 = a2 && correctByBand.B1 >= PASS;
  return b1 ? "B1" : a2 ? "A2" : "A1";
}

/**
 * Сам тест. Вопросы идут по возрастанию сложности — так человек видит, что они кончаются, а не
 * что его гоняют по кругу, — но варианты внутри вопроса перемешиваются, чтобы ответ нельзя было
 * угадать по позиции.
 */
export function renderPlacement(container, { onDone, onExit } = {}) {
  const items = QUESTIONS.map((q) => {
    const order = shuffle(q.options.map((text, i) => ({ text, right: i === q.answer })));
    return { ...q, order };
  });
  let i = 0;
  const correct = { A1: 0, A2: 0, B1: 0 };

  const bar = el("div", { class: "progress-bar" });
  const counter = el("div", { class: "muted small" });
  const host = el("div", { class: "placement-body" });

  const draw = () => {
    const q = items[i];
    counter.textContent = tr`Вопрос ${i + 1} из ${items.length}`;
    bar.style.width = `${Math.round((i / items.length) * 100)}%`;
    host.innerHTML = "";

    const feedback = el("div", { class: "placement-why" });
    const next = el("button", { class: "btn primary big", type: "button", hidden: true, onClick: () => {
      i++;
      if (i >= items.length) return finish();
      draw();
    } }, i + 1 >= items.length ? "Показать результат" : "Дальше");

    const buttons = q.order.map((opt) => el("button", { class: "opt placement-opt", type: "button", onClick: () => {
      if (buttons.some((b) => b.disabled)) return;
      if (opt.right) { correct[q.band]++; sfx.correct(); } else sfx.wrong();
      buttons.forEach((b) => {
        b.disabled = true;
        if (b.dataset.right === "1") b.classList.add("correct");
      });
      if (!opt.right) buttons.find((b) => b.textContent === opt.text)?.classList.add("wrong");
      feedback.textContent = tr(q.why);
      feedback.classList.add("show");
      next.hidden = false;
      nextTick(() => next.focus());
    } }, opt.text));
    buttons.forEach((b, k) => { b.dataset.right = q.order[k].right ? "1" : "0"; });

    host.append(
      el("div", { class: "placement-q" }, q.q),
      q.de ? el("div", { class: "placement-de", lang: "de" }, q.de,
        el("button", { class: "icon-btn tiny", type: "button", title: "Прослушать",
          onClick: () => speech.speak(q.de.replace("___", "…"), { rate: RATES.example, force: true }) }, "🔊")) : null,
      el("div", { class: "placement-opts" }, buttons),
      feedback,
      next,
    );
  };

  const finish = () => {
    const band = gradeAnswers(correct);
    const claim = store.state.cefrClaim || "A1";
    const lower = CEFR.indexOf(band) < CEFR.indexOf(claim);
    const total = correct.A1 + correct.A2 + correct.B1;
    bar.style.width = "100%";
    counter.textContent = tr("Готово");
    host.innerHTML = "";
    if (band !== "A1") { confetti({ count: 160, duration: 2200 }); sfx.levelUp(); }

    host.append(
      el("div", { class: "placement-result" },
        el("div", { class: "cefr-badge big" }, band),
        el("h2", {}, tr`Твой уровень — ${band}`),
        el("p", { class: "muted" }, tr`${CEFR_TITLE[band]} · правильных ответов ${total} из ${items.length}`),
        el("div", { class: "placement-breakdown" },
          ["A1", "A2", "B1"].map((b) => el("div", { class: `placement-band ${correct[b] >= PASS ? "ok" : ""}` },
            el("span", { class: "placement-band-name" }, b),
            el("span", { class: "placement-band-score" }, `${correct[b]} / 6`))),
        ),
        el("p", { class: "muted small" }, band === "A1"
          ? "Начнём с самого начала — это нормально и это правильный старт. Всё остальное откроется по пути."
          : tr`Уроки с уровня ${band} уже открыты. Предыдущие никуда не делись — заглядывай, если захочешь повторить.`),
        // Опускать заявленный уровень тест не должен молча: человек мог зайти сюда из любопытства,
        // уже пройдя половину B1, и «начать сначала» ему никто не предлагал.
        lower ? el("p", { class: "muted small" },
          tr`Сейчас у тебя заявлен ${claim}, и всё пройденное останется на месте. Если хочешь пойти с ${band} — скажи, я переключу.`) : null,
        el("div", { class: "placement-actions" },
          el("button", { class: "btn primary big", type: "button", onClick: () => {
            store.update((s) => { s.introSeen = true; });
            store.claimCefr(band, { allowLower: lower });
            toast(tr`Уровень ${band}. Открыл уроки с ${CEFR_FIRST[band]}-го.`, { icon: "🎓", ms: 5000 });
            onDone?.(band);
          } }, lower ? tr`Всё равно начать с ${band} →` : tr`Начать с уровня ${band} →`),
          lower ? el("button", { class: "btn ghost", type: "button", onClick: () => {
            store.update((s) => { s.introSeen = true; });
            onDone?.(claim);
          } }, tr`Оставить ${claim}`) : null,
          el("button", { class: "btn ghost", type: "button", onClick: () => { i = 0; correct.A1 = correct.A2 = correct.B1 = 0; draw(); } }, "Пройти заново"),
        ),
      ),
    );
  };

  container.append(el("div", { class: "placement" },
    el("div", { class: "placement-card" },
      el("div", { class: "placement-head" },
        el("div", {},
          el("div", { class: "prologue-kicker" }, "Проверка уровня"),
          el("div", { class: "placement-title" }, "18 вопросов, минуты три")),
        el("div", { class: "placement-head-right" },
          counter,
          // focus-режим убирает всю навигацию, так что без этой кнопки из теста нет выхода
          el("button", { class: "link-btn quiet", type: "button", onClick: () => onExit?.() }, "Выйти из теста")),
      ),
      el("div", { class: "progress-track" }, bar),
      host,
    ),
  ));
  draw();
}
