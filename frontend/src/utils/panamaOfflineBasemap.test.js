import assert from "node:assert/strict";
import test from "node:test";
import {
  PANAMA_CANAL_CORRIDOR_GEOJSON,
  PANAMA_METRO_GRID_GEOJSON,
  PANAMA_METRO_LAND_GEOJSON,
  TRANSPARENT_TILE_DATA_URI,
} from "./panamaOfflineBasemap.js";

function coordinatesOf(geometry) {
  if (!geometry || typeof geometry !== "object") return [];
  if (geometry.type === "GeometryCollection") {
    return (geometry.geometries || []).flatMap(coordinatesOf);
  }
  if (!Array.isArray(geometry.coordinates)) return [];
  const collect = (value) =>
    typeof value[0] === "number" && typeof value[1] === "number"
      ? [value]
      : value.flatMap(collect);
  return geometry.coordinates.flatMap(collect);
}

function assertValidFeatureCollection(geojson, label) {
  assert.equal(geojson.type, "FeatureCollection", `${label} type`);
  assert.ok(Array.isArray(geojson.features), `${label} features`);
  assert.ok(geojson.features.length > 0, `${label} has features`);

  for (const feature of geojson.features) {
    assert.equal(feature.type, "Feature", `${label} feature type`);
    assert.ok(feature.geometry, `${label} geometry`);
    const coordinates = coordinatesOf(feature.geometry);
    assert.ok(coordinates.length > 0, `${label} coordinates`);
    for (const [lng, lat] of coordinates) {
      assert.ok(Number.isFinite(lng) && Number.isFinite(lat), `${label} finite`);
      assert.ok(lng >= -80 && lng <= -79, `${label} lng ${lng}`);
      assert.ok(lat >= 8.8 && lat <= 9.2, `${label} lat ${lat}`);
    }
  }
}

test("transparent tile is a valid GIF data URI", () => {
  const match = /^data:image\/gif;base64,([A-Za-z0-9+/=]+)$/.exec(
    TRANSPARENT_TILE_DATA_URI,
  );
  assert.ok(match, "data:image/gif;base64 URI");
  assert.equal(
    Buffer.from(match[1], "base64").subarray(0, 6).toString("ascii"),
    "GIF89a",
  );
});

test("metro land GeoJSON is a bounded FeatureCollection", () => {
  assertValidFeatureCollection(PANAMA_METRO_LAND_GEOJSON, "land");
});

test("canal corridor GeoJSON is a bounded FeatureCollection", () => {
  assertValidFeatureCollection(PANAMA_CANAL_CORRIDOR_GEOJSON, "canal");
});

test("metro grid GeoJSON is a bounded FeatureCollection", () => {
  assertValidFeatureCollection(PANAMA_METRO_GRID_GEOJSON, "grid");
});
