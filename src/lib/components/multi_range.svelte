<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { onMount, tick } from "svelte";
  import { browser } from "$app/environment";

  // Types
  interface ChangeEvent {
    type: "thumbMoved" | "thumbsReset" | "colorChanged";
    thumbCount: number;
    values: number[];
    colors: string[];
    ranges: RangeData[];
    movedIndex?: number;
  }

  interface RangeData {
    min: number;
    max: number;
    color: string;
  }

  interface DragState {
    activeThumbIndex: number | null;
    isDragging: boolean;
    startValue: number | null;
    startX: number | null;
  }

  // Props
  export let min: number = 0;
  export let max: number = 100;
  export let initialThumbCount: number = 1;
  export let id: string | null = null;
  export let onchange: ((event: ChangeEvent) => void) | undefined = undefined;

  // State
  let thumbCount: number = initialThumbCount;
  let values: number[] = [];
  let colors: string[] = [];
  let ranges: RangeData[] = [];
  let thumbHover: boolean[] = [];
  let keydownAcceleration: number = 0;
  let accelerationTimer: ReturnType<typeof setTimeout> | null = null;
  let showColorPicker: number | null = null;

  // Node Bindings
  let container: HTMLDivElement;
  let element: HTMLDivElement;

  // Internal State
  let elementX: number = 0;
  let dragState: DragState = {
    activeThumbIndex: null,
    isDragging: false,
    startValue: null,
    startX: null,
  };

  let mouseEventShield: HTMLDivElement | null = null;

  // Color palette for random assignment
  const colorPalette = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FECA57",
    "#FF9FF3",
    "#54A0FF",
    "#5F27CD",
    "#00D2D3",
    "#FF9F43",
    "#EE5A24",
    "#009432",
    "#0652DD",
    "#9980FA",
    "#833471",
    "#F79F1F",
    "#A3CB38",
    "#1289A7",
    "#D63031",
    "#74B9FF",
  ];

  // Generate random color
  function getRandomColor(): string {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  }

  // Generate colors array based on thumb count
  function generateColors(count: number): string[] {
    const rangeCount = count + 1; // Always one more range than thumbs
    return Array.from({ length: rangeCount }, () => getRandomColor());
  }

  // Calculate ranges from values and colors
  function calculateRanges(): void {
    const newRanges: RangeData[] = [];

    for (let i = 0; i <= values.length; i++) {
      const rangeMin = i === 0 ? min : values[i - 1] + 1;
      const rangeMax = i === values.length ? max : values[i];

      newRanges.push({
        min: rangeMin,
        max: rangeMax,
        color: colors[i] || getRandomColor(),
      });
    }

    ranges = newRanges;
    console.log("Ranges calculated:", ranges);
  }

  // Reactive calculations
  $: if (element && browser) {
    elementX = element.getBoundingClientRect().left;
  }

  $: progressSegmentStyles =
    values.length > 1
      ? values
          .slice(0, -1)
          .map((startValue, i) =>
            calculateSegmentPosition(startValue, values[i + 1]),
          )
      : [];

  // Initialize values based on thumb count
  function calculateDefaultValues(count: number): number[] {
    if (count === 1) return [(min + max) / 2];

    const step = (max - min) / (count + 1);
    return Array.from({ length: count }, (_, i) => min + step * (i + 1));
  }

  async function resetComponentState(): Promise<void> {
    values = calculateDefaultValues(thumbCount);
    colors = generateColors(thumbCount);
    thumbHover = new Array(thumbCount).fill(false);

    await tick();
    calculateRanges();
    notifyParent("thumbsReset");
  }

  function notifyParent(
    type: "thumbMoved" | "thumbsReset" | "colorChanged",
    movedIndex?: number,
  ): void {
    onchange?.({
      type,
      thumbCount,
      values: values.slice(),
      colors: colors.slice(),
      ranges: ranges.slice(),
      movedIndex,
    });
  }

  function getValidValue(thumbIndex: number, newValue: number): number {
    const leftBound = thumbIndex === 0 ? min : values[thumbIndex - 1] + 1;
    const rightBound =
      thumbIndex === values.length - 1 ? max - 1 : values[thumbIndex + 1] - 1; // ← CAMBIAR max por max - 1
    return Math.max(leftBound, Math.min(rightBound, newValue));
  }

  function setValue(thumbIndex: number, val: number): void {
    const validValue = getValidValue(thumbIndex, val);
    if (values[thumbIndex] !== validValue) {
      values[thumbIndex] = validValue;
      values = [...values];
      calculateRanges();
      notifyParent("thumbMoved", thumbIndex);
    }
  }

  function setColor(rangeIndex: number, color: string): void {
    colors[rangeIndex] = color;
    colors = [...colors];
    showColorPicker = null;
    calculateRanges(); // ← ¡ESTA LÍNEA FALTA!
    notifyParent("colorChanged");
  }

  function calculatePosition(value: number): number {
    if (!container) return 0;
    const percent = ((value - min) * 100) / (max - min);
    return (container.clientWidth - 10) * (percent / 100) + 5;
  }

  function calculateSegmentPosition(startValue: number, endValue: number) {
    const startPercent = ((startValue - min) * 100) / (max - min);
    const endPercent = ((endValue - min) * 100) / (max - min);
    return {
      left: `${startPercent}%`,
      width: `${endPercent - startPercent}%`,
    };
  }

  function calculateNewValue(clientX: number, thumbIndex: number): void {
    if (!container) return;

    const delta = clientX - (elementX + 10);
    const percent = Math.max(
      0,
      Math.min(100, (delta * 100) / (container.clientWidth - 10)),
    );
    const newValue = Math.round((percent * (max - min)) / 100) + min;

    setValue(thumbIndex, newValue);
  }

  function getClientX(e: MouseEvent | TouchEvent): number {
    return e.type.startsWith("touch")
      ? (e as TouchEvent).touches[0].clientX
      : (e as MouseEvent).clientX;
  }

  // Event Handlers
  function onDragStart(e: MouseEvent | TouchEvent, thumbIndex: number): void {
    if (e.type === "mousedown" && mouseEventShield && browser) {
      document.body.append(mouseEventShield);
    }

    dragState = {
      activeThumbIndex: thumbIndex,
      isDragging: true,
      startValue: values[thumbIndex],
      startX: getClientX(e),
    };
  }

  function onDragEnd(e: MouseEvent | TouchEvent): void {
    if (
      e.type === "mouseup" &&
      browser &&
      mouseEventShield &&
      document.body.contains(mouseEventShield)
    ) {
      document.body.removeChild(mouseEventShield);
    }

    dragState = {
      activeThumbIndex: null,
      isDragging: false,
      startValue: null,
      startX: null,
    };
  }

  function onKeyPress(e: KeyboardEvent): void {
    if (dragState.activeThumbIndex === null) return;

    const isIncrement = e.key === "ArrowUp" || e.key === "ArrowRight";
    const isDecrement = e.key === "ArrowDown" || e.key === "ArrowLeft";

    if (!isIncrement && !isDecrement) return;

    keydownAcceleration = Math.min(keydownAcceleration + 1, 50);
    const throttled = Math.ceil(keydownAcceleration / 5);
    const activeIndex = dragState.activeThumbIndex;
    const delta = isIncrement ? throttled : -throttled;

    setValue(activeIndex, values[activeIndex] + delta);

    if (accelerationTimer) clearTimeout(accelerationTimer);
    accelerationTimer = setTimeout(() => (keydownAcceleration = 0), 100);
  }

  function updateValueOnEvent(e: MouseEvent | TouchEvent): boolean {
    if (!dragState.isDragging || dragState.activeThumbIndex === null)
      return false;

    e.stopPropagation?.();
    e.preventDefault?.();

    calculateNewValue(getClientX(e), dragState.activeThumbIndex);
    return true;
  }

  function resizeWindow(): void {
    if (element) {
      elementX = element.getBoundingClientRect().left;
    }
  }

  function toggleColorPicker(rangeIndex: number): void {
    console.log(rangeIndex);
    showColorPicker = showColorPicker === rangeIndex ? null : rangeIndex;
  }

  // Public API
  export function addThumb(): void {
    if (dragState.isDragging) return;
    thumbCount++;
    resetComponentState();
  }

  export function removeThumb(): void {
    if (dragState.isDragging) return;
    thumbCount = Math.max(1, thumbCount - 1);
    resetComponentState();
  }

  // Initialize component
  onMount(() => {
    if (browser) {
      mouseEventShield = document.createElement("div");
      mouseEventShield.className = "mouse-over-shield";
      mouseEventShield.addEventListener("mouseover", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    resetComponentState();
  });
</script>

<svelte:window
  on:touchmove|nonpassive={updateValueOnEvent}
  on:touchcancel={onDragEnd}
  on:touchend={onDragEnd}
  on:mousemove={updateValueOnEvent}
  on:mouseup={onDragEnd}
  on:resize={resizeWindow}
  on:click={(e) => {
    const target = e.target as Element;
    if (target?.closest(".range__color-picker")) {
      showColorPicker = null;
    }
  }}
/>

<div class="range">
  <div class="range__controls">
    <button
      class="range__button"
      on:click={addThumb}
      disabled={dragState.isDragging}
      title="Add delimiter"
      aria-label="Add delimiter"
    >
      +
    </button>
    <button
      class="range__button"
      on:click={removeThumb}
      disabled={dragState.isDragging || thumbCount <= 1}
      title="Remove delimiter"
      aria-label="Remove delimiter"
    >
      −
    </button>
    <span class="range__count" aria-live="polite">
      Delimitadores: {thumbCount}
    </span>
  </div>

  <div
    class="range__wrapper"
    tabindex="0"
    on:keydown={onKeyPress}
    bind:this={element}
    role="application"
    aria-label="Multi-range slider with {thumbCount} delimiter{thumbCount === 1
      ? ''
      : 's'}"
    {id}
  >
    <div class="range__track" bind:this={container}>
      <!-- Progress segments between thumbs -->
      {#each ranges as range, index (index)}
        <div
          class="range__track--segment"
          style="left: {((range.min - min) * 100) / (max - min)}%; 
           width: {((range.max - range.min) * 100) / (max - min)}%; 
           background-color: {range.color};"
        ></div>
      {/each}

      <!-- Thumbs -->
      {#each values as value, index (index)}
        <div
          class="range__thumb"
          class:range__thumb--holding={dragState.activeThumbIndex === index}
          style="left: {calculatePosition(value)}px"
          role="slider"
          tabindex="0"
          aria-valuemin={index === 0 ? min : values[index - 1] + 1}
          aria-valuemax={index === values.length - 1
            ? max
            : values[index + 1] - 1}
          aria-valuenow={value}
          aria-label="Range delimiter {index + 1}, value {Math.round(value)}"
          on:touchstart={(e) => onDragStart(e, index)}
          on:mousedown={(e) => onDragStart(e, index)}
          on:mouseover={() => (thumbHover[index] = true)}
          on:mouseout={() => (thumbHover[index] = false)}
          on:focus={() => (thumbHover[index] = true)}
          on:blur={() => (thumbHover[index] = false)}
          transition:fly={{ duration: 300, y: -10 }}
        >
          {#if dragState.activeThumbIndex === index || thumbHover[index]}
            <div
              class="range__tooltip"
              in:fly={{ y: 7, duration: 200 }}
              out:fade={{ duration: 100 }}
            >
              {Math.round(value)}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Range Summary -->
  <div class="range__summary">
    <h4 class="range__summary-title">Color Ranges:</h4>
    {#each ranges as range, index (index)}
      <div class="range__summary-item">
        <div
          class="range__color-preview"
          style="background-color: {range.color}"
          on:click={() => toggleColorPicker(index)}
          title="Click to change color"
        ></div>
        <span class="range__summary-text">
          {Math.round(range.min)} - {Math.round(range.max)}
        </span>

        <!-- Color Picker -->
        {#if showColorPicker === index}
          <div
            class="range__color-picker"
            transition:fly={{ duration: 200, y: -10 }}
          >
            <div class="range__color-grid">
              {#each colorPalette as color}
                <div
                  class="range__color-option"
                  style="background-color: {color}"
                  class:range__color-option--selected={range.color === color}
                  on:click={() => setColor(index, color)}
                ></div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<svelte:head>
  <style>
    .mouse-over-shield {
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: transparent;
      z-index: 10000;
      cursor: grabbing;
    }
  </style>
</svelte:head>

<style>
  .range {
    position: relative;
    width: 100%;
    padding: 1rem;
  }

  .range__controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .range__button {
    width: 32px;
    height: 32px;
    border: 1px solid var(--button-border, #d0d0d0);
    background: var(--button-bg, white);
    color: var(--button-text, #333);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    transition: all 0.2s ease;
  }

  .range__button:hover:not(:disabled) {
    background: var(--button-hover-bg, #f5f5f5);
    border-color: var(--button-hover-border, #999);
  }

  .range__button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .range__count {
    color: var(--text-muted, #666);
    font-weight: 500;
  }

  .range__wrapper {
    min-width: 100%;
    position: relative;
    padding: 0.5rem;
    box-sizing: border-box;
    outline: none;
  }

  .range__wrapper:focus-visible > .range__track {
    box-shadow:
      0 0 0 2px white,
      0 0 0 3px var(--track-focus, #6185ff);
  }

  .range__track {
    height: 6px;
    background-color: var(--track-bgcolor, #d0d0d0);
    border-radius: 999px;
    position: relative;
  }

  .range__track--segment {
    /*
    background: var(
      --track-highlight-bg,
      linear-gradient(90deg, #6185ff, #9c65ff)
    );
    */
    height: 6px;
    position: absolute;
    border-radius: 999px;
    top: 0;
  }

  .range__thumb {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    width: 20px;
    height: 20px;
    background-color: var(--thumb-bgcolor, white);
    cursor: grab;
    border-radius: 999px;
    margin-top: -8px;
    margin-left: -10px;
    transition: box-shadow 100ms;
    user-select: none;
    box-shadow: var(
      --thumb-boxshadow,
      0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 0px 2px 1px rgba(0, 0, 0, 0.2)
    );
    z-index: 10;
  }

  .range__thumb:active,
  .range__thumb--holding {
    cursor: grabbing;
    box-shadow:
      0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 1px 2px 1px rgba(0, 0, 0, 0.2),
      0 0 0 6px var(--thumb-holding-outline, rgba(113, 119, 250, 0.3));
  }

  .range__tooltip {
    pointer-events: none;
    position: absolute;
    top: -33px;
    color: var(--tooltip-text, white);
    width: 38px;
    padding: 4px 0;
    border-radius: 4px;
    text-align: center;
    background: var(--tooltip-bg, linear-gradient(45deg, #6185ff, #9c65ff));
    font-size: 12px;
    font-weight: 500;
  }

  .range__tooltip::after {
    content: "";
    display: block;
    position: absolute;
    height: 7px;
    width: 7px;
    background-color: var(--tooltip-bgcolor, #6185ff);
    bottom: -3px;
    left: calc(50% - 3px);
    clip-path: polygon(0% 0%, 100% 100%, 0% 100%);
    transform: rotate(-45deg);
    border-radius: 0 0 0 3px;
  }

  /* New styles for color functionality */
  .range__summary {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--summary-bg, #f8f9fa);
    border-radius: 8px;
    border: 1px solid var(--summary-border, #e9ecef);
  }

  .range__summary-title {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .range__summary-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    position: relative;
  }

  .range__color-preview {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid var(--color-preview-border, #fff);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;
  }

  .range__color-preview:hover {
    transform: scale(1.1);
  }

  .range__summary-text {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    font-weight: 500;
    min-width: 80px;
  }

  .range__color-picker {
    position: absolute;
    top: 30px;
    left: 0;
    z-index: 1000;
    background: white;
    border: 1px solid var(--picker-border, #ddd);
    border-radius: 8px;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .range__color-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
    width: 140px;
  }

  .range__color-option {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .range__color-option:hover {
    transform: scale(1.1);
    border-color: var(--color-option-hover, #333);
  }

  .range__color-option--selected {
    border-color: var(--color-option-selected, #333);
    transform: scale(1.05);
  }
</style>
