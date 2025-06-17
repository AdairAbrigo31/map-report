import * as topojson from "topojson-client";
import Papa from "papaparse";

function convertTopoJSONToGeoJSON(topoData: any): any {
  // Obtener la primera clave del objeto objects (normalmente será el nombre del layer)
  const objectKeys = Object.keys(topoData.objects);
  if (objectKeys.length === 0) {
    throw new Error("No objects found in TopoJSON");
  }

  const objectKey = objectKeys[0];
  return topojson.feature(topoData, topoData.objects[objectKey]);
}

function processCSVFile(fileCSV: File) {
  Papa.parse(fileCSV, {
    header: true,
    dynamicTyping: true,
    complete: function (results) {
      console.log(results);
    }
  });
}

export { convertTopoJSONToGeoJSON, processCSVFile };
