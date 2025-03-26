import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { OpenStreetMapService } from '../../services/open-street-map.service';
import { OpenLayerService } from '../../services/open-layer.service';
import { GeometryService } from '../../services/geometry.service';

import { Map, Feature } from 'ol';
import { Geometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import Draw, { DrawEvent } from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import Select, { SelectEvent } from 'ol/interaction/Select';
import { DragPan } from 'ol/interaction';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
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
    this.vectorSource = new VectorSource<Feature<Geometry>>();
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: this.olService.getDefaultStyle(),
    });
    this.vectorLayer.setZIndex(1);

    this.initializeMap();

    this.map.getInteractions().forEach(interaction => {
      if (interaction instanceof DragPan) {
        this.dragPanInteraction = interaction;
      }
    });
    if (!this.dragPanInteraction) {
      console.warn('DragPan interaction not found on the map. Panning might not work as expected.');
    }

    this.addInteractions();
    this.setInteractionState('select');
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }
    // Consider removing listeners if component is destroyed but map persists elsewhere
    // e.g., this.draw?.un('drawend', this.handleDrawEnd);
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

  private handleDrawEnd = (event: DrawEvent) => {
    console.log('Draw End Event');
    const feature = event.feature;

    // Set properties directly on the feature
    const properties = {
      name: `New ${this.geometryType}`,
      description: 'User-created feature',
      createdAt: new Date().toISOString(),
      geometryType: this.geometryType
    };
    feature.setProperties(properties);
    console.log('Feature properties set:', feature.getProperties());

    // Switch back to select mode
    this.setInteractionState('select');
    this.selectedButton = 'select';
    this.showCreateButton = true;
    this.showEditDeleteButtons = false;
  }

  addInteractions() {
    this.draw = new Draw({
      source: this.vectorSource,
      type: this.geometryType,
      stopClick: true
    });

    this.modify = new Modify({
      source: this.vectorSource,
      // Optionally, only modify selected features:
      // features: this.selectInteraction.getFeatures(),
    });

    this.snap = new Snap({ source: this.vectorSource });

    this.selectInteraction = new Select({
      condition: click,
      layers: [this.vectorLayer],
      // Optional: Style selected features differently
      // style: this.olService.getSelectStyle() // Create a getSelectStyle in your service
    });

    this.map.addInteraction(this.draw);
    this.map.addInteraction(this.modify);
    this.map.addInteraction(this.snap);
    this.map.addInteraction(this.selectInteraction);

    this.draw.on('drawend', this.handleDrawEnd);

    // Handle selection logic
    this.selectInteraction.on('select', (e: SelectEvent) => {
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
        this.selectedFeature = null;
      }
    });
  }

  setInteractionState(mode: 'select' | 'draw' | 'edit' | 'none') {
    console.log(`Setting interaction state to: ${mode}`);

    // Deactivate all managed interactions first
    this.draw?.setActive(false);
    this.modify?.setActive(false);
    this.selectInteraction?.setActive(false);
    this.snap?.setActive(false);
    this.dragPanInteraction?.setActive(false);

    // Activate interactions based on the desired mode
    switch (mode) {
      case 'select':
        this.selectInteraction?.setActive(true);
        this.dragPanInteraction?.setActive(true);
        break;

      case 'draw':
        if (this.draw) {
          this.draw.setActive(true);
        } else {
          console.error("Draw interaction not initialized!");
        }
        this.snap?.setActive(true);
        break;

      case 'edit':
        if (this.selectedFeature) { // Only activate modify if a feature is selected
          this.modify?.setActive(true);
          this.snap?.setActive(true);
        } else {
          console.warn("Attempted to enter edit mode without a selected feature.");
          this.setInteractionState('select');
          this.selectedButton = 'select';
        }
        break;

      case 'none':
        this.dragPanInteraction?.setActive(true);
        break;
    }
  }

  onGeometryTypeChange(event: MatButtonToggleChange) {
    this.geometryType = event.value;

    // If Draw interaction exists, replace it
    if (this.map && this.draw) {
      this.map.removeInteraction(this.draw);
      this.draw.un('drawend', this.handleDrawEnd);

      // Create the NEW interaction
      this.draw = new Draw({
        source: this.vectorSource,
        type: this.geometryType,
        stopClick: true
      });

      this.draw.on('drawend', this.handleDrawEnd);
      this.map.addInteraction(this.draw);

      if (this.selectedButton === 'create') {
        this.setInteractionState('draw');
      } else {
        this.draw.setActive(false);
      }
    } else if (this.map) {
      console.warn("Draw interaction was missing, creating it now in onGeometryTypeChange.");
      this.draw = new Draw({
        source: this.vectorSource,
        type: this.geometryType,
        stopClick: true
      });
      this.draw.on('drawend', this.handleDrawEnd);
      this.map.addInteraction(this.draw);
      this.draw.setActive(this.selectedButton === 'create');

    }
  }

  onCreate() {
    this.selectedButton = 'create';
    this.selectedFeature = null;
    this.selectInteraction?.getFeatures().clear();
    this.showCreateButton = true;
    this.showEditDeleteButtons = false;

    this.setInteractionState('draw');
  }

  onEdit() {
    if (this.selectedFeature) {
      this.selectedButton = 'edit';
      this.showCreateButton = false;
      this.showEditDeleteButtons = true;
      this.setInteractionState('edit');
    } else {
      // User clicked Edit without selecting anything
      alert("Nenhuma geometria selecionada para editar. Clique em uma geometria para selecioná-la.");
      this.selectedButton = 'select';
      this.setInteractionState('select');
      this.showCreateButton = true;
      this.showEditDeleteButtons = false;
    }
  }

  onDelete() {
    if (this.selectedFeature) {
      const featureToDelete = this.selectedFeature;
      try {
        this.vectorSource.removeFeature(featureToDelete);
        console.log('Feature removed from source');

        this.selectedFeature = null;
        this.selectInteraction?.getFeatures().clear();

        this.showEditDeleteButtons = false;
        this.showCreateButton = true;
        this.selectedButton = 'select';
        this.setInteractionState('select');
        console.log('Feature deleted');
      } catch (error) {
        console.error("Error removing feature:", error);
        alert("Erro ao deletar a geometria.");
        this.selectedFeature = null;
        this.selectInteraction?.getFeatures().clear();
        this.showEditDeleteButtons = false;
        this.showCreateButton = true;
        this.selectedButton = 'select';
        this.setInteractionState('select');
      }

    } else {
      alert('Nenhuma geometria selecionada para deletar. Clique em uma geometria para selecioná-la.');
      this.selectedButton = 'select';
      this.setInteractionState('select');
    }
  }

  onSelect() {
    this.selectedButton = 'select';
    this.showCreateButton = true;
    this.showEditDeleteButtons = !!this.selectedFeature;
    this.setInteractionState('select');
  }
}