import * as topojson from "topojson-client";

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

function processCSVFile(fileCSV: File) {
  console.log(fileCSV.name);
}

export { convertTopoJSONToGeoJSON, processCSVFile };
