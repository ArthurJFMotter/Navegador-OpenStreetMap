import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GeometryViewModel } from '../models/geometry.model';
import * as L from 'leaflet';

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
        const newGeometry: GeometryViewModel = { ...geometry, id: this.nextId.toString() };
        const currentGeometries = this.geometriesSubject.value;
        this.geometriesSubject.next([...currentGeometries, newGeometry]);
        this.nextId++;
    }

    updateGeometry(id: string, updates: Partial<GeometryViewModel>): void {
        const currentGeometries = this.geometriesSubject.value;
        const updatedGeometries = currentGeometries.map((geo) => {
            if (geo.id === id) {
                const updatedGeo = { ...geo, ...updates };

                // Remove the old layer if it exists
                if (geo.layer && updates.coordinates) {
                    this.removeLayerFromMap(geo.layer);
                    updatedGeo.layer = this.createLayer(updatedGeo);
                }

                return updatedGeo;
            }
            return geo;
        });
        this.geometriesSubject.next(updatedGeometries);
    }

    deleteGeometry(id: string): void {
        const currentGeometries = this.geometriesSubject.value;
        const geometryToDelete = currentGeometries.find(geo => geo.id === id);

        // Remove the layer from the map *before* removing it from the data
        if (geometryToDelete && geometryToDelete.layer) {
            this.removeLayerFromMap(geometryToDelete.layer);
        }

        const filteredGeometries = currentGeometries.filter((geo) => geo.id !== id);
        this.geometriesSubject.next(filteredGeometries);
    }

    getGeometryById(id: string): GeometryViewModel | undefined {
        return this.geometriesSubject.value.find(geo => geo.id === id);
    }


    // Helper function to create Leaflet layers
    createLayer(geometry: GeometryViewModel): L.Layer | null {
        const latLngs = geometry.coordinates.map(coord => L.latLng(coord[1], coord[0])); //lat and long

        let layer: L.Layer | null = null;
        if (geometry.type === 'point') {
            if (geometry.name) {
                layer = L.marker(latLngs[0], { icon: this.createDivIcon(geometry.color, geometry.name) });
            } else { layer = L.marker(latLngs[0], { icon: this.createDivIcon(geometry.color) }); }
        } else if (geometry.type === 'line') {
            layer = L.polyline(latLngs, { color: geometry.color || 'black' });
        } else if (geometry.type === 'polygon') {
            layer = L.polygon(latLngs, { color: geometry.color || 'black' });
        }
        return layer;
    }

    // Helper function to remove layers from the map (IMPORTANT)
    private removeLayerFromMap(layer: L.Layer): void {
        if (layer) {
            layer.remove(); // Use the remove() method directly on the layer
        }
    }

    createDivIcon(color: string = 'blue', name: string = ''): L.DivIcon {
        const iconHtml = `
          <div style="
              background-color: ${color};
              width: 10px;
              height: 10px;
              border-radius: 50%;
              display: flex;
              justify-content: center;
              align-items: center;
              color: white;
              font-size:8px;
          ">
            <span>${name ?? ''}</span>  
          </div>
      `;

        return L.divIcon({
            html: iconHtml,
            className: 'my-div-icon', // Add a custom class if needed
            iconSize: [10, 10],      // Adjust size as needed
            iconAnchor: [5, 5]     // Adjust anchor point as needed
        });
    }
}