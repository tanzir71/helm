/* global HTMLAnchorElement, IntersectionObserver, document, navigator, window */

const menuButton = document.querySelector('[data-menu-toggle]');
const navigation = document.querySelector('[data-site-nav]');

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  navigation?.toggleAttribute('data-open', !open);
});

navigation?.addEventListener('click', (event) => {
  if (!(event.target instanceof HTMLAnchorElement)) return;
  menuButton?.setAttribute('aria-expanded', 'false');
  navigation.removeAttribute('data-open');
});

const tabs = [...document.querySelectorAll('[data-install-tab]')];
const panels = [...document.querySelectorAll('[data-install-panel]')];

function selectInstallTab(method) {
  for (const tab of tabs) {
    const selected = tab.getAttribute('data-install-tab') === method;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const panel of panels) {
    panel.hidden = panel.getAttribute('data-install-panel') !== method;
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectInstallTab(tab.getAttribute('data-install-tab')));
  tab.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextTab = tabs[(index + direction + tabs.length) % tabs.length];
    nextTab?.focus();
    nextTab?.click();
  });
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const code = button.parentElement?.querySelector('code')?.textContent;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = 'Copied';
      window.setTimeout(() => {
        button.textContent = 'Copy';
      }, 1600);
    } catch {
      button.textContent = 'Select text';
    }
  });
}

for (const year of document.querySelectorAll('[data-current-year]')) {
  year.textContent = String(new Date().getFullYear());
}

if (
  'IntersectionObserver' in window &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  document.documentElement.classList.add('supports-reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-visible', '');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  for (const element of document.querySelectorAll('[data-reveal]')) observer.observe(element);
}
