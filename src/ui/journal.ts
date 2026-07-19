import type { Discovery } from '../engine/reactions';

const KEY = 'sand-magic-journal';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export class Journal {
  readonly entries: Discovery[] = [];
  readonly seen = new Set<string>();

  constructor(private readonly storage: StorageLike) {
    try {
      const raw = storage.getItem(KEY);
      if (raw) {
        for (const d of JSON.parse(raw) as Discovery[]) {
          this.entries.push(d);
          this.seen.add(d.name);
        }
      }
    } catch {
      // corrupt or blocked storage: start with an empty journal, never crash
    }
  }

  record(d: Discovery): void {
    if (this.seen.has(d.name)) return;
    this.seen.add(d.name);
    this.entries.push(d);
    try {
      this.storage.setItem(KEY, JSON.stringify(this.entries));
    } catch {
      // storage blocked: keep the in-memory journal for this session
    }
  }
}

export function showToast(d: Discovery): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `✨ You discovered ${d.name}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function buildJournalUI(root: HTMLElement, journal: Journal): void {
  const open = document.createElement('button');
  open.id = 'journal-btn';
  open.textContent = '📖 Journal';
  open.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const cards = journal.entries.map(d => `
      <div class="card">
        <div class="card-title">
          <span class="swatch" style="background:${d.swatches[0]}"></span>
          <span class="swatch" style="background:${d.swatches[1]}"></span>
          <strong>${d.name}</strong>
        </div>
        <p>${d.science}</p>
      </div>`).join('');
    overlay.innerHTML = `
      <div class="dialog journal">
        <h2>My Discoveries</h2>
        <div class="cards">${cards || '<p>Nothing here yet — mix things together and see what happens!</p>'}</div>
        <button class="no">Back to playing</button>
      </div>`;
    overlay.querySelector('.no')!.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  });
  root.appendChild(open);
}
