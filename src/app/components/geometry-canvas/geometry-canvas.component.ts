import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { GeometryService, Geometry } from '../../services/geometry.service';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { GeometryDialogComponent } from '../geometry-dialog/geometry-dialog.component';

type Mode = 'draw' | 'edit' | 'delete' | 'none';

@Component({
  selector: 'app-geometry-canvas',
  standalone: false,
  templateUrl: './geometry-canvas.component.html',
  styleUrl: './geometry-canvas.component.scss',
})
export class GeometryCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D | null;
  private geometries: Geometry[] = [];
  private geometrySubscription!: Subscription;
  private selectedGeometry: Geometry | null = null;
  mode: Mode = 'none';
  drawingType: 'point' | 'line' | 'polygon' = 'point';
  private isDrawing = false;
  private tempCoordinates: number[][] = [];
  private previewCoordinates: number[][] = []; // For drawing preview

  constructor(private geometryService: GeometryService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.geometrySubscription = this.geometryService.geometries$.subscribe(
      (geometries) => {
        this.geometries = geometries;
        this.redrawCanvas();
      }
    );
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!this.ctx) {
      console.error("Could not get 2D context");
      return;
    }
    this.setupCanvasListeners();
    this.redrawCanvas(); // Initial draw
  }

  ngOnDestroy(): void {
    this.geometrySubscription.unsubscribe();
  }

  setupCanvasListeners(): void {
    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('dblclick', this.onDoubleClick.bind(this)); // Add double-click
  }
  onDoubleClick(event: MouseEvent): void{
    if (this.mode === 'draw' && (this.drawingType === 'line' || this.drawingType === 'polygon')) {
      this.finishDrawing();
    }
  }


  onClick(event: MouseEvent): void {
    if (this.mode === 'delete') {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

       // Find the geometry that was clicked.
      for (const geometry of this.geometries) {
        for (const coord of geometry.coordinates) {
          const distance = Math.sqrt((x - coord[0]) ** 2 + (y - coord[1]) ** 2);
          if (distance < 5) { // 5 pixel radius
            this.geometryService.deleteGeometry(geometry.id);
            return;
          }
        }
      }
    } else if (this.mode === 'edit') {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        for (const geometry of this.geometries) {
          for (const coord of geometry.coordinates) {
            const distance = Math.sqrt((x - coord[0]) ** 2 + (y - coord[1]) ** 2);
            if (distance < 5) { // 5 pixel radius for selection
                this.selectedGeometry = geometry;
                this.openDialog(geometry); //pass the geometry to be edited.
                return;
              }
          }
        }
    } else if (this.mode === 'draw' && this.drawingType === 'point') {
      // Handle point creation directly on click
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.tempCoordinates = [[x, y]]; // Single point
      this.finishDrawing();
    }
  }

  onMouseDown(event: MouseEvent): void {
    if (this.mode === 'draw' && this.drawingType !== 'point') {
      this.isDrawing = true;
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Start a new line/polygon or add a point to the existing one
      if (this.tempCoordinates.length === 0) {
        this.tempCoordinates.push([x, y]);
      } else {
        this.tempCoordinates.push([x,y]);
      }
        this.previewCoordinates = [...this.tempCoordinates, [x,y]]; //initialize with current point.
      this.redrawCanvas();
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (this.mode === 'draw' && this.isDrawing && this.drawingType !== 'point') {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      // Update the preview coordinates
      this.previewCoordinates = [...this.tempCoordinates, [x, y]]; // Add current mouse position
      this.redrawCanvas();
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this.mode === 'draw' && this.isDrawing && this.drawingType !== 'point') {
      //Line and Polygon needs one more click, so, we just update the canvas and dont save anything, untill double click.
       const rect = this.canvasRef.nativeElement.getBoundingClientRect();
       const x = event.clientX - rect.left;
       const y = event.clientY - rect.top;
       this.previewCoordinates = [...this.tempCoordinates, [x,y]];  //Add current mouse position
       this.redrawCanvas(); //update the canvas
    }
  }



  finishDrawing(): void {
    if (this.tempCoordinates.length > 0) {
      // For lines and polygons, open dialog *after* drawing
      this.openDialog({
        type: this.drawingType,
        coordinates: [...this.tempCoordinates],
      });
    }
    this.isDrawing = false;
    this.tempCoordinates = [];
    this.previewCoordinates = [];
  }

  drawPreview(): void {
    if (!this.ctx || this.previewCoordinates.length < 2) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // Semi-transparent blue for preview
    this.ctx.lineWidth = 2;
    this.ctx.moveTo(this.previewCoordinates[0][0], this.previewCoordinates[0][1]);
    for (let i = 1; i < this.previewCoordinates.length; i++) {
      this.ctx.lineTo(this.previewCoordinates[i][0], this.previewCoordinates[i][1]);
    }
    if (this.drawingType === 'polygon' && this.previewCoordinates.length > 2) {
       this.ctx.closePath();
    }

    this.ctx.stroke();
    this.ctx.closePath();
  }

  openDialog(geometryData: Partial<Geometry>): void {
     const dialogRef = this.dialog.open(GeometryDialogComponent, {
        width: '300px',
        data: {
        name: geometryData.name || '',  //Default or existing name
        geometry: geometryData
        }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const geometryToSave: Omit<Geometry, 'id'> = {
          name: result.name,
          type: geometryData.type!,
          coordinates: geometryData.coordinates!,
        };

        if(this.selectedGeometry){ //if we have something selected, means we are editing.
            this.geometryService.updateGeometry(this.selectedGeometry.id, geometryToSave);
            this.selectedGeometry = null; //clear selection
        } else {
            this.geometryService.addGeometry(geometryToSave);
        }
      }
    });
  }

  redrawCanvas(): void {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

    for (const geometry of this.geometries) {
      this.drawGeometry(geometry);
    }
    //Draw the preview of the geometry before saving.
    this.drawPreview();

  }

  drawGeometry(geometry: Geometry): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = geometry.color || 'black';
    this.ctx.lineWidth = 2;

    // Draw based on geometry type
    if (geometry.type === 'point') {
      this.ctx.arc(geometry.coordinates[0][0], geometry.coordinates[0][1], 3, 0, 2 * Math.PI);
      this.ctx.fill();
    } else if (geometry.type === 'line' || geometry.type === 'polygon') {
      if (geometry.coordinates.length > 0) {
        this.ctx.moveTo(geometry.coordinates[0][0], geometry.coordinates[0][1]);
      }
      for (let i = 1; i < geometry.coordinates.length; i++) {
        this.ctx.lineTo(geometry.coordinates[i][0], geometry.coordinates[i][1]);
      }
      if (geometry.type === 'polygon') {
        this.ctx.closePath(); // Close the polygon
      }
      this.ctx.stroke();
    }
    this.ctx.closePath();

    // Calculate and draw the name
    if (geometry.name && geometry.coordinates.length > 0) {
      this.ctx.font = '12px Arial';
      this.ctx.fillStyle = 'black';


      let centerX: number;
      let centerY: number;

      if (geometry.type === 'point') {
        centerX = geometry.coordinates[0][0];
        centerY = geometry.coordinates[0][1] - 10; // Position above the point
        this.ctx.textAlign = 'center'; // Center horizontally for point
        this.ctx.textBaseline = 'bottom'; // Align to bottom for point

      } else if (geometry.type === 'line') {
        // Midpoint of the line
        centerX = (geometry.coordinates[0][0] + geometry.coordinates[geometry.coordinates.length - 1][0]) / 2;
        centerY = (geometry.coordinates[0][1] + geometry.coordinates[geometry.coordinates.length - 1][1]) / 2;
        this.ctx.textAlign = 'center'; // Center the text horizontally
        this.ctx.textBaseline = 'middle'; // Center the text vertically
      } else if (geometry.type === 'polygon') {
        // Calculate centroid (average of all vertices)
        let sumX = 0;
        let sumY = 0;
        for (const coord of geometry.coordinates) {
          sumX += coord[0];
          sumY += coord[1];
        }
        centerX = sumX / geometry.coordinates.length;
        centerY = sumY / geometry.coordinates.length;
        this.ctx.textAlign = 'center'; // Center the text horizontally
        this.ctx.textBaseline = 'middle'; // Center the text vertically
      }
        else
      {
        centerX = 0;
        centerY = 0;
           this.ctx.textAlign = 'center'; // Center the text horizontally
        this.ctx.textBaseline = 'middle'; // Center the text vertically
      }

      this.ctx.fillText(geometry.name, centerX, centerY);
    }
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.isDrawing = false;
    this.tempCoordinates = [];
    this.previewCoordinates = []; // Reset preview
  }

  setDrawingType(type: 'point' | 'line' | 'polygon'): void {
    this.drawingType = type;
    this.tempCoordinates = []; // Clear existing temp coordinates
    this.previewCoordinates = [];
  }
}