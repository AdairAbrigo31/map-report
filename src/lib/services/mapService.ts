import { browser } from "$app/environment";
import type { ChangeEvent } from "$lib/interfaces/IChangeEvent";

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


function paintMapWithGeoJSON(
  leaflet: any,
  map: any,
  geoJsonLayer: any,
  popup: any,
  datCSV: any,
  filters: ChangeEvent) {

  if (geoJsonLayer) {
    geoJsonLayer.eachLayer((layer: any) => {
      const feature = layer.feature;
      const total = datCSV.find(
        (item: any) => item.Canton === feature.properties.name
      )?.Total;

      const color = getColorsByFilters(filters, total);

      // Aplicar nuevo estilo
      layer.setStyle({
        fillColor: color,
        weight: 2,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
      });

      layer.on("click", (e: any) => {
        popup
          .setLatLng(e.latlng)
          .setContent(feature.properties.name + ' - ' + total)
          .openOn(map);
      });
    });
  }

  return geoJsonLayer;

}

function updateMapWithGeoJSON(
  leaflet: any,
  map: any,
  data: any,
  geoJsonLayer: any,
  popup: any,
) {
  // Remover capa anterior
  if (geoJsonLayer) {
    map.removeLayer(geoJsonLayer);
  }

  // Agregar nueva capa - Mapeo cuando cambia de mapa (Sin filtros)
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


function getColorsByFilters(filters: ChangeEvent, total: number) {
  if (!total || !filters?.ranges) return '#cccccc'; // ← Valor por defecto

  let ranges = filters.ranges;
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (total >= range.min && total <= range.max) {
      return range.color;
    }
  }
  return '#cccccc'; // ← Valor por defecto si no está en ningún rango
}

export { initializeLeaflet, createMap, updateMapWithGeoJSON, paintMapWithGeoJSON };
