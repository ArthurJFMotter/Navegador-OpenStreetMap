import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { OpenStreetMapService } from '../../services/open-street-map.service';
import { OpenLayerService } from '../../services/open-layer.service';
import { GeometryService } from '../../services/geometry.service';
import { GeoJsonFeature } from '../../models/geometry.model';

import { Map, Feature } from 'ol';
import { Geometry, Point as OlPoint, LineString as OlLineString, Polygon as OlPolygon } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import Select from 'ol/interaction/Select';
import { DragPan } from 'ol/interaction';
import Interaction from 'ol/interaction/Interaction';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import BaseLayer from 'ol/layer/Base';
import { click } from 'ol/events/condition';

@Component({
  selector: 'app-open-map',
  standalone: false,
  templateUrl: './open-map.component.html',
  styleUrl: './open-map.component.scss'
})
export class OpenMapComponent implements AfterViewInit, OnDestroy {

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map!: Map;
  private vectorSource!: VectorSource<Feature<Geometry>>;
  private vectorLayer!: VectorLayer<VectorSource<Feature<Geometry>>>;

  private draw!: Draw;
  private modify!: Modify;
  private snap!: Snap;
  private selectInteraction!: Select;
  private dragPanInteraction!: DragPan;

  geometryType: 'Point' | 'LineString' | 'Polygon' = 'Point';
  selectedFeature: Feature<Geometry> | null = null;
  selectedButton: string | null = 'select'; // Tracks ('select', 'create', 'edit')

  showCreateButton: boolean = true;
  showEditDeleteButtons: boolean = false;

  constructor(
    private osmService: OpenStreetMapService,
    private olService: OpenLayerService,
    private geometryService: GeometryService
  ) { }

