export interface PointGeometry {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

export interface LineStringGeometry {
    type: 'LineString';
    coordinates: [number, number][]; // Array of [longitude, latitude] pairs
}

export interface PolygonGeometry {
    type: 'Polygon';
    coordinates: [number, number][][];  // Array of rings (outer, then inner)
}

export type Geometry = PointGeometry | LineStringGeometry | PolygonGeometry;

export interface FeatureProperties {
    name?: string;
    description?: string;
    [key: string]: any; // Allow for other properties
}

export interface GeoJsonFeature {
    type: 'Feature';
    geometry: Geometry;
    properties: FeatureProperties | null;
    id?: string | number;
}