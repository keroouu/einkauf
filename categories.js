// Kategorien in der Reihenfolge, in der man meist durch den Laden läuft.
// Die Stichwörter dienen nur als erste Vermutung – einmal korrigiert,
// merkt sich die App die Kategorie für diesen Artikel.
export const CATEGORIES = [
  { id: 'obst', name: 'Obst & Gemüse', icon: '🍎', kw: ['apfel', 'äpfel', 'banane', 'birne', 'orange', 'mandarine', 'zitrone', 'limette', 'traube', 'erdbeere', 'himbeere', 'heidelbeere', 'beeren', 'kiwi', 'mango', 'ananas', 'melone', 'pfirsich', 'nektarine', 'granatapfel', 'avocado', 'tomate', 'tomaten', 'gurke', 'paprika', 'salat', 'eisberg', 'rucola', 'zwiebel', 'knoblauch', 'kartoffel', 'karotte', 'möhre', 'zucchini', 'aubergine', 'brokkoli', 'blumenkohl', 'spinat', 'pilze', 'champignon', 'lauch', 'porree', 'sellerie', 'ingwer', 'petersilie', 'basilikum', 'dill', 'minze', 'koriander', 'frühlingszwiebel', 'kürbis', 'radieschen', 'kohl', 'spargel', 'süßkartoffel', 'obst', 'gemüse', 'kräuter'] },
  { id: 'brot', name: 'Brot & Backwaren', icon: '🥖', kw: ['brot', 'brötchen', 'toast', 'baguette', 'croissant', 'fladenbrot', 'brezel', 'laugen', 'knäckebrot', 'wraps', 'tortilla', 'kuchen', 'simit', 'pide', 'lavash', 'yufka', 'börek', 'zwieback'] },
  { id: 'kuehl', name: 'Milch & Kühlregal', icon: '🥛', kw: ['milch', 'joghurt', 'jogurt', 'quark', 'käse', 'butter', 'sahne', 'schmand', 'frischkäse', 'mozzarella', 'feta', 'hirtenkäse', 'weißkäse', 'gouda', 'parmesan', 'halloumi', 'ei', 'eier', 'margarine', 'ayran', 'kefir', 'skyr', 'pudding', 'fraiche', 'hummus', 'tofu', 'kaymak', 'labneh'] },
  { id: 'fleisch', name: 'Fleisch & Fisch', icon: '🥩', kw: ['hähnchen', 'hühnchen', 'huhn', 'chicken', 'pute', 'hack', 'hackfleisch', 'rind', 'lamm', 'kalb', 'steak', 'wurst', 'würstchen', 'sucuk', 'salami', 'schinken', 'aufschnitt', 'fisch', 'lachs', 'garnelen', 'döner', 'köfte', 'fleisch', 'filet', 'schnitzel', 'gulasch', 'pastirma'] },
  { id: 'tk', name: 'Tiefkühl', icon: '🧊', kw: ['tk', 'tiefkühl', 'eis', 'eiscreme', 'pizza', 'pommes', 'gefroren', 'eiswürfel'] },
  { id: 'vorrat', name: 'Nudeln, Reis & Konserven', icon: '🍝', kw: ['nudeln', 'spaghetti', 'pasta', 'penne', 'lasagne', 'reis', 'bulgur', 'couscous', 'linsen', 'kichererbsen', 'bohnen', 'mehl', 'zucker', 'haferflocken', 'müsli', 'cornflakes', 'konserve', 'dose', 'passierte', 'tomatenmark', 'paprikamark', 'kokosmilch', 'öl', 'olivenöl', 'sonnenblumenöl', 'essig', 'brühe', 'honig', 'marmelade', 'nutella', 'erdnussbutter', 'thunfisch', 'mais', 'oliven', 'tahin', 'senf', 'ketchup', 'mayo', 'mayonnaise', 'soße', 'sauce', 'pesto', 'grieß', 'polenta'] },
  { id: 'gewuerz', name: 'Gewürze & Backen', icon: '🧂', kw: ['salz', 'pfeffer', 'paprikapulver', 'gewürz', 'gewürze', 'zimt', 'kreuzkümmel', 'kümmel', 'kurkuma', 'chili', 'chiliflocken', 'oregano', 'thymian', 'backpulver', 'hefe', 'vanille', 'vanillezucker', 'puderzucker', 'natron', 'pul', 'biber', 'sumach', 'minzpulver'] },
  { id: 'snacks', name: 'Süßes & Snacks', icon: '🍫', kw: ['schokolade', 'schoko', 'chips', 'kekse', 'gummibärchen', 'nüsse', 'pistazien', 'mandeln', 'cracker', 'riegel', 'bonbons', 'süßigkeiten', 'popcorn', 'salzstangen', 'baklava', 'kerne', 'lokum', 'snacks'] },
  { id: 'getraenke', name: 'Getränke', icon: '🥤', kw: ['wasser', 'mineralwasser', 'saft', 'cola', 'limo', 'limonade', 'sprudel', 'tee', 'kaffee', 'kaffeebohnen', 'bier', 'wein', 'schorle', 'eistee', 'energy', 'kapseln', 'pads', 'sirup'] },
  { id: 'drogerie', name: 'Drogerie', icon: '🧴', kw: ['shampoo', 'spülung', 'duschgel', 'seife', 'zahnpasta', 'zahncreme', 'zahnbürste', 'zahnseide', 'deo', 'creme', 'rasierer', 'rasierschaum', 'windeln', 'feuchttücher', 'tampons', 'binden', 'wattepads', 'wattestäbchen', 'taschentücher', 'toilettenpapier', 'klopapier', 'sonnencreme', 'haargel', 'pflaster', 'tabletten', 'vitamine', 'bodylotion', 'nagellack', 'abschminktücher'] },
  { id: 'haushalt', name: 'Haushalt', icon: '🧽', kw: ['spülmittel', 'spültabs', 'tabs', 'waschmittel', 'weichspüler', 'müllbeutel', 'mülltüten', 'alufolie', 'frischhaltefolie', 'backpapier', 'küchenrolle', 'küchenpapier', 'schwamm', 'schwämme', 'putzmittel', 'reiniger', 'batterien', 'glühbirne', 'kerzen', 'servietten', 'gefrierbeutel', 'entkalker'] },
  { id: 'sonstiges', name: 'Sonstiges', icon: '📦', kw: [] },
];

const BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
export const categoryById = id => BY_ID[id] || BY_ID.sonstiges;
export const categoryIndex = id => CATEGORIES.indexOf(categoryById(id));

// Bewertung: ganzes Wort > Wortanfang > irgendwo enthalten; bei Gleichstand
// gewinnt das längere Stichwort ("eisberg" schlägt "eis").
export function guessCategory(name) {
  const lower = String(name).toLowerCase();
  const words = lower.split(/[^a-zäöüß]+/).filter(Boolean);
  let best = 'sonstiges';
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    for (const kw of cat.kw) {
      let type = 0;
      for (const w of words) {
        if (w === kw) type = Math.max(type, 3);
        else if (w.startsWith(kw) && kw.length >= 3) type = Math.max(type, 2);
        else if (kw.length >= 4 && w.includes(kw)) type = Math.max(type, 1);
      }
      const score = type ? type * 100 + kw.length : 0;
      if (score > bestScore) { bestScore = score; best = cat.id; }
    }
  }
  return best;
}
