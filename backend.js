// Speicher-Schicht: entweder Firebase (geteilt, in Echtzeit) oder lokal (Demo).
// Beide bieten dieselben Funktionen:
//   subscribe(col, cb)  – cb bekommt bei jeder Änderung alle Dokumente
//   add(col, data)      – legt ein Dokument an, gibt die ID zurück
//   set(col, id, data)  – schreibt/ergänzt ein Dokument (merge)
//   remove(col, id)
//   exists()            – gibt es diesen Haushalt schon?
import { firebaseConfig } from './firebase-config.js';

export const hasFirebase = !!(firebaseConfig && firebaseConfig.apiKey);

const SDK = 'https://www.gstatic.com/firebasejs/11.0.2/';

export async function createBackend(householdId) {
  return hasFirebase ? createFirebaseBackend(householdId) : createLocalBackend();
}

async function createFirebaseBackend(hid) {
  const [{ initializeApp, getApps }, authMod, fs] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js'),
  ]);
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) await authMod.signInAnonymously(auth);

  let db;
  try {
    db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
    });
  } catch {
    db = fs.getFirestore(app);
  }

  const col = name => fs.collection(db, 'households', hid, name);
  const fail = e => console.error('Firestore:', e);

  return {
    mode: 'firebase',
    subscribe(name, cb) {
      return fs.onSnapshot(col(name),
        snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        fail);
    },
    add(name, data) {
      const ref = fs.doc(col(name));
      fs.setDoc(ref, data).catch(fail);
      return ref.id;
    },
    set(name, id, data) {
      fs.setDoc(fs.doc(col(name), id), data, { merge: true }).catch(fail);
    },
    remove(name, id) {
      fs.deleteDoc(fs.doc(col(name), id)).catch(fail);
    },
    async exists() {
      const snap = await fs.getDocsFromServer(col('lists'));
      return !snap.empty;
    },
  };
}

function createLocalBackend() {
  const KEY = 'einkauf-local-v1';
  let data = load();
  const subs = {};

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(data)); }
  function docs(name) { return Object.entries(data[name] || {}).map(([id, d]) => ({ id, ...d })); }
  function emit(name) { (subs[name] || []).forEach(cb => cb(docs(name))); }
  function emitAll() { Object.keys(subs).forEach(emit); }
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Andere Tabs im selben Browser halten wir synchron.
  window.addEventListener('storage', e => { if (e.key === KEY) { data = load(); emitAll(); } });

  return {
    mode: 'local',
    subscribe(name, cb) {
      (subs[name] ||= []).push(cb);
      queueMicrotask(() => cb(docs(name)));
      return () => { subs[name] = subs[name].filter(f => f !== cb); };
    },
    add(name, doc) {
      const id = newId();
      (data[name] ||= {})[id] = doc;
      save(); emit(name);
      return id;
    },
    set(name, id, doc) {
      const c = (data[name] ||= {});
      c[id] = { ...(c[id] || {}), ...doc };
      save(); emit(name);
    },
    remove(name, id) {
      if (data[name]) delete data[name][id];
      save(); emit(name);
    },
    async exists() { return Object.keys(data.lists || {}).length > 0; },
  };
}
