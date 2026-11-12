'use strict';
/* =====================================================================
   HABITOPIA — "Small Daily Actions. Big Adventures."
   Vanilla HTML + CSS + JS. All data is saved in localStorage (no API).
   ===================================================================== */
const KEY = 'habitopia.v2', PERFECT = 25;
const $ = (s, e = document) => e.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmt = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const dow = s => parse(s).getDay();
const weekStart = s => addDays(s, -((dow(s) + 6) % 7));           // Monday
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let S = null, memo = {}, memStore = null;
const todayStr = () => { const d = new Date(); d.setDate(d.getDate() + ((S && S.offset) || 0)); return fmt(d); };
const lastN = n => { const t = todayStr(); return Array.from({ length: n }, (_, i) => addDays(t, i - n + 1)); };
const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

/* ---------------- game data ---------------- */
const DIFF = { easy: { n: 'Easy', xp: 30, e: '🌿' }, medium: { n: 'Medium', xp: 50, e: '⚔️' }, hard: { n: 'Hard', xp: 80, e: '🔥' }, legend: { n: 'Legendary', xp: 120, e: '👑' } };
const CATS = {
  reading: { n: 'Reading', e: '📖', a: '#7651D9', b: '#4B3396' },
  notes: { n: 'Review', e: '📝', a: '#4F86F0', b: '#2E56A8' },
  practice: { n: 'Practice', e: '💻', a: '#FF8A3D', b: '#B8541A' },
  tasks: { n: 'Assignments', e: '✅', a: '#E0A92B', b: '#9A7414' },
  focus: { n: 'Focus', e: '⏱️', a: '#2FB488', b: '#1D7A5C' },
  wellness: { n: 'Wellness', e: '🌙', a: '#E0589B', b: '#9A2F68' }
};
const CAT_MIGRATE = { learning: 'reading', fitness: 'wellness', health: 'wellness', mindful: 'wellness', work: 'focus', creative: 'notes' };
const UNITS = ['minutes', 'pages', 'problems', 'chapters', 'flashcards', 'times'];
const EMOJIS = ['📖', '📝', '💻', '⏱️', '🗓️', '🧠', '✏️', '🔬', '📐', '🎧', '😴', '💧', '🏃', '🧘', '☕', '🎯'];
const STUDY_TPL = [
  { name: 'Review Notes', desc: "Go over today's lecture notes.", icon: '📝', cat: 'notes', freq: 'daily', target: 30, unit: 'minutes', diff: 'medium', time: '19:00' },
  { name: 'Read a Chapter', desc: 'Read 10 pages of your textbook.', icon: '📖', cat: 'reading', freq: 'daily', target: 10, unit: 'pages', diff: 'medium', time: '07:00' },
  { name: 'Practice Problems', desc: 'Solve problems to lock in the lesson.', icon: '🧠', cat: 'practice', freq: 'daily', target: 5, unit: 'problems', diff: 'hard', time: '20:00' },
  { name: 'Flashcards', desc: 'Quick active recall before bed.', icon: '🗂️', cat: 'notes', freq: 'daily', target: 20, unit: 'flashcards', diff: 'easy', time: '21:00' },
  { name: 'Group Study', desc: 'Study with classmates once a week.', icon: '👥', cat: 'focus', freq: 'weekly', perWeek: 1, target: 60, unit: 'minutes', diff: 'hard', time: '' },
  { name: 'Assignment Work', desc: 'Make steady progress on your homework.', icon: '✏️', cat: 'tasks', freq: 'custom', days: [1, 2, 3, 4, 5], target: 45, unit: 'minutes', diff: 'hard', time: '16:00' },
  { name: 'Sleep by 11 PM', desc: 'A rested brain remembers more.', icon: '😴', cat: 'wellness', freq: 'daily', target: 1, unit: 'times', diff: 'easy', time: '22:30' }
];
const QUOTES = [
  ['The expert in anything was once a beginner.', 'Helen Hayes'],
  ['Learning is not attained by chance; it must be sought with ardor.', 'Abigail Adams'],
  ["Don't watch the clock; do what it does. Keep going.", 'Sam Levenson'],
  ['Small deeds done are better than great deeds planned.', 'Peter Marshall'],
  ['Success is the sum of small efforts repeated day in and day out.', 'Robert Collier'],
  ['It always seems impossible until it is done.', 'Nelson Mandela'],
  ['Every study session is a vote for the scholar you want to become.', 'Habitopia']
];
const ACH = [
  { id: 'first', i: '🌱', n: 'First Steps', d: 'Complete your first study quest', r: 'common', xp: 25, p: s => [s.done, 1] },
  { id: 'perfect', i: '🌟', n: 'Perfect Study Day', d: 'Finish every quest in one day', r: 'common', xp: 50, p: s => [s.perfect, 1] },
  { id: 'maker', i: '🛠️', n: 'Quest Maker', d: 'Create 3 of your own quests', r: 'common', xp: 40, p: s => [s.created, 3] },
  { id: 'exam', i: '🎓', n: 'Exam Ready', d: 'Finish a deadline (exam, quiz or project)', r: 'common', xp: 60, p: s => [s.dl, 1] },
  { id: 'fire', i: '🔥', n: 'On Fire', d: 'Complete a 5-day streak', r: 'rare', xp: 100, p: s => [s.best, 5] },
  { id: 'book', i: '📚', n: 'Bookworm', d: 'Complete 10 reading sessions', r: 'rare', xp: 100, p: s => [s.read, 10] },
  { id: 'early', i: '🌅', n: 'Early Bird', d: 'Complete 10 morning quests', r: 'rare', xp: 100, p: s => [s.morn, 10] },
  { id: 'focus', i: '🧠', n: 'Deep Focus', d: 'Finish 5 focus timer sessions', r: 'rare', xp: 100, p: s => [s.timer, 5] },
  { id: 'comeback', i: '🛡️', n: 'Comeback Hero', d: 'Save a streak with a Streak Shield', r: 'rare', xp: 75, p: s => [s.saved, 1] },
  { id: 'unstop', i: '⚡', n: 'Unstoppable', d: 'Complete a 7-day streak', r: 'epic', xp: 200, p: s => [s.best, 7] },
  { id: 'hours', i: '⏳', n: 'Scholar Hours', d: 'Study for 10 hours in total', r: 'epic', xp: 200, p: s => [Math.floor(s.mins / 60), 10] },
  { id: 'diamond', i: '💎', n: 'Diamond Mind', d: 'Earn 1,000 XP', r: 'epic', xp: 150, p: s => [s.xp, 1000] },
  { id: 'marathon', i: '🏅', n: 'Marathon', d: 'Complete 100 quests', r: 'epic', xp: 250, p: s => [s.done, 100] },
  { id: 'month', i: '🏆', n: 'Month of Might', d: 'Reach a 30-day streak', r: 'legendary', xp: 400, p: s => [s.best, 30] },
  { id: 'legend', i: '👑', n: 'Legendary', d: 'Reach level 20', r: 'legendary', xp: 500, p: s => [s.level, 20] }
];
const ACHM = Object.fromEntries(ACH.map(a => [a.id, a]));
const RAR = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const MILES = [3, 5, 7, 14, 21, 30, 50, 100];
const ITEMS = {
  outfit: [{ id: 'none', n: 'Plain Fur', l: 1, i: '🦊' }, { id: 'tunic', n: 'Adventurer Tunic', l: 1, i: '👕' }, { id: 'cloak', n: 'Forest Cloak', l: 5, i: '🧥' }, { id: 'mage', n: 'Mage Robe', l: 8, i: '🔮' }, { id: 'armor', n: 'Knight Armor', l: 12, i: '🛡️' }],
  weapon: [{ id: 'none', n: 'Bare Paws', l: 1, i: '✋' }, { id: 'wood', n: 'Wooden Sword', l: 3, i: '🗡️' }, { id: 'steel', n: 'Steel Sword', l: 7, i: '⚔️' }, { id: 'staff', n: 'Magic Staff', l: 10, i: '🪄' }],
  shield: [{ id: 'none', n: 'No Shield', l: 1, i: '✋' }, { id: 'buckler', n: 'Oak Buckler', l: 4, i: '🪵' }, { id: 'crest', n: 'Royal Crest', l: 9, i: '🔰' }],
  acc: [{ id: 'none', n: 'None', l: 1, i: '✨' }, { id: 'scarf', n: 'Red Scarf', l: 2, i: '🧣' }, { id: 'amulet', n: 'Gold Amulet', l: 6, i: '📿' }, { id: 'crown', n: 'Hero Crown', l: 15, i: '👑' }]
};
const SLOTS = { outfit: 'Outfits', weapon: 'Weapons', shield: 'Shields', acc: 'Accessories' };
const ALL_ITEMS = Object.entries(ITEMS).flatMap(([slot, a]) => a.filter(x => x.id !== 'none').map(x => ({ ...x, slot })));
const PLACES = [
  { id: 'forest', n: 'Forest of Consistency', e: '🌲', l: 1, s: 0, x: 80, y: 430, d: 'Every scholar begins under these whispering trees. Study a little every day and the forest grows with you.' },
  { id: 'mountain', n: 'Mountain of Discipline', e: '⛰️', l: 5, s: 5, x: 245, y: 330, d: 'A steep climb of discipline. Keep studying even when motivation fades.' },
  { id: 'kingdom', n: 'Kingdom of Focus', e: '🏰', l: 10, s: 7, x: 95, y: 210, d: 'A kingdom of deep focus. Only scholars with proven streaks may enter the gates.' },
  { id: 'valley', n: 'Valley of Growth', e: '🌄', l: 15, s: 14, x: 235, y: 95, d: 'Where all those small study sessions bloom into real mastery.' }
];
const titleOf = l => l >= 20 ? 'Legendary Scholar' : l >= 15 ? 'Grand Sage' : l >= 10 ? 'Master Scholar' : l >= 5 ? 'Apprentice Scholar' : 'Fledgling Scholar';
const need = l => 150 + l * 60;
function levelInfo(xp) { let l = 1, r = xp; while (r >= need(l)) { r -= need(l); l++; } return { level: l, cur: r, need: need(l) }; }

const PRESETS = [
  { name: 'Review Notes', desc: "Go over today's lecture notes.", icon: '📝', cat: 'notes', freq: 'daily', time: '19:00', target: 30, unit: 'minutes', diff: 'medium', subject: 'HCI' },
  { name: 'Read a Chapter', desc: 'Read 10 pages of your textbook.', icon: '📖', cat: 'reading', freq: 'daily', time: '07:00', target: 10, unit: 'pages', diff: 'medium', subject: 'Networking' },
  { name: 'Practice Coding', desc: 'Solve problems or build a small feature.', icon: '💻', cat: 'practice', freq: 'custom', days: [1, 2, 3, 4, 5], time: '20:00', target: 45, unit: 'minutes', diff: 'hard', subject: 'Programming' },
  { name: 'Focus Session', desc: 'One deep Pomodoro with your phone away.', icon: '⏱️', cat: 'focus', freq: 'daily', time: '09:00', target: 25, unit: 'minutes', diff: 'medium', subject: '' },
  { name: 'Plan Tomorrow', desc: "List tomorrow's classes and tasks.", icon: '🗓️', cat: 'tasks', freq: 'daily', time: '21:30', target: 1, unit: 'times', diff: 'easy', subject: '' },
  { name: 'Weekly Review', desc: "Summarize the week's topics in your own words.", icon: '🧠', cat: 'notes', freq: 'weekly', perWeek: 1, time: '', target: 1, unit: 'times', diff: 'hard', subject: '' },
  { name: 'Practice Quiz', desc: 'Test yourself twice a week.', icon: '✏️', cat: 'practice', freq: 'weekly', perWeek: 2, time: '17:00', target: 1, unit: 'times', diff: 'hard', subject: '' },
  { name: 'Sleep by 11 PM', desc: 'A rested brain remembers more.', icon: '😴', cat: 'wellness', freq: 'daily', time: '22:30', target: 1, unit: 'times', diff: 'easy', subject: '', personal: true }
];
const mkHabit = (p, i, created) => ({
  id: p.id || ('q' + (i + 1)), name: p.name, desc: p.desc || '', icon: p.icon, cat: p.cat, freq: p.freq, subject: p.subject || '',
  days: p.days || [0, 1, 2, 3, 4, 5, 6], perWeek: p.perWeek || 3, target: p.target || 1, unit: p.unit || 'times',
  time: p.time || '', diff: p.diff, xp: DIFF[p.diff].xp, personal: !!p.personal, created
});
const stepOf = h => h.target <= 10 ? 1 : Math.max(5, Math.round(h.target / 4 / 5) * 5);
const isRead = h => (h.cat === 'reading' || /read/i.test(h.name)) ? 1 : 0;
const isMorn = h => (h.time && h.time < '10:00') ? 1 : 0;

/* ---------------- state ---------------- */
const defaults = () => ({
  v: 2, user: null, species: 'fox', habits: [], sessions: [], deadlines: [], dismissed: {}, log: {}, ach: {}, notifs: [], offset: 0, cel: [], fired: {}, lastWeek: null,
  equip: { outfit: 'tunic', weapon: 'none', shield: 'none', acc: 'none' }, createdCount: 0, feedback: [],
  settings: { sound: true, remind: true, theme: 'dark', text: 'm', contrast: false, motion: false, swipe: true, swipes: 0, types: { reminder: true, quest: true, streak: true, level: true, achievement: true, weekly: true } }
});
function load() {
  try {
    const r = localStorage.getItem(KEY) || memStore;
    if (r) {
      const o = JSON.parse(r);
      if (o && o.v === 2) {
        const s = Object.assign(defaults(), o);
        s.settings = Object.assign(defaults().settings, o.settings || {}); s.settings.types = Object.assign(defaults().settings.types, (o.settings && o.settings.types) || {});
        s.habits.forEach(h => { if (CAT_MIGRATE[h.cat]) h.cat = CAT_MIGRATE[h.cat]; if (h.subject == null) h.subject = ''; });
        return s;
      }
    }
  } catch (e) { }
  return null;
}
function save() { memo = {}; const j = JSON.stringify(S); memStore = j; try { localStorage.setItem(KEY, j); } catch (e) { } }

/* ---------------- log helpers (everything below is derived from S.log) ---------------- */
const find = id => S.habits.find(h => h.id === id);
const dayLog = d => S.log[d] || (S.log[d] = { h: {}, perfect: false });
const doneOn = (d, id) => !!(S.log[d] && S.log[d].h[id] && S.log[d].h[id].d);
const progOn = (d, id) => (S.log[d] && S.log[d].h[id]) ? S.log[d].h[id].p : 0;
const doneCount = d => S.log[d] ? Object.values(S.log[d].h).filter(e => e.d).length : 0;
const isActive = d => doneCount(d) > 0;
function dayXp(d) { const L = S.log[d]; if (!L) return 0; return Object.values(L.h).reduce((a, e) => a + (e.d ? e.x : 0), 0) + (L.perfect ? PERFECT : 0) + (L.bonus || 0); }
function totalXp() {
  if (memo.xp != null) return memo.xp;
  let x = 0; for (const d in S.log) x += dayXp(d);
  for (const id in S.ach) if (S.ach[id].c) x += ACHM[id].xp;
  return memo.xp = x;
}
const weekCount = (h, from, to) => { let n = 0; for (let d = from; d <= to; d = addDays(d, 1)) if (doneOn(d, h.id)) n++; return n; };
const isSchedH = (h, d) => h.freq === 'daily' || (h.freq === 'custom' && h.days.includes(dow(d))) || h.freq === 'weekly';
function scheduled(d) {                    // quests that still need doing on day d
  return S.habits.filter(h => {
    if (h.created > d) return false;
    if (h.freq === 'daily') return true;
    if (h.freq === 'custom') return h.days.includes(dow(d));
    if (doneOn(d, h.id)) return true;
    return weekCount(h, weekStart(d), addDays(d, -1)) < h.perWeek;
  });
}
/* Streak: a day is "active" if at least one quest was completed.
   Gentle recovery: one missed day per week is forgiven by a Streak Shield. */
