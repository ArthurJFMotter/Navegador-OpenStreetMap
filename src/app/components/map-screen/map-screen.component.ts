// map-screen.component.ts
import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { OpenStreetMapService } from '../../services/open-street-map.service';
import { GeometryService } from '../../services/geometry.service';
import { Subscription } from 'rxjs';
import { GeometryViewModel } from '../../models/geometry.model';
import { MatDialog } from '@angular/material/dialog';
import { GeometryDialogComponent } from '../geometry-dialog/geometry-dialog.component';
import * as L from 'leaflet';
import { DeleteDialogComponent } from '../delete-dialog/delete-dialog.component';

type Mode = 'draw' | 'edit' | 'delete' | 'none';

@Component({
    selector: 'app-map-screen',
    standalone: false,
    templateUrl: './map-screen.component.html',
    styleUrl: './map-screen.component.scss'
})
export class MapScreenComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('map') mapElement!: ElementRef;

    private map!: L.Map;
    private geometries: GeometryViewModel[] = [];
    private geometrySubscription!: Subscription;
    private selectedGeometry: GeometryViewModel | null = null;

    mode: Mode = 'none';
    drawingType: 'point' | 'line' | 'polygon' = 'point';

    private isDrawing = false;
    private tempCoordinates: L.LatLng[] = [];
    private previewLayer: L.Layer | null = null;
    editingGeometryId: string | null = null;

    constructor(
        private mapService: OpenStreetMapService,
        private geometryService: GeometryService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.geometrySubscription = this.geometryService.geometries$.subscribe(
            (geometries) => {
                this.geometries = geometries;
                this.redrawMap();
            }
        );
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.initMap();
            this.setupMapListeners();
            this.redrawMap();
        }, 0);
    }

    ngOnDestroy(): void {
        this.geometrySubscription.unsubscribe();
        if (this.map) {
            this.map.remove();
        }
    }

    private initMap(): void {
        this.map = this.mapService.initMap(this.mapElement.nativeElement, {
            center: [-23.478549220947194, -47.42413624752591],
            zoom: 19
        });
        this.map.options.doubleClickZoom = false;
    }

    private setupMapListeners(): void {
        if (!this.map) return;
        this.map.on('click', this.onMapClick.bind(this));
    }

    onMapClick(event: L.LeafletMouseEvent): void {
        if (this.mode === 'delete') {
           // ... (rest of delete logic is correct) ...
           for (let i = this.geometries.length - 1; i >= 0; i--) {
            const geometry = this.geometries[i];

            if (geometry.layer && geometry.id) {
                if (geometry.type === 'point' && geometry.layer instanceof L.Marker) {
                    if (geometry.layer.getLatLng().equals(event.latlng, 0.0001)) {
                        this.confirmAndDelete(geometry);
                        return;
                    }
                } else if (geometry.type === 'line' && geometry.layer instanceof L.Polyline) {
                    if (this.isPointNearPolyline(event.latlng, geometry.layer)) {
                        this.confirmAndDelete(geometry);
                        return;
                    }
                }
                else if (geometry.type === 'polygon' && geometry.layer instanceof L.Polygon) {
                    if (this.isPointInsidePolygon(event.latlng, geometry.layer)) {
                        this.confirmAndDelete(geometry);
                        return;
                    }
                }
            }
        }
        } else if (this.mode === 'edit') {
           // ... (rest of edit logic is correct) ...
           for (let i = this.geometries.length - 1; i >= 0; i--) {
            const geometry = this.geometries[i];
            if (geometry.layer) {
                if (geometry.type === 'point' && geometry.layer instanceof L.Marker) {
                    if (geometry.layer.getLatLng().equals(event.latlng, 0.0001)) {
                        this.selectedGeometry = geometry;
                        this.openDialog(geometry, 'edit');
                        return;
                    }
                } else if (geometry.type === 'line' && geometry.layer instanceof L.Polyline) {
                    if (this.isPointNearPolyline(event.latlng, geometry.layer)) {
                        this.selectedGeometry = geometry;
                        this.openDialog(geometry, 'edit');
                        return;
                    }
                } else if (geometry.type === 'polygon' && geometry.layer instanceof L.Polygon) {
                    if (this.isPointInsidePolygon(event.latlng, geometry.layer)) {
                        this.selectedGeometry = geometry;
                        this.openDialog(geometry, 'edit');
                        return;
                    }
                }
            }
        }
        } else if (this.mode === 'draw' && this.drawingType === 'point') {
            this.tempCoordinates = [event.latlng];
            this.finishDrawing();
        } else if (this.mode === 'draw' && (this.drawingType === 'line' || this.drawingType === 'polygon')) {
            this.tempCoordinates.push(event.latlng);
            this.drawPreview();
        }
    }
    private confirmAndDelete(geometry: GeometryViewModel): void {
      const dialogRef = this.dialog.open(DeleteDialogComponent, {
          data: { entityName: geometry.type, entitySpecification: geometry.name },
      });

      dialogRef.afterClosed().subscribe(result => {
          if (result && geometry?.id) {
              this.geometryService.deleteGeometry(geometry.id);
          }
      });
    }

    isPointNearPolyline(point: L.LatLng, polyline: L.Polyline, tolerance: number = 10): boolean {
      const pointPx = this.map.latLngToLayerPoint(point);
      const latLngs = polyline.getLatLngs() as L.LatLng[];

      for (let i = 0; i < latLngs.length - 1; i++) {
          const startPx = this.map.latLngToLayerPoint(latLngs[i]);
          const endPx = this.map.latLngToLayerPoint(latLngs[i + 1]);
          const distance = L.LineUtil.pointToSegmentDistance(pointPx, startPx, endPx);
          if (distance <= tolerance) {
              return true;
          }
      }
      return false;
    }

    isPointInsidePolygon(point: L.LatLng, polygon: L.Polygon): boolean {
      return polygon.getBounds().contains(point);
    }
    finishDrawing(): void {
        if (this.tempCoordinates.length > 0) {
            const newGeometry: Omit<GeometryViewModel, 'id'> = {
                name: '',
                type: this.drawingType,
                coordinates: this.tempCoordinates.map(latlng => [latlng.lng, latlng.lat]), // lng, lat (EPSG:4326)
                color: 'black',
                layer: null,
            };
            this.openDialog(newGeometry, 'create');
        }
    }

    private clearPreview(): void {
        if (this.previewLayer && this.map) {
            this.map.removeLayer(this.previewLayer);
            this.previewLayer = null;
        }
    }

    drawPreview(previewCoords: L.LatLng[] = this.tempCoordinates): void {
        this.clearPreview();
        if (!this.map || previewCoords.length < 1) return;

        let previewLayer: L.Layer | null = null;

        if (this.drawingType === 'line' && previewCoords.length >= 2) {
            previewLayer = L.polyline(previewCoords, { color: 'rgba(0, 0, 255, 0.5)', dashArray: '5, 5' });
        } else if (this.drawingType === 'polygon' && previewCoords.length >= 2) {
            previewLayer = L.polygon(previewCoords, { color: 'rgba(0, 0, 255, 0.5)', dashArray: '5, 5' });
        }

        if (previewLayer) {
            this.previewLayer = previewLayer;
            this.previewLayer.addTo(this.map);
        }
    }

    openDialog(geometry: Omit<GeometryViewModel, 'id'> | GeometryViewModel, mode: 'create' | 'edit' = 'create'): void {
        const dialogRef = this.dialog.open(GeometryDialogComponent, {
            data: { geometry, mode },
        });

        dialogRef.afterClosed().subscribe((result: GeometryViewModel | null) => {
            this.isDrawing = false;
            this.tempCoordinates = [];
            this.clearPreview();
            this.resetMouseHandlers();
            this.setMode('none');

            if (result) {
                if (mode === 'edit' && this.selectedGeometry?.id) {
                    // Edit existing geometry
                    //  No transformation needed here:  We *keep* coordinates in EPSG:4326.
                    this.geometryService.updateGeometry(this.selectedGeometry.id, result);
                } else {
                    // Create new geometry
                    // No transformation needed here either: We *keep* coordinates in EPSG:4326
                    const layer = this.geometryService.createLayer(result);  // createLayer expects EPSG:4326
                    if (layer) {
                        result.layer = layer;
                        this.geometryService.addGeometry(result);  // addGeometry expects EPSG:4326
                    }
                }
            }
            this.selectedGeometry = null;
            this.editingGeometryId = null;
        });
    }
    toggleDraw() {
        if (this.mode === 'draw') {
            this.setMode('none');
        } else {
            this.setMode('draw');
        }
    }


    setMode(mode: Mode): void {
        this.mode = mode;
        this.isDrawing = (mode === 'draw');
        this.tempCoordinates = [];
        this.clearPreview();
        this.resetMouseHandlers();

        if (mode === 'draw') {
            this.setDrawMouseHandlers();
        }
    }

    setDrawMouseHandlers(): void {
        if (!this.map) return;
        this.resetMouseHandlers();
        this.map.on('mousedown', this.onMapMouseDown.bind(this));
        this.map.on('mousemove', this.onMapMouseMove.bind(this));
        this.map.on('mouseup', this.onMapMouseUp.bind(this));
    }
    resetMouseHandlers(): void {
        if (!this.map) return;
        this.map.off('mousedown', this.onMapMouseDown.bind(this));
        this.map.off('mousemove', this.onMapMouseMove.bind(this));
        this.map.off('mouseup', this.onMapMouseUp.bind(this));
    }
    onMapMouseDown(event: L.LeafletMouseEvent): void {
        if (this.mode === 'draw' && this.drawingType !== 'point') {
            this.isDrawing = true;
            if (this.tempCoordinates.length === 0) {
                this.tempCoordinates.push(event.latlng);
            } else {
                this.tempCoordinates.push(event.latlng);
            }
            this.drawPreview();
        }
    }

    onMapMouseMove(event: L.LeafletMouseEvent): void {
        if (this.mode === 'draw' && this.isDrawing && this.drawingType !== 'point') {
            const previewCoords = [...this.tempCoordinates, event.latlng];
            this.drawPreview(previewCoords);
        }
    }

    onMapMouseUp(event: L.LeafletMouseEvent): void {

    }

    setDrawingType(type: 'point' | 'line' | 'polygon'): void {
        this.drawingType = type;
        this.tempCoordinates = [];
        this.clearPreview();
        if (this.isDrawing) {
            this.resetMouseHandlers();
            this.setDrawMouseHandlers();
        }
    }

    private createTextLabel(position: L.LatLng, text: string, type: 'point' | 'line' | 'polygon'): L.Marker {
        let iconAnchor: [number, number];
        const textWidth = text.length * 6;  // Approximate width based on font size

        if (type === 'point') {
            iconAnchor = [textWidth / 2, 20]; // Center horizontally, 20px above
        } else {
            iconAnchor = [textWidth / 2, 0]; // Center horizontally, at the point
        }

        return L.marker(position, {
            icon: L.divIcon({
                className: 'text-label',
                html: `<div style="white-space: nowrap;">${text}</div>`,
                iconSize: [textWidth, 20], //  Set the width dynamically
                iconAnchor: iconAnchor  //  Set the anchor dynamically
            })
        });
    }

    redrawMap(): void {
        if (!this.map) return;

        // Remove existing layers and labels
        this.geometries.forEach(geometry => {
            if (geometry.layer) {
                this.map.removeLayer(geometry.layer);
            }
            if (geometry.textLabel) {
                this.map.removeLayer(geometry.textLabel);
            }
        });

        this.geometries.forEach(geometry => {
            if (!geometry.layer) {
                geometry.layer = this.geometryService.createLayer(geometry);
            }
            if (geometry.layer) {
                geometry.layer.addTo(this.map);

                if (geometry.name) {
                    let labelPosition: L.LatLng;

                    if (geometry.type === 'point' && geometry.layer instanceof L.Marker) {
                        // Point: Above the marker.
                        labelPosition = geometry.layer.getLatLng().clone();
                        geometry.textLabel = this.createTextLabel(labelPosition, geometry.name, 'point');

                    } else if (geometry.type === 'line' && geometry.layer instanceof L.Polyline) {
                        // Line: Calculate the true midpoint.
                        const latLngs = geometry.layer.getLatLngs() as L.LatLng[];
                        if (latLngs.length > 0) {
                            let totalLat = 0;
                            let totalLng = 0;
                            for (const latLng of latLngs) {
                                totalLat += latLng.lat;
                                totalLng += latLng.lng;
                            }
                            labelPosition = L.latLng(totalLat / latLngs.length, totalLng / latLngs.length);
                            geometry.textLabel = this.createTextLabel(labelPosition, geometry.name, 'line');
                        }


                    } else if (geometry.type === 'polygon' && geometry.layer instanceof L.Polygon) {
                        labelPosition = geometry.layer.getBounds().getCenter();
                        geometry.textLabel = this.createTextLabel(labelPosition, geometry.name, 'polygon');

                    }

                    if (geometry.textLabel) {
                        geometry.textLabel.addTo(this.map);
                    }
                }
            }
        });
        this.drawPreview();
    }
}