import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CustomImageCarousel } from '@/features/post-editor/configs/image-carousel';

const editors: Editor[] = [];
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;

function flushFrames() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(0));
}

function makeEditor(widths = ['90%', '90%', '90%'], count = 1) {
  const element = document.createElement('div');
  document.body.append(element);
  const editor = new Editor({
    element,
    extensions: [StarterKit.configure({ trailingNode: false }), CustomImageCarousel],
    content: Array.from(
      { length: count },
      (_, carousel) =>
        `<div data-type="image-carousel">${widths.map((width, index) => `<img src="/${carousel}-${index}.webp" data-width="${width}" data-height="auto" width="600" height="400">`).join('')}</div>`,
    ).join(''),
  });
  editors.push(editor);
  return editor;
}

function containers(editor: Editor) {
  return [...editor.view.dom.querySelectorAll<HTMLElement>('.image-carousel-container')];
}

function control(container: HTMLElement, label: string) {
  return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
}

function pointer(target: EventTarget, name: string, options: Partial<PointerEvent> = {}) {
  const event = new MouseEvent(name, {
    bubbles: true,
    cancelable: true,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
  });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    pointerType: { value: options.pointerType ?? 'mouse' },
  });
  target.dispatchEvent(event);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains('image-carousel-viewport')) return 400;
    if (this.tagName === 'IMG')
      return parseFloat((this.closest('.image-carousel-slide') as HTMLElement).style.flexBasis) * 4;
    return 0;
  });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    let offset = 0;
    let sibling = this.previousElementSibling as HTMLElement | null;
    while (sibling) {
      offset += parseFloat(sibling.style.flexBasis) * 4 + 8;
      sibling = sibling.previousElementSibling as HTMLElement | null;
    }
    return offset;
  });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    const slides = [...this.querySelectorAll<HTMLElement>('.image-carousel-slide')];
    return Math.max(
      400,
      slides.reduce((total, slide) => total + parseFloat(slide.style.flexBasis) * 4, 0) +
        Math.max(0, slides.length - 1) * 8,
    );
  });
  HTMLElement.prototype.scrollTo = vi.fn(function (
    this: HTMLElement,
    options: ScrollToOptions | number,
  ) {
    this.scrollLeft = typeof options === 'number' ? options : (options.left ?? 0);
    this.dispatchEvent(new Event('scroll'));
  });
});

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  document.body.replaceChildren();
  frames.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('캐러셀 NodeView 수명과 편집', () => {
  it('이미지 선택 시에만 해당 모자이크·삭제를 표시하고 번호 영역은 표시하지 않는다', () => {
    const editor = makeEditor();
    flushFrames();
    const [container] = containers(editor);
    const pictures = container.querySelectorAll('img');
    pictures[0].click();
    expect(container.querySelectorAll('.image-resize-frame')).toHaveLength(1);
    expect(container.querySelector('.image-carousel-actions')).toBeNull();
    expect(
      container.querySelectorAll('.image-carousel-selected-actions:not([hidden]) button'),
    ).toHaveLength(1);
    expect(container.querySelectorAll('.image-delete-button:not([hidden])')).toHaveLength(1);
    pictures[1].click();
    expect(container.querySelectorAll('.image-resize-frame')).toHaveLength(1);
    expect(pictures[1].parentElement!.classList.contains('image-resize-frame')).toBe(true);
    expect(editor.getHTML()).not.toMatch(/image-resize-frame|번 이미지|모자이크/);
  });

  it('인접 너비와 높이에 독립적으로 붙고 이탈하며 인접 이미지 데이터는 보존한다', () => {
    const editor = makeEditor(['70%', '90%', '50%']);
    flushFrames();
    const [container] = containers(editor);
    const neighbors = structuredClone(editor.state.doc.firstChild!.attrs.images.slice(1));
    container.querySelector('img')!.click();
    pointer(control(container, '1번 이미지 se 크기 조절'), 'pointerdown');
    pointer(document, 'pointermove', { clientX: 75, clientY: 5 });
    const slide = container.querySelector<HTMLElement>('.image-carousel-slide')!;
    expect(parseFloat(slide.style.flexBasis)).toBe(90);
    expect(container.querySelector('img')!.style.height).toBe('200px');
    pointer(document, 'pointermove', { clientX: 90, clientY: 20 });
    expect(parseFloat(slide.style.flexBasis)).toBe(90);
    expect(container.querySelector('img')!.style.height).toBe('220px');
    pointer(document, 'pointermove', { clientX: 100, clientY: 20 });
    expect(parseFloat(slide.style.flexBasis)).toBe(95);
    pointer(document, 'pointerup', { clientX: 100, clientY: 20 });
    flushFrames();
    expect(editor.state.doc.firstChild!.attrs.images.slice(1)).toEqual(neighbors);
    expect(editor.state.doc.firstChild!.attrs.images[0].width).toBe('95.0%');
  });

  it('서로 다른 캐러셀의 스크롤을 추가 및 삭제 후에도 독립적으로 유지한다', () => {
    const editor = makeEditor(undefined, 2);
    flushFrames();
    const [first, second] = containers(editor);
    control(first, '다음 이미지').click();
    control(second, '다음 이미지').click();
    control(second, '다음 이미지').click();
    editor.commands.addImagesToCarousel(0, [{ src: '/new.webp', width: '90%', height: 'auto' }]);
    flushFrames();
    expect(first.querySelector('.image-carousel-viewport')!.scrollLeft).toBe(368);
    expect(second.querySelector('.image-carousel-viewport')!.scrollLeft).toBe(696);
    control(first, '2번 이미지 삭제').click();
    flushFrames();
    expect(first.querySelector('.image-carousel-viewport')!.scrollLeft).toBe(368);
    expect(second.querySelector('.image-carousel-viewport')!.scrollLeft).toBe(696);
  });

  it('짧은 슬라이드가 끝에 여러 장 보이면 끝에서 다음을 비활성화하고 이전은 실제 이전 위치로 이동한다', () => {
    const editor = makeEditor(['30%', '30%', '30%', '30%', '30%']);
    flushFrames();
    const [container] = containers(editor);
    const next = control(container, '다음 이미지');
    next.click();
    next.click();
    expect(container.querySelector('.image-carousel-viewport')!.scrollLeft).toBe(232);
    expect(next.disabled).toBe(true);
    control(container, '이전 이미지').click();
    expect(container.querySelector('.image-carousel-viewport')!.scrollLeft).toBe(128);
    expect(next.disabled).toBe(false);
  });

  it('키보드 리사이즈 후 해당 핸들 포커스와 슬라이드 스크롤을 복원한다', () => {
    const editor = makeEditor();
    flushFrames();
    const [container] = containers(editor);
    control(container, '다음 이미지').click();
    container.querySelectorAll('img')[1].click();
    const handle = control(container, '2번 이미지 se 크기 조절');
    handle.focus();
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    flushFrames();
    expect(editor.state.doc.firstChild!.attrs.images[1].width).toBe('92.5%');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('2번 이미지 se 크기 조절');
    expect(container.querySelector('.image-carousel-viewport')!.scrollLeft).toBe(368);
  });

  it('드래그 중 종료하면 남은 문서 이벤트가 미리보기나 문서를 수정하지 않는다', () => {
    const editor = makeEditor();
    flushFrames();
    const [container] = containers(editor);
    container.querySelector('img')!.click();
    pointer(control(container, '1번 이미지 se 크기 조절'), 'pointerdown');
    const image = container.querySelector('img')!;
    const originalStyle = image.style.cssText;
    const dispatch = vi.spyOn(editor.view, 'dispatch');
    editor.destroy();
    pointer(document, 'pointermove', { clientX: 100, clientY: 100 });
    pointer(document, 'pointerup', { clientX: 100, clientY: 100 });
    expect(image.style.cssText).toBe(originalStyle);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('100% 너비를 넘는 실제 드래그는 미리보기와 같은 너비로 크롭 비율을 저장한다', () => {
    const editor = makeEditor();
    flushFrames();
    const [container] = containers(editor);
    container.querySelector('img')!.click();
    pointer(control(container, '1번 이미지 se 크기 조절'), 'pointerdown');
    pointer(document, 'pointermove', { clientX: 500, clientY: 100 });
    expect(container.querySelector<HTMLElement>('.image-carousel-slide')!.style.flexBasis).toBe(
      '100.0%',
    );
    expect(container.querySelector('img')!.style.height).toBe('300px');
    pointer(document, 'pointerup', { clientX: 500, clientY: 100 });
    flushFrames();
    expect(editor.state.doc.firstChild!.attrs.images[0]).toMatchObject({
      width: '100.0%',
      height: 'ratio:1.3333',
    });
    expect(parseFloat(container.querySelector('img')!.style.aspectRatio)).toBe(1.3333);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.firstChild!.attrs.images[0]).toMatchObject({
      width: '90%',
      height: 'auto',
    });
  });

  it('스와이프 후 클릭은 선택하지 않고 다음 탭과 키보드로 선택할 수 있다', () => {
    const editor = makeEditor();
    const [container] = containers(editor);
    const image = container.querySelector('img')!;
    pointer(image, 'pointerdown', { pointerType: 'touch' });
    pointer(image, 'pointermove', { pointerType: 'touch', clientX: 30 });
    image.click();
    expect(image.parentElement!.classList.contains('image-resize-frame')).toBe(false);
    pointer(image, 'pointerdown', { pointerType: 'touch' });
    image.click();
    expect(image.parentElement!.classList.contains('image-resize-frame')).toBe(true);
    const next = container.querySelectorAll('img')[1];
    next.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(next.parentElement!.classList.contains('image-resize-frame')).toBe(true);
  });

  it('Escape는 미저장 크기와 스냅 안내를 복원하고 늦은 pointerup을 무시한다', () => {
    const editor = makeEditor();
    flushFrames();
    const [container] = containers(editor);
    const image = container.querySelector('img')!;
    const original = image.style.cssText;
    image.click();
    pointer(control(container, '1번 이미지 se 크기 조절'), 'pointerdown');
    pointer(document, 'pointermove', { clientX: 5, clientY: 5 });
    expect(container.querySelector('.image-carousel-snap-guide')).not.toBeNull();
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    pointer(document, 'pointerup', { clientX: 100, clientY: 100 });
    expect(container.querySelector('.image-carousel-snap-guide')).toBeNull();
    expect(image.style.cssText).toBe(original);
    expect(editor.state.doc.firstChild!.attrs.images[0].width).toBe('90%');
  });

  it('종료하면 예약된 화면 갱신을 해제한다', () => {
    const editor = makeEditor();
    const [container] = containers(editor);
    const slide = container.querySelector<HTMLElement>('.image-carousel-slide')!;
    pointer(slide, 'pointerdown', { pointerType: 'touch' });
    editor.destroy();
    vi.advanceTimersByTime(600);
    flushFrames();
    expect(slide.dataset.resizing).toBe('false');
    expect(frames.size).toBe(0);
  });
});
