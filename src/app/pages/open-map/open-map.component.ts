import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog'; 
import { OpenStreetMapService } from '../../services/open-street-map.service';
import { OpenLayerService } from '../../services/open-layer.service';
import { GeometryDialogComponent, GeometryDialogData, GeometryDialogResult } from '../../components/geometry-dialog/geometry-dialog.component';

import { Map, Feature } from 'ol';
import { Geometry } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw, { DrawEvent } from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import Select, { SelectEvent } from 'ol/interaction/Select';
import { DragPan } from 'ol/interaction';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { click } from 'ol/events/condition';
import { StyleLike } from 'ol/style/Style';


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
  selectedButton: string | null = 'select';

  showCreateButton: boolean = true;
  showEditDeleteButtons: boolean = false;

  constructor(
    private osmService: OpenStreetMapService,
    private olService: OpenLayerService,
    private dialog: MatDialog
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
    if (this.map) {
      this.map.setTarget(undefined);
    }
     this.draw?.un('drawend', this.handleDrawEnd);
     this.selectInteraction?.un('select', this.handleSelect);
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

  // --- Handler for Draw End ---
  private handleDrawEnd = (event: DrawEvent) => {
    console.log('Draw End Event - Feature implicitly added to source.');
    const feature = event.feature;

    // Deactivate drawing immediately to prevent accidental further drawing
    this.setInteractionState('none'); 

    // Open the dialog to get properties
    this.openGeometryDialog(feature, 'create').then(added => {
       if (added) {
           // If added successfully via dialog, go to select mode
           this.setInteractionState('select');
           this.selectedButton = 'select';
           this.showCreateButton = true;
       } else {
           // If cancelled, remove the feature that was implicitly added
           console.log('Creation cancelled, removing feature.');
           this.vectorSource.removeFeature(feature);
           // Go back to select mode
           this.setInteractionState('select');
           this.selectedButton = 'select';
           this.showCreateButton = true;
       }
    }).catch(error => {
        console.error("Error during dialog process:", error);
        // Fallback: Remove feature and reset state even on error
        this.vectorSource.removeFeature(feature);
        this.setInteractionState('select');
        this.selectedButton = 'select';
        this.showCreateButton = true;
    });
  }

  // --- Handler for Select Interaction ---
  private handleSelect = (e: SelectEvent) => {
    if (this.selectedButton === 'select') { // Only act if in select mode
        if (e.selected.length > 0) {
            this.selectedFeature = e.selected[0];
            console.log('Selected feature:', this.selectedFeature.getProperties());
            this.showEditDeleteButtons = true; // Show edit/delete
            this.showCreateButton = false; // Hide create
        } else {
            this.selectedFeature = null;
            console.log('No feature selected');
            this.showEditDeleteButtons = false; // Hide edit/delete
            this.showCreateButton = true; // Show create
        }
    } else {
        // If not in select mode (e.g., drawing), clear accidental selection
        this.selectInteraction?.getFeatures().clear();
        // Don't change selectedFeature state here as it might be needed (e.g., during edit)
    }
  }


  addInteractions() {
    // Create Draw interaction (initial type)
    this.draw = new Draw({
      source: this.vectorSource,
      type: this.geometryType,
      stopClick: true
    });

    // Modify interaction - will be activated separately if needed
    this.modify = new Modify({
      source: this.vectorSource,
      // Optionally only modify selected features:
      features: this.selectInteraction?.getFeatures(), // Link modify to the selection
    });

    this.snap = new Snap({ source: this.vectorSource });

    this.selectInteraction = new Select({
      condition: click,
      layers: [this.vectorLayer],
      // *** Use the selection style function from the service ***
      style: this.olService.createSelectStyleFunction() as StyleLike, // Cast needed sometimes
    });

    // Add interactions to the map (modify starts inactive)
    this.map.addInteraction(this.draw);
    this.map.addInteraction(this.modify);
    this.map.addInteraction(this.snap);
    this.map.addInteraction(this.selectInteraction);

    // Attach handlers
    this.draw.on('drawend', this.handleDrawEnd);
    this.selectInteraction.on('select', this.handleSelect);

    // Deactivate interactions that shouldn't be active initially
    this.draw.setActive(false);
    this.modify.setActive(false);
    this.snap.setActive(false);
    // Select and DragPan will be handled by setInteractionState('select') in ngAfterViewInit
  }

  setInteractionState(mode: 'select' | 'draw' | 'edit' | 'none') {
    console.log(`Setting interaction state to: ${mode}`);

    // Deactivate all managed interactions first
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
        // Pan usually disabled during draw
        break;

      case 'edit': // 'edit' now means MODIFY GEOMETRY (not properties dialog)
         if (this.selectedFeature) {
             this.modify?.setActive(true); // Activate geometry modification
             this.snap?.setActive(true);
             // Keep select active to allow changing selection? Maybe not ideal during modify.
             // this.selectInteraction?.setActive(true);
             // Pan usually disabled during vertex editing
         } else {
             console.warn("Attempted to enter modify mode without a selected feature.");
             this.setInteractionState('select'); // Fallback
             this.selectedButton = 'select';
         }
        break;

      case 'none': // A neutral state, usually just panning enabled
        this.dragPanInteraction?.setActive(true);
        break;
    }
  }

    // --- Dialog Opener Function ---
    async openGeometryDialog(feature: Feature<Geometry>, mode: 'create' | 'edit'): Promise<boolean> {
      const dialogData: GeometryDialogData = {
          mode: mode,
          featureProperties: mode === 'edit' ? feature.getProperties() : {}
      };

      const dialogRef = this.dialog.open<GeometryDialogComponent, GeometryDialogData, GeometryDialogResult>(
          GeometryDialogComponent,
          {
              width: '350px',
              disableClose: true,
              data: dialogData
          }
      );

      const result = await dialogRef.afterClosed().toPromise();

      if (result) {
          console.log('Dialog result:', result);

          // Define properties object with potential geometryType included from the start
          const propertiesToSet: { [key: string]: any } = { // Use index signature for flexibility
              ...feature.getProperties(), // Keep existing properties
              name: result.name,
              color: result.color,
              description: feature.get('description') || 'User feature',
              createdAt: feature.get('createdAt') || new Date().toISOString(),
              updatedAt: new Date().toISOString()
          };

          // Add geometryType specifically for 'create' mode
          if (mode === 'create') {
              // Now assigning to a [key: string]: any object is safe
              propertiesToSet['geometryType'] = this.geometryType;
          }

          feature.setProperties(propertiesToSet);
          console.log('Feature properties updated:', feature.getProperties());
          return true;
      } else {
          console.log('Dialog cancelled or closed without saving.');
          return false;
      }
  }

  onGeometryTypeChange(event: MatButtonToggleChange) {
    this.geometryType = event.value;

    if (this.map && this.draw) {
        this.map.removeInteraction(this.draw);
        this.draw.un('drawend', this.handleDrawEnd); // Unbind from OLD

        this.draw = new Draw({
            source: this.vectorSource,
            type: this.geometryType,
            stopClick: true
        });

        this.draw.on('drawend', this.handleDrawEnd); // Bind to NEW
        this.map.addInteraction(this.draw);

        if (this.selectedButton === 'create') {
            this.setInteractionState('draw'); // Activate the new draw interaction
        } else {
            this.draw.setActive(false); // Keep inactive if not in create mode
        }
    }
  }

  onCreate() {
    this.selectedButton = 'create';
    this.selectedFeature = null;
    this.selectInteraction?.getFeatures().clear();
    this.showCreateButton = true; // Decide on desired UX here
    this.showEditDeleteButtons = false;
    this.setInteractionState('draw'); // Activate drawing
  }

  // --- EDIT BUTTON CLICK ---
  // Now triggers the dialog for properties, not geometry modification directly
  async onEdit() {
    if (this.selectedFeature) {
      // Current mode is 'select', keep it that way while dialog is open
      // Store current selected button to revert if needed, though 'select' is likely fine
      const previousButton = this.selectedButton;
      this.selectedButton = 'select'; // Ensure we are in select mode logically
      this.setInteractionState('none'); // Deactivate interactions while dialog is open

      const updated = await this.openGeometryDialog(this.selectedFeature, 'edit');

      if (updated) {
         console.log("Properties updated successfully.");
         // Optional: Briefly highlight the feature?
      } else {
          console.log("Edit cancelled.");
      }
      // Restore select state after dialog closes
      this.selectedButton = 'select';
      this.setInteractionState('select');
      // Re-evaluate button visibility based on selection state
      this.showEditDeleteButtons = !!this.selectedFeature;
      this.showCreateButton = !this.selectedFeature;


    } else {
      alert("Nenhuma geometria selecionada para editar.");
       // Ensure state is consistent
      this.selectedButton = 'select';
      this.setInteractionState('select');
      this.showEditDeleteButtons = false;
      this.showCreateButton = true;
    }
  }


  onDelete() {
    if (this.selectedFeature) {
      // Maybe add a confirmation dialog here?
      // e.g., using MatDialog or window.confirm()

      const featureToDelete = this.selectedFeature;
      try {
          this.vectorSource.removeFeature(featureToDelete);
          console.log('Feature removed from source');

          this.selectedFeature = null;
          this.selectInteraction?.getFeatures().clear(); // Clear visual selection explicitly

          this.showEditDeleteButtons = false;
          this.showCreateButton = true;
          this.selectedButton = 'select';
          this.setInteractionState('select'); // Ensure select interaction is active
          console.log('Feature deleted');
      } catch (error) {
           console.error("Error removing feature:", error);
           alert("Erro ao deletar a geometria.");
           // Reset state even on error
           this.selectedFeature = null;
           this.selectInteraction?.getFeatures().clear();
           this.showEditDeleteButtons = false;
           this.showCreateButton = true;
           this.selectedButton = 'select';
           this.setInteractionState('select');
      }
    } else {
      alert('Nenhuma geometria selecionada para deletar.');
      this.selectedButton = 'select';
      this.setInteractionState('select');
    }
  }

  onSelect() {
    this.selectedButton = 'select';
    // Buttons visibility depends on whether a feature is selected
    this.showCreateButton = !this.selectedFeature;
    this.showEditDeleteButtons = !!this.selectedFeature;
    this.setInteractionState('select');
  }

  // --- Optional: Add a button/method to activate geometry modification ---
  onModifyGeometry() {
      if (this.selectedFeature) {
          this.selectedButton = 'edit'; // Use 'edit' state for geometry modification
          this.showCreateButton = false;
          this.showEditDeleteButtons = true; // Keep edit/delete visible? Or maybe just a 'Finish Editing' button?
          this.setInteractionState('edit'); // Activate Modify interaction
          console.log("Modify geometry mode activated.");
          // You might want a 'Finish Editing' button that calls onSelect() or setInteractionState('select')
      } else {
          alert("Selecione uma geometria para modificar seus vértices.");
      }
  }

}