  ngAfterViewInit(): void {
    // 1. Initialize Source and Layer
    this.vectorSource = new VectorSource<Feature<Geometry>>();
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: this.olService.getDefaultStyle(),
    });
    this.vectorLayer.setZIndex(1);

    // 2. Initialize Map
    this.initializeMap();

    // 3. Find and Store Default DragPan Interaction
    this.map.getInteractions().forEach(interaction => {
        if (interaction instanceof DragPan) {
            this.dragPanInteraction = interaction;
        }
    });
    if (!this.dragPanInteraction) {
        console.warn('DragPan interaction not found on the map. Panning might not work as expected.');
    }

    // 4. Create and Add Custom Interactions (initially inactive)
    this.addInteractions();

    // 5. Set Initial State to Select Mode
    this.setInteractionState('select');
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined); // Clean up map target
    }
  }

  initializeMap() {
    const osmLayer = this.osmService.createOSMLayer();
    osmLayer.setZIndex(0);
    const initialCenter: [number, number] = [-47.4585, -23.5003];
    const initialZoom = 15;

    this.map = this.olService.createMap(
      this.mapContainer.nativeElement,
      [osmLayer, this.vectorLayer],
      initialCenter,
      initialZoom
    );
  }

  addInteractions() {
    this.draw = new Draw({
      source: this.vectorSource,
      type: this.geometryType,
      stopClick: true
    });

    this.modify = new Modify({
      source: this.vectorSource,
    });

    this.snap = new Snap({ source: this.vectorSource });

    this.selectInteraction = new Select({
      condition: click,
      layers: [this.vectorLayer],
    });

    this.map.addInteraction(this.draw);
    this.map.addInteraction(this.modify);
    this.map.addInteraction(this.snap);
    this.map.addInteraction(this.selectInteraction);

    this.draw.on('drawend', (event) => {
      console.log('Draw End Event');
      const feature = event.feature;
      this.addFeatureWithProperties(feature);

      this.setInteractionState('select');
      this.selectedButton = 'select';
      this.showCreateButton = true;
    });

    this.selectInteraction.on('select', (e) => {
      if (this.selectedButton === 'select') {
        if (e.selected.length > 0) {
          this.selectedFeature = e.selected[0];
          console.log('Selected feature:', this.selectedFeature.getProperties());
          this.showEditDeleteButtons = true;
          this.showCreateButton = false;
        } else {
          this.selectedFeature = null;
          console.log('No feature selected');
          this.showEditDeleteButtons = false;
          this.showCreateButton = true;
        }
      } else {
        this.selectInteraction.getFeatures().clear();
      }
    });
  }

  setInteractionState(mode: 'select' | 'draw' | 'edit' | 'none') {
    console.log(`Setting interaction state to: ${mode}`);

    // 1. Deactivate all managed interactions
    if (this.draw) this.draw.setActive(false);
    if (this.modify) this.modify.setActive(false);
    if (this.selectInteraction) this.selectInteraction.setActive(false);
    if (this.snap) this.snap.setActive(false);
    if (this.dragPanInteraction) this.dragPanInteraction.setActive(false);

    // 2. Activate interactions based on the desired mode
    switch (mode) {
      case 'select':
        if (this.selectInteraction) this.selectInteraction.setActive(true);
        if (this.dragPanInteraction) this.dragPanInteraction.setActive(true);
        break;

      case 'draw':
        if (this.draw) this.draw.setActive(true);
        if (this.snap) this.snap.setActive(true);
        break;

      case 'edit':
        if (this.modify) {
             this.modify.setActive(true);
        }
        if (this.snap) this.snap.setActive(true);
        break;

      case 'none':
        if (this.dragPanInteraction) this.dragPanInteraction.setActive(true);
        break;
    }
  }

  onGeometryTypeChange(event: MatButtonToggleChange) {
    this.geometryType = event.value;

    // If currently in 'create' mode, update the Draw interaction immediately
    if (this.selectedButton === 'create') {
        // 1. Remove the existing Draw interaction from the map
        if (this.draw) {
            this.map.removeInteraction(this.draw);
        }
        // 2. Create a new Draw interaction with the updated type
        this.draw = new Draw({
            source: this.vectorSource,
            type: this.geometryType,
            stopClick: true // Keep this!
        });
        // 3. Re-attach the persistent 'drawend' listener
        this.draw.on('drawend', (e) => {
            console.log('Draw End Event (after type change)');
            const feature = e.feature;
            this.addFeatureWithProperties(feature);
            this.setInteractionState('select'); // Go back to select mode
            this.selectedButton = 'select';
            this.showCreateButton = true;
        });
        // 4. Add the new Draw interaction to the map
        this.map.addInteraction(this.draw);
        // 5. Ensure the state is correctly set to 'draw' to activate the new interaction
        this.setInteractionState('draw');
    }
  }

  onCreate() {
    this.selectedButton = 'create';
    this.selectedFeature = null;
    if (this.selectInteraction) {
        this.selectInteraction.getFeatures().clear();
    }
    this.showCreateButton = true;
    this.showEditDeleteButtons = false;

    this.setInteractionState('draw');
  }

  addFeatureWithProperties(feature: Feature<Geometry>) {
    const properties = {
      name: `New ${this.geometryType}`,
      description: 'User-created feature',
      createdAt: new Date().toISOString()
    };
    feature.setProperties(properties);
    this.vectorSource.addFeature(feature);
    console.log('Feature added with properties:', feature.getProperties());
  }

  onEdit() {
    if (this.selectedFeature) {
      this.selectedButton = 'edit';
      this.showCreateButton = false;
      this.showEditDeleteButtons = true;
      this.setInteractionState('edit');
    } else {
      alert("No feature selected to edit. Click a geometry to select.");
      this.selectedButton = 'select';
      this.setInteractionState('select');
    }
  }

  onDelete() {
    if (this.selectedFeature) {
      const featureToDelete = this.selectedFeature;
      this.vectorSource.removeFeature(featureToDelete);

      this.selectedFeature = null;
      if (this.selectInteraction) {
         this.selectInteraction.getFeatures().clear();
      }

      this.showEditDeleteButtons = false;
      this.showCreateButton = true;
      this.selectedButton = 'select';
      this.setInteractionState('select');
      console.log('Feature deleted');
    } else {
      alert('No feature selected to delete. Click a geometry to select.');
      this.selectedButton = 'select';
      this.setInteractionState('select');
    }
  }

  onSelect() {
    this.selectedButton = 'select';
    //this.selectedFeature = null;
    this.showCreateButton = true;
    this.showEditDeleteButtons = !!this.selectedFeature;

    this.setInteractionState('select');
  }

  // Optional: Function to save a feature (called after creation or modification)
  // saveFeature(feature: Feature<Geometry>) {
  //   try {
  //     const geoJsonFeature = this.olService.featureToGeoJSON(feature); // Assuming olService has this helper
  //     console.log('Saving GeoJSON:', geoJsonFeature);
  //     // Example: Replace with actual service call
  //     // this.geometryService.saveGeometry(geoJsonFeature).subscribe(...)
  //   } catch (error) {
  //     console.error("Error converting feature to GeoJSON:", error);
  //   }
  // }
}