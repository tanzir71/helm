export interface MeasurableTextarea {
  scrollHeight: number;
  style: { height: string };
}

export function resizeComposerTextarea(textarea: MeasurableTextarea, maxHeight = 180): number {
  textarea.style.height = '0px';
  const height = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${height}px`;
  return height;
}
