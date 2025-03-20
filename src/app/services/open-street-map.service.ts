import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
    providedIn: 'root'
})
export class OpenStreetMapService {
    
    private map: L.Map | null = null;

    constructor() { }

    /**
     * Initialize the map on the specified HTML element with given options
     */
    initMap(element: HTMLElement, options: L.MapOptions = {}): L.Map {
        // First, make sure Leaflet is properly initialized
        if (!L || !L.map) {
          console.error('Leaflet library not properly loaded');
          throw new Error('Leaflet library not properly loaded');
        }
    
        const defaultOptions: L.MapOptions = {
          center: [51.505, -0.09], // Default center (London)
          zoom: 13,
          layers: [
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            })
          ]
        };
    
        // Merge default options with provided options
        const mergedOptions = { ...defaultOptions, ...options };
        
        // Create the map instance
        this.map = L.map(element, mergedOptions);
        
        return this.map;
      }

    /**
     * Get the current map instance
     */
    getMap(): L.Map | null {
        return this.map;
    }

    /**
     * Set the view (center and zoom level) of the map
     */
    setView(center: L.LatLngExpression, zoom: number): void {
        if (this.map) {
            this.map.setView(center, zoom);
        }
    }

    /**
     * Add a marker to the map at the specified position
     */
    addMarker(position: L.LatLngExpression, options: L.MarkerOptions = {}): L.Marker | null {
        if (this.map) {
            const marker = L.marker(position, options).addTo(this.map);
            return marker;
        }
        return null;
    }

    /**
     * Add a popup to the map at the specified position
     */
    addPopup(position: L.LatLngExpression, content: string, options: L.PopupOptions = {}): L.Popup | null {
        if (this.map) {
            const popup = L.popup(options)
                .setLatLng(position)
                .setContent(content)
                .openOn(this.map);
            return popup;
        }
        return null;
    }

    /**
     * Add a circle to the map at the specified position
     * This uses L.Circle which takes a radius in meters as a separate parameter
     */
    addCircle(position: L.LatLngExpression, radius: number = 500, options: L.CircleOptions = {
        radius: 0
    }): L.Circle | null {
        if (this.map) {
            const defaultOptions: L.CircleOptions = {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5,
                radius: 0
            };
            const mergedOptions = { ...defaultOptions, ...options };
            const circle = L.circle(position, { ...mergedOptions, radius }).addTo(this.map);
            return circle;
        }
        return null;
    }

    /**
     * Add a circle marker to the map at the specified position
     * CircleMarker uses screen pixels for radius instead of meters
     */
    addCircleMarker(position: L.LatLngExpression, options: L.CircleMarkerOptions = { radius: 10 }): L.CircleMarker | null {
        if (this.map) {
            const defaultOptions: L.CircleMarkerOptions = {
                radius: 10,  // Default radius in pixels
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5
            };
            const mergedOptions = { ...defaultOptions, ...options };
            const circleMarker = L.circleMarker(position, mergedOptions).addTo(this.map);
            return circleMarker;
        }
        return null;
    }

    /**
     * Resize the map when container size changes
     */
    invalidateSize(): void {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
}