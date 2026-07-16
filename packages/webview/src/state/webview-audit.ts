import type { WebviewAuditMode, WebviewAuditResult } from '@helm/core/browser';

const interactiveSelector =
  'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

export async function runWebviewAudit(mode: WebviewAuditMode): Promise<WebviewAuditResult> {
  const result: WebviewAuditResult = {
    mode,
    errors: [],
    mainInteractiveCount: 0,
    settingsInteractiveCount: 0,
    samples: [],
  };

  const settingsInitiallyOpen = Boolean(findButton('Back'));
  if (!settingsInitiallyOpen && mode === 'keyboard') {
    result.mainInteractiveCount = auditInteractiveElements(document, 'main', result.errors);
  }

  if (!settingsInitiallyOpen) {
    const settingsButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Open settings"]',
    );
    if (!settingsButton) {
      result.errors.push('Could not find the Open settings button.');
      return result;
    }
    settingsButton.click();
    await nextPaint();
  }

  if (mode === 'keyboard') {
    result.settingsInteractiveCount = auditInteractiveElements(document, 'settings', result.errors);
  } else {
    const sections = document.querySelectorAll<HTMLElement>('[data-helm-theme-audit]');
    for (const section of sections) {
      const style = getComputedStyle(section);
      result.samples.push({
        id: section.dataset.helmThemeAudit ?? 'unknown',
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderBottomColor,
      });
    }
    if (result.samples.length !== 3) {
      result.errors.push(`Expected 3 themed settings sections, found ${result.samples.length}.`);
    }
    for (const sample of result.samples) {
      if (!sample.color || !sample.borderColor) {
        result.errors.push(`${sample.id} did not resolve theme foreground and border colors.`);
      }
    }
  }

  if (!settingsInitiallyOpen) {
    findButton('Back')?.click();
    await nextPaint();
  }
  return result;
}

function auditInteractiveElements(root: ParentNode, scope: string, errors: string[]): number {
  const elements = [...root.querySelectorAll<HTMLElement>(interactiveSelector)].filter(
    (element) => !isHidden(element) && !isDisabled(element),
  );
  for (const [index, element] of elements.entries()) {
    element.focus();
    if (document.activeElement !== element) {
      errors.push(`${scope} control ${index + 1} could not receive focus.`);
    }
    if (element instanceof HTMLButtonElement && !accessibleName(element)) {
      errors.push(`${scope} button ${index + 1} has no accessible name.`);
    }
    if (isFormControl(element) && !formControlName(element)) {
      errors.push(`${scope} form control ${index + 1} has no accessible name.`);
    }
    if (element.matches(':focus-visible') && getComputedStyle(element).outlineStyle === 'none') {
      errors.push(
        `${scope} control ${index + 1} (${describeElement(element)}) has no visible focus outline.`,
      );
    }
  }
  return elements.length;
}

function accessibleName(button: HTMLButtonElement): string {
  return button.getAttribute('aria-label')?.trim() || button.textContent?.trim() || '';
}

function describeElement(element: HTMLElement): string {
  const label =
    element.getAttribute('aria-label')?.trim() ||
    (isFormControl(element) ? formControlName(element) : '') ||
    element.textContent?.trim().replace(/\s+/gu, ' ').slice(0, 60) ||
    element.getAttribute('title') ||
    'unnamed';
  return `${element.tagName.toLowerCase()} “${label}”`;
}

function isFormControl(
  element: HTMLElement,
): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function formControlName(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): string {
  return (
    control.getAttribute('aria-label')?.trim() || control.labels?.[0]?.textContent?.trim() || ''
  );
}

function isDisabled(element: HTMLElement): boolean {
  return 'disabled' in element && Reflect.get(element, 'disabled') === true;
}

function isHidden(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  return style.display === 'none' || style.visibility === 'hidden' || element.hidden;
}

function findButton(label: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent?.trim() === label,
  );
}

async function nextPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
