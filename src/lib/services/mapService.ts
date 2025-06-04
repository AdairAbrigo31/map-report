import { browser } from "$app/environment";

async function initializeLeaflet() {
  if (browser) {
    const leaflet = await import("leaflet");
    delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
    leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    return leaflet;
  }
}

function createMap(leaflet: any, containerID: string) {
  const map = leaflet.map(containerID).setView([0, 0], 10);
  const popup = leaflet.popup();

  leaflet
    .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    })
    .addTo(map);

  return { map, popup };
}

function updateMapWithGeoJSON(
  leaflet: any,
  map: any,
  data: any,
  geoJsonLayer: any,
  popup: any
) {
  // Remover capa anterior
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
  }

  // Agregar nueva capa
  const newLayer = leaflet
    .geoJSON(data, {
      onEachFeature: (feature: any, layer: any) => {
        layer.on("click", (e: any) => {
          popup
            .setLatLng(e.latlng)
            .setContent(feature.properties.name || "Sin nombre")
            .openOn(map);
        });
      },
    })
    .addTo(map);

  map.fitBounds(newLayer.getBounds());
  return newLayer;
}

export { initializeLeaflet, createMap, updateMapWithGeoJSON };
