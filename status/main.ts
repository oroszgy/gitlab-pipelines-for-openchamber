import { createHostPort } from '../panel/host-port';
import { mountStatusSection, STATUS_SECTION_CSS } from '../panel/status-section';

function injectStyle(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
}

const root = document.getElementById('root');
if (root) {
  injectStyle(STATUS_SECTION_CSS);
  const hostPort = createHostPort();
  const section = mountStatusSection(root, hostPort);
  window.addEventListener('beforeunload', () => section.dispose());
}
