<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";

    // Types
    interface ChangeEvent {
        type: "thumbMoved" | "thumbsReset";
        thumbCount: number;
        values: number[];
        movedIndex?: number;
    }

    // Props
    export let min: number = 0;
    export let max: number = 100;
    export let initialThumbCount: number = 1;
    export let id: string | null = null;

    // Callback en lugar de dispatcher
    export let onchange: ((event: ChangeEvent) => void) | undefined = undefined;

    // State
    let thumbCount: number = initialThumbCount;
    let values: number[] = [];

    // Node Bindings
    let container: HTMLDivElement | null = null;
    let thumbRefs: HTMLDivElement[] = [];
    let progressSegments: HTMLDivElement[] = [];
    let element: HTMLDivElement | null = null;

    // Internal State
    let elementX: number | null = null;
    let dragState = {
        activeThumbIndex: null as number | null,
        isDragging: false,
        startValue: null as number | null,
        startX: null as number | null,
    };
    let thumbHover: boolean[] = [];
    let keydownAcceleration: number = 0;
    let accelerationTimer: NodeJS.Timeout | null = null;
    let mouseEventShield: HTMLDivElement | null = null;

    // Initialize values based on thumb count
    function calculateDefaultValues(count: number): number[] {
        if (count === 1) {
            return [(min + max) / 2];
        }

        const step = (max - min) / (count + 1);
        return Array.from({ length: count }, (_, i) => min + step * (i + 1));
    }

    // Initialize component
    onMount(() => {
        if (browser) {
            mouseEventShield = document.createElement("div");
            mouseEventShield.setAttribute("class", "mouse-over-shield");
            mouseEventShield.addEventListener("mouseover", (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // Initialize values
        values = calculateDefaultValues(thumbCount);
        thumbHover = new Array(thumbCount).fill(false);
        notifyParent("thumbsReset");
    });

    function resizeWindow(): void {
        if (element) {
            elementX = element.getBoundingClientRect().left;
        }
    }

    function notifyParent(
        type: "thumbMoved" | "thumbsReset",
        movedIndex?: number,
    ): void {
        if (onchange) {
            onchange({
                type,
                thumbCount,
                values: [...values],
                movedIndex,
            });
        }
    }

    // Add thumb functionality
    export function addThumb(): void {
        if (dragState.isDragging) return; // Don't add during drag

        thumbCount++;
        values = calculateDefaultValues(thumbCount);
        thumbHover = new Array(thumbCount).fill(false);
        thumbRefs = [];
        progressSegments = [];
        notifyParent("thumbsReset");
    }

    // Remove thumb functionality
    export function removeThumb(): void {
        if (dragState.isDragging) return; // Don't remove during drag

        if (thumbCount > 1) {
            thumbCount--;
        } else {
            thumbCount = 1;
        }

        values = calculateDefaultValues(thumbCount);
        thumbHover = new Array(thumbCount).fill(false);
        thumbRefs = [];
        progressSegments = [];
        notifyParent("thumbsReset");
    }

    function getValidValue(thumbIndex: number, newValue: number): number {
        const leftBound = thumbIndex === 0 ? min : values[thumbIndex - 1] + 1;
        const rightBound =
            thumbIndex === values.length - 1 ? max : values[thumbIndex + 1] - 1;

        return Math.max(leftBound, Math.min(rightBound, newValue));
    }

    function setValue(thumbIndex: number, val: number): void {
        const validValue = getValidValue(thumbIndex, val);
        if (values[thumbIndex] !== validValue) {
            values[thumbIndex] = validValue;
            values = [...values]; // Trigger reactivity
            notifyParent("thumbMoved", thumbIndex);
        }
    }

    function onDragStart(e: MouseEvent | TouchEvent, thumbIndex: number): void {
        if (e.type === "mousedown" && mouseEventShield && browser) {
            document.body.append(mouseEventShield);
        }

        dragState.activeThumbIndex = thumbIndex;
        dragState.isDragging = true;
        dragState.startValue = values[thumbIndex];
        dragState.startX =
            e.type === "touchstart"
                ? (e as TouchEvent).touches[0].clientX
                : (e as MouseEvent).clientX;
    }

    function onDragEnd(e: MouseEvent | TouchEvent): void {
        if (e.type === "mouseup" && browser) {
            if (mouseEventShield && document.body.contains(mouseEventShield)) {
                document.body.removeChild(mouseEventShield);
            }
        }

        dragState.activeThumbIndex = null;
        dragState.isDragging = false;
        dragState.startValue = null;
        dragState.startX = null;
    }

    function onKeyPress(e: KeyboardEvent): void {
        if (dragState.activeThumbIndex === null) return;

        if (keydownAcceleration < 50) keydownAcceleration++;
        const throttled: number = Math.ceil(keydownAcceleration / 5);
        const activeIndex = dragState.activeThumbIndex;

        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            setValue(activeIndex, values[activeIndex] + throttled);
        }
        if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            setValue(activeIndex, values[activeIndex] - throttled);
        }

        if (accelerationTimer) clearTimeout(accelerationTimer);
        accelerationTimer = setTimeout(() => (keydownAcceleration = 1), 100);
    }

    function calculateNewValue(clientX: number, thumbIndex: number): void {
        if (!container || elementX === null) return;

        const delta: number = clientX - (elementX + 10);
        let percent: number = (delta * 100) / (container.clientWidth - 10);

        percent = percent < 0 ? 0 : percent > 100 ? 100 : percent;
        const newValue =
            parseInt(((percent * (max - min)) / 100).toString()) + min;

        setValue(thumbIndex, newValue);
    }

    function updateValueOnEvent(e: MouseEvent | TouchEvent): boolean {
        if (dragState.activeThumbIndex === null || !dragState.isDragging)
            return false;

        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();

        const clientX: number =
            e.type === "touchmove" || e.type === "touchstart"
                ? (e as TouchEvent).touches[0].clientX
                : (e as MouseEvent).clientX;

        calculateNewValue(clientX, dragState.activeThumbIndex);
        return true;
    }

    function calculatePosition(value: number): number {
        if (!container) return 0;
        const percent = ((value - min) * 100) / (max - min);
        return (container.clientWidth - 10) * (percent / 100) + 5;
    }

    function calculateSegmentPosition(
        startValue: number,
        endValue: number,
    ): { left: string; width: string } {
        const startPercent = ((startValue - min) * 100) / (max - min);
        const endPercent = ((endValue - min) * 100) / (max - min);
        const width = endPercent - startPercent;

        return {
            left: `${startPercent}%`,
            width: `${width}%`,
        };
    }

    // React to left position of element relative to window
    $: if (element && browser) elementX = element.getBoundingClientRect().left;

    // Calculate progress segments
    $: progressSegmentStyles =
        values.length > 1
            ? (() => {
                  const segments = [];
                  for (let i = 0; i < values.length - 1; i++) {
                      segments.push(
                          calculateSegmentPosition(values[i], values[i + 1]),
                      );
                  }
                  return segments;
              })()
            : [];
</script>

<svelte:window
    on:touchmove|nonpassive={updateValueOnEvent}
    on:touchcancel={onDragEnd}
    on:touchend={onDragEnd}
    on:mousemove={updateValueOnEvent}
    on:mouseup={onDragEnd}
    on:resize={resizeWindow}
/>

<div class="range">
    <div class="range__controls">
        <button
            class="range__button"
            on:click={addThumb}
            disabled={dragState.isDragging}
            title="Add delimiter"
        >
            +
        </button>
        <button
            class="range__button"
            on:click={removeThumb}
            disabled={dragState.isDragging || thumbCount <= 1}
            title="Remove delimiter"
        >
            −
        </button>
        <span class="range__count">Delimiters: {thumbCount}</span>
    </div>

    <div
        class="range__wrapper"
        tabindex="0"
        on:keydown={onKeyPress}
        bind:this={element}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label="Multi-range slider"
        {id}
    >
        <div class="range__track" bind:this={container}>
            <!-- Progress segments between thumbs -->
            {#each progressSegmentStyles as segment, index}
                <div
                    class="range__track--segment"
                    style="left: {segment.left}; width: {segment.width};"
                    bind:this={progressSegments[index]}
                />
            {/each}

            <!-- Thumbs -->
            {#each values as value, index (index)}
                <div
                    class="range__thumb"
                    class:range__thumb--holding={dragState.activeThumbIndex ===
                        index}
                    style="left: {calculatePosition(value)}px"
                    data-thumb-index={index}
                    bind:this={thumbRefs[index]}
                    role="slider"
                    tabindex="0"
                    aria-valuemin={index === 0 ? min : values[index - 1] + 1}
                    aria-valuemax={index === values.length - 1
                        ? max
                        : values[index + 1] - 1}
                    aria-valuenow={value}
                    aria-label="Range delimiter {index + 1}"
                    on:touchstart={(e) => onDragStart(e, index)}
                    on:mousedown={(e) => onDragStart(e, index)}
                    on:mouseover={() => (thumbHover[index] = true)}
                    on:mouseout={() => (thumbHover[index] = false)}
                    on:focus={() => (thumbHover[index] = true)}
                    on:blur={() => (thumbHover[index] = false)}
                    transition:fly={{ duration: 300, y: -10 }}
                >
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
</div>

<svelte:head>
    <style>
        .mouse-over-shield {
            position: fixed;
            top: 0px;
            left: 0px;
            height: 100%;
            width: 100%;
            background-color: rgba(255, 0, 0, 0);
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
        background-color: var(--track-highlight-bgcolor, #6185ff);
        background: var(
            --track-highlight-bg,
            linear-gradient(90deg, #6185ff, #9c65ff)
        );
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
        background-color: var(--tooltip-bgcolor, #6185ff);
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
</style>
