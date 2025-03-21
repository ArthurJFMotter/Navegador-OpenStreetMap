import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Geometry {
    id: number;
    name: string;
    type: 'point' | 'line' | 'polygon';
    coordinates: number[][]; // [[x1, y1], [x2, y2], ...]
    color?: string;
}

@Injectable({
    providedIn: 'root',
})
export class GeometryService {
    private geometriesSubject = new BehaviorSubject<Geometry[]>([]);
    geometries$: Observable<Geometry[]> = this.geometriesSubject.asObservable();
    private nextId = 1;

    constructor() { }

    getGeometries(): Geometry[] {
        return this.geometriesSubject.value;
    }

    addGeometry(geometry: Omit<Geometry, 'id'>): void {
        const newGeometry: Geometry = { ...geometry, id: this.nextId++ };
        const currentGeometries = this.geometriesSubject.value;
        this.geometriesSubject.next([...currentGeometries, newGeometry]);
    }

    updateGeometry(id: number, updates: Partial<Geometry>): void {
        const currentGeometries = this.geometriesSubject.value;
        const updatedGeometries = currentGeometries.map((geo) => {
            if (geo.id === id) {
                return { ...geo, ...updates };
            }
            return geo;
        });
        this.geometriesSubject.next(updatedGeometries);
    }


    deleteGeometry(id: number): void {
        const currentGeometries = this.geometriesSubject.value;
        const filteredGeometries = currentGeometries.filter((geo) => geo.id !== id);
        this.geometriesSubject.next(filteredGeometries);
    }

    // Helper function to find a geometry by ID
    getGeometryById(id: number): Geometry | undefined {
        return this.geometriesSubject.value.find(geo => geo.id === id);
    }
}