function streakInfo() {
  if (memo.st) return memo.st;
  const t = todayStr(), res = { count: 0, best: 0, shield: [], saved: 0, atRisk: false };
  const act = Object.keys(S.log).filter(isActive).sort();
  if (!act.length) return memo.st = res;
  const used = new Set(); let run = 0, best = 0;
  for (let d = act[0]; d <= t; d = addDays(d, 1)) {
    if (isActive(d)) run++;
    else if (d === t) { /* today still pending */ }
    else if (run > 0) {
      const wk = weekStart(d), nx = addDays(d, 1);
      if (!used.has(wk) && (isActive(nx) || nx === t)) { used.add(wk); res.shield.push(d); if (isActive(nx)) res.saved++; }
      else run = 0;
    }
    best = Math.max(best, run);
  }
  res.count = run; res.best = best;
  res.atRisk = run > 0 && !isActive(t);
  return memo.st = res;
}
function habitStreak(h) {
  const t = todayStr(); let c = 0;
  if (h.freq === 'weekly') {
    const cnt = w => weekCount(h, w, addDays(w, 6));
    let ws = weekStart(t); if (cnt(ws) >= h.perWeek) c++;
    ws = addDays(ws, -7);
    while (ws >= weekStart(h.created) && cnt(ws) >= h.perWeek) { c++; ws = addDays(ws, -7); }
    return c;
  }
  let d = doneOn(t, h.id) ? t : addDays(t, -1);
  for (let i = 0; i < 500 && d >= h.created; i++) {
    if (!isSchedH(h, d)) { d = addDays(d, -1); continue; }
    if (doneOn(d, h.id)) { c++; d = addDays(d, -1); } else break;
  }
  return c;
}
const minsOn = d => S.sessions.reduce((a, x) => a + (x.d === d ? x.min : 0), 0);
const minsRange = n => lastN(n).reduce((a, d) => a + minsOn(d), 0);
function subjectMins(n) {
  const days = new Set(lastN(n)), m = {};
  S.sessions.forEach(x => { if (days.has(x.d)) { const k = x.sub || 'General'; m[k] = (m[k] || 0) + x.min; } });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
const fmtMin = m => m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm';
const habitTotal = h => Object.keys(S.log).reduce((a, d) => a + (doneOn(d, h.id) ? 1 : 0), 0);
function stats() {
  if (memo.stats) return memo.stats;
  let done = 0, read = 0, morn = 0, perfect = 0;
  for (const d in S.log) { const L = S.log[d]; if (L.perfect) perfect++; for (const k in L.h) { const e = L.h[k]; if (e.d) { done++; read += e.r || 0; morn += e.m || 0; } } }
  const st = streakInfo(), xp = totalXp();
  const timer = S.sessions.filter(x => x.t === 't').length, mins = S.sessions.reduce((a, x) => a + x.min, 0), dl = S.deadlines.filter(x => x.done).length;
  return memo.stats = { done, read, morn, perfect, best: st.best, saved: st.saved, xp, level: levelInfo(xp).level, created: S.createdCount, timer, mins, dl };
}
function checkAch() {
  const s = stats(), fresh = [];
  ACH.forEach(a => { if (!S.ach[a.id] && a.p(s)[0] >= a.p(s)[1]) { S.ach[a.id] = { d: todayStr(), c: false }; fresh.push(a); } });
  return fresh;
}
function nextReward(level) {
  const nxt = ALL_ITEMS.filter(i => i.l > level).sort((a, b) => a.l - b.l)[0];
  return nxt || null;
}

/* ---------------- notifications ---------------- */
let nid = 1;
function pushN(type, title, text) {
  if (!S.settings.types[type]) return;
  S.notifs.unshift({ id: Date.now() + '-' + (nid++), type, title, text, ts: Date.now(), read: false });
  S.notifs = S.notifs.slice(0, 60);
}
const ago = ts => { const m = Math.max(0, Math.round((Date.now() - ts) / 60000)); return m < 1 ? 'Just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
const unread = () => S.notifs.filter(n => !n.read).length;

/* ---------------- state creation ---------------- */
function freshState(name) {
  S = defaults(); S.user = { name: (name || '').trim() || 'Adventurer' };
  const t = todayStr();
  S.habits = PRESETS.map((p, i) => mkHabit(p, i, t));
  S.lastWeek = weekStart(t);
  pushN('quest', 'Welcome, ' + S.user.name + '!', 'Finish your first study quest to earn XP and start your streak.');
  save();
}
const rangeCount = (start, n) => { let c = 0; for (let i = 0; i < n; i++) c += doneCount(addDays(start, i)); return c; };

/* ---------------- daily housekeeping ---------------- */
function checkNewDay() {
  const t = todayStr(), ws = weekStart(t);
  if (S.lastWeek !== ws) {
    if (S.lastWeek) { const n = rangeCount(S.lastWeek, 7); pushN('weekly', 'Weekly summary', 'Last week you completed ' + n + ' quest' + (n === 1 ? '' : 's') + (n ? '. Keep the momentum going!' : '. A fresh week is a fresh start!')); }
    S.lastWeek = ws;
  }
  const st = streakInfo();
  if (st.atRisk) { const k = 'risk' + t; if (!S.fired[k]) { S.fired[k] = 1; pushN('streak', 'Streak alert 🔥', 'Your ' + st.count + '-day streak needs one quest today to stay alive.'); } }
  Object.keys(S.fired).forEach(k => { if (!k.includes(t) && !k.startsWith('risk')) delete S.fired[k]; });
}

/* ---------------- game actions ---------------- */
const snap = () => ({ xp: totalXp(), lv: levelInfo(totalXp()).level, st: streakInfo().count });
function settle(b) {
  memo = {};
  let fresh = [], g = 0, f;
  while ((f = checkAch()).length && g++ < 5) { fresh = fresh.concat(f); memo = {}; }
  const xp1 = totalXp(), lv1 = levelInfo(xp1).level, st1 = streakInfo().count, ev = [];
  if (lv1 > b.lv) { ev.push({ t: 'level', from: b.lv, lv: lv1 }); pushN('level', 'Level up!', 'You reached Level ' + lv1 + ' — ' + titleOf(lv1) + '.'); }
  fresh.forEach(a => { ev.push({ t: 'ach', id: a.id }); pushN('achievement', 'Achievement unlocked', a.n + ' — ' + a.d); });
  if (st1 > b.st && MILES.includes(st1) && !S.cel.includes(st1)) { S.cel.push(st1); ev.push({ t: 'streak', n: st1 }); pushN('streak', st1 + '-day streak! 🔥', 'You are on fire. Keep the adventure going!'); }
  save(); render();
  ev.forEach(queueOv);
  return { gain: xp1 - b.xp, lv: lv1 };
}
function mutate(id, fn, pt) {
  const h = find(id); if (!h) return;
  const d = todayStr(), b = snap(), L = dayLog(d), was = !!(L.h[id] && L.h[id].d);
  fn(h, L);
  const now = !!(L.h[id] && L.h[id].d);
  const sch = scheduled(d), perf = sch.length > 0 && sch.every(x => doneOn(d, x.id));
  const newPerf = perf && !L.perfect; L.perfect = perf; memo = {};
  if (now && !was) pushN('quest', 'Quest complete', h.name + ' +' + h.xp + ' XP');
  const r = settle(b);
  if (now && !was) celebrateQuest(h, r.gain, newPerf, pt);
}
const entry = (L, h) => L.h[h.id] || (L.h[h.id] = { p: 0, d: 0, x: h.xp, r: isRead(h), m: isMorn(h) });
const addP = (h, L, np, rec) => {
  const e = entry(L, h), old = e.p; e.p = Math.min(h.target, np); e.x = h.xp; if (e.p >= h.target) { e.d = 1; if (e.hr == null) e.hr = new Date().getHours(); }
  const dl = e.p - old; if (rec !== false && h.unit === 'minutes' && dl > 0) S.sessions.push({ d: todayStr(), min: dl, id: h.id, sub: h.subject || '', t: 'm' });
};
const completeQ = (id, pt) => mutate(id, (h, L) => addP(h, L, h.target), pt);
const stepQ = (id, pt) => mutate(id, (h, L) => addP(h, L, entry(L, h).p + stepOf(h)), pt);
const undoQ = id => mutate(id, (h, L) => { delete L.h[id]; S.sessions = S.sessions.filter(s => !(s.d === todayStr() && s.id === id && s.t === 'm')); });
function claim(id) {
  if (!S.ach[id] || S.ach[id].c) return;
  const b = snap(); S.ach[id].c = true; memo = {};
  beep([523, 784, 1047]); settle(b);
}
function seedProgress(h) { return progOn(todayStr(), h.id); }

/* ---------------- sound + effects ---------------- */
let ac;
function beep(freqs) {
  if (!S || !S.settings.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * .09;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.13, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .3);
    });
  } catch (e) { }
}
const COLORS = ['#FFC85A', '#FF8A3D', '#7651D9', '#55D6A0', '#FFF4E7', '#F472B6'];
function confettiHtml(n) {
  return Array.from({ length: n || 36 }, () => `<i class="cf" style="left:${Math.random() * 100}%;background:${COLORS[Math.random() * COLORS.length | 0]};animation-duration:${1.8 + Math.random() * 1.8}s;animation-delay:${Math.random() * .6}s"></i>`).join('');
}
function burst(x, y) {                               // small confetti burst at a point
  const L = $('#fxL'), r = $('#app').getBoundingClientRect();
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 60;
    p.className = 'spark'; p.style.cssText = `left:${x - r.left}px;top:${y - r.top}px;background:${COLORS[i % COLORS.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px`;
    L.appendChild(p); setTimeout(() => p.remove(), 900);
  }
}
function floatXp(x, y, txt) {
  const L = $('#fxL'), r = $('#app').getBoundingClientRect(), e = document.createElement('div');
  e.className = 'floatxp'; e.textContent = txt; e.style.left = (x - r.left) + 'px'; e.style.top = (y - r.top) + 'px';
  L.appendChild(e); setTimeout(() => e.remove(), 1400);
}
let toastT;
function toast(html, ms) {
  const T = $('#toastL'); T.innerHTML = `<div class="toast" role="status">${html}</div>`;
  clearTimeout(toastT); toastT = setTimeout(() => { T.innerHTML = ''; }, ms || 2600);
}
function celebrateQuest(h, gain, perf, pt) {
  const x = pt ? pt.x : innerWidth / 2, y = pt ? pt.y : innerHeight / 2;
  floatXp(x, y, '+' + gain + ' XP'); burst(x, y);
  beep([659, 880, 1175]);
  toast(`<div class="tmasc">${mascot({ mood: 'cheer', crop: 'head', size: 46 })}</div><div><b>Quest Complete!</b><div class="small">${esc(h.name)} · +${h.xp} XP${perf ? ' · 🌟 Perfect Day +' + PERFECT : ''}</div></div>`);
}

