import * as L from 'leaflet';

export interface GeometryViewModel {
    id?: string | null;
    name?: string | null;
    type: "point" | "line" | "polygon";
    coordinates: [number, number][]; // [[lng1, lat1], [lng2, lat2], ...]
    color?: string;
    layer: L.Layer | null;
    textLabel?: L.Marker;
}