// src/app/components/open-map/open-map.component.ts
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Map, Feature } from 'ol';
import { OpenStreetMapService } from '../../services/open-street-map.service';
import { OpenLayerService } from '../../services/open-layer.service';
import { GeometryService } from '../../services/geometry.service';
import { GeoJsonFeature } from '../../models/geometry.model';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import {Geometry} from 'ol/geom'; //Import Geometry Class
@Component({
  selector: 'app-open-map',
  standalone: false,
  templateUrl: './open-map.component.html',
  styleUrl: './open-map.component.scss'
})
export class OpenMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  private map!: Map;

  constructor(
    private osmService: OpenStreetMapService,
    private olService: OpenLayerService,
    private geometryService: GeometryService
  ) { }

  ngAfterViewInit(): void {
    // Create a point
    const pointFeatureData = this.geometryService.createPoint(-47.4585, -23.5003, { name: 'teste' }); // Example: New York

    // Create a linestring
    const lineStringFeatureData = this.geometryService.createLineString([
        [-74.006, 40.7128],  // New York
        [-71.0589, 42.3601], // Boston
        [-77.0369, 38.9072]   // Washington, D.C.
    ], { name: 'East Coast Route' });

    //create a polygon
    const polygonFeatureData = this.geometryService.createPolygon([
      [
        [-0.1587,51.5188],  //Point 1
        [-0.1687,51.5388],  //Point 2
        [-0.1487,51.5488],  //Point 3
        [-0.1387,51.5288]   //Point 4
      ]
  ],{ name: 'My polygon shape'});

    // Convert GeoJSON features to OpenLayers features - Correct!
    const pointFeature = this.olService.createFeatureFromGeoJson(pointFeatureData);
    const lineStringFeature = this.olService.createFeatureFromGeoJson(lineStringFeatureData);
    const polygonFeature = this.olService.createFeatureFromGeoJson(polygonFeatureData);

    // Create a vector layer with the features - Correct!
    const vectorLayer = this.olService.createVectorLayer([pointFeature, lineStringFeature, polygonFeature]);

    //Initialize Map - Correct!
    this.initializeMap([vectorLayer]);
}

ngOnDestroy(): void {
  if (this.map) {
    this.map.setTarget(undefined); // Clean up the map
  }
}

  initializeMap(customLayers: VectorLayer<any>[]= []) {

    const osmLayer = this.osmService.createOSMLayer();
    const initialCenter: [number, number] = [-47.4585, -23.5003];
    const initialZoom = 20;

      this.map = this.olService.createMap(this.mapContainer.nativeElement, [...customLayers, osmLayer], initialCenter, initialZoom);

  }
}