/* ---------------- icons ---------------- */
const IC = {
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  quests: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9 11l2 2 4-4M9 17h6"/>',
  rewards: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
  journey: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell: '<path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4zM10 21a2 2 0 0 0 4 0"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  chev: '<path d="M9 5l7 7-7 7"/>'
};
const ico = (n, s) => `<svg class="ic" width="${s || 22}" height="${s || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const flame = s => `<svg class="flame" width="${s || 20}" height="${s || 20}" viewBox="0 0 24 24" aria-hidden="true"><path fill="url(#g-flame)" d="M12 1.5c.6 3.6 5.6 6 5.6 11.6a5.6 5.6 0 0 1-11.2 0c0-2.2 1-3.7 2.4-4.8.1 1.9.9 3 2.1 3.2-.8-3.4-.6-6.4 1.1-10z"/><path fill="#FFF4E7" opacity=".85" d="M12 12.2c.5 1.5 2.3 2.4 2.3 4.2a2.3 2.3 0 0 1-4.6 0c0-1.2.7-1.9 1.3-2.6.3.7.6.9 1 1-.3-1.1-.2-1.9 0-2.6z"/></svg>`;
const logo = s => `<svg width="${s || 30}" height="${s || 30}" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2l12 5v8c0 8-5 13-12 15C9 28 4 23 4 15V7z" fill="url(#g-gold)"/><path d="M16 9l2 5 5 .5-4 3.5 1.2 5L16 20l-4.2 3 1.2-5-4-3.5 5-.5z" fill="#10152F"/></svg>`;

function badge(a, on, size) {
  const g = on ? 'g-' + a.r : 'g-locked';
  return `<svg class="badgesvg ${on ? 'on' : ''}" width="${size || 74}" height="${(size || 74) * 1.1}" viewBox="0 0 100 110" aria-hidden="true"><path d="M50 4l42 24v54L50 106 8 82V28z" fill="url(#${g})" stroke="rgba(255,255,255,.55)" stroke-width="3"/><path d="M50 14l33 19v44L50 96 17 77V33z" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/><circle cx="50" cy="55" r="27" fill="rgba(16,21,47,.5)"/>${on ? `<text x="50" y="66" text-anchor="middle" font-size="32">${a.i}</text>` : `<g transform="translate(36 40)" stroke="#b8b3d9" stroke-width="2.4" fill="none" stroke-linecap="round"><rect x="2" y="12" width="24" height="16" rx="3"/><path d="M7 12V8a7 7 0 0 1 14 0v4"/></g>`}</svg>`;
}
function ring(p, size, col, txt, sub) {
  const r = size / 2 - 8, c = 2 * Math.PI * r, h = size / 2;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${h}" cy="${h}" r="${r}" stroke="rgba(255,255,255,.12)" stroke-width="9" fill="none"/><circle cx="${h}" cy="${h}" r="${r}" stroke="${col}" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.min(1, p))).toFixed(1)}" transform="rotate(-90 ${h} ${h})" class="ringfg"/></svg><div class="rt"><b>${txt}</b><small>${sub}</small></div></div>`;
}

/* ---------------- Habi the companion (original mascots, SVG) ---------------- */
const SPECIES = {
  fox: { n: 'Fox', e: '🦊', main: '#F58A2B', belly: '#FFF1DC', paw: '#7a3b12', inner: '#8a4320', nose: '#2b1a0e', blush: '#ff7b9c' },
  rabbit: { n: 'Rabbit', e: '🐰', main: '#EFE9F7', belly: '#FFFFFF', paw: '#cdbfe6', inner: '#F7B3CB', nose: '#F08FB0', blush: '#ff9bb8' },
  tiger: { n: 'Tiger', e: '🐯', main: '#F7A936', belly: '#FFF1DC', paw: '#2b1a0e', inner: '#FFF1DC', nose: '#3a2418', blush: '#ff7b9c' },
  snake: { n: 'Snake', e: '🐍', main: '#3FB88A', belly: '#D9F7E8', paw: '#2c8c68', inner: '#2c8c68', nose: '#1d6a4d', blush: '#ff9bb8' },
  slug: { n: 'Slug', e: '🐌', main: '#C09CF7', belly: '#EEDDFF', paw: '#9a74d6', inner: '#9a74d6', nose: '#7a52c0', blush: '#ff9bb8' }
};
const speciesOf = () => (S && SPECIES[S.species]) ? S.species : 'fox';
function mascot(o) {
  o = o || {};
  const sp = SPECIES[o.sp] ? o.sp : speciesOf(), C = SPECIES[sp];
  const mood = o.mood || 'happy', eq = o.eq || (S && S.equip) || { outfit: 'tunic', weapon: 'none', shield: 'none', acc: 'none' };
  const size = o.size || 120, head = o.crop === 'head', ink = '#2b1a0e', OR = C.main, CR = C.belly, BR = C.paw;
  const eyes = mood === 'cheer' ? `<path class="eye" d="M52 62q6-9 12 0M76 62q6-9 12 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
    : mood === 'sleepy' ? `<path d="M52 61h12M76 61h12" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`
    : `<g class="eye"><circle cx="58" cy="60" r="5.4" fill="${ink}"/><circle cx="82" cy="60" r="5.4" fill="${ink}"/><circle cx="60" cy="58" r="1.9" fill="#fff"/><circle cx="84" cy="58" r="1.9" fill="#fff"/></g>`;
  const brows = mood === 'sad' ? `<path d="M50 50l12 3M90 50l-12 3" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>` : '';
  const mouth = { cheer: `<path d="M62 78q8 14 16 0z" fill="#e0475b" stroke="${ink}" stroke-width="1.5"/>`, happy: `<path d="M63 78q7 7 14 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`, neutral: `<path d="M64 80h12" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`, sad: `<path d="M63 83q7-7 14 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`, sleepy: `<path d="M65 80q5 4 10 0" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>` }[mood] || '';
  const blush = (mood === 'happy' || mood === 'cheer') ? `<circle cx="46" cy="72" r="4.5" fill="${C.blush}" opacity=".45"/><circle cx="94" cy="72" r="4.5" fill="${C.blush}" opacity=".45"/>` : '';
  const cheer = mood === 'cheer';

  /* ----- species parts ----- */
  const tails = {
    fox: `<g class="tail"><path d="M90 142C134 146 144 100 120 78 118 104 106 120 92 124z" fill="${OR}"/><path d="M120 78C131 87 135 100 131 113 125 105 117 99 112 92z" fill="${CR}"/></g>`,
    rabbit: `<circle cx="113" cy="140" r="11" fill="#fff" stroke="#dccff0" stroke-width="2"/>`,
    tiger: `<path d="M92 140C132 144 140 110 122 90" fill="none" stroke="${OR}" stroke-width="12" stroke-linecap="round"/><path d="M92 140C132 144 140 110 122 90" fill="none" stroke="${ink}" stroke-width="12" stroke-dasharray="3 10" stroke-dashoffset="-6"/>`,
    snake: `<path d="M92 150C134 152 142 116 116 118 102 120 106 138 120 134" fill="none" stroke="${OR}" stroke-width="12" stroke-linecap="round"/>`,
    slug: `<path d="M88 146C120 152 140 142 136 124 122 138 104 136 92 128z" fill="${OR}"/><path d="M92 141C112 145 126 141 130 133" fill="none" stroke="${CR}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`
  };
  const feet = {
    fox: `<ellipse cx="55" cy="150" rx="11" ry="6.5" fill="${BR}"/><ellipse cx="85" cy="150" rx="11" ry="6.5" fill="${BR}"/>`,
    rabbit: `<ellipse cx="54" cy="150" rx="12" ry="7" fill="${BR}"/><ellipse cx="86" cy="150" rx="12" ry="7" fill="${BR}"/>`,
    tiger: `<ellipse cx="55" cy="150" rx="11" ry="6.5" fill="${BR}"/><ellipse cx="85" cy="150" rx="11" ry="6.5" fill="${BR}"/>`,
    snake: `<ellipse cx="70" cy="153" rx="36" ry="9" fill="${OR}"/><path d="M42 154q28 8 56 0" stroke="${BR}" stroke-width="2" fill="none" opacity=".7"/>`,
    slug: `<ellipse cx="70" cy="153" rx="38" ry="8" fill="${BR}" opacity=".85"/>`
  };
  const bodyExtra = {
    fox: '', rabbit: '',
    tiger: `<path d="M44 108q9 3 14 1M44 122q9 3 14 1M96 108q-9 3-14 1M96 122q-9 3-14 1" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    snake: `<path d="M60 112h20M58 120h24M58 128h24M60 136h20" stroke="${OR}" opacity=".55" stroke-width="2" stroke-linecap="round"/>`,
    slug: `<circle cx="52" cy="112" r="3.5" fill="${BR}" opacity=".45"/><circle cx="90" cy="132" r="4" fill="${BR}" opacity=".45"/><circle cx="50" cy="136" r="3" fill="${BR}" opacity=".45"/>`
  };
  const cheeks = `<ellipse cx="55" cy="75" rx="15" ry="11" fill="${CR}"/><ellipse cx="85" cy="75" rx="15" ry="11" fill="${CR}"/><ellipse cx="70" cy="79" rx="12" ry="8" fill="${CR}"/>`;
  const ears = {
    fox: `<path d="M40 46L44 12 68 34z" fill="${OR}"/><path d="M100 46L96 12 72 34z" fill="${OR}"/><path d="M47 38l1-16 12 11z" fill="${C.inner}"/><path d="M93 38l-1-16-12 11z" fill="${C.inner}"/>`,
    rabbit: `<g transform="rotate(-9 54 27)"><ellipse cx="54" cy="27" rx="9.5" ry="25" fill="${OR}" stroke="#dccff0" stroke-width="1.5"/><ellipse cx="54" cy="29" rx="4.5" ry="17" fill="${C.inner}"/></g><g transform="rotate(9 86 27)"><ellipse cx="86" cy="27" rx="9.5" ry="25" fill="${OR}" stroke="#dccff0" stroke-width="1.5"/><ellipse cx="86" cy="29" rx="4.5" ry="17" fill="${C.inner}"/></g>`,
    tiger: `<circle cx="45" cy="37" r="11" fill="${OR}"/><circle cx="45" cy="37" r="5.5" fill="${CR}"/><circle cx="95" cy="37" r="11" fill="${OR}"/><circle cx="95" cy="37" r="5.5" fill="${CR}"/>`,
    snake: '',
    slug: `<path d="M54 40Q46 24 44 12" stroke="${OR}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="44" cy="10" r="7.5" fill="${OR}"/><circle cx="46" cy="8" r="2.4" fill="#fff" opacity=".85"/><path d="M86 40Q94 24 96 12" stroke="${OR}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="96" cy="10" r="7.5" fill="${OR}"/><circle cx="98" cy="8" r="2.4" fill="#fff" opacity=".85"/>`
  };
  const face = {
    fox: cheeks, tiger: cheeks,
    rabbit: `<ellipse cx="70" cy="78" rx="15" ry="10" fill="${CR}"/>`,
    snake: `<ellipse cx="70" cy="76" rx="23" ry="15" fill="${CR}"/><path d="M70 31l8 9-8 9-8-9z" fill="${BR}" opacity=".85"/><circle cx="50" cy="44" r="2.2" fill="${BR}" opacity=".5"/><circle cx="90" cy="44" r="2.2" fill="${BR}" opacity=".5"/>`,
    slug: `<ellipse cx="70" cy="75" rx="24" ry="17" fill="${CR}"/><circle cx="50" cy="42" r="3" fill="${BR}" opacity=".45"/><circle cx="92" cy="46" r="3.5" fill="${BR}" opacity=".45"/><circle cx="84" cy="38" r="2.2" fill="${BR}" opacity=".45"/>`
  };
  const deco = {
    tiger: `<path d="M70 32v10M60 34l2 8M80 34l-2 8M38 60h8M38 68l7-2M102 60h-8M102 68l-7-2" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`
  };
  const nose = {
    fox: `<ellipse cx="70" cy="72" rx="4.6" ry="3.4" fill="${ink}"/>`,
    tiger: `<ellipse cx="70" cy="72" rx="4.6" ry="3.4" fill="${C.nose}"/>`,
    rabbit: `<ellipse cx="70" cy="72" rx="3.6" ry="2.8" fill="${C.nose}"/>`,
    snake: `<circle cx="66" cy="71" r="1.6" fill="${C.nose}"/><circle cx="74" cy="71" r="1.6" fill="${C.nose}"/>`,
    slug: ''
  };
  const extra = sp === 'rabbit' && mood !== 'sad' ? `<rect x="65.6" y="80" width="4.2" height="6.5" rx="1.2" fill="#fff" stroke="#d9cde8" stroke-width=".8"/><rect x="70.2" y="80" width="4.2" height="6.5" rx="1.2" fill="#fff" stroke="#d9cde8" stroke-width=".8"/>`
    : sp === 'snake' && (mood === 'happy' || mood === 'neutral') ? `<path d="M70 80v9" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round"/><path d="M70 89l-3 3.5M70 89l3 3.5" stroke="#e11d48" stroke-width="2" stroke-linecap="round"/>` : '';

  /* ----- back layers ----- */
  let back = '';
  if (o.glow) back += `<circle cx="70" cy="95" r="82" fill="url(#aura)" class="aura"/>`;
  if (eq.outfit === 'cloak') back += `<path d="M44 98L22 156Q70 172 118 156L96 98z" fill="#1F7A4D" stroke="#14543a" stroke-width="2"/>`;
  back += tails[sp];
  /* ----- body ----- */
  let body = feet[sp] + `<ellipse cx="70" cy="120" rx="27" ry="30" fill="${OR}"/><ellipse cx="70" cy="127" rx="15" ry="20" fill="${CR}"/>` + bodyExtra[sp];
  const outfits = {
    tunic: `<path d="M45 102Q70 92 95 102L99 142Q70 152 41 142z" fill="#2FA36B" stroke="#1d7a4f" stroke-width="1.5"/><rect x="42" y="128" width="56" height="7" fill="#7a4a1e"/><rect x="65" y="126" width="10" height="11" rx="2" fill="#FFC85A"/>`,
    cloak: `<path d="M45 102Q70 92 95 102L99 142Q70 152 41 142z" fill="#2a8a58" stroke="#1d6a45" stroke-width="1.5"/><rect x="42" y="128" width="56" height="7" fill="#5b3a1a"/><rect x="65" y="126" width="10" height="11" rx="2" fill="#FFC85A"/>`,
    mage: `<path d="M44 100Q70 90 96 100L108 154Q70 166 32 154z" fill="#4C3FB1" stroke="#33298a" stroke-width="1.5"/><path d="M42 130Q70 140 98 130" stroke="#FFC85A" stroke-width="5" fill="none"/><g fill="#FFC85A"><circle cx="52" cy="145" r="2"/><circle cx="88" cy="146" r="2"/><circle cx="70" cy="150" r="2.4"/><circle cx="60" cy="112" r="1.6"/><circle cx="82" cy="114" r="1.6"/></g>`,
    armor: `<path d="M46 102Q70 92 94 102L92 138Q70 148 48 138z" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/><rect x="48" y="126" width="44" height="6" fill="#FFC85A"/><path d="M70 104v22" stroke="#94a3b8" stroke-width="2"/><circle cx="43" cy="102" r="10" fill="#94a3b8" stroke="#64748b" stroke-width="2"/><circle cx="97" cy="102" r="10" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>`
  };
  body += outfits[eq.outfit] || '';
  /* ----- arms, shield, weapon ----- */
  const armL = `<ellipse cx="41" cy="118" rx="8.5" ry="17" transform="rotate(18 41 118)" fill="${OR}"/>`;
  let shield = '';
  if (eq.shield === 'buckler') shield = `<g><circle cx="32" cy="128" r="19" fill="#b07a43" stroke="#7a4a1e" stroke-width="3"/><circle cx="32" cy="128" r="12" fill="none" stroke="#8a5a2c" stroke-width="2"/><circle cx="32" cy="128" r="5" fill="#FFC85A"/></g>`;
  if (eq.shield === 'crest') shield = `<g><path d="M14 110h36v22q0 16-18 24-18-8-18-24z" fill="#6d3fe0" stroke="#FFC85A" stroke-width="3"/><path d="M32 117l3.2 7 7.6.8-5.7 5 1.7 7.5-6.8-4-6.8 4 1.7-7.5-5.7-5 7.6-.8z" fill="#FFC85A"/></g>`;
  const pawL = `<circle cx="40" cy="133" r="7.5" fill="${OR}"/>`;
  const weapons = {
    wood: `<g transform="translate(100 132) rotate(18)"><rect x="-3.5" y="-54" width="7" height="46" rx="2.5" fill="#c08a52" stroke="#7a4a1e" stroke-width="1.5"/><rect x="-10" y="-9" width="20" height="5" rx="2" fill="#7a4a1e"/><rect x="-3" y="-4" width="6" height="14" rx="2" fill="#5b3a1a"/></g>`,
    steel: `<g transform="translate(100 132) rotate(18)"><path d="M0 -70L6 -52V-9H-6V-52z" fill="#dbeafe" stroke="#64748b" stroke-width="1.8"/><path d="M0 -66V-12" stroke="#fff" stroke-width="1.6" opacity=".8"/><rect x="-13" y="-9" width="26" height="6" rx="3" fill="#FFC85A" stroke="#b8861b" stroke-width="1.5"/><rect x="-3.5" y="-3" width="7" height="14" rx="2" fill="#6d3fe0"/><circle cx="0" cy="13" r="3.5" fill="#FFC85A"/></g>`,
    staff: `<g transform="translate(100 132) rotate(8)"><rect x="-3" y="-64" width="6" height="86" rx="3" fill="#7c4a1e"/><circle class="orb" cx="0" cy="-72" r="14" fill="#a78bfa" opacity=".35"/><circle cx="0" cy="-72" r="8.5" fill="#c4b5fd" stroke="#7651D9" stroke-width="2"/><path d="M-8 -62q8 6 16 0" stroke="#FFC85A" stroke-width="3" fill="none"/></g>`
  };
  const armR = `<ellipse cx="99" cy="118" rx="8.5" ry="17" transform="rotate(-18 99 118)" fill="${OR}"/>${weapons[eq.weapon] || ''}<circle cx="100" cy="133" r="7.5" fill="${OR}"/>`;
  const rightGroup = cheer ? `<g transform="rotate(-14 93 106)">${armR}</g>` : `<g>${armR}</g>`;
  /* ----- head ----- */
  let hd = ears[sp] + `<circle cx="70" cy="62" r="32" fill="${OR}"/>` + face[sp] + (deco[sp] || '');
  hd += blush + brows + eyes + nose[sp] + mouth + extra;
  /* ----- accessories ----- */
  let acc = '';
  if (eq.acc === 'scarf') acc = `<path d="M48 92Q70 108 92 92L95 102Q70 118 45 102z" fill="#e11d48" stroke="#9f1239" stroke-width="1.5"/><path d="M82 106L92 132 80 128z" fill="#e11d48" stroke="#9f1239" stroke-width="1.5"/>`;
  if (eq.acc === 'amulet') acc = `<path d="M52 96Q70 116 88 96" stroke="#FFC85A" stroke-width="2.4" fill="none"/><circle cx="70" cy="112" r="6" fill="#FFC85A" stroke="#b8861b" stroke-width="1.5"/><circle cx="70" cy="112" r="2.8" fill="#7651D9"/>`;
  if (eq.acc === 'crown') acc = `<path d="M48 36L54 16 63 30 70 10 77 30 86 16 92 36z" fill="#FFC85A" stroke="#b8861b" stroke-width="2"/><circle cx="54" cy="16" r="2.6" fill="#ff7b9c"/><circle cx="70" cy="10" r="2.8" fill="#55D6A0"/><circle cx="86" cy="16" r="2.6" fill="#ff7b9c"/>`;
  const inner = back + body + armL + shield + pawL + rightGroup + hd + acc;
  const vb = head ? '34 2 72 84' : '0 0 140 170';
  const w = size, h = head ? size * 84 / 72 : size * 170 / 140;
  return `<svg class="fox ${head ? 'headcrop' : ''} ${o.cls || ''}" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-label="Habi the ${C.n.toLowerCase()} adventurer">${inner}</svg>`;
}
const foxMood = r => r >= 1 ? 'cheer' : r >= .5 ? 'happy' : 'neutral';

/* ================= views ================= */
let view = 'home', backTo = 'home', questTab = 'daily', rewardFilter = 'all', form = null, aRange = 7, nFilter = 'all', placeSel = 'forest', eqTab = 'outfit', fb = { rating: 4 }, loading = false;
const freqText = h => h.freq === 'daily' ? 'Every day' : h.freq === 'weekly' ? h.perWeek + '× per week' : h.days.slice().sort().map(d => DAYS[d]).join(' · ');
const pctTxt = p => Math.round(p * 100) + '%';
const catOf = h => CATS[h.cat] || CATS.focus;

function foxSays() {
  const t = todayStr(), sch = scheduled(t), dn = sch.filter(h => doneOn(t, h.id)).length, st = streakInfo();
  if (!sch.length) return 'No classes or quests today. Rest your brain! 🌿';
  if (dn === sch.length) return 'All study quests done! I am so proud of you! 🎉';
  if (st.atRisk) return 'Your ' + st.count + '-day streak needs just one quest today. You can do it!';
  if (st.shield.length && st.shield[st.shield.length - 1] === addDays(t, -1)) return 'My Streak Shield protected you yesterday. Let\'s keep going! 🛡️';
  if (dn === 0) return 'Fresh day to learn. Pick one study quest and begin!';
  return 'Nice work! ' + (sch.length - dn) + ' more to go.';
}
function questCard(h, t) {
  const c = catOf(h), d = doneOn(t, h.id), p = progOn(t, h.id), pct = Math.min(100, p / h.target * 100), step = stepOf(h);
  const wk = h.freq === 'weekly' ? `<span>📅 ${weekCount(h, weekStart(t), t)}/${h.perWeek} this week</span>` : '';
  return `<article class="q ${d ? 'done' : ''}" data-id="${h.id}" style="--c:${c.a};--c2:${c.b}">
    <div class="ico" aria-hidden="true">${esc(h.icon)}</div>
    <div class="tx"><h3>${esc(h.name)}</h3><p>${esc(h.desc)}</p>
      <div class="prog"><div class="bar"><i style="width:${pct}%"></i></div><span>${p}/${h.target} ${esc(h.unit)}</span></div>
      <div class="meta"><span class="xp">+${h.xp} XP</span>${h.subject ? `<span class="subj">📚 ${esc(h.subject)}</span>` : ''}<span>🔥 ${habitStreak(h)}</span>${h.time ? `<span>⏰ ${h.time}</span>` : ''}${wk}</div></div>
    <div class="acts">${(!d && h.target > 1) ? `<button class="step" data-act="step" data-id="${h.id}" aria-label="Add ${step} ${esc(h.unit)} to ${esc(h.name)}">+${step}</button>` : ''}
      <button class="cbtn ${d ? 'ok' : ''}" data-act="${d ? 'undo' : 'complete'}" data-id="${h.id}" aria-label="${d ? 'Undo' : 'Complete'} ${esc(h.name)}">${d ? '✓ Done' : 'Complete'}</button></div></article>`;
}
function emptyState(title, text, btn) {
  return `<div class="empty">${mascot({ mood: 'neutral', size: 110 })}<h3>${title}</h3><p>${text}</p>${btn || ''}</div>`;
}

/* ---- adaptive suggestions (all computed locally from your own log) ---- */
const BUCKETS = [['morning', '🌅'], ['afternoon', '☀️'], ['evening', '🌙'], ['night', '🦉']];
const bucketOf = h => h >= 5 && h <= 11 ? 0 : h >= 12 && h <= 17 ? 1 : h >= 18 && h <= 22 ? 2 : 3;
const hrLabel = h => (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM');
function timeStats() {
  const hrs = Array(24).fill(0), bk = [0, 0, 0, 0]; let n = 0;
  lastN(35).forEach(d => { const L = S.log[d]; if (L) Object.values(L.h).forEach(e => { if (e.d && e.hr != null) { hrs[e.hr]++; bk[bucketOf(e.hr)]++; n++; } }); });
  return { hrs, bk, n, best: bk.indexOf(Math.max(...bk)), peak: hrs.indexOf(Math.max(...hrs)) };
}
function suggestions() {
  const out = [], t = todayStr(), ts = timeStats(), dis = S.dismissed || {}, add = o => { if (dis[o.key] !== t) out.push(o); };
  const rates = S.habits.filter(h => h.created <= addDays(t, -7)).map(h => [h, habitRate(h, 14)]);
  if (ts.n >= 8) {
    const share = Math.round(ts.bk[ts.best] / ts.n * 100), pk = ts.peak;
    const c = rates.filter(([h, r]) => r < .9 && (!h.time || bucketOf(+h.time.slice(0, 2)) !== ts.best)).sort((a, b) => a[1] - b[1])[0];
    if (c) add({ key: 'move' + c[0].id, icon: BUCKETS[ts.best][1], title: 'Study at your best time', text: share + '% of your finished quests happen in the ' + BUCKETS[ts.best][0] + ', mostly around ' + hrLabel(pk) + '. ' + c[0].name + ' is only at ' + pctTxt(c[1]) + '. Try moving it to ' + hrLabel(pk) + '.', btn: 'Move to ' + hrLabel(pk), act: 'sgmove', id: c[0].id, v: pk });
    else add({ key: 'peak', icon: BUCKETS[ts.best][1], title: 'Your power hour', text: 'You finish the most quests around ' + hrLabel(pk) + '. Keep that time free for your hardest subject.', btn: '⏱ Start a focus session', act: 'sgfocus', id: '', v: '' });
  }
  const subs = [...new Set(S.habits.map(h => h.subject).filter(Boolean))];
  const nSub = subs.map(s => { const last = S.sessions.filter(x => x.sub === s).map(x => x.d).sort().pop(); return [s, last ? diff(last, t) : 99]; }).filter(x => x[1] >= 4 && x[1] < 99).sort((a, b) => b[1] - a[1])[0];
  if (nSub) {
    const dl = S.deadlines.filter(x => !x.done && x.title.toLowerCase().includes(nSub[0].toLowerCase())).sort((a, b) => a.date < b.date ? -1 : 1)[0], q = S.habits.find(h => h.subject === nSub[0] && h.unit === 'minutes');
    add({ key: 'sub' + nSub[0], icon: '📚', title: nSub[0] + ' needs attention', text: (nSub[1] >= 99 ? 'No study time logged for ' + nSub[0] + ' yet.' : 'No ' + nSub[0] + ' study logged in ' + nSub[1] + ' days.') + (dl ? ' Your ' + dl.title + ' is ' + dlText(daysLeft(dl.date)).toLowerCase() + '.' : ''), btn: '⏱ Study ' + nSub[0] + ' now', act: 'sgfocus', id: q ? q.id : '', v: nSub[0] });
  }
  const hard = rates.filter(([h, r]) => r < .5 && h.freq !== 'weekly' && h.target > 1).sort((a, b) => a[1] - b[1])[0];
  if (hard) {
    const h = hard[0], nt = h.unit === 'minutes' ? Math.max(10, Math.round(h.target / 2 / 5) * 5) : Math.max(1, Math.ceil(h.target / 2));
    if (nt < h.target) add({ key: 'ease' + h.id, icon: '🪜', title: 'Make it easier to start', text: h.name + ' is at ' + pctTxt(hard[1]) + ' for 2 weeks. A smaller goal keeps the habit alive.', btn: 'Lower to ' + nt + ' ' + h.unit, act: 'sgease', id: h.id, v: nt });
  }
  return out;
}
const sgCard = (s, kick) => `<section class="card sg">${kick ? '<div class="small gold" style="margin-bottom:6px">💡 HABI SUGGESTS</div>' : ''}<div class="row g8" style="align-items:flex-start"><span class="sgi" aria-hidden="true">${s.icon}</span><div class="tx"><b>${esc(s.title)}</b><p>${esc(s.text)}</p></div></div>
  <div class="row g8" style="margin-top:10px"><button class="btn sm grow" data-act="${s.act}" data-id="${esc(s.id)}" data-v="${esc(String(s.v))}" data-k="${esc(s.key)}">${esc(s.btn)}</button><button class="chip sm" data-act="sgno" data-k="${esc(s.key)}">Not now</button></div></section>`;
const daysLeft = d => diff(todayStr(), d);
const dlText = n => n < 0 ? Math.abs(n) + ' day' + (Math.abs(n) === 1 ? '' : 's') + ' overdue' : n === 0 ? 'Due today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days';
const DLT = { exam: ['🎓', 'Exam'], quiz: ['📝', 'Quiz'], project: ['🛠️', 'Project'], homework: ['✏️', 'Homework'] };
const nextDl = () => S.deadlines.filter(x => !x.done).sort((a, b) => a.date < b.date ? -1 : 1)[0];
function studyCard(t, sch) {
  const goal = Math.max(30, sch.reduce((a, h) => a + (h.unit === 'minutes' ? h.target : 0), 0)), m = minsOn(t), wk = minsRange(7), nd = nextDl();
  return `<section class="card studycard"><div class="row sp"><div><div class="small gold">📚 STUDY TIME TODAY</div><div class="big2">${fmtMin(m)} <small class="muted">/ ${fmtMin(goal)}</small></div></div>
      <button class="btn sm" data-act="go" data-v="focus">⏱ Focus</button></div>
    <div class="bar" role="progressbar" aria-label="Study time today" aria-valuenow="${m}" aria-valuemin="0" aria-valuemax="${goal}"><i style="width:${Math.min(100, m / goal * 100)}%"></i></div>
    <div class="row sp small muted"><span>This week: ${fmtMin(wk)}</span><span>${m >= goal ? '🎉 Goal reached!' : fmtMin(goal - m) + ' to go'}</span></div>
    ${nd ? `<button class="dlmini ${daysLeft(nd.date) <= 3 ? 'hot' : ''}" data-act="todl"><span>${DLT[nd.type][0]}</span><b>${esc(nd.title)}</b><small>${dlText(daysLeft(nd.date))}</small></button>` : ''}</section>`;
}
function viewHome() {
  const t = todayStr(), sch = scheduled(t), dn = sch.filter(h => doneOn(t, h.id)).length, ratio = sch.length ? dn / sch.length : 0;
  const xp = totalXp(), li = levelInfo(xp), st = streakInfo(), n = unread();
  const nxtLv = ALL_ITEMS.filter(i => i.l === li.level + 1), nr = nextReward(li.level);
  const rewardTxt = nxtLv.length ? 'Next level reward: ' + nxtLv.map(i => i.i + ' ' + i.n).join(', ') : nr ? 'Next gear at Lv ' + nr.l + ': ' + nr.i + ' ' + nr.n : 'All gear unlocked — you are a legend!';
  const q = QUOTES[Math.abs(diff('2026-01-01', t)) % QUOTES.length];
  return `<header class="top"><div class="logo">${logo(30)}<b>Habitopia</b></div>
    <div class="row g8"><button class="ib" data-act="go" data-v="notifs" aria-label="Notifications, ${n} unread">${ico('bell')}${n ? `<i class="dot">${n}</i>` : ''}</button>
      <button class="streakchip" data-act="go" data-v="streak" aria-label="Current streak ${st.count} days">${flame(18)} ${st.count}</button>
      <button class="avatar" data-act="nav" data-v="profile" aria-label="Open profile">${mascot({ crop: 'head', size: 42, mood: 'happy' })}</button></div></header>
    <section class="welcome"><div><h1>Ready, ${esc(S.user.name)}?</h1><p>Small steps. Legendary grades.</p><div class="bubble">${esc(foxSays())}</div></div>
      <div class="mw"><div>${mascot({ mood: foxMood(ratio), size: 132, glow: li.level >= 20 })}</div></div></section>
    <section class="card lvlcard"><div class="av">${mascot({ crop: 'head', size: 64 })}</div><div class="t"><div class="small gold">${titleOf(li.level).toUpperCase()}</div><div class="big">Level ${li.level}</div>
      <div class="bar xp" role="progressbar" aria-label="XP progress" aria-valuenow="${li.cur}" aria-valuemin="0" aria-valuemax="${li.need}"><i style="width:${li.cur / li.need * 100}%"></i></div>
      <div class="row sp small"><span>${li.cur} / ${li.need} XP</span><span class="muted">${xp.toLocaleString()} total</span></div></div>
      <div class="reward">🎁 ${esc(rewardTxt)}</div></section>
    <section class="stats3"><button class="stat" data-act="go" data-v="streak"><span class="si">${flame(26)}</span><b>${st.count}</b><small>Day streak</small></button>
      <button class="stat" data-act="go" data-v="analytics"><span class="si">✨</span><b>${xp.toLocaleString()}</b><small>Total XP</small></button>
      <button class="stat" data-act="nav" data-v="quests"><span class="si">✅</span><b>${dn}/${sch.length}</b><small>Done today</small></button></section>
    ${studyCard(t, sch)}
    ${(() => { const g = suggestions(); return g.length ? sgCard(g[0], true) : ''; })()}
    <div class="sec"><h2>Today's Study Quests</h2><span class="small muted">${parse(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
    ${S.settings.swipe && (S.settings.swipes || 0) < 3 && sch.length ? '<p class="swhint">👉 Tip: swipe a quest right to complete it, left to undo.</p>' : ''}
    ${sch.length ? sch.map(h => questCard(h, t)).join('') : emptyState('No quests today', 'Enjoy your rest day, or create a new quest to keep growing.', `<button class="btn" data-act="create">+ Create Quest</button>`)}
    <section class="card quote"><div class="qm">❝</div><p class="qt">${esc(q[0])}</p><p class="qa">— ${esc(q[1])}</p>
      <div class="row g8 fox-msg">${mascot({ crop: 'head', size: 40, mood: 'cheer' })}<span>${esc(foxSays())}</span></div></section>`;
}

let dlForm = { title: '', date: '', type: 'exam', err: '' };
function viewDeadlines(tabs) {
  const open = S.deadlines.filter(x => !x.done).sort((a, b) => a.date < b.date ? -1 : 1), done = S.deadlines.filter(x => x.done);
  const card = x => { const n = daysLeft(x.date), hot = !x.done && n <= 3;
    return `<article class="dl ${x.done ? 'done' : ''} ${hot ? 'hot' : ''}"><span class="dli">${DLT[x.type][0]}</span><div class="tx"><h3>${esc(x.title)}</h3><p>${DLT[x.type][1]} · ${parse(x.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · <b>${x.done ? 'Finished ✓' : dlText(n)}</b></p></div>
      <div class="acts">${x.done ? '' : `<button class="cbtn" data-act="dldone" data-id="${x.id}" aria-label="Mark ${esc(x.title)} finished">Done +60</button>`}<button class="ib sm" data-act="dldel" data-id="${x.id}" aria-label="Delete ${esc(x.title)}">${ico('trash', 18)}</button></div></article>`; };
  return `<h1 class="ptitle">Quests</h1>
    <div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" aria-selected="${questTab === k}" class="${questTab === k ? 'on' : ''}" data-act="qtab" data-v="${k}">${n}</button>`).join('')}</div>
    <section class="card"><h3>➕ Add deadline</h3>
      <label class="l" for="dl-title">What is due?</label><input type="text" id="dl-title" maxlength="40" value="${esc(dlForm.title)}" placeholder="e.g. Networking Quiz">
      <label class="l" for="dl-date">Date</label><input type="date" id="dl-date" value="${dlForm.date}" min="${todayStr()}">
      <label class="l">Type</label><div class="chips">${Object.entries(DLT).map(([k, [e, n]]) => `<button type="button" class="chip ${dlForm.type === k ? 'on' : ''}" data-act="dltype" data-v="${k}">${e} ${n}</button>`).join('')}</div>
      ${dlForm.err ? `<p class="err" role="alert">${esc(dlForm.err)}</p>` : ''}<button class="btn block" style="margin-top:12px" data-act="dladd">Add deadline</button></section>
    <div class="sec"><h2>Coming up</h2><span class="small muted">${open.length} open</span></div>
    ${open.map(card).join('') || emptyState('No deadlines', 'Add your next exam, quiz or project so you can plan ahead.', '')}
    ${done.length ? `<div class="sec"><h2>Finished</h2></div>${done.map(card).join('')}` : ''}<div style="height:30px"></div>`;
}
/* ---- focus timer ---- */
let timer = { min: 25, left: 1500, running: false, end: 0, q: '' }, tmInt = null;
const mmss = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
function viewFocus() {
  const qs = S.habits.filter(h => h.unit === 'minutes'), pct = timer.left / (timer.min * 60), R = 88, C = 2 * Math.PI * R;
  const fin = S.sessions.filter(x => x.t === 't' && x.d === todayStr()).length;
  return `<div class="subhead"><button class="ib" data-act="back" aria-label="Back">${ico('back')}</button><h1>Focus Timer</h1></div>
    <section class="card tmcard"><svg class="tmring" viewBox="0 0 200 200" role="img" aria-label="Time left ${mmss(timer.left)}"><circle cx="100" cy="100" r="${R}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="12"/>
      <circle id="tm-arc" cx="100" cy="100" r="${R}" fill="none" stroke="url(#g-gold)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 100 100)"/></svg>
      <div class="tmtxt"><b id="tm-time" aria-live="off">${mmss(timer.left)}</b><small>${timer.running ? 'Stay focused…' : timer.left === timer.min * 60 ? 'Ready to focus' : 'Paused'}</small></div></section>
    <div class="chips center" style="justify-content:center">${[15, 25, 45, 60].map(m => `<button class="chip ${timer.min === m ? 'on' : ''}" data-act="tmdur" data-v="${m}" ${timer.running ? 'disabled' : ''}>${m} min</button>`).join('')}</div>
    <label class="l" for="tm-q">Count it for quest (optional)</label>
    <select id="tm-q" data-act-change="tmq" ${timer.running ? 'disabled' : ''}><option value="">Just a free focus session</option>${qs.map(h => `<option value="${h.id}" ${timer.q === h.id ? 'selected' : ''}>${esc(h.icon + ' ' + h.name + (h.subject ? ' · ' + h.subject : ''))}</option>`).join('')}</select>
    <div class="row g8" style="margin-top:14px"><button class="btn grow" data-act="${timer.running ? 'tmpause' : 'tmstart'}">${timer.running ? '⏸ Pause' : timer.left < timer.min * 60 ? '▶ Resume' : '▶ Start focus'}</button><button class="btn ghost" data-act="tmreset">↺ Reset</button></div>
    <section class="card" style="margin-top:14px"><div class="row sp"><span>🍅 Focus sessions today</span><b class="gold">${fin}</b></div>
      <p class="small muted" style="margin-top:8px">Finish a session to earn bonus XP. If you pick a quest, the minutes count toward it too. Keep this app open while the timer runs.</p></section>`;
}
function viewQuests() {
  const t = todayStr(), tabs = [['daily', 'Daily'], ['weekly', 'Weekly'], ['personal', 'Mine'], ['deadlines', 'Deadlines']];
  if (questTab === 'deadlines') return viewDeadlines(tabs);
  const list = S.habits.filter(h => questTab === 'daily' ? (h.freq === 'daily' || h.freq === 'custom') : questTab === 'weekly' ? h.freq === 'weekly' : h.personal);
  const cards = list.map(h => {
    const c = catOf(h), d = doneOn(t, h.id), sched = scheduled(t).some(x => x.id === h.id);
    const hist = lastN(7).map(day => { const on = doneOn(day, h.id); const s = day >= h.created && isSchedH(h, day); return `<span class="hd ${on ? 'on' : s ? 'miss' : ''}" title="${day}">${on ? '✓' : ''}</span>`; }).join('');
    return `<article class="mq" data-id="${h.id}" style="--c:${c.a};--c2:${c.b}">
      <div class="mq-h"><div class="ico" aria-hidden="true">${esc(h.icon)}</div><div class="tx"><h3>${esc(h.name)}</h3><p>${esc(h.desc)}</p></div>
        <button class="ib sm" data-act="edit" data-id="${h.id}" aria-label="Edit ${esc(h.name)}">${ico('edit', 18)}</button></div>
      <div class="tags"><span class="tag" style="--c:${c.a}">${c.e} ${c.n}</span>${h.subject ? `<span class="tag">📚 ${esc(h.subject)}</span>` : ''}<span class="tag">🔁 ${freqText(h)}</span>${h.time ? `<span class="tag">⏰ ${h.time}</span>` : '<span class="tag">🔕 No reminder</span>'}
        <span class="tag">🎯 ${h.target} ${esc(h.unit)}</span><span class="tag d-${h.diff}">${DIFF[h.diff].e} ${DIFF[h.diff].n}</span><span class="tag gold">+${h.xp} XP</span></div>
      <div class="mq-f"><div><div class="hist" role="img" aria-label="Completion history for the last 7 days">${hist}</div><small class="muted">Last 7 days</small></div>
        <div class="mstat"><b>${habitStreak(h)}</b><small>🔥 streak</small></div><div class="mstat"><b>${habitTotal(h)}</b><small>✅ total</small></div></div>
      ${sched ? `<button class="cbtn wide ${d ? 'ok' : ''}" data-act="${d ? 'undo' : 'complete'}" data-id="${h.id}">${d ? '✓ Completed today — tap to undo' : 'Complete today'}</button>` : ''}</article>`;
  }).join('');
  return `<h1 class="ptitle">Quests</h1>
    <div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" aria-selected="${questTab === k}" class="${questTab === k ? 'on' : ''}" data-act="qtab" data-v="${k}">${n}</button>`).join('')}</div>
    <p class="muted small" style="margin:0 2px 10px">${questTab === 'daily' ? 'Quests that repeat on set days.' : questTab === 'weekly' ? 'Hit your weekly goal on any day you like.' : 'Study quests you created yourself.'}</p>
    ${cards || emptyState('No ' + questTab + ' quests yet', 'Create your first study quest and start learning.', '')}<div style="height:70px"></div>`;
}

function viewRewards() {
  const unl = ACH.filter(a => S.ach[a.id]), unc = unl.filter(a => !S.ach[a.id].c);
  const xpEarned = unl.filter(a => S.ach[a.id].c).reduce((a, x) => a + x.xp, 0);
  const fl = rewardFilter, list = ACH.filter(a => fl === 'all' ? true : fl === 'unlocked' ? S.ach[a.id] : fl === 'locked' ? !S.ach[a.id] : (S.ach[a.id] && !S.ach[a.id].c));
  const s = stats();
  const cards = list.map(a => {
    const on = !!S.ach[a.id], [cur, tar] = a.p(s), pc = Math.min(100, cur / tar * 100);
    return `<article class="ach r-${a.r} ${on ? '' : 'lock'}" data-act="achinfo" data-id="${a.id}" tabindex="0" role="button" aria-label="${esc(a.n)}, ${RAR[a.r]}, ${on ? 'unlocked' : 'locked'}">
      <div class="bw ${on && !S.ach[a.id].c ? 'pulse' : ''}">${badge(a, on, 78)}</div><span class="rar">${RAR[a.r]}</span><h3>${esc(a.n)}</h3><p>${esc(a.d)}</p>
      ${on ? (S.ach[a.id].c ? `<div class="axp">✓ +${a.xp} XP collected</div>` : `<button class="btn sm claim" data-act="claim" data-id="${a.id}">Claim +${a.xp} XP</button>`)
        : `<div class="bar sm"><i style="width:${pc}%"></i></div><div class="small muted">${Math.min(cur, tar).toLocaleString()} / ${tar.toLocaleString()} · +${a.xp} XP</div>`}</article>`;
  }).join('');
  const filt = [['all', 'All'], ['unlocked', 'Unlocked'], ['locked', 'Locked'], ['claim', 'To claim' + (unc.length ? ' (' + unc.length + ')' : '')]];
  return `<h1 class="ptitle">Rewards</h1>
    <section class="card trophy"><div class="tr-ic">🏆</div><div class="t"><div class="big">${unl.length} / ${ACH.length}</div><div class="small muted">achievements unlocked</div>
      <div class="bar"><i style="width:${unl.length / ACH.length * 100}%"></i></div></div><div class="tr-xp"><b>${xpEarned}</b><small>XP from rewards</small></div></section>
    <div class="chips scroll" role="tablist">${filt.map(([k, n]) => `<button class="chip ${fl === k ? 'on' : ''}" data-act="rfilter" data-v="${k}">${n}</button>`).join('')}</div>
    ${cards ? `<div class="grid2">${cards}</div>` : emptyState('Nothing here yet', fl === 'claim' ? 'All rewards have been collected. Great job!' : 'Complete quests to unlock achievements.', '')}`;
}

function mapSvg(lv, best) {
  const pl = PLACES.map(p => ({ ...p, on: lv >= p.l && best >= p.s })), cur = [...pl].reverse().find(p => p.on) || pl[0];
  const stars = [[30, 40], [90, 20], [160, 55], [220, 28], [300, 60], [60, 100], [280, 130], [200, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff" opacity=".7"/>`).join('');
  const nodes = pl.map(p => `<g class="node ${p.on ? 'on' : 'lock'} ${placeSel === p.id ? 'sel' : ''}" data-act="place" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.n)}, ${p.on ? 'unlocked' : 'locked'}">
      <circle cx="${p.x}" cy="${p.y}" r="34" fill="${p.on ? 'rgba(255,200,90,.18)' : 'rgba(0,0,0,.25)'}"/><circle cx="${p.x}" cy="${p.y}" r="27" fill="${p.on ? '#242044' : '#161a3a'}" stroke="${p.on ? '#FFC85A' : '#5b5d86'}" stroke-width="3"/>
      <text x="${p.x}" y="${p.y + 11}" text-anchor="middle" font-size="30" opacity="${p.on ? 1 : .4}">${p.e}</text>${p.on ? '' : `<text x="${p.x + 20}" y="${p.y - 18}" font-size="16">🔒</text>`}
      <text x="${p.x}" y="${p.y + 52}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${p.on ? '#FFF4E7' : '#9a9cc4'}">${p.n}</text></g>`).join('');
  return `<svg class="mapsvg" viewBox="0 0 340 520" role="group" aria-label="Adventure map">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1a5a"/><stop offset=".6" stop-color="#3b2a7a"/><stop offset="1" stop-color="#0f3a3a"/></linearGradient></defs>
    <rect width="340" height="520" rx="22" fill="url(#sky)"/>${stars}<circle cx="290" cy="40" r="20" fill="#FFF4E7" opacity=".9"/><circle cx="297" cy="35" r="18" fill="#2b2570"/>
    <path d="M0 330L60 250 110 310 170 220 240 320 300 260 340 320V520H0z" fill="#1c2260" opacity=".7"/><path d="M0 430Q90 380 170 420T340 400V520H0z" fill="#0e4a45"/><path d="M0 480Q120 440 220 470T340 450V520H0z" fill="#0b3a3a"/>
    <path d="M80 430C80 380 245 400 245 330C245 270 95 270 95 210C95 150 235 160 235 95" fill="none" stroke="#FFC85A" stroke-width="5" stroke-dasharray="2 11" stroke-linecap="round" opacity=".85"/>
    ${nodes}<text x="${cur.x - 8}" y="${cur.y - 40}" font-size="26" class="foxmark">${SPECIES[speciesOf()].e}</text></svg>`;
}
function viewJourney() {
  const li = levelInfo(totalXp()), best = streakInfo().best, p = PLACES.find(x => x.id === placeSel) || PLACES[0];
  const idx = PLACES.indexOf(p), nextL = PLACES[idx + 1] ? PLACES[idx + 1].l : 99;
  const on = li.level >= p.l && best >= p.s, items = ALL_ITEMS.filter(i => i.l >= p.l && i.l < nextL);
  const req = (ok, txt, cur, tar) => `<div class="req ${ok ? 'ok' : ''}"><span>${ok ? '✅' : '⬜'}</span><span style="flex:1">${txt}</span><small>${Math.min(cur, tar)}/${tar}</small></div>`;
  const total = PLACES.filter(x => li.level >= x.l && best >= x.s).length;
  return `<h1 class="ptitle">Journey</h1>
    <p class="muted small" style="margin:-4px 2px 10px">${total} of ${PLACES.length} realms discovered. Level up and keep your streak to open new areas.</p>
    <div class="mapwrap">${mapSvg(li.level, best)}</div>
    <section class="card place"><div class="row sp"><h2>${p.e} ${p.n}</h2><span class="rar ${on ? 'r-rare' : ''}">${on ? 'Unlocked' : 'Locked'}</span></div><p class="muted">${p.d}</p>
      <h3 class="sub">Milestones</h3>${req(li.level >= p.l, 'Reach level ' + p.l, li.level, p.l)}${p.s ? req(best >= p.s, 'Hit a ' + p.s + '-day streak', best, p.s) : ''}
      <h3 class="sub">Rewards in this realm</h3><div class="chips">${items.length ? items.map(i => `<span class="tag ${li.level >= i.l ? 'gold' : ''}">${i.i} ${i.n} · Lv ${i.l}</span>`).join('') : '<span class="muted small">New adventures coming soon…</span>'}</div></section>`;
}

