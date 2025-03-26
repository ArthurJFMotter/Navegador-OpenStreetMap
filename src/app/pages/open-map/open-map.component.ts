import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { OpenStreetMapService } from '../../services/open-street-map.service';
import { OpenLayerService } from '../../services/open-layer.service';
import { GeometryDialogComponent, GeometryDialogData, GeometryDialogResult } from '../../components/geometry-dialog/geometry-dialog.component';

import { Map, Feature } from 'ol';
import { Geometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw, { DrawEvent } from 'ol/interaction/Draw';
import Modify, { ModifyEvent } from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import Select, { SelectEvent } from 'ol/interaction/Select';
import { DragPan } from 'ol/interaction';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { click } from 'ol/events/condition';
import { StyleLike } from 'ol/style/Style';
import { unByKey } from 'ol/Observable';
import { EventsKey } from 'ol/events';

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

  private drawEndListenerKey: EventsKey | null = null;
  private selectListenerKey: EventsKey | null = null;
  private modifyStartListenerKey: EventsKey | null = null;
  private modifyEndListenerKey: EventsKey | null = null;

  geometryType: 'Point' | 'LineString' | 'Polygon' = 'Point';
  selectedFeature: Feature<Geometry> | null = null;
  selectedButton: 'select' | 'create' | 'edit-geometry' = 'select';

  showCreateButton: boolean = true;
  showEditDeleteButtons: boolean = false;
  hasModifiedGeometry: boolean = false;

  constructor(
    private osmService: OpenStreetMapService,
    private olService: OpenLayerService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) { }

  ngAfterViewInit(): void {
    this.vectorSource = new VectorSource<Feature<Geometry>>();
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: this.olService.createStyleFunction(),
    });
    this.vectorLayer.setZIndex(1);

    this.initializeMap();

    this.map.getInteractions().forEach(interaction => {
      if (interaction instanceof DragPan) {
        this.dragPanInteraction = interaction;
      }
    });
    if (!this.dragPanInteraction) {
      console.warn('DragPan interaction not found.');
    }

    this.addInteractions();
    this.setInteractionState('select');
  }

  ngOnDestroy(): void {
    if (this.drawEndListenerKey) unByKey(this.drawEndListenerKey);
    if (this.selectListenerKey) unByKey(this.selectListenerKey);
    if (this.modifyStartListenerKey) unByKey(this.modifyStartListenerKey);
    if (this.modifyEndListenerKey) unByKey(this.modifyEndListenerKey);

    if (this.map) {
      this.map.setTarget(undefined);
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

  private handleDrawEnd = (event: DrawEvent) => {
    console.log('Draw End Event');
    const feature = event.feature;
    this.setInteractionState('none');

    this.openGeometryDialog(feature, 'create').then(added => {
      if (!added) {
        console.log('Creation cancelled, removing feature.');
        this.vectorSource.removeFeature(feature);
      }
      this.selectedButton = 'select';
      this.setInteractionState('select');
      this.updateButtonVisibility();
    }).catch(error => {
      console.error("Error during dialog process:", error);
      this.vectorSource.removeFeature(feature);
      this.selectedButton = 'select';
      this.setInteractionState('select');
      this.updateButtonVisibility();
    });
  }


  private handleSelect = (e: SelectEvent) => {

    if (this.selectedButton !== 'select') {

      if (e.selected.length > 0) {
        this.selectInteraction?.getFeatures().clear();
      }
      return;
    }

    if (e.selected.length > 0) {
      this.selectedFeature = e.selected[0];
      console.log('Selected feature:', this.selectedFeature.getProperties());
    } else {
      this.selectedFeature = null;
      console.log('No feature selected');
    }
    this.updateButtonVisibility();
  }

  private handleModifyStart = (event: ModifyEvent) => {
    console.log('Modify Start');
    this.hasModifiedGeometry = false;
  }

  private handleModifyEnd = (event: ModifyEvent) => {
    console.log('Modify End (single operation)');
    this.hasModifiedGeometry = true;
    // Update geometry property in feature if needed for saving later
    // event.features.forEach(feature => {
    //   // You might want to store the updated geometry here if you serialize elsewhere
    //   // feature.set('updatedGeometry', feature.getGeometry()?.clone());
    // });
    // Re-enable pan/zoom if it was disabled
    // if (this.selectedButton === 'edit-geometry') { // Only re-enable if still in edit mode
    //     this.dragPanInteraction?.setActive(true);
    // }
  }

  addInteractions() {
    // Draw
    this.draw = new Draw({
      source: this.vectorSource,
      type: this.geometryType,
      stopClick: true
    });

    // Modify
    this.modify = new Modify({
      source: this.vectorSource,
      features: this.selectInteraction?.getFeatures(), // Link modify to selection
    });

    // Snap
    this.snap = new Snap({ source: this.vectorSource });

    // Select
    this.selectInteraction = new Select({
      condition: click,
      layers: [this.vectorLayer],
      style: this.olService.createSelectStyleFunction() as StyleLike,
    });

    // Add interactions
    this.map.addInteraction(this.draw);
    this.map.addInteraction(this.modify);
    this.map.addInteraction(this.snap);
    this.map.addInteraction(this.selectInteraction);

    // Attach listeners and store keys
    this.drawEndListenerKey = this.draw.on('drawend', this.handleDrawEnd);
    this.selectListenerKey = this.selectInteraction.on('select', this.handleSelect);

    // Attach Modify listeners
    this.modifyStartListenerKey = this.modify.on('modifystart', this.handleModifyStart);
    this.modifyEndListenerKey = this.modify.on('modifyend', this.handleModifyEnd);

    this.draw.setActive(false);
    this.modify.setActive(false);
    this.snap.setActive(false);
    this.selectInteraction.setActive(false);
  }

  setInteractionState(mode: 'select' | 'draw' | 'edit-geometry' | 'none') {
    console.log(`Setting interaction state to: ${mode}`);

    this.draw?.setActive(false);
    this.modify?.setActive(false);
    this.selectInteraction?.setActive(false);
    this.snap?.setActive(false);
    this.dragPanInteraction?.setActive(false);

    // Activate based on mode
    switch (mode) {
      case 'select':
        this.selectInteraction?.setActive(true);
        this.dragPanInteraction?.setActive(true);
        break;

      case 'draw':
        this.draw?.setActive(true);
        this.snap?.setActive(true);
        break;

      case 'edit-geometry':
        if (this.selectedFeature) {
          this.modify?.setActive(true);
          this.snap?.setActive(true);
        } else {
          console.warn("Attempted to enter modify mode without a selected feature.");
          this.selectedButton = 'select';
          this.setInteractionState('select');
        }
        break;

      case 'none':
        this.dragPanInteraction?.setActive(true);
        break;
    }
    this.updateButtonVisibility();
  }

  updateButtonVisibility() {
    this.showCreateButton = this.selectedButton === 'select' && !this.selectedFeature;
    this.showEditDeleteButtons = !!this.selectedFeature && this.selectedButton !== 'create';
    this.cdr.detectChanges();
  }

  async openGeometryDialog(feature: Feature<Geometry>, mode: 'create' | 'edit'): Promise<boolean> {
    const dialogData: GeometryDialogData = {
      mode: mode,
      featureProperties: feature.getProperties()
    };

    const dialogRef = this.dialog.open<GeometryDialogComponent, GeometryDialogData, GeometryDialogResult>(
      GeometryDialogComponent, { width: '350px', disableClose: true, data: dialogData }
    );

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      console.log('Dialog result:', result);
      const propertiesToSet: { [key: string]: any } = {
        ...feature.getProperties(),
        name: result.name,
        color: result.color,
        description: feature.get('description') || 'User feature',
        createdAt: feature.get('createdAt') || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (mode === 'create') {
        propertiesToSet['geometryType'] = this.geometryType;
      }
      feature.setProperties(propertiesToSet);
      console.log('Feature properties updated:', feature.getProperties());
      this.hasModifiedGeometry = false;
      return true;
    } else {
      console.log('Dialog cancelled or closed without saving.');
      return false;
    }
  }

  onGeometryTypeChange(event: MatButtonToggleChange) {
    if (this.selectedButton !== 'create') return;

    this.geometryType = event.value;

    if (this.map && this.draw) {
      this.map.removeInteraction(this.draw);
      if (this.drawEndListenerKey) {
        unByKey(this.drawEndListenerKey);
        this.drawEndListenerKey = null;
      }

      this.draw = new Draw({
        source: this.vectorSource,
        type: this.geometryType,
        stopClick: true
      });

      this.drawEndListenerKey = this.draw.on('drawend', this.handleDrawEnd);
      this.map.addInteraction(this.draw);
      this.draw.setActive(true);
      this.snap?.setActive(true);
    }
  }

  onCreate() {
    this.selectedButton = 'create';
    this.selectedFeature = null;
    this.selectInteraction?.getFeatures().clear();
    this.setInteractionState('draw');
  }


  async onEdit() {
    if (this.selectedButton === 'select' && this.selectedFeature) {
      // ---- STAGE 1: Enter Geometry Modification ----
      this.selectedButton = 'edit-geometry';
      this.setInteractionState('edit-geometry');
      this.hasModifiedGeometry = false;

      console.log("Entered geometry edit mode. Modify the shape and click 'Finish Shape'.");
    }
    else if (this.selectedButton === 'edit-geometry' && this.selectedFeature) {
      // ---- STAGE 2: Finish Geometry Modification & Open Dialog ----
      console.log("Finishing geometry edit mode.");
      this.setInteractionState('none');

      // Open the properties dialog
      const propertiesUpdated = await this.openGeometryDialog(this.selectedFeature, 'edit');

      if (propertiesUpdated) {
        console.log("Properties updated successfully after geometry modification.");
      } else {
        console.log("Properties dialog cancelled after geometry modification.");
      }

      // --- Always return to select mode after dialog ---
      this.selectedButton = 'select';
      this.setInteractionState('select');
      if (!this.selectInteraction.getFeatures().getArray().includes(this.selectedFeature)) {
        this.selectInteraction.getFeatures().push(this.selectedFeature);
      }
      this.updateButtonVisibility();

    } else {
      alert("Cannot edit. Please select a feature first.");
      this.selectedButton = 'select';
      this.setInteractionState('select');
      this.updateButtonVisibility();
    }
  }


  onDelete() {
    if (this.selectedButton !== 'select' || !this.selectedFeature) {
      alert('Por favor, selecione uma geometria para deletar.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja deletar a geometria "${this.selectedFeature.get('name') || 'sem nome'}"?`)) {
      return;
    }

    const featureToDelete = this.selectedFeature;
    try {
      this.vectorSource.removeFeature(featureToDelete);
      console.log('Feature removed from source');

      this.selectedFeature = null;
      this.selectInteraction?.getFeatures().clear();

      this.selectedButton = 'select';
      this.setInteractionState('select');
      console.log('Feature deleted');

    } catch (error) {
      console.error("Error removing feature:", error);
      alert("Erro ao deletar a geometria.");
      this.selectedFeature = null;
      this.selectInteraction?.getFeatures().clear();
      this.selectedButton = 'select';
      this.setInteractionState('select');
    }
  }

  onSelect() {
    if (this.selectedButton === 'edit-geometry') {
      console.log("Cancelling geometry edit mode.");
      this.selectedButton = 'select';
      this.setInteractionState('select');
      this.updateButtonVisibility();

    } else if (this.selectedButton !== 'select') {
      this.selectedButton = 'select';
      this.setInteractionState('select');
      this.updateButtonVisibility();
    }

  }

}