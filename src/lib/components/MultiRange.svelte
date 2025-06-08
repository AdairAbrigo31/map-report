<script lang="ts">
    import { onMount } from "svelte";
    import { fly, fade } from "svelte/transition";
    import { browser } from "$app/environment";

    // Props
    export let min: number = 0;
    export let max: number = 100;
    export let delimiterCount: number = 1;
    export let id: string | null = null;
    export let onchange: ((delimiters: number[]) => void) | undefined =
        undefined;

    // Initialize delimiters array based on delimiterCount
    let delimiters: number[] = [];

    // Initialize delimiters evenly distributed
    function initializeDelimiters() {
        delimiters = [];
        for (let i = 0; i < delimiterCount; i++) {
            const position =
                min + ((max - min) / (delimiterCount + 1)) * (i + 1);
            delimiters.push(Math.round(position));
        }
    }

    // Initialize on component mount and when delimiterCount changes
    $: if (delimiterCount > 0) initializeDelimiters();

    // Node Bindings
    let container: HTMLDivElement | null = null;
    let element: HTMLDivElement | null = null;
    let thumbs: HTMLDivElement[] = [];

    // Internal State
    let elementX: number | null = null;
    let currentThumbIndex: number | null = null;
    let holding: boolean = false;
    let thumbHovers: boolean[] = [];

    // Initialize hover states
    $: thumbHovers = new Array(delimiterCount).fill(false) as boolean[];

    // Mouse shield - only create in browser
    let mouseEventShield: HTMLDivElement | null = null;

    onMount(() => {
        if (browser) {
            mouseEventShield = document.createElement("div");
            mouseEventShield.setAttribute("class", "mouse-over-shield");
            mouseEventShield.addEventListener("mouseover", (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
    });

    function resizeWindow() {
        if (element) {
            elementX = element.getBoundingClientRect().left;
        }
    }

    function setValue(newDelimiters: number[]) {
        delimiters = [...newDelimiters];
        onchange?.(delimiters);
    }

    function onDragStart(e: MouseEvent | TouchEvent, index: number) {
        if (e.type === "mousedown" && mouseEventShield && browser) {
            document.body.append(mouseEventShield);
        }
        currentThumbIndex = index;
        holding = true;
    }

    function onDragEnd(e: MouseEvent | TouchEvent) {
        if (e.type === "mouseup" && mouseEventShield && browser) {
            if (document.body.contains(mouseEventShield)) {
                document.body.removeChild(mouseEventShield);
            }
        }
        currentThumbIndex = null;
        holding = false;
    }

    function onHover(index: number, isHover: boolean) {
        const newHovers = [...thumbHovers];
        newHovers[index] = isHover;
        thumbHovers = newHovers;
    }

    function calculateNewValue(clientX: number, delimiterIndex: number) {
        if (!container || !elementX) return;

        const delta = clientX - (elementX + 10);
        let percent = (delta * 100) / (container.clientWidth - 10);
        percent = percent < 0 ? 0 : percent > 100 ? 100 : percent;

        let newValue =
            parseInt(((percent * (max - min)) / 100).toString()) + min;

        // Apply constraints - delimiter cannot cross others
        if (delimiterIndex > 0 && newValue <= delimiters[delimiterIndex - 1]) {
            newValue = delimiters[delimiterIndex - 1] + 1;
        }
        if (
            delimiterIndex < delimiters.length - 1 &&
            newValue >= delimiters[delimiterIndex + 1]
        ) {
            newValue = delimiters[delimiterIndex + 1] - 1;
        }

        // Update the specific delimiter
        const newDelimiters = [...delimiters];
        newDelimiters[delimiterIndex] = newValue;
        setValue(newDelimiters);
    }

    function updateValueOnEvent(e: MouseEvent | TouchEvent) {
        if (currentThumbIndex === null) return false;

        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();

        const clientX =
            e.type === "touchmove" || e.type === "touchstart"
                ? (e as TouchEvent).touches[0].clientX
                : (e as MouseEvent).clientX;

        calculateNewValue(clientX, currentThumbIndex);
    }

    // React to left position of element relative to window
    $: if (element) elementX = element.getBoundingClientRect().left;

    // Update thumb positions
    $: if (container && thumbs.length === delimiterCount) {
        delimiters.forEach((value: number, index: number) => {
            if (thumbs[index]) {
                const percent = ((value - min) * 100) / (max - min);
                const offsetLeft =
                    (container!.clientWidth - 10) * (percent / 100) + 5;
                thumbs[index].style.left = `${offsetLeft}px`;
            }
        });
    }
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
    <div class="range__wrapper" bind:this={element} {id}>
        <div class="range__track" bind:this={container}>
            {#each delimiters as delimiter, index (index)}
                <div
                    class="range__thumb"
                    class:range__thumb--holding={holding &&
                        currentThumbIndex === index}
                    bind:this={thumbs[index]}
                    role="slider"
                    tabindex="0"
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={delimiter}
                    aria-label="Delimiter {index + 1}"
                    on:touchstart={(e) => onDragStart(e, index)}
                    on:mousedown={(e) => onDragStart(e, index)}
                    on:mouseover={() => onHover(index, true)}
                    on:mouseout={() => onHover(index, false)}
                    on:focus={() => onHover(index, true)}
                    on:blur={() => onHover(index, false)}
                >
                    {#if (holding && currentThumbIndex === index) || thumbHovers[index]}
                        <div
                            class="range__tooltip"
                            in:fly={{ y: 7, duration: 200 }}
                            out:fade={{ duration: 100 }}
                        >
                            {delimiter}
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
        flex: 1;
    }

    .range__wrapper {
        min-width: 100%;
        position: relative;
        padding: 0.5rem;
        box-sizing: border-box;
        outline: none;
    }

    .range__track {
        height: 6px;
        background-color: var(--track-bgcolor, #d0d0d0);
        border-radius: 999px;
        position: relative;
    }

    .range__thumb {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        width: 20px;
        height: 20px;
        background-color: var(--thumb-bgcolor, white);
        cursor: pointer;
        border-radius: 999px;
        margin-top: -8px;
        transition: box-shadow 100ms;
        user-select: none;
        box-shadow: var(
            --thumb-boxshadow,
            0 1px 1px 0 rgba(0, 0, 0, 0.14),
            0 0px 2px 1px rgba(0, 0, 0, 0.2)
        );
    }

    .range__thumb--holding {
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
