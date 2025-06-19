<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import {
    initializeLeaflet,
    createMap,
    updateMapWithGeoJSON,
  } from "$lib/services/mapService";
  //import { processCSVFile } from "$lib/auxiliars";
  import loadCountryData from "$lib/services/dataService";
  import MutiRange from "../lib/components/multi_range.svelte";
  import Papa from "papaparse";

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

  function processCSVFile(file: File) {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: function (results) {
        console.log(results);
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
        }
      },
    });
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

  function applyFilters() {
    console.log("APlicando filtros");
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

  function showErrorModal(title: string, message: string) {
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

<main class="m-3">
  <!-- Modal -->
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
          <h1 class="modal-title fs-5" id="modalErrorLabel">Modal title</h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">...</div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal">Close</button
          >
          <button type="button" class="btn btn-primary">Understood</button>
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

      {#if filecsv}
        <div class="container-filters">
          <MutiRange min={0} max={100} onchange={(e) => console.log(e)} />
        </div>
      {/if}

      {#if filecsv}
        <button
          type="button"
          class="btn btn-primary btn-lg"
          on:click={applyFilters}>Aplicar filtros</button
        >
      {/if}
    </div>
  </div>
</main>
