export const TRANSPARENT_TILE_DATA_URI =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export const PANAMA_METRO_LAND_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Área metropolitana de Panamá", kind: "land" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-79.625, 9.105],
            [-79.45, 9.105],
            [-79.36, 9.105],
            [-79.36, 9.06],
            [-79.38, 9.055],
            [-79.4, 9.045],
            [-79.42, 9.025],
            [-79.44, 9.005],
            [-79.46, 8.985],
            [-79.48, 8.965],
            [-79.5, 8.945],
            [-79.52, 8.94],
            [-79.54, 8.945],
            [-79.56, 8.955],
            [-79.58, 8.965],
            [-79.6, 8.975],
            [-79.625, 8.985],
            [-79.625, 9.105],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Arraiján", kind: "land" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-79.79, 9.105],
            [-79.64, 9.105],
            [-79.64, 8.97],
            [-79.66, 8.95],
            [-79.7, 8.925],
            [-79.74, 8.93],
            [-79.79, 8.95],
            [-79.79, 9.105],
          ],
        ],
      },
    },
  ],
};

export const PANAMA_CANAL_CORRIDOR_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Miraflores - Balboa - Amador", kind: "waterway" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-79.575, 8.998],
            [-79.548, 8.998],
            [-79.542, 8.972],
            [-79.535, 8.945],
            [-79.524, 8.928],
            [-79.532, 8.922],
            [-79.546, 8.94],
            [-79.558, 8.972],
            [-79.575, 8.982],
            [-79.575, 8.998],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Eje del Canal", kind: "waterway" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-79.5615, 8.996],
          [-79.554, 8.97],
          [-79.542, 8.945],
          [-79.528, 8.925],
        ],
      },
    },
  ],
};

const LATITUDE_LINES = Array.from({ length: 9 }, (_, index) =>
  Number((8.92 + index * 0.02).toFixed(2)),
);
const LONGITUDE_LINES = Array.from({ length: 10 }, (_, index) =>
  Number((-79.6 + index * 0.02).toFixed(2)),
);

export const PANAMA_METRO_GRID_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { axis: "latitude" },
      geometry: {
        type: "MultiLineString",
        coordinates: LATITUDE_LINES.map((lat) => [
          [-79.62, lat],
          [-79.4, lat],
        ]),
      },
    },
    {
      type: "Feature",
      properties: { axis: "longitude" },
      geometry: {
        type: "MultiLineString",
        coordinates: LONGITUDE_LINES.map((lng) => [
          [lng, 8.9],
          [lng, 9.1],
        ]),
      },
    },
  ],
};