function viewProfile() {
  const xp = totalXp(), li = levelInfo(xp), s = stats(), st = streakInfo();
  const tab = eqTab, items = ITEMS[tab];
  const grid = items.map(i => {
    const ok = li.level >= i.l, on = S.equip[tab] === i.id;
    return `<button class="item ${on ? 'on' : ''} ${ok ? '' : 'lock'}" data-act="equip" data-slot="${tab}" data-id="${i.id}" ${ok ? '' : 'aria-disabled="true"'} aria-pressed="${on}"><span class="ii">${ok ? i.i : '🔒'}</span><b>${i.n}</b><small>${ok ? (on ? 'Equipped' : 'Tap to equip') : 'Level ' + i.l}</small></button>`;
  }).join('');
  const owned = ALL_ITEMS.filter(i => li.level >= i.l).length;
  const fbs = S.feedback.slice(-3).reverse().map(f => `<div class="note"><b>${'★'.repeat(f.r)}${'☆'.repeat(5 - f.r)}</b> <span class="small muted">${esc(f.who || 'Tester')} · ${f.d}</span><div class="small">${esc(f.c)}</div></div>`).join('');
  return `<h1 class="ptitle">Profile</h1>
    <section class="card hero2"><div class="stage">${mascot({ mood: 'happy', size: 200, glow: li.level >= 10 })}</div>
      <div class="center"><h2>${esc(S.user.name)}</h2><div class="gold small">${titleOf(li.level)} · Level ${li.level}</div></div>
      <div class="bar xp"><i style="width:${li.cur / li.need * 100}%"></i></div><div class="row sp small"><span>${li.cur} / ${li.need} XP to level ${li.level + 1}</span><span class="muted">${xp.toLocaleString()} XP total</span></div></section>
    <div class="stat-row"><div><b>${s.done}</b><small>Quests done</small></div><div><b>${st.best}</b><small>Best streak</small></div><div><b>${fmtMin(s.mins)}</b><small>Studied</small></div></div>
    <div class="sec"><h2>Choose your companion</h2></div>
    <div class="spgrid">${Object.entries(SPECIES).map(([k, c]) => `<button class="sp ${speciesOf() === k ? 'on' : ''}" data-act="species" data-v="${k}" aria-pressed="${speciesOf() === k}" aria-label="${c.n}"><span class="spv">${mascot({ crop: 'head', size: 54, sp: k, mood: 'happy' })}</span><b>${c.n}</b></button>`).join('')}</div>
    <div class="sec"><h2>Customize your study buddy</h2><span class="small muted">${owned}/${ALL_ITEMS.length} items</span></div>
    <div class="tabs sm" role="tablist">${Object.entries(SLOTS).map(([k, n]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="eqtab" data-v="${k}">${n}</button>`).join('')}</div>
    <div class="items">${grid}</div>
    <div class="sec"><h2>More</h2></div>
    <button class="link" data-act="go" data-v="analytics">${ico('chart', 22)}<span>Analytics &amp; Progress</span>${ico('chev', 18)}</button>
    <button class="link" data-act="go" data-v="streak">${flame(22)}<span>Streak Tracker</span>${ico('chev', 18)}</button>
    <button class="link" data-act="go" data-v="notifs">${ico('bell', 22)}<span>Notifications &amp; Reminders</span>${ico('chev', 18)}</button>
    <div class="sec"><h2>Display &amp; Accessibility</h2></div>
    <div class="card"><label class="l">Theme</label><div class="seg" role="group" aria-label="Theme">${[['dark', '🌙 Dark'], ['light', '☀️ Light'], ['auto', '🖥 System']].map(([k, n]) => `<button type="button" class="${S.settings.theme === k ? 'on' : ''}" data-act="theme" data-v="${k}" aria-pressed="${S.settings.theme === k}">${n}</button>`).join('')}</div>
      <label class="l">Text size</label><div class="seg txs" role="group" aria-label="Text size">${[['s', 'A−', 'Small'], ['m', 'A', 'Normal'], ['l', 'A+', 'Large'], ['xl', 'A++', 'Extra large']].map(([k, n, a]) => `<button type="button" class="${S.settings.text === k ? 'on' : ''}" data-act="textsize" data-v="${k}" aria-label="${a} text" aria-pressed="${S.settings.text === k}">${n}</button>`).join('')}</div>
      ${[['contrast', '🔆 High contrast', 'Stronger borders and text'], ['motion', '🐢 Reduce motion', 'Turn off animations and confetti'], ['swipe', '👉 Swipe gestures', 'Swipe quests right to complete, left to undo']].map(([k, n, s]) => `<div class="row sp setrow"><span><b>${n}</b><br><small class="muted">${s}</small></span><button class="switch ${S.settings[k] ? 'on' : ''}" role="switch" aria-checked="${!!S.settings[k]}" aria-label="${n.slice(3)}" data-act="tgl" data-v="${k}"><i></i></button></div>`).join('')}</div>
    <div class="sec"><h2>Settings</h2></div>
    <div class="card"><label class="l" for="nm">Your name</label><div class="row g8"><input type="text" id="nm" maxlength="20" value="${esc(S.user.name)}"><button class="btn sm" data-act="saveName">Save</button></div>
      <div class="row sp" style="margin-top:14px"><b>🔊 Sound effects</b><button class="chip ${S.settings.sound ? 'on' : ''}" data-act="sound" aria-pressed="${S.settings.sound}">${S.settings.sound ? 'On' : 'Off'}</button></div></div>
    <div class="sec"><h2>Tester Feedback</h2></div>
    <div class="card"><label class="l" for="fbw">Tester name (optional)</label><input type="text" id="fbw" maxlength="20">
      <label class="l">How easy was it to use?</label><div class="chips" id="fbr">${[1, 2, 3, 4, 5].map(n => `<button class="chip ${fb.rating === n ? 'on' : ''}" data-act="fbrate" data-n="${n}" aria-label="${n} stars">${n}★</button>`).join('')}</div>
      <label class="l" for="fbc">Think-aloud notes</label><textarea id="fbc" maxlength="300" placeholder="What did they say or struggle with?"></textarea>
      <button class="btn block" style="margin-top:12px" data-act="fbsave">Save feedback</button></div>${fbs}
    <div class="sec"><h2>Data</h2></div>
    <div class="card"><p class="small muted" style="margin-bottom:10px">Everything is saved on this device only.</p><button class="chip" data-act="reset" id="rst">🗑 Reset all data</button></div>`;
}

/* ---- analytics ---- */
function rateDay(d) { const sc = scheduled(d).length, dn = doneCount(d); return sc ? Math.min(1, dn / sc) : (dn ? 1 : null); }
function habitRate(h, n) {
  let exp = 0, done = 0;
  lastN(n).forEach(d => { if (d < h.created) return; if (h.freq === 'daily' || (h.freq === 'custom' && h.days.includes(dow(d)))) exp++; if (doneOn(d, h.id)) done++; });
  if (h.freq === 'weekly') exp = Math.max(1, Math.round(h.perWeek * n / 7));
  return exp ? Math.min(1, done / exp) : 0;
}
function insights() {
  const out = [], days = lastN(30), byD = Array(7).fill(0);
  days.forEach(d => byD[dow(d)] += doneCount(d));
  const tot = byD.reduce((a, b) => a + b, 0);
  if (!tot) return [['🌱', 'Complete a few quests and Habi will share personal growth insights here.']];
  const best = byD.indexOf(Math.max(...byD)), wk = rangeCount(addDays(todayStr(), -6), 7), pw = rangeCount(addDays(todayStr(), -13), 7);
  out.push(['📆', 'Your strongest day is ' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][best] + '. Plan your hardest quest then!']);
  out.push([wk >= pw ? '📈' : '🌤️', wk >= pw ? 'You completed ' + wk + ' quests this week, ' + (wk - pw >= 0 ? (wk - pw) + ' more than' : '') + ' last week. Keep climbing!' : 'This week is a little quieter (' + wk + ' vs ' + pw + '). One small quest today restarts the momentum.']);
  const rates = S.habits.map(h => [h, habitRate(h, 30)]).sort((a, b) => b[1] - a[1]);
  if (rates.length > 1) out.push(['⭐', rates[0][0].name + ' is your most consistent quest (' + pctTxt(rates[0][1]) + '). Try pairing ' + rates[rates.length - 1][0].name + ' with it.']);
  let mo = 0, all = 0; days.forEach(d => { if (S.log[d]) Object.values(S.log[d].h).forEach(e => { if (e.d) { all++; mo += e.m || 0; } }); });
  if (all) out.push(['🌅', pctTxt(mo / all) + ' of your completions happen in the morning. ' + (mo / all > .4 ? 'You are an early bird!' : 'Try moving one quest earlier.')]);
  const sub = subjectMins(30); if (sub.length) out.push(['📚', sub[0][0] + ' got most of your study time (' + fmtMin(sub[0][1]) + ' in 30 days).' + (sub.length > 1 ? ' ' + sub[sub.length - 1][0] + ' needs more love.' : '')]);
  const tm = S.sessions.filter(x => x.t === 't' && lastN(7).includes(x.d)).length; out.push(['⏱️', tm ? 'You finished ' + tm + ' focus session' + (tm > 1 ? 's' : '') + ' this week. Deep work pays off!' : 'Try one 25-minute focus session. Short and distraction-free beats long and distracted.']);
  return out;
}
function viewAnalytics() {
  const t = todayStr(), sch = scheduled(t), dn = sch.filter(h => doneOn(t, h.id)).length, days = lastN(aRange), s = stats(), st = streakInfo();
  const rates = days.map(rateDay).filter(x => x != null), wkRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const act = lastN(30).filter(isActive).length / 30;
  const bars = days.map(d => { const r = rateDay(d); return `<div class="col ${d === t ? 'today' : ''}" title="${d}: ${r == null ? 'rest' : pctTxt(r)}"><div class="bw"><div class="b" style="height:${r == null ? 4 : Math.max(4, r * 100)}%"></div></div>${aRange === 7 ? `<span>${DAYS[dow(d)][0]}</span>` : ''}</div>`; }).join('');
  const xps = days.map(dayXp), mx = Math.max(1, ...xps), W = 300, H = 100;
  const pts = xps.map((v, i) => [i * W / (xps.length - 1), H - 8 - v / mx * (H - 20)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const wks = 12, start = addDays(weekStart(t), -7 * (wks - 1));
  let heat = ''; for (let w = 0; w < wks; w++) for (let r = 0; r < 7; r++) {
    const d = addDays(start, w * 7 + r), c = d > t ? -1 : doneCount(d);
    heat += `<i class="hm l${c < 0 ? 'f' : Math.min(4, c)}" title="${d}: ${c < 0 ? '' : c + ' quests'}" style="grid-column:${w + 1};grid-row:${r + 1}"></i>`;
  }
  const best = S.habits.map(h => [h, habitRate(h, 30)]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<div class="subhead"><button class="ib" data-act="back" aria-label="Back">${ico('back')}</button><h1>Analytics</h1></div>
    <div class="tabs sm"><button class="${aRange === 7 ? 'on' : ''}" data-act="arange" data-v="7">Weekly</button><button class="${aRange === 30 ? 'on' : ''}" data-act="arange" data-v="30">Monthly</button></div>
    <section class="card rings"><div>${ring(sch.length ? dn / sch.length : 0, 92, '#55D6A0', sch.length ? pctTxt(dn / sch.length) : '—', 'Today')}</div><div>${ring(wkRate, 92, '#FFC85A', pctTxt(wkRate), aRange === 7 ? 'Week' : 'Month')}</div><div>${ring(act, 92, '#FF8A3D', pctTxt(act), 'Consistency')}</div></section>
    <div class="stat-row"><div><b>${s.done}</b><small>Total completed</small></div><div><b>${st.count}</b><small>Current streak</small></div><div><b>${st.best}</b><small>Longest streak</small></div></div>
    <section class="card"><h3>📚 Study time <small class="muted">· ${aRange} days</small></h3><div class="row sp"><div><b class="big2">${fmtMin(minsRange(aRange))}</b><div class="small muted">total studied</div></div><div style="text-align:right"><b class="big2">${fmtMin(Math.round(minsRange(aRange) / aRange))}</b><div class="small muted">daily average</div></div></div>
      <div class="chart ${aRange === 30 ? 'dense' : ''} mins" role="img" aria-label="Study minutes per day">${days.map(d => { const m = minsOn(d), mx2 = Math.max(60, ...days.map(minsOn)); return `<div class="col ${d === t ? 'today' : ''}" title="${d}: ${m} min"><div class="bw"><div class="b" style="height:${Math.max(4, m / mx2 * 100)}%"></div></div>${aRange === 7 ? `<span>${DAYS[dow(d)][0]}</span>` : ''}</div>`; }).join('')}</div>
      <h3 class="sub">By subject</h3>${subjectMins(aRange).slice(0, 5).map(([n, m], i, a) => `<div class="brow"><span class="bn" style="flex:0 0 96px">${esc(n)}</span><div class="bar sm"><i style="width:${m / a[0][1] * 100}%"></i></div><b>${fmtMin(m)}</b></div>`).join('') || '<p class="muted small">Log minutes or run a focus session to see subjects.</p>'}</section>
    <section class="card"><h3>Daily completion rate</h3><div class="chart ${aRange === 30 ? 'dense' : ''}" role="img" aria-label="Daily completion rate chart">${bars}</div></section>
    <section class="card"><h3>XP earned over time</h3><svg class="xpchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="XP earned over time"><defs><linearGradient id="xpa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC85A" stop-opacity=".5"/><stop offset="1" stop-color="#FFC85A" stop-opacity="0"/></linearGradient></defs><path d="${line} L${W} ${H} L0 ${H}z" fill="url(#xpa)"/><path d="${line}" fill="none" stroke="#FFC85A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>
      <div class="row sp small muted"><span>${days[0].slice(5)}</span><span>${xps.reduce((a, b) => a + b, 0).toLocaleString()} XP in ${aRange} days</span><span>${t.slice(5)}</span></div></section>
    <section class="card"><h3>Activity heatmap <small class="muted">· last 12 weeks</small></h3><div class="heat">${heat}</div>
      <div class="legend small muted">Less ${['f0', 'l1', 'l2', 'l3', 'l4'].map(c => `<i class="hm ${c.replace('f0', 'l0')}"></i>`).join('')} More</div></section>
    <section class="card"><h3>Best-performing quests <small class="muted">· 30 days</small></h3>${best.map(([h, r]) => `<div class="brow"><span class="bi">${esc(h.icon)}</span><span class="bn">${esc(h.name)}</span><div class="bar sm"><i style="width:${r * 100}%"></i></div><b>${pctTxt(r)}</b></div>`).join('') || '<p class="muted">No quests yet.</p>'}</section>
    ${(() => { const ts = timeStats(), mx = Math.max(1, ...ts.bk); return `<section class="card"><h3>⏰ When you get things done <small class="muted">· 5 weeks</small></h3>${ts.n ? BUCKETS.map((b, i) => `<div class="brow"><span class="bi">${b[1]}</span><span class="bn" style="flex:0 0 78px;text-transform:capitalize">${b[0]}</span><div class="bar sm"><i style="width:${ts.bk[i] / mx * 100}%"></i></div><b>${ts.bk[i]}</b></div>`).join('') + '<p class="small muted" style="margin-top:8px">Peak hour: <b class="gold">' + hrLabel(ts.peak) + '</b></p>' : '<p class="muted small">Finish a few quests and Habi will find your best study time.</p>'}</section>`; })()}
    ${(() => { const g = suggestions(); return g.length ? '<section><h3 class="sub" style="margin:4px 2px 8px">💡 Smart suggestions</h3>' + g.map(x => sgCard(x)).join('') + '</section>' : ''; })()}
    <section class="card"><h3>Personal growth insights</h3>${insights().map(([e, tx]) => `<div class="insight"><span>${e}</span><p>${esc(tx)}</p></div>`).join('')}</section>`;
}

