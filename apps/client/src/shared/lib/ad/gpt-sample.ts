import type { AdvertisementPlacement } from '@/shared/constants/ad';

const googlePublisherTagScriptId = 'google-publisher-tag-preview-script';
const googlePublisherTagScriptSource = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';

type GooglePublisherTagSize = [number, number] | 'fluid';

type GooglePublisherTagSlotRenderEndedEvent = {
  isEmpty: boolean;
  slot: GooglePublisherTagSlot;
};

type GooglePublisherTagService = {
  addEventListener: (
    eventName: 'slotRenderEnded',
    listener: (event: GooglePublisherTagSlotRenderEndedEvent) => void,
  ) => void;
  removeEventListener: (
    eventName: 'slotRenderEnded',
    listener: (event: GooglePublisherTagSlotRenderEndedEvent) => void,
  ) => void;
};

type GooglePublisherTagSlot = {
  addService: (service: GooglePublisherTagService) => GooglePublisherTagSlot;
};

type GooglePublisherTagApi = {
  apiReady?: boolean;
  cmd: Array<() => void>;
  defineSlot: (
    advertisementPath: string,
    size: GooglePublisherTagSize,
    elementId: string,
  ) => GooglePublisherTagSlot | null;
  pubads: () => GooglePublisherTagService;
  enableServices: () => void;
  display: (elementId: string) => void;
  destroySlots: (slots?: GooglePublisherTagSlot[]) => boolean;
};

type GooglePublisherTagBootstrap = Partial<Omit<GooglePublisherTagApi, 'cmd'>> & {
  cmd: Array<() => void>;
};

type GooglePublisherTagWindow = Window & {
  googletag?: GooglePublisherTagBootstrap;
};

type GooglePublisherTagSampleDefinition = {
  advertisementPath: string;
  size: GooglePublisherTagSize;
};

type PendingGooglePublisherTagDefinition = {
  container: HTMLElement;
  sampleElement: HTMLElement;
  placement: AdvertisementPlacement;
  resolve: () => void;
  reject: (error: unknown) => void;
};

const displayedContainers = new WeakSet<HTMLElement>();
const definedSlots = new WeakMap<HTMLElement, GooglePublisherTagSlot>();
const preparationPromises = new WeakMap<HTMLElement, Promise<void>>();
const slotRenderListeners = new WeakMap<
  HTMLElement,
  (event: GooglePublisherTagSlotRenderEndedEvent) => void
>();
let scriptLoadPromise: Promise<GooglePublisherTagApi> | null = null;
let servicesEnabled = false;
let sampleElementSequence = 0;
let definitionBatchScheduled = false;
const pendingDefinitions: PendingGooglePublisherTagDefinition[] = [];

const getGooglePublisherTagSampleDefinition = (
  placement: AdvertisementPlacement,
  container: HTMLElement,
): GooglePublisherTagSampleDefinition => {
  if (placement === 'postTop') {
    return {
      advertisementPath: '/6355419/Travel/Asia',
      size: [container.clientWidth || 300, container.clientHeight || 50],
    };
  }
  if (placement === 'sidebar') {
    return {
      advertisementPath: '/6355419/Travel/Europe/France/Paris',
      size: [300, 250],
    };
  }
  return { advertisementPath: '/6355419/Travel', size: 'fluid' };
};

const getGooglePublisherTagBootstrap = (): GooglePublisherTagBootstrap => {
  const googlePublisherTagWindow = window as GooglePublisherTagWindow;
  googlePublisherTagWindow.googletag ??= { cmd: [] };
  return googlePublisherTagWindow.googletag;
};

const getGooglePublisherTagApi = (): GooglePublisherTagApi => {
  const googlePublisherTagBootstrap = getGooglePublisherTagBootstrap();
  if (
    !googlePublisherTagBootstrap.defineSlot ||
    !googlePublisherTagBootstrap.pubads ||
    !googlePublisherTagBootstrap.enableServices ||
    !googlePublisherTagBootstrap.display ||
    !googlePublisherTagBootstrap.destroySlots
  ) {
    throw new Error('Google Publisher Tag preview API is unavailable');
  }
  return googlePublisherTagBootstrap as GooglePublisherTagApi;
};

