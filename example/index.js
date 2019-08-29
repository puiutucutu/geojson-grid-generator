import * as turf from "@turf/turf";
import { Map, View } from "ol";
import { Vector as VectorLayer, Tile as TileLayer } from "ol/layer.js";
import { OSM, Vector as VectorSource } from "ol/source";
import { GeoJSON } from "ol/format";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import "normalize.css";
import torontoWards from "../src/data/toronto-wards";

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

Open Layers

*/

const geojsonFormatter = new GeoJSON();

const map = new Map({
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    new VectorLayer({
      source: new VectorSource({
        features: geojsonFormatter.readFeatures(gridWithinWardsCollection, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857"
        })
      }),
      style: new Style({
        stroke: new Stroke({
          color: [0, 0, 0],
          width: 1
        }),
        fill: new Fill({
          color: [255, 255, 255, 0.4]
        })
      })
    }),
    new VectorLayer({
      source: new VectorSource({
        features: geojsonFormatter.readFeatures(wardsMerged, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857"
        })
      }),
      style: new Style({
        stroke: new Stroke({
          color: [0, 0, 0],
          width: 2
        }),
        fill: new Fill({
          color: [10, 20, 30, 0.2]
        })
      })
    }),
    new VectorLayer({
      source: new VectorSource({
        features: geojsonFormatter.readFeatures(wardsPolygonScaledUp, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857"
        })
      }),
      style: new Style({
        stroke: new Stroke({
          color: [255, 0, 0],
          width: 4
        })
      })
    })
  ],

  target: "map",
  view: new View({
    center: fromLonLat([-79.3773582137488, 43.718226593124335]),
    zoom: 11
  })
});
