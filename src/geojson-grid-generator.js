import path from "path";
import fs from "fs";
import * as turf from "@turf/turf";
import torontoWards from "./data/toronto-wards";

/*

 Prepare Wards

 */

const wardsBBox = turf.bbox(torontoWards);
const wardsPolygon = turf.bboxPolygon(wardsBBox);
const wardsPolygonScaledUp = turf.transformScale(wardsPolygon, 1.1);
const wardsPolygonScaledUpBBox = turf.bbox(wardsPolygonScaledUp);

// merge all the wards into one GeoJSON feature
const wardsMerged = turf.union(...torontoWards.features);

// retain only the first geometry data in the resulting Polygon to filter out
// residuals from the merge
wardsMerged.geometry.coordinates = [[...wardsMerged.geometry.coordinates[0]]];

/*

Generate Grid

*/

const cellSide = 1;
const options = { units: "kilometers" };
const grid = turf.hexGrid(wardsPolygonScaledUpBBox, cellSide, options);

// intersect to keep only grid cells that fall within the merged wards
const gridWithinWards = turf.featureReduce(
  grid,
  (accumulator, currFeature) => {
    if (!turf.booleanDisjoint(currFeature, wardsMerged)) {
      accumulator.push(currFeature);
    }
    return accumulator;
  },
  []
);

const gridWithinWardsCollection = turf.featureCollection(gridWithinWards);

/*

 Output Grid as Json File

 */

fs.writeFile(
  path.join(__dirname, "grid.geojson"),
  JSON.stringify(gridWithinWardsCollection),
  err => (err ? console.log(err) : console.log("File successfully created"))
);