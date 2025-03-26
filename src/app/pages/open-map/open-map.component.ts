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
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import BaseLayer from 'ol/layer/Base';
import { click } from 'ol/events/condition';
import Select from 'ol/interaction/Select';

@Component({
  selector: 'app-open-map',
  standalone: false,
  templateUrl: './open-map.component.html',
  styleUrl: './open-map.component.scss'
})
export class OpenMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  private map!: Map;
  private draw!: Draw;
  private modify!: Modify;
  private snap!: Snap;
  private selectInteraction!: Select;
  private vectorSource!: VectorSource<Feature<Geometry>>;
  private vectorLayer!: VectorLayer<VectorSource<Feature<Geometry>>>;

  geometryType: 'Point' | 'LineString' | 'Polygon' = 'Point';
  selectedFeature: Feature<Geometry> | null = null;

  // Control button visibility
  showCreateButton: boolean = true;
  showEditDeleteButtons: boolean = false;
  selectActive: boolean = false;

  selectedButton: string | null = 'select';

  constructor(
    private osmService: OpenStreetMapService,
    private olService: OpenLayerService,
    private geometryService: GeometryService
  ) { }

  ngAfterViewInit(): void {
    this.vectorSource = new VectorSource<Feature<Geometry>>();
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: this.olService.getDefaultStyle(),
    });
    this.vectorLayer.setZIndex(1);

    this.initializeMap();
    this.addInteractions();
    this.onSelect(); // Initialize with select active
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }
  }

  onGeometryTypeChange(event: MatButtonToggleChange) {
    this.geometryType = event.value;
    if (this.selectedButton === 'create') {
        this.removeInteractions();
        this.addInteractions();
        this.startDrawing();
    }
  }

  initializeMap() {
    const osmLayer = this.osmService.createOSMLayer();
    osmLayer.setZIndex(0);
    const initialCenter: [number, number] = [-47.4585, -23.5003];
    const initialZoom = 15;

    this.map = this.olService.createMap(this.mapContainer.nativeElement, [osmLayer, this.vectorLayer], initialCenter, initialZoom);
  }

  addInteractions() {
    this.draw = new Draw({
      source: this.vectorSource,
      type: this.geometryType,
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


    this.selectInteraction.on('select', (e) => {
      if (e.selected.length > 0) {
        this.selectedFeature = e.selected[0];
        console.log('Selected feature:', this.selectedFeature);
        this.showEditDeleteButtons = true;
        this.showCreateButton = false;
      } else {
        this.selectedFeature = null;
        console.log('No feature selected');
        this.showEditDeleteButtons = false;
        this.showCreateButton = true;
      }
    });

    this.setInteractionsActive(false); // Initially disable drawing/editing
  }


  removeInteractions() {
    if (this.draw) this.map.removeInteraction(this.draw);
    if (this.modify) this.map.removeInteraction(this.modify);
    if (this.snap) this.map.removeInteraction(this.snap);
    if (this.selectInteraction) this.map.removeInteraction(this.selectInteraction);
  }

  setInteractionsActive(active: boolean) {
    this.draw.setActive(active);
    this.modify.setActive(active);
    this.snap.setActive(active);
  }

  onCreate() {
      this.selectedButton = 'create';

      this.showCreateButton = true;
      this.showEditDeleteButtons = false;
      this.setSelectActive(true);
      this.setInteractionsActive(false);
      this.removeInteractions();
      this.addInteractions();

      // Immediately start drawing based on the selected geometry type
      this.startDrawing();
  }

  startDrawing() {
    this.draw.setActive(true);

    this.draw.once('drawend', (event) => {
        const feature = event.feature;
        this.addFeatureWithProperties(feature);
        this.setInteractionsActive(false);
        this.showCreateButton = true;
        this.onSelect();
    });
  }

  addFeatureWithProperties(feature: Feature<Geometry>) {
    const properties = {
      name: `New ${this.geometryType}`,
      description: 'User-created feature',
    };
    feature.setProperties(properties);
    this.vectorSource.addFeature(feature);
  }

  onEdit() {
    if (this.selectedFeature) {
      this.selectedButton = 'edit';
      this.setInteractionsActive(false);
      this.modify.setActive(true);
    } else {
      alert("No feature selected to edit. Click a geometry to select.");
    }
  }

  onDelete() {
    if (this.selectedFeature) {
      this.vectorSource.removeFeature(this.selectedFeature);
      this.selectedFeature = null;
      this.setInteractionsActive(false);
      this.showEditDeleteButtons = false;
      this.showCreateButton = true;
      this.onSelect(); // Re-enable select after deleting
    } else {
      alert('No feature selected to delete. Click a geometry to select.');
    }
  }

  onSelect() {
      this.selectedButton = 'select';
      this.setInteractionsActive(false);
      this.showCreateButton = true;
      this.showEditDeleteButtons = false;
      this.setSelectActive(false);

      if (this.draw) this.draw.setActive(false);
      if (this.modify) this.modify.setActive(false);
      if (this.snap) this.snap.setActive(false);
      if (this.selectInteraction) this.selectInteraction.setActive(true);
  }

  setSelectActive(active: boolean) {
    this.selectActive = active;
  }
}