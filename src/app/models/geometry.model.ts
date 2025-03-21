export interface GeometryViewModel {
    id?: string | null;
    name?: string | null;
    type: "point" | "line" | "polygon";
    coordinates: number[][]; // [[x1, y1], [x2, y2], ...]
    color?: string;
}