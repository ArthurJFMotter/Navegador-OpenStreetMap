import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GeometryViewModel } from '../models/geometry.model';

@Injectable({
    providedIn: 'root',
})
export class GeometryService {
    private geometriesSubject = new BehaviorSubject<GeometryViewModel[]>([]);
    geometries$: Observable<GeometryViewModel[]> = this.geometriesSubject.asObservable();
    private nextId: number = 1;

    constructor() { }

    getGeometries(): GeometryViewModel[] {
        return this.geometriesSubject.value;
    }

    addGeometry(geometry: Omit<GeometryViewModel, 'id'>): void {
        const newGeometry: GeometryViewModel = { ...geometry, id: this.nextId.toString()};

        console.log("created geometry:", newGeometry);
        console.log("new id:", this.nextId);
        
        const currentGeometries = this.geometriesSubject.value;
        this.geometriesSubject.next([...currentGeometries, newGeometry]);
        this.nextId++;
    }

    updateGeometry(id: string, updates: Partial<GeometryViewModel>): void {
        const currentGeometries = this.geometriesSubject.value;
        const updatedGeometries = currentGeometries.map((geo) => {
            if (geo.id === id) {
                return { ...geo, ...updates };
            }
            return geo;
        });
        this.geometriesSubject.next(updatedGeometries);
    }


    deleteGeometry(id: string): void {
        const currentGeometries = this.geometriesSubject.value;
        const filteredGeometries = currentGeometries.filter((geo) => geo.id !== id);
        this.geometriesSubject.next(filteredGeometries);
    }

    getGeometryById(id: string): GeometryViewModel | undefined {
        return this.geometriesSubject.value.find(geo => geo.id === id);
    }
}