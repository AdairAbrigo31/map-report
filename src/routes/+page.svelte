<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment"; // Solo si usas SvelteKit

    let countries: Array<string> = ["Ecuador", "Italia"];
    let countrieSelect = countries[0];
    let fileInput: HTMLInputElement;
    let filecsv: File | null;
    let geoJsonData: any = null;
    let L: any = null; // Variable para Leaflet
    let map: any = null;
    let geoJsonLayer: any = null;

    var popup: any = null;

    $: if (filecsv) {
        console.log(filecsv.name);
    }

    $: if (countrieSelect && L && map) {
        loadCountryGeojson(countrieSelect);
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

    function onMapClick(e: any) {
        console.log(e);
        popup
            .setLatLng(e.latlng)
            .setContent("You clicked the map at " + e.latlng.toString())
            .openOn(map);
    }

    async function loadCountryGeojson(country: string) {
        try {
            const response = await fetch(
                `/geojson/${country.toLowerCase()}.geojson`,
            );
            if (!response.ok)
                throw new Error("Tenemos problemas para cargar el mapa");
            geoJsonData = await response.json();

            if (map && L) {
                updateMapWithGeoJSON(geoJsonData);
            }
            console.log(geoJsonData);
        } catch (error) {}
    }

    onMount(async () => {
        // Solo ejecutar en el browser (importante para SvelteKit)
        if (browser) {
            // Importar Leaflet dinámicamente
            L = await import("leaflet");

            // Configurar iconos por defecto de Leaflet
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                iconUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                shadowUrl:
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            });

            // Inicializar el mapa
            map = L.map("map").setView([0, 0], 10); // Vista mundial inicial

            popup = L.popup();

            // Agregar capa base de OpenStreetMap
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
            }).addTo(map);

            // Cargar GeoJSON inicial de Ecuador
            await loadCountryGeojson("ecuador");
        }
    });

    function updateFile() {
        console.log(fileInput.files);
        filecsv = fileInput?.files?.[0] || null;
    }
</script>

<main class="m-3">
    <h2>
        Bienvenido , aquí podras realizar tus reportes usando mapas de distintos
        paises
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
                accept=".geojson"
                bind:this={fileInput}
                on:input={updateFile}
            />
        </div>
    </div>
</main>
