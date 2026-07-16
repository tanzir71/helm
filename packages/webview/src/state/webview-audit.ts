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
  if (mode === 'responsive') {
    if (settingsInitiallyOpen) {
      findButton('Back')?.click();
      await nextPaint();
    }
    await auditIconFont(result.errors);
    await auditResponsiveLayout(result.errors);
    if (settingsInitiallyOpen) {
      document.querySelector<HTMLButtonElement>('button[aria-label="Open settings"]')?.click();
      await nextPaint();
    }
    return result;
  }

  if (!settingsInitiallyOpen && mode === 'keyboard') {
    result.mainInteractiveCount = auditInteractiveElements(document, 'main', result.errors);
  }
  await auditIconFont(result.errors);

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

async function auditIconFont(errors: string[]): Promise<void> {
  await document.fonts.ready;
  const icon = [...document.querySelectorAll<HTMLElement>('.codicon')].find((element) => {
    const rect = element.getBoundingClientRect();
    return !isHidden(element) && rect.width > 0 && rect.height > 0;
  });
  if (!icon) {
    errors.push('Could not find a visible Codicon to audit.');
    return;
  }
  const pseudoStyle = getComputedStyle(icon, '::before');
  const glyph = pseudoStyle.content.replace(/^['"]|['"]$/gu, '');
  if (!glyph || glyph === 'none') errors.push('Visible Codicon has no ::before glyph content.');
  if (!pseudoStyle.fontFamily.toLowerCase().includes('codicon')) {
    errors.push(`Visible icon resolved ${pseudoStyle.fontFamily} instead of the Codicon font.`);
  }
  if (!document.fonts.check('14px codicon', glyph || '\uea60')) {
    errors.push('The Codicon font face did not load inside the webview.');
  }
}

async function auditResponsiveLayout(errors: string[]): Promise<void> {
  const root = document.documentElement;
  const initialWidth = root.style.width;
  let modelOpened = false;
  let modeOpened = false;
  root.style.width = '240px';
  try {
    await nextPaint();
    const toolbar = document.querySelector<HTMLElement>('[data-helm-composer-toolbar]');
    if (!toolbar) {
      errors.push('Could not find the composer toolbar for responsive audit.');
      return;
    }
    const toolbarRect = toolbar.getBoundingClientRect();
    const controls = [...toolbar.querySelectorAll<HTMLButtonElement>('button')].filter(
      (button) => !isHidden(button),
    );
    if (controls.length < 5) {
      errors.push(`Expected 5 composer controls at 240px, found ${controls.length}.`);
    }
    for (const control of controls) {
      const rect = control.getBoundingClientRect();
      if (rect.left < toolbarRect.left - 0.5 || rect.right > toolbarRect.right + 0.5) {
        errors.push(`${describeElement(control)} escapes the 240px composer toolbar.`);
      }
      if (Math.abs(rect.height - 24) > 0.5) {
        errors.push(`${describeElement(control)} is ${rect.height}px tall instead of 24px.`);
      }
    }
    for (let leftIndex = 0; leftIndex < controls.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < controls.length; rightIndex += 1) {
        const left = controls[leftIndex]!;
        const right = controls[rightIndex]!;
        if (rectanglesOverlap(left.getBoundingClientRect(), right.getBoundingClientRect())) {
          errors.push(`${describeElement(left)} overlaps ${describeElement(right)} at 240px.`);
        }
      }
    }

    const modelButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Choose model and reasoning effort"]',
    );
    if (!modelButton) {
      errors.push('Could not find the model picker for responsive audit.');
      return;
    }
    modelButton.click();
    modelOpened = true;
    await nextPaint();
    const popover = document.querySelector<HTMLElement>('[data-helm-popover="model"]');
    if (!popover) {
      errors.push('Model picker did not open during responsive audit.');
      return;
    }
    const popoverRect = popover.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    if (
      popoverRect.left < rootRect.left + 7.5 ||
      popoverRect.right > rootRect.right - 7.5 ||
      popoverRect.top < rootRect.top + 7.5
    ) {
      errors.push('Model picker escapes the visible 240px webview bounds.');
    }
    modelButton.click();
    modelOpened = false;
    await nextPaint();

    const modeButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Choose agent mode"]',
    );
    if (!modeButton) {
      errors.push('Could not find the mode picker for responsive audit.');
      return;
    }
    modeButton.click();
    modeOpened = true;
    await nextPaint();
    const modePopover = document.querySelector<HTMLElement>('[data-helm-popover="mode"]');
    if (!modePopover) {
      errors.push('Mode picker did not open during responsive audit.');
      return;
    }
    const modeRect = modePopover.getBoundingClientRect();
    if (
      modeRect.left < rootRect.left + 7.5 ||
      modeRect.right > rootRect.right - 7.5 ||
      modeRect.top < rootRect.top + 7.5
    ) {
      errors.push('Mode picker escapes the visible 240px webview bounds.');
    }
  } finally {
    if (modelOpened) {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Choose model and reasoning effort"]')
        ?.click();
    }
    if (modeOpened) {
      document.querySelector<HTMLButtonElement>('button[aria-label="Choose agent mode"]')?.click();
    }
    root.style.width = initialWidth;
    await nextPaint();
  }
}

function rectanglesOverlap(left: DOMRect, right: DOMRect): boolean {
  return (
    Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0.5 &&
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0.5
  );
}
