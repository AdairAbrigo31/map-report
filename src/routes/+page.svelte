<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import {
    initializeLeaflet,
    createMap,
    updateMapWithGeoJSON,
    paintMapWithGeoJSON,
  } from "$lib/services/mapService";
  import loadCountryData from "$lib/services/dataService";
  import MutiRange from "../lib/components/multi_range.svelte";
  import Papa from "papaparse";
  import type { ChangeEvent } from "$lib/interfaces/IChangeEvent";

  // Estado del componente
  let countries: Array<string> = ["Ecuador", "Italia"];
  let countrieSelect = countries[0];
  let mapLevel: "provincias" | "cantones" = "cantones";
  let fileInput: HTMLInputElement;
  let filecsv: File | null;
  let dataCSV: any = null;
  let isLoading = false;
  let loadingMessage = "";
  let error: string | null = null;

  // Variables del mapa
  let L: any = null;
  let map: any = null;
  let popup: any = null;
  let geoJsonLayer: any = null;
  let minValueCSV: number;
  let maxValueCSV: number;

  // Capturar los cambios del multi-range
  let filters: ChangeEvent;

  // Reactive statements
  $: if (filecsv) {
    processCSVFile(filecsv);
  }

  $: if (countrieSelect && L && map) {
    handleCountryChange(countrieSelect);
  }

  function setLoading(loading: boolean, message: string = "") {
    isLoading = loading;
    loadingMessage = message;
  }

  function processCSVFile(file: File) {
    setLoading(true, "Procesando archivo CSV...");

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: function (results) {
        try {
          if (results.errors.length > 0 || results.data.length === 0) {
            filecsv = null;
            showErrorModal(
              "Error",
              "Hubo un error al procesar el archivo CSV. Por favor, verifica el formato, recuerda que debe tener un encabezado con minimo dos campos, ademas claro de tener data.",
            );
            return;
          }

          let firstElement: any = results.data[0];
          if (
            firstElement["Total"] === undefined ||
            firstElement["Total"] === null
          ) {
            filecsv = null;
            showErrorModal(
              "Error",
              "La columna 'Total' es obligatoria en su csv y debe ser un valor numérico",
            );
            return;
          }

          dataCSV = results.data;
          minValueCSV = Math.min(
            ...dataCSV.map((item: any) => item["Total"] || 0),
          );
          maxValueCSV = Math.max(
            ...dataCSV.map((item: any) => item["Total"] || 0),
          );
          console.log(dataCSV);
        } finally {
          setLoading(false);
        }
      },
    });
  }

  async function handleCountryChange(country: string) {
    setLoading(true, `Cargando mapa de ${country}...`);
    error = null;
    filecsv = null; // Limpiar archivo CSV al cambiar de país
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
      setLoading(false);
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

  function applyFilters() {
    console.log("Aplicando filtros", filters);
    setLoading(true, "Aplicando filtros al mapa...");
    error = null;

    try {
      geoJsonLayer = paintMapWithGeoJSON(
        L,
        map,
        geoJsonLayer,
        popup,
        dataCSV,
        filters,
      );
    } catch (err) {
      error = err instanceof Error ? err.message : "Error desconocido";
    } finally {
      setLoading(false);
    }
  }

  onMount(async () => {
    if (browser) {
      setLoading(true, "Inicializando mapa...");
      try {
        L = await initializeLeaflet();
        const mapData = createMap(L, "map");
        map = mapData.map;
        popup = mapData.popup;

        await handleCountryChange("ecuador");
      } finally {
        setLoading(false);
      }
    }
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  function showErrorModal(title: string, message: string) {
    setLoading(false); // Asegurar que se oculte el loading

    const modalTitle = document.getElementById("modalErrorLabel");
    const modalBody = document.querySelector("#modalError .modal-body");

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = message;

    if (typeof (window as any).bootstrap !== "undefined") {
      const modal = new (window as any).bootstrap.Modal(
        document.getElementById("modalError"),
      );
      modal.show();
    } else {
      console.error("Bootstrap no está disponible");
    }
  }
</script>

<main class="m-3 position-relative">
  <!-- Loading Overlay - Cubre toda la pantalla -->
  {#if isLoading}
    <div class="loading-overlay">
      <div class="loading-content">
        <div
          class="spinner-border text-primary"
          role="status"
          style="width: 3rem; height: 3rem;"
        >
          <span class="visually-hidden">Loading...</span>
        </div>
        {#if loadingMessage}
          <p class="mt-3 mb-0 text-primary fw-bold">{loadingMessage}</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Modal de Error -->
  <div
    class="modal fade"
    id="modalError"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
    tabindex="-1"
    aria-labelledby="modalErrorLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header bg-danger">
          <h1 class="modal-title fs-5 text-white" id="modalErrorLabel">
            Modal title
          </h1>
          <button
            type="button"
            class="btn-close btn-close-white"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">...</div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal">Cerrar</button
          >
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal"
            >Entendido</button
          >
        </div>
      </div>
    </div>
  </div>

  <h2>
    Bienvenido, aquí podrás realizar tus reportes usando mapas de distintos
    países
  </h2>

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
          disabled={isLoading}
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
          disabled={isLoading}
        />
        <label class="form-check-label" for="cantones">Cantones</label>
      </div>
    </div>
  </div>

  <div class="row mt-3 mb-3">
    <div class="col-8" id="map" style="height: 100vh">
      <!-- El mapa se renderiza aquí -->
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
        disabled={isLoading}
      />

      {#if filecsv && minValueCSV !== undefined && maxValueCSV !== undefined}
        <div class="container-filters">
          <MutiRange
            min={minValueCSV}
            max={maxValueCSV}
            onchange={(e) => (filters = e)}
          />
        </div>
      {/if}

      {#if filecsv}
        <button
          type="button"
          class="btn btn-primary btn-lg"
          on:click={() => applyFilters()}
          disabled={isLoading}>Aplicar filtros</button
        >
      {/if}

      {#if error}
        <div class="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .loading-content p {
    font-size: 1.1rem;
    max-width: 300px;
  }

  /* Hacer que el main tenga position relative para que el overlay funcione */
  main {
    position: relative;
    min-height: 100vh;
  }
</style>
