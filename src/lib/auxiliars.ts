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
      let firstElement: any = results.data[0];
      if (firstElement['Total'] === undefined || firstElement['Total'] === null || firstElement['Canton'] == undefined || firstElement['Canton'] == null) {
        throw new Error("CSV file does not contain 'total' column");
      } else {
        console.log(results);
      }
    }
  });
}

function calculateMinAndMax(dataCSV: []) {
  if (!dataCSV || dataCSV.length === 0) {
    throw new Error("No data provided for min/max calculation");
  }

  let min = Infinity;
  let max = -Infinity;

  dataCSV.forEach((item: any) => {
    if (item.Total !== undefined && item.Total !== null) {
      if (item.Total < min) {
        min = item.Total;
      }
      if (item.Total > max) {
        max = item.Total;
      }
    }
  });

  return { min, max };
}

export { convertTopoJSONToGeoJSON, processCSVFile, calculateMinAndMax };
