<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import * as topojson from "topojson-client";

    let countries: Array<string> = ["Ecuador", "Italia"];
    let countrieSelect = countries[0];
    let fileInput: HTMLInputElement;
    let filecsv: File | null;
    let geoJsonData: any = null;
    let L: any = null;
    let map: any = null;
    let geoJsonLayer: any = null;

    var popup: any = null;

    $: if (filecsv) {
        console.log(filecsv.name);
    }

    $: if (countrieSelect && L && map) {
        loadCountryData(countrieSelect);
    }

    function updateMapWithGeoJSON(data: any) {
        if (!map || !L || !data) return;

        // Remover capa anterior si existe
        if (geoJsonLayer) {
            map.removeLayer(geoJsonLayer);
        }

        // Agregar nueva capa
        geoJsonLayer = L.geoJSON(data, {
            onEachFeature: (feature: any, layer: any) => {
                layer.on("click", (e: any) => {
                    console.log("Feature clicked:", feature);
                    popup
                        .setLatLng(e.latlng)
                        .setContent(feature.properties.name || "Sin nombre")
                        .openOn(map);
                });
            },
        }).addTo(map);
        map.fitBounds(geoJsonLayer.getBounds());
    }

    // Función para convertir TopoJSON a GeoJSON
    function convertTopoJSONToGeoJSON(topoData: any): any {
        // Obtener la primera clave del objeto objects (normalmente será el nombre del layer)
        const objectKeys = Object.keys(topoData.objects);
        if (objectKeys.length === 0) {
            throw new Error("No objects found in TopoJSON");
        }

        // Usar la primera clave disponible
        const objectKey = objectKeys[0];
        return topojson.feature(topoData, topoData.objects[objectKey]);
    }

    async function loadCountryData(country: string) {
        try {
            let response = await fetch(
                `/topojson/${country.toLowerCase()}.topojson`,
            );

            const data = await response.json();

            geoJsonData = convertTopoJSONToGeoJSON(data);

            if (map && L) {
                updateMapWithGeoJSON(geoJsonData);
            }
        } catch (error) {
            console.error("Error loading map data:", error);
        }
    }

    onMount(async () => {
        if (browser) {
            L = await import("leaflet");

            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                iconUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                shadowUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            });

            map = L.map("map").setView([0, 0], 10);
            popup = L.popup();

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
            }).addTo(map);

            await loadCountryData("ecuador");
        }
    });

    function updateFile() {
        console.log(fileInput.files);
        filecsv = fileInput?.files?.[0] || null;
    }
</script>

<main class="m-3">
    <h2>
        Bienvenido, aquí podrás realizar tus reportes usando mapas de distintos
        países
    </h2>
    <select class="form-select" bind:value={countrieSelect}>
        {#each countries as value}
            <option {value}> {value} </option>
        {/each}
    </select>
    <div class="row mt-3 mb-3">
        <div class="col-8" id="map" style="height: 100vh">Mapa</div>

        <div class="col container">
            <label for="form-label" class="form-label"
                >Cargue su archivo csv siguiendo el formato indicado</label
            >
            <input
                class="form-control"
                type="file"
                id="formFile"
                accept=".topojson,.topojson"
                bind:this={fileInput}
                on:input={updateFile}
            />
        </div>
    </div>
</main>