/* ---- streak ---- */
function viewStreak() {
  const t = todayStr(), st = streakInfo(), first = t.slice(0, 8) + '01', lead = (dow(first) + 6) % 7, dim = new Date(parse(t).getFullYear(), parse(t).getMonth() + 1, 0).getDate();
  let cal = ''; for (let i = 0; i < lead; i++) cal += '<i class="cd blank"></i>';
  for (let n = 1; n <= dim; n++) { const d = t.slice(0, 8) + pad(n), a = isActive(d), sh = st.shield.includes(d); cal += `<i class="cd ${a ? 'on' : ''} ${sh ? 'sh' : ''} ${d === t ? 'today' : ''} ${d > t ? 'fut' : ''}" title="${d}">${a ? flame(14) : sh ? '🛡️' : n}</i>`; }
  const ws = weekStart(t), week = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map(d => `<div class="wd ${isActive(d) ? 'on' : ''} ${d === t ? 'today' : ''} ${st.shield.includes(d) ? 'sh' : ''}"><small>${DAYS[dow(d)]}</small><span>${isActive(d) ? flame(20) : st.shield.includes(d) ? '🛡️' : d > t ? '·' : '○'}</span></div>`).join('');
  const msg = st.count === 0 ? 'Every scholar restarts sometimes. Finish one study quest today and your new streak begins! 💜' : st.atRisk ? 'Your ' + st.count + '-day streak is waiting. One quest keeps the fire alive!' : st.count >= 7 ? 'Incredible consistency! You are building a real habit. 🔥' : 'Great start! Keep showing up and the flame will grow.';
  const nm = MILES.find(m => m > st.count);
  const ml = MILES.map(m => `<div class="mile ${st.best >= m ? 'on' : ''}"><span>${st.best >= m ? '🔥' : '🔒'}</span><b>${m}</b><small>days</small></div>`).join('');
  const shieldReady = !st.shield.some(d => weekStart(d) === ws);
  return `<div class="subhead"><button class="ib" data-act="back" aria-label="Back">${ico('back')}</button><h1>Streaks</h1></div>
    <section class="card flamecard ${st.count ? 'lit' : ''}"><div class="bigflame bob">${flame(96)}</div><div class="disp huge">${st.count}</div><div class="muted">day streak</div><div class="row sp small" style="width:100%;margin-top:12px"><span>🏆 Longest: <b>${st.best}</b></span><span>${nm ? '🎯 Next: ' + nm + ' days' : '👑 All milestones!'}</span></div></section>
    <section class="card nudge ${st.atRisk ? 'warn' : ''}"><span style="font-size:24px">${st.atRisk ? '⚠️' : '💬'}</span><span>${esc(msg)}</span></section>
    <section class="card"><h3>This week</h3><div class="week">${week}</div></section>
    <section class="card"><h3>${parse(t).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3><div class="calhead">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span>${x}</span>`).join('')}</div><div class="cal">${cal}</div></section>
    <section class="card"><h3>Streak milestones</h3><div class="miles">${ml}</div></section>
    <section class="card shieldcard"><div class="row g8"><span style="font-size:34px">🛡️</span><div><h3 style="margin:0">Streak Shield</h3><p class="small muted">Life happens! Miss one day a week and Habi's shield protects your streak automatically, as long as you come back the next day.</p></div></div>
      <div class="tag ${shieldReady ? 'gold' : ''}" style="margin-top:10px">${shieldReady ? '✅ Shield ready this week' : '⏳ Shield used this week — resets Monday'}</div></section>`;
}

/* ---- notifications ---- */
const NT = { reminder: ['⏰', 'Reminders'], quest: ['✅', 'Quests'], streak: ['🔥', 'Streaks'], level: ['⬆️', 'Level-ups'], achievement: ['🏆', 'Achievements'], weekly: ['📊', 'Weekly summary'] };
function viewNotifs() {
  const list = S.notifs.filter(n => nFilter === 'all' || n.type === nFilter);
  const items = list.map(n => `<article class="notif ${n.read ? '' : 'new'}" data-act="nread" data-id="${n.id}"><span class="ni">${NT[n.type][0]}</span><div class="tx"><b>${esc(n.title)}</b><p>${esc(n.text)}</p><small class="muted">${ago(n.ts)}</small></div>${n.read ? '' : '<i class="udot"></i>'}</article>`).join('');
  const tg = Object.entries(NT).map(([k, [e, n]]) => `<div class="row sp setrow"><span>${e} ${n}</span><button class="switch ${S.settings.types[k] ? 'on' : ''}" role="switch" aria-checked="${S.settings.types[k]}" aria-label="${n}" data-act="ntype" data-v="${k}"><i></i></button></div>`).join('');
  return `<div class="subhead"><button class="ib" data-act="back" aria-label="Back">${ico('back')}</button><h1>Notifications</h1><button class="chip sm" data-act="readall">Mark all read</button></div>
    <div class="chips scroll"><button class="chip ${nFilter === 'all' ? 'on' : ''}" data-act="nfilter" data-v="all">All</button>${Object.entries(NT).map(([k, [e, n]]) => `<button class="chip ${nFilter === k ? 'on' : ''}" data-act="nfilter" data-v="${k}">${e} ${n}</button>`).join('')}</div>
    ${items || emptyState('All caught up!', 'No notifications here. Habi will let you know when something happens.', '')}
    <div class="sec"><h2>Reminder settings</h2></div><section class="card">
      <div class="row sp setrow"><span><b>Enable reminders</b><br><small class="muted">Habi nudges you at each quest's reminder time.</small></span><button class="switch ${S.settings.remind ? 'on' : ''}" role="switch" aria-checked="${S.settings.remind}" aria-label="Enable reminders" data-act="nremind"><i></i></button></div>
      <h3 class="sub">Notification types</h3>${tg}
      <button class="btn block ghost" style="margin-top:12px" data-act="testremind">🔔 Send a test reminder</button><p class="small muted" style="margin-top:8px">Change each quest's reminder time when you edit it in the Quests tab.</p></section>`;
}

