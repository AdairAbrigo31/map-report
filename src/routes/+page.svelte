<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import {
    initializeLeaflet,
    createMap,
    updateMapWithGeoJSON,
  } from "$lib/services/mapService";
  import { processCSVFile } from "$lib/auxiliars";
  import loadCountryData from "$lib/services/dataService";
  import MutiRange from "../lib/components/MultiRange.svelte";

  // Estado del componente
  let countries: Array<string> = ["Ecuador", "Italia"];
  let countrieSelect = countries[0];
  let mapLevel: "provincias" | "cantones" = "cantones";
  let fileInput: HTMLInputElement;
  let filecsv: File | null;
  let isLoading = false;
  let error: string | null = null;

  // Variables del mapa
  let L: any = null;
  let map: any = null;
  let popup: any = null;
  let geoJsonLayer: any = null;

  // Variables del filtro
  let delimiters = 1;

  // Reactive statements
  $: if (filecsv) {
    processCSVFile(filecsv);
  }

  $: if (countrieSelect && L && map) {
    handleCountryChange(countrieSelect);
  }

  async function handleCountryChange(country: string) {
    isLoading = true;
    error = null;

    try {
      const geoJsonData = await loadCountryData(country);
      geoJsonLayer = updateMapWithGeoJSON(
        L,
        map,
        geoJsonData,
        geoJsonLayer,
        popup,
      );
    } catch (err) {
      error = err instanceof Error ? err.message : "Error desconocido";
    } finally {
      isLoading = false;
    }
  }

  function updateFile() {
    const file = fileInput?.files?.[0];
    if (file && !file.name.endsWith(".csv")) {
      error = "Por favor selecciona un archivo CSV válido";
      return;
    }
    filecsv = file || null;
    error = null;
  }

  function addDelimiter() {
    delimiters += 1;
  }

  function removeDelimiter() {
    if (delimiters > 1) {
      delimiters -= 1;
    } else {
      error = "No se puede eliminar más delimitadores";
    }
  }

  onMount(async () => {
    if (browser) {
      L = await initializeLeaflet();
      const mapData = createMap(L, "map");
      map = mapData.map;
      popup = mapData.popup;

      await handleCountryChange("ecuador");
    }
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<main class="m-3">
  <h2>
    Bienvenido, aquí podrás realizar tus reportes usando mapas de distintos
    países
  </h2>

  {#if error}
    <div class="alert alert-danger">{error}</div>
  {/if}

  {#if true}
    <div class="container-filters row">
      <div class="col-10">
        <MutiRange
          min={0}
          max={100}
          on:change={(e) => console.log(e.detail.delimiters)}
        />
      </div>
      <div class="col-2">
        <button on:click={addDelimiter}> Agregar </button>
        {#if delimiters > 1}<button on:click={removeDelimiter}>
            Quitar
          </button>{/if}
      </div>
    </div>
  {/if}

  <div class="row">
    <select
      class="form-select col"
      bind:value={countrieSelect}
      disabled={isLoading}
    >
      {#each countries as value}
        <option {value}>{value}</option>
      {/each}
    </select>

    <div class="col col-lg-2">
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          bind:group={mapLevel}
          value="provincias"
          id="provincias"
        />
        <label class="form-check-label" for="provincias">Provincias</label>
      </div>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          bind:group={mapLevel}
          value="cantones"
          id="cantones"
        />
        <label class="form-check-label" for="cantones">Cantones</label>
      </div>
    </div>
  </div>

  <div class="row mt-3 mb-3">
    <div class="col-8" id="map" style="height: 100vh">
      {#if isLoading}
        <div class="d-flex justify-content-center align-items-center h-100">
          <div class="spinner-border" role="status"></div>
        </div>
      {:else}
        Mapa
      {/if}
    </div>

    <div class="col container">
      <label for="formFile" class="form-label">
        Cargue su archivo CSV siguiendo el formato indicado para poder usar los
        filtros
      </label>
      <input
        class="form-control"
        type="file"
        id="formFile"
        accept=".csv"
        bind:this={fileInput}
        on:input={updateFile}
      />
    </div>
  </div>
</main>
