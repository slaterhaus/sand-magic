import posterUrl from '../assets/science-magic.png';
import musicUrl from '../assets/glowing-mushrooms.ogg';

// Shows the poster + Play button, then starts the looping music on click
// (browsers require a user gesture before audio can play) and reveals a
// small mute toggle for as long as the game runs.
export function buildTitleScreen(root: HTMLElement): void {
  const music = new Audio(musicUrl);
  music.loop = true;
  music.volume = 0.5;

  const overlay = document.createElement('div');
  overlay.className = 'title-screen';
  overlay.innerHTML = `
    <img src="${posterUrl}" alt="Science Magic" class="poster" />
    <button class="play-btn">▶ Play</button>
  `;
  overlay.querySelector('.play-btn')!.addEventListener('click', () => {
    music.play().catch(() => {
      // autoplay can still be blocked in rare cases; the mute button lets
      // her retry with another click, so failing silently is fine here
    });
    overlay.remove();
    buildMuteButton(root, music);
  });
  root.appendChild(overlay);
}

function buildMuteButton(root: HTMLElement, music: HTMLAudioElement): void {
  const btn = document.createElement('button');
  btn.className = 'mute-btn';
  btn.textContent = '🔊';
  btn.addEventListener('click', () => {
    music.muted = !music.muted;
    btn.textContent = music.muted ? '🔇' : '🔊';
  });
  root.appendChild(btn);
}
