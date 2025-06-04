import { convertTopoJSONToGeoJSON } from "$lib/auxiliars";

export default async function loadCountryData(country: string) {
  const response = await fetch(`/topojson/${country.toLowerCase()}.topojson`);

  if (!response.ok) {
    throw new Error(`Error cargando datos: ${response.status}`);
  }

  const data = await response.json();
  return convertTopoJSONToGeoJSON(data);
}