/* ---- create / edit quest ---- */
function viewCreate() {
  const f = form, isNew = !f.id, xp = DIFF[f.diff].xp;
  return `<div class="subhead"><button class="ib" data-act="cancelForm" aria-label="Back">${ico('back')}</button><h1>${isNew ? 'Create Quest' : 'Edit Quest'}</h1></div>
    <form class="form" onsubmit="return false" novalidate>
    ${isNew ? `<label class="l">Quick start</label><div class="chips scroll">${STUDY_TPL.map((x, i) => `<button type="button" class="chip" data-act="ftpl" data-v="${i}">${x.icon} ${esc(x.name)}</button>`).join('')}</div>` : ''}
    <label class="l" for="f-name">Quest name</label><input type="text" id="f-name" maxlength="30" value="${esc(f.name)}" placeholder="e.g. Review HCI notes">
    <label class="l" for="f-sub">Subject / course (optional)</label><input type="text" id="f-sub" maxlength="24" value="${esc(f.subject)}" placeholder="e.g. HCI, Networking, Math">
    <label class="l" for="f-desc">Description</label><input type="text" id="f-desc" maxlength="70" value="${esc(f.desc)}" placeholder="What will you study?">
    <label class="l">Category</label><div class="chips">${Object.entries(CATS).map(([k, c]) => `<button type="button" class="chip ${f.cat === k ? 'on' : ''}" data-act="fcat" data-v="${k}">${c.e} ${c.n}</button>`).join('')}</div>
    <label class="l">Icon</label><div class="emo">${(EMOJIS.includes(f.icon) ? EMOJIS : [f.icon].concat(EMOJIS)).map(e => `<button type="button" class="${f.icon === e ? 'on' : ''}" data-act="ficon" data-v="${e}" aria-label="Icon ${e}">${e}</button>`).join('')}</div>
    <div class="row g8" style="margin-top:8px"><label class="small muted" for="f-emo">Or type your own emoji:</label><input type="text" id="f-emo" maxlength="4" style="width:70px;text-align:center" placeholder="😀"></div>
    <label class="l">Schedule</label><div class="seg">${[['daily', 'Daily'], ['weekly', 'Weekly'], ['custom', 'Custom days']].map(([k, n]) => `<button type="button" class="${f.freq === k ? 'on' : ''}" data-act="ffreq" data-v="${k}">${n}</button>`).join('')}</div>
    ${f.freq === 'custom' ? `<div class="days" style="margin-top:10px">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" class="chip ${f.days.includes(d) ? 'on' : ''}" data-act="fday" data-v="${d}" aria-pressed="${f.days.includes(d)}" aria-label="${DAYS[d]}">${DAYS[d][0]}</button>`).join('')}</div>` : ''}
    ${f.freq === 'weekly' ? `<div class="row g8" style="margin-top:10px"><span>Goal:</span><button type="button" class="chip" data-act="fweek" data-v="-1" aria-label="Fewer times per week">−</button><b>${f.perWeek}× per week</b><button type="button" class="chip" data-act="fweek" data-v="1" aria-label="More times per week">+</button></div>` : ''}
    <label class="l" for="f-target">Target duration or quantity</label><div class="row g8"><input type="text" inputmode="numeric" id="f-target" value="${f.target}" maxlength="3" style="width:90px;text-align:center"><select id="f-unit" aria-label="Unit">${UNITS.map(u => `<option ${f.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    <label class="l" for="f-time">Reminder time</label><div class="row g8"><input type="time" id="f-time" value="${f.time}" style="width:150px"><button type="button" class="chip" data-act="fnotime">🔕 No reminder</button></div>
    <label class="l">Difficulty</label><div class="seg d4">${Object.entries(DIFF).map(([k, d]) => `<button type="button" class="${f.diff === k ? 'on' : ''}" data-act="fdiff" data-v="${k}">${d.e}<br>${d.n}</button>`).join('')}</div>
    <div class="xpprev"><span>XP reward preview</span><b>+${xp} XP</b><small>per completion</small></div>
    ${f.err ? `<p class="err" role="alert">${esc(f.err)}</p>` : ''}
    <div class="row g8" style="margin-top:18px">${isNew ? '' : `<button type="button" class="btn danger" data-act="fdel">${f.confirm ? 'Tap again to delete' : ico('trash', 18) + ' Delete'}</button>`}<button type="button" class="btn grow" data-act="fsave">Save Quest</button></div></form>`;
}

/* ================= render + overlays ================= */
const VIEWS = { home: viewHome, quests: viewQuests, rewards: viewRewards, journey: viewJourney, profile: viewProfile, analytics: viewAnalytics, streak: viewStreak, notifs: viewNotifs, create: viewCreate, focus: viewFocus };
const mqLight = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : { matches: false };
function applyPrefs() {
  const st = (S && S.settings) || {}, h = document.documentElement;
  h.dataset.theme = st.theme === 'light' || (st.theme === 'auto' && mqLight.matches) ? 'light' : 'dark';
  h.dataset.text = st.text || 'm'; h.dataset.contrast = st.contrast ? 'on' : 'off'; h.dataset.motion = st.motion ? 'reduce' : 'normal';
}
if (mqLight.addEventListener) mqLight.addEventListener('change', applyPrefs);
function render() {
  applyPrefs();
  if (!S || !S.user) { $('#screen').innerHTML = ''; return; }
  const sc = $('#screen'), top = sc.scrollTop;
  sc.dataset.view = view;
  sc.innerHTML = VIEWS[view]();
  sc.scrollTop = resetScroll ? 0 : top; resetScroll = false;
  const nv = { analytics: 'profile', streak: 'home', notifs: 'home', create: 'quests', focus: 'home' }[view] || view;
  document.querySelectorAll('.nb').forEach(b => { const on = b.dataset.v === nv; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
  $('#app').classList.toggle('nonav', view === 'create');
  $('#fab').hidden = view !== 'quests' || questTab === 'deadlines';
  if (timer.running && view !== 'focus') sc.insertAdjacentHTML('afterbegin', `<button class="tmpill" data-act="go" data-v="focus" aria-label="Focus timer running">⏱ <span id="tm-pill">${mmss(timer.left)}</span> · tap to open</button>`);
}
let resetScroll = false;
const nav = v => { view = v; backTo = 'home'; resetScroll = true; render(); };
const go = v => { backTo = view; view = v; resetScroll = true; render(); };

let ovQ = [];
function queueOv(ev) { ovQ.push(ev); if (!$('#ovL').firstChild) showOv(); }
function showOv() {
  const ev = ovQ.shift(); if (!ev) { $('#ovL').innerHTML = ''; return; }
  $('#ovL').innerHTML = ovHtml(ev);
  if (ev.t === 'level') beep([523, 659, 784, 1047, 1319]); else if (ev.t === 'ach') beep([784, 988, 1175]); else if (ev.t === 'streak') beep([440, 554, 659, 880]);
  const b = $('#ovL button'); if (b) b.focus();
}
function closeOv() { $('#ovL').innerHTML = ''; if (ovQ.length) showOv(); }
function ovHtml(ev) {
  if (ev.t === 'level') {
    const items = ALL_ITEMS.filter(i => i.l > ev.from && i.l <= ev.lv);
    return `<div class="ov lvlov" data-act="closeOv" role="dialog" aria-modal="true" aria-label="Level up"><div class="rays"></div>${confettiHtml(44)}<div class="mcard">
      <div class="glowring"></div><div>${mascot({ mood: 'cheer', size: 170, glow: true })}</div><div class="ribbon">LEVEL UP!</div><div class="gain">Lv ${ev.lv}</div><p class="gold disp">${titleOf(ev.lv)}</p>
      ${items.length ? `<div class="unl">🎁 New gear unlocked<br><b>${items.map(i => i.i + ' ' + i.n).join(' · ')}</b></div>` : ''}<button class="btn" data-act="closeOv">Continue</button></div></div>`;
  }
  if (ev.t === 'ach' || ev.t === 'achinfo') {
    const a = ACHM[ev.id], u = S.ach[a.id], s = stats(), [cur, tar] = a.p(s);
    return `<div class="ov achov r-${a.r}" data-act="closeOv" role="dialog" aria-modal="true" aria-label="Achievement ${esc(a.n)}">${u ? '<div class="rays"></div>' : ''}${ev.t === 'ach' ? confettiHtml(30) : ''}<div class="mcard">
      <div class="bigbadge ${u ? 'pop' : ''}">${badge(a, !!u, 150)}</div><span class="rar">${RAR[a.r]}</span><h2>${ev.t === 'ach' ? 'Achievement Unlocked!' : esc(a.n)}</h2>${ev.t === 'ach' ? `<h3 class="gold">${esc(a.n)}</h3>` : ''}<p>${esc(a.d)}</p>
      ${u ? `<div class="xpbig">+${a.xp} XP</div><p class="small muted">${u.c ? 'Reward collected · unlocked ' + u.d : 'Tap claim to collect your reward!'}</p>` : `<div class="bar"><i style="width:${Math.min(100, cur / tar * 100)}%"></i></div><p class="small muted">${Math.min(cur, tar).toLocaleString()} / ${tar.toLocaleString()} · Reward: +${a.xp} XP</p>`}
      <div class="row g8" style="justify-content:center">${u && !u.c ? `<button class="btn" data-act="ovclaim" data-id="${a.id}">Claim reward</button>` : ''}<button class="btn ${u && !u.c ? 'ghost' : ''}" data-act="closeOv">${u && !u.c ? 'Later' : 'Close'}</button></div></div></div>`;
  }
  if (ev.t === 'streak') {
    const m = ev.n >= 30 ? 'A whole month of showing up. Truly legendary!' : ev.n >= 14 ? 'Two weeks strong. This is who you are now!' : ev.n >= 7 ? 'A full week! Habits are forming.' : 'You are building momentum. Keep going!';
    return `<div class="ov streakov" data-act="closeOv" role="dialog" aria-modal="true" aria-label="Streak celebration">${confettiHtml(40)}<div class="mcard"><div class="bigflame bob">${flame(150)}</div><div class="disp huge">${ev.n}</div><div class="ribbon">DAY STREAK!</div><p>${m}</p><div>${mascot({ mood: 'cheer', size: 120 })}</div><button class="btn" data-act="closeOv">Keep the fire burning</button></div></div>`;
  }
  return '';
}

/* ================= onboarding / splash ================= */
let obSp = 'fox', obName = '';
function showOnboarding() {
  $('#onbL').innerHTML = `<div class="onb"><div class="center"><div>${mascot({ mood: 'cheer', size: 190, sp: obSp, eq: { outfit: 'tunic', weapon: 'wood', shield: 'buckler', acc: 'scarf' } })}</div>
    <div class="logo big">${logo(34)}<b>Habitopia</b></div><p class="tag-line">Small Steps. Legendary Grades.</p></div>
    <p class="muted center">Turn your daily habits into quests, earn XP, and level up your study game.</p>
    <label class="l">Pick your companion</label><div class="spgrid">${Object.entries(SPECIES).map(([k, c]) => `<button class="sp ${obSp === k ? 'on' : ''}" data-act="obsp" data-v="${k}" aria-pressed="${obSp === k}" aria-label="${c.n}"><span class="spv">${mascot({ crop: 'head', size: 50, sp: k, mood: 'happy', eq: { outfit: 'none', weapon: 'none', shield: 'none', acc: 'none' } })}</span><b>${c.n}</b></button>`).join('')}</div>
    <label class="l" for="ob-name">What should we call you?</label><input type="text" id="ob-name" maxlength="20" placeholder="Your name" autocomplete="off" value="${esc(obName)}">
    <button class="btn block" data-act="obstart" data-v="fresh">Start studying 📚</button>
    <p class="small muted center">Everything is saved on this device. No account or internet needed.</p></div>`;
  const i = $('#ob-name'); if (i && !obName) i.focus();
}
function hideSplash() { const s = $('#splash'); if (!s) return; s.classList.add('out'); setTimeout(() => s.remove(), 500); }

/* ================= actions ================= */
const sure = (el, txt) => { if (!el.dataset.sure) { el.dataset.sure = 1; el.textContent = txt || '⚠ Tap again to confirm'; return false; } return true; };
const blankForm = () => ({ id: null, name: '', desc: '', subject: '', cat: 'reading', icon: '📖', freq: 'daily', days: [1, 3, 5], perWeek: 3, target: 25, unit: 'minutes', time: '', diff: 'medium', err: '', confirm: false });
function act(a, d, ev) {
  const pt = { x: ev.x, y: ev.y };
  switch (a) {
    case 'nav': nav(d.v); break;
    case 'go': go(d.v); break;
    case 'back': view = backTo || 'home'; backTo = 'home'; render(); break;
    case 'complete': completeQ(d.id, pt); break;
    case 'step': stepQ(d.id, pt); break;
    case 'undo': undoQ(d.id); break;
    case 'closeOv': closeOv(); break;
    case 'ovclaim': $('#ovL').innerHTML = ''; claim(d.id); if (!$('#ovL').firstChild && ovQ.length) showOv(); break;
    case 'claim': claim(d.id); if (!$('#ovL').firstChild && ovQ.length) showOv(); break;
    case 'achinfo': if (!$('#ovL').firstChild) { $('#ovL').innerHTML = ovHtml({ t: 'achinfo', id: d.id }); const b = $('#ovL button'); if (b) b.focus(); } break;
    case 'qtab': questTab = d.v; render(); break;
    /* display + accessibility */
    case 'theme': S.settings.theme = d.v; save(); render(); break;
    case 'textsize': S.settings.text = d.v; save(); render(); break;
    case 'tgl': S.settings[d.v] = !S.settings[d.v]; save(); render(); break;
    /* adaptive suggestions */
    case 'sgmove': { const h = find(d.id); if (h) { h.time = pad(+d.v) + ':00'; save(); render(); toast('⏰ ' + esc(h.name) + ' reminder moved to ' + hrLabel(+d.v)); } break; }
    case 'sgease': { const h = find(d.id); if (h) { h.target = +d.v; save(); render(); toast('🪜 ' + esc(h.name) + ' target is now ' + d.v + ' ' + esc(h.unit)); } break; }
    case 'sgfocus': if (d.id) timer.q = d.id; go('focus'); break;
    case 'sgno': S.dismissed = S.dismissed || {}; S.dismissed[d.k] = todayStr(); save(); render(); break;
    case 'ftpl': { const x = STUDY_TPL[+d.v]; Object.assign(form, { name: x.name, desc: x.desc, icon: x.icon, cat: x.cat, freq: x.freq, days: x.days ? x.days.slice() : form.days, perWeek: x.perWeek || form.perWeek, target: x.target, unit: x.unit, diff: x.diff, time: x.time, err: '' }); render(); break; }
    /* deadlines */
    case 'todl': questTab = 'deadlines'; nav('quests'); break;
    case 'dltype': dlForm.type = d.v; render(); break;
    case 'dladd': {
      const ti = dlForm.title.trim(); if (!ti) { dlForm.err = 'Please enter what is due.'; render(); break; }
      if (!dlForm.date) { dlForm.err = 'Please pick a date.'; render(); break; }
      S.deadlines.push({ id: 'd' + Date.now().toString(36), title: ti, date: dlForm.date, type: dlForm.type, done: false });
      dlForm = { title: '', date: '', type: 'exam', err: '' }; save(); render(); toast('🗓️ Deadline added'); break;
    }
    case 'dldone': { const x = S.deadlines.find(v => v.id === d.id); if (!x || x.done) break; const b = snap(); x.done = true; const L = dayLog(todayStr()); L.bonus = (L.bonus || 0) + 60; memo = {}; beep([523, 784, 1047]); burst(ev.x, ev.y); settle(b); toast('🎓 ' + esc(x.title) + ' finished! +60 XP'); break; }
    case 'dldel': if (!sure(ev.el, '⚠ Tap again')) break; S.deadlines = S.deadlines.filter(v => v.id !== d.id); save(); render(); break;
    /* focus timer */
    case 'tmdur': timer.min = +d.v; timer.left = timer.min * 60; render(); break;
    case 'tmstart': timer.running = true; timer.end = Date.now() + timer.left * 1000; clearInterval(tmInt); tmInt = setInterval(tmTick, 500); render(); break;
    case 'tmpause': timer.running = false; clearInterval(tmInt); render(); break;
    case 'tmreset': timer.running = false; clearInterval(tmInt); timer.left = timer.min * 60; render(); break;
    case 'rfilter': rewardFilter = d.v; render(); break;
    case 'eqtab': eqTab = d.v; render(); break;
    case 'arange': aRange = +d.v; render(); break;
    case 'nfilter': nFilter = d.v; render(); break;
    case 'place': placeSel = d.id; render(); break;
    case 'equip': {
      const it = ITEMS[d.slot].find(i => i.id === d.id), lv = levelInfo(totalXp()).level;
      if (lv < it.l) { toast('🔒 Reach level ' + it.l + ' to unlock ' + it.n); break; }
      S.equip[d.slot] = d.id; save(); render(); beep([660, 880]); toast('Equipped: ' + it.n); break;
    }
    /* quest form */
    case 'create': form = blankForm(); backTo = view === 'create' ? backTo : view; view = 'create'; resetScroll = true; render(); break;
    case 'edit': { const h = find(d.id); form = { id: h.id, name: h.name, desc: h.desc, subject: h.subject || '', cat: h.cat, icon: h.icon, freq: h.freq, days: h.days.slice(), perWeek: h.perWeek, target: h.target, unit: h.unit, time: h.time, diff: h.diff, err: '', confirm: false }; backTo = view; view = 'create'; resetScroll = true; render(); break; }
    case 'cancelForm': view = backTo === 'create' ? 'quests' : backTo; render(); break;
    case 'fcat': form.cat = d.v; render(); break;
    case 'ficon': form.icon = d.v; render(); break;
    case 'ffreq': form.freq = d.v; if (d.v === 'custom' && !form.days.length) form.days = [1, 3, 5]; render(); break;
    case 'fday': { const n = +d.v, i = form.days.indexOf(n); i < 0 ? form.days.push(n) : form.days.splice(i, 1); render(); break; }
    case 'fweek': form.perWeek = Math.min(7, Math.max(1, form.perWeek + (+d.v))); render(); break;
    case 'fdiff': form.diff = d.v; render(); break;
    case 'fnotime': form.time = ''; render(); break;
    case 'fsave': saveForm(); break;
    case 'fdel':
      if (!form.confirm) { form.confirm = true; render(); break; }
      S.habits = S.habits.filter(h => h.id !== form.id); save(); view = 'quests'; render(); toast('🗑 Quest deleted'); break;
    /* notifications */
    case 'nread': { const n = S.notifs.find(x => x.id === d.id); if (n) { n.read = true; save(); render(); } break; }
    case 'readall': S.notifs.forEach(n => n.read = true); save(); render(); break;
    case 'ntype': S.settings.types[d.v] = !S.settings.types[d.v]; save(); render(); break;
    case 'nremind': S.settings.remind = !S.settings.remind; save(); render(); break;
    case 'testremind': {
      const h = S.habits[0]; pushN('reminder', h ? h.name : 'Quest', 'Time for your quest! ' + (h ? h.icon + ' +' + h.xp + ' XP' : '')); save(); render();
      toast(`<div class="tmasc">${mascot({ crop: 'head', size: 46 })}</div><div><b>⏰ Reminder</b><div class="small">${esc(h ? h.name : 'Your quest')} is waiting for you!</div></div>`); beep([880, 660]); break;
    }
    /* profile */
    case 'sound': S.settings.sound = !S.settings.sound; save(); render(); beep([660, 880]); break;
    case 'saveName': { const v = ($('#nm').value || '').trim(); if (v) { S.user.name = v; save(); render(); toast('✅ Name saved'); } break; }
    case 'fbrate': fb.rating = +d.n; document.querySelectorAll('#fbr .chip').forEach(c => c.classList.toggle('on', +c.dataset.n === fb.rating)); break;
    case 'fbsave': { const c = ($('#fbc').value || '').trim(); if (!c) { toast('Please add a note first'); break; } S.feedback.push({ r: fb.rating, c, who: ($('#fbw').value || '').trim(), d: todayStr() }); save(); render(); toast('✅ Feedback saved'); break; }
    case 'reset': if (!sure(ev.el, '⚠ Tap again to erase everything')) break;
      try { localStorage.removeItem(KEY); } catch (e) { } memStore = null; S = null; obSp = 'fox'; obName = ''; view = 'home'; $('#ovL').innerHTML = ''; render(); showOnboarding(); break;
    case 'obsp': obSp = d.v; obName = ($('#ob-name').value || ''); showOnboarding(); break;
    case 'species': S.species = d.v; save(); render(); beep([660, 880]); toast(`<div class="tmasc">${mascot({ crop: 'head', size: 46, mood: 'cheer' })}</div><div><b>New companion!</b><div class="small">Say hi to your ${SPECIES[d.v].n.toLowerCase()} ${SPECIES[d.v].e}</div></div>`); break;
    case 'obstart': { const n = ($('#ob-name').value || '').trim(); freshState(n); S.species = obSp; save(); $('#onbL').innerHTML = ''; view = 'home'; checkNewDay(); save(); render(); break; }
  }
}
function tmTick() {
  timer.left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
  const T = $('#tm-time'), P = $('#tm-pill'), A = $('#tm-arc');
  if (T) T.textContent = mmss(timer.left); if (P) P.textContent = mmss(timer.left);
  if (A) A.setAttribute('stroke-dashoffset', (2 * Math.PI * 88 * (1 - timer.left / (timer.min * 60))).toFixed(1));
  if (timer.left <= 0) finishTimer();
}
function finishTimer() {
  clearInterval(tmInt); timer.running = false;
  const h = timer.q && find(timer.q), min = timer.min, d = todayStr(), bonus = Math.max(5, Math.round(min * 0.8));
  S.sessions.push({ d, min, id: h ? h.id : null, sub: h ? h.subject || '' : '', t: 't' });
  beep([523, 659, 784, 1047]);
  const fin = () => { timer.left = timer.min * 60; toast('🍅 Focus session done! +' + bonus + ' XP'); };
  if (h) { mutate(h.id, (q, L) => { L.bonus = (L.bonus || 0) + bonus; addP(q, L, entry(L, q).p + min, false); }); fin(); }
  else { const b = snap(); dayLog(d).bonus = (dayLog(d).bonus || 0) + bonus; memo = {}; settle(b); fin(); render(); }
}
function saveForm() {
  const f = form, name = f.name.trim(), target = parseInt(f.target, 10);
  if (!name) { f.err = 'Please give your quest a name.'; render(); return; }
  if (!(target >= 1)) { f.err = 'Target must be 1 or more.'; render(); return; }
  if (f.freq === 'custom' && !f.days.length) { f.err = 'Pick at least one day.'; render(); return; }
  const b = snap(), data = { name, subject: (f.subject || '').trim(), desc: f.desc.trim(), icon: f.icon || '🎯', cat: f.cat, freq: f.freq, days: f.freq === 'custom' ? f.days.slice().sort() : [0, 1, 2, 3, 4, 5, 6], perWeek: f.perWeek, target, unit: f.unit, time: f.time, diff: f.diff, xp: DIFF[f.diff].xp };
  if (f.id) { Object.assign(find(f.id), data); view = backTo === 'create' ? 'quests' : backTo; toast('✅ Quest updated'); }
  else { S.habits.push({ id: 'q' + Date.now().toString(36), personal: true, created: todayStr(), ...data }); S.createdCount++; questTab = 'personal'; view = 'quests'; toast('✨ Quest created!'); }
  backTo = 'home'; form = null; resetScroll = true; save(); settle(b);
}

/* ================= swipe gestures ================= */
let sw = null, swEnd = 0;
function swReset(c, anim) { if (!c) return; c.style.transition = anim ? 'transform .2s' : 'none'; c.style.transform = ''; delete c.dataset.sw; delete c.dataset.swl; }
document.addEventListener('pointerdown', e => {
  if (!S || !S.user || !S.settings.swipe || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const c = e.target.closest('.q[data-id],.mq[data-id]'); if (!c || e.target.closest('button,input,select,textarea,a')) return;
  sw = { c, id: c.dataset.id, x: e.clientX, y: e.clientY, dx: 0, on: false, pid: e.pointerId };
});
document.addEventListener('pointermove', e => {
  if (!sw || e.pointerId !== sw.pid) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (!sw.on) { if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; } if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.5) return; sw.on = true; }
  sw.dx = dx;
  const done = doneOn(todayStr(), sw.id), ok = dx > 0 ? !done : done;
  sw.c.style.transition = 'none'; sw.c.style.transform = 'translateX(' + Math.max(-110, Math.min(110, dx * .55)) + 'px)';
  sw.c.dataset.sw = ok ? (dx > 0 ? 'ok' : 'undo') : 'no';
  sw.c.dataset.swl = !ok ? (dx > 0 ? 'Already done' : 'Not done yet') : Math.abs(dx) >= 80 ? (dx > 0 ? '✓ Release to complete' : '↩ Release to undo') : (dx > 0 ? 'Keep swiping →' : '← Keep swiping');
});
document.addEventListener('pointerup', e => {
  if (!sw || e.pointerId !== sw.pid) return;
  const s = sw; sw = null; if (!s.on) return;
  swEnd = Date.now(); swReset(s.c, true);
  if (Math.abs(s.dx) < 80) return;
  const done = doneOn(todayStr(), s.id), pt = { x: e.clientX, y: e.clientY };
  if (!scheduled(todayStr()).some(h => h.id === s.id)) { toast('📅 This quest is not scheduled today'); return; }
  if (s.dx > 0 && !done) { S.settings.swipes = (S.settings.swipes || 0) + 1; completeQ(s.id, pt); }
  else if (s.dx < 0 && done) { S.settings.swipes = (S.settings.swipes || 0) + 1; undoQ(s.id); toast('↩ Quest marked as not done'); }
  else toast(s.dx > 0 ? 'Already done. Swipe left to undo.' : 'Swipe right to complete this quest.');
});
document.addEventListener('pointercancel', () => { if (sw) { swReset(sw.c, true); sw = null; } });
document.addEventListener('click', e => { if (Date.now() - swEnd < 400) { e.stopPropagation(); e.preventDefault(); } }, true);

/* ================= reminders (in-app, no API) ================= */
function reminderTick() {
  if (!S || !S.user || !S.settings.remind || !S.settings.types.reminder) return;
  const t = todayStr(), hm = nowHM(); let changed = false;
  scheduled(t).forEach(h => {
    if (!h.time || doneOn(t, h.id)) return;
    const k = 'rem' + t + h.id; if (S.fired[k] || h.time > hm) return;
    S.fired[k] = 1; changed = true;
    const late = (parseInt(hm) * 60 + parseInt(hm.slice(3))) - (parseInt(h.time) * 60 + parseInt(h.time.slice(3)));
    if (late <= 90) { pushN('reminder', h.name, 'Time for your quest! ' + h.icon + ' +' + h.xp + ' XP'); toast(`<div class="tmasc">${mascot({ crop: 'head', size: 46 })}</div><div><b>⏰ ${esc(h.name)}</b><div class="small">Time for your quest!</div></div>`, 4000); beep([880, 660]); }
  });
  if (changed) { save(); render(); }
}

/* ================= events ================= */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.classList.contains('ov') && e.target !== b) return;
  const r = b.getBoundingClientRect();
  act(b.dataset.act, b.dataset, { x: r.left + r.width / 2, y: r.top + r.height / 2, el: b });
});
document.addEventListener('input', e => {
  const id = e.target.id; if (id === 'ob-name') obName = e.target.value;
  if (id === 'dl-title') dlForm.title = e.target.value; if (id === 'dl-date') dlForm.date = e.target.value; if (id === 'tm-q') timer.q = e.target.value;
  if (!form || view !== 'create') return;
  if (id === 'f-name') form.name = e.target.value;
  else if (id === 'f-desc') form.desc = e.target.value;
  else if (id === 'f-sub') form.subject = e.target.value;
  else if (id === 'f-target') form.target = e.target.value.replace(/\D/g, '');
  else if (id === 'f-unit') form.unit = e.target.value;
  else if (id === 'f-time') form.time = e.target.value;
  else if (id === 'f-emo') { const c = Array.from(e.target.value.trim())[0]; if (c) { form.icon = c; render(); } }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#ovL').firstChild) closeOv();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (e.key === 'Enter' && e.target.id === 'ob-name') act('obstart', { v: 'fresh' }, { x: 0, y: 0 });
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && S && S.user) { checkNewDay(); save(); render(); } });

/* ================= start ================= */
function init() {
  $('#nav').innerHTML = [['home', 'Home'], ['quests', 'Quests'], ['rewards', 'Rewards'], ['journey', 'Journey'], ['profile', 'Profile']]
    .map(([k, n]) => `<button class="nb" data-act="nav" data-v="${k}">${ico(k)}<span>${n}</span></button>`).join('');
  $('#splashFox').innerHTML = mascot({ mood: 'happy', size: 130 });
  S = load(); applyPrefs();
  setTimeout(() => {                                   // short "loading" state
    if (!S || !S.user) showOnboarding(); else { checkNewDay(); save(); render(); }
    hideSplash();
  }, window.__FAST__ ? 0 : 900);
  setInterval(reminderTick, 30000);
}
init();
