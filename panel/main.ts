import { API_ORIGIN, PANEL_ID } from './config';
import { createHostPort } from './host-port';
import { mountPanel } from './panel';
import { PANEL_CSS } from './styles';

function injectStyle(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
}

const root = document.getElementById('root');
if (root) {
  injectStyle(PANEL_CSS);
  const hostPort = createHostPort();
  const panel = mountPanel(root, hostPort, { apiOrigin: API_ORIGIN, panelId: PANEL_ID });
  window.addEventListener('beforeunload', () => panel.dispose());
}
