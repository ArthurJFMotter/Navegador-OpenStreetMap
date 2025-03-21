import * as L from 'leaflet';

export interface GeometryViewModel {
    id?: string | null;
    name?: string | null;
    type: "point" | "line" | "polygon";
    coordinates: number[][]; // [[lng1, lat1], [lng2, lat2], ...]  <-- IMPORTANT: Longitude first!
    color?: string;
    layer?: L.Layer | null;
}