const loadGooglePublisherTagScript = (): Promise<GooglePublisherTagApi> => {
  const googlePublisherTagBootstrap = getGooglePublisherTagBootstrap();
  if (googlePublisherTagBootstrap.apiReady) {
    return Promise.resolve(getGooglePublisherTagApi());
  }
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(
      googlePublisherTagScriptId,
    ) as HTMLScriptElement | null;
    const handleLoad = () => resolve(getGooglePublisherTagBootstrap() as GooglePublisherTagApi);
    const handleError = () =>
      reject(new Error('Google Publisher Tag preview script failed to load'));

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = googlePublisherTagScriptId;
    script.src = googlePublisherTagScriptSource;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

const showGooglePublisherTagSampleStatus = (
  sampleElement: HTMLElement,
  message: 'GPT TEST AD · NO FILL' | 'GPT TEST AD · LOAD FAILED',
): void => {
  sampleElement.className =
    'flex h-full min-h-[50px] w-full items-center justify-center bg-gray-100 text-caption1 font-semibold text-gray-500';
  sampleElement.textContent = message;
};

const flushGooglePublisherTagDefinitions = (googlePublisherTagApi: GooglePublisherTagApi): void => {
  definitionBatchScheduled = false;
  const definitions = pendingDefinitions.splice(0);
  googlePublisherTagApi.cmd.push(() => {
    let slotDefined = false;
    for (const definition of definitions) {
      if (!definition.container.isConnected) {
        definition.resolve();
        continue;
      }
      try {
        const sampleDefinition = getGooglePublisherTagSampleDefinition(
          definition.placement,
          definition.container,
        );
        const slot = googlePublisherTagApi.defineSlot(
          sampleDefinition.advertisementPath,
          sampleDefinition.size,
          definition.sampleElement.id,
        );
        if (!slot) {
          showGooglePublisherTagSampleStatus(definition.sampleElement, 'GPT TEST AD · LOAD FAILED');
          definition.reject(new Error('Google Publisher Tag preview slot definition failed'));
          continue;
        }
        const publisherTagService = googlePublisherTagApi.pubads();
        const slotRenderListener = (event: GooglePublisherTagSlotRenderEndedEvent): void => {
          if (event.slot === slot && event.isEmpty) {
            showGooglePublisherTagSampleStatus(definition.sampleElement, 'GPT TEST AD · NO FILL');
          }
        };
        publisherTagService.addEventListener('slotRenderEnded', slotRenderListener);
        slot.addService(publisherTagService);
        definedSlots.set(definition.container, slot);
        slotRenderListeners.set(definition.container, slotRenderListener);
        slotDefined = true;
        definition.resolve();
      } catch (error) {
        showGooglePublisherTagSampleStatus(definition.sampleElement, 'GPT TEST AD · LOAD FAILED');
        definition.reject(error);
      }
    }
    if (slotDefined && !servicesEnabled) {
      googlePublisherTagApi.enableServices();
      servicesEnabled = true;
    }
  });
};

const scheduleGooglePublisherTagDefinition = (
  googlePublisherTagApi: GooglePublisherTagApi,
  definition: PendingGooglePublisherTagDefinition,
): void => {
  pendingDefinitions.push(definition);
  if (definitionBatchScheduled) return;
  definitionBatchScheduled = true;
  queueMicrotask(() => flushGooglePublisherTagDefinitions(googlePublisherTagApi));
};

/** GPT 공개 샘플을 표시할 자식 요소를 생성한다. */
export const createGooglePublisherTagSampleElement = (
  placement: AdvertisementPlacement,
): HTMLDivElement => {
  sampleElementSequence++;
  const element = document.createElement('div');
  element.id = `gpt-sample-slot-${sampleElementSequence}`;
  element.className =
    placement === 'postTop' || placement === 'sidebar' ? 'h-full w-full' : 'min-h-[250px] w-full';
  element.dataset.googlePublisherTagSample = 'true';
  return element;
};

/** GPT 공개 샘플 슬롯을 등록하고 모든 초기 슬롯 정의 후 서비스를 활성화한다. */
export const prepareGooglePublisherTagSample = (
  container: HTMLElement,
  sampleElement: HTMLElement,
  placement: AdvertisementPlacement,
): Promise<void> => {
  const existingPreparation = preparationPromises.get(container);
  if (existingPreparation) return existingPreparation;

  const preparation = loadGooglePublisherTagScript()
    .then(
      (googlePublisherTagApi) =>
        new Promise<void>((resolve, reject) => {
          scheduleGooglePublisherTagDefinition(googlePublisherTagApi, {
            container,
            sampleElement,
            placement,
            resolve,
            reject,
          });
        }),
    )
    .catch((error: unknown) => {
      if (container.isConnected) {
        showGooglePublisherTagSampleStatus(sampleElement, 'GPT TEST AD · LOAD FAILED');
      }
      throw error;
    });
  preparationPromises.set(container, preparation);
  return preparation;
};

/** lazy 경계에 진입한 준비 완료 GPT 공개 샘플을 정확히 한 번 표시한다. */
export const displayGooglePublisherTagSample = async (
  container: HTMLElement,
  sampleElement: HTMLElement,
): Promise<void> => {
  if (displayedContainers.has(container)) return;
  displayedContainers.add(container);

  try {
    await preparationPromises.get(container);
    if (!container.isConnected || !definedSlots.has(container)) return;
    const googlePublisherTagApi = getGooglePublisherTagApi();
    googlePublisherTagApi.cmd.push(() => googlePublisherTagApi.display(sampleElement.id));
  } catch {
    return;
  }
};

/** DOM에서 제거된 예약 영역의 GPT 슬롯과 이벤트를 해제한다. */
export const destroyGooglePublisherTagSample = (container: HTMLElement): void => {
  const slot = definedSlots.get(container);
  if (slot) {
    const googlePublisherTagApi = getGooglePublisherTagApi();
    const slotRenderListener = slotRenderListeners.get(container);
    googlePublisherTagApi.cmd.push(() => {
      if (slotRenderListener) {
        googlePublisherTagApi.pubads().removeEventListener('slotRenderEnded', slotRenderListener);
      }
      googlePublisherTagApi.destroySlots([slot]);
    });
    definedSlots.delete(container);
    slotRenderListeners.delete(container);
  }
  displayedContainers.delete(container);
  preparationPromises.delete(container);
};
