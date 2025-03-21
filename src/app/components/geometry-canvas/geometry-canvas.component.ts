import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  HostListener,
  Renderer2,
  Input
} from '@angular/core';
import { GeometryService } from '../../services/geometry.service';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { GeometryDialogComponent } from '../geometry-dialog/geometry-dialog.component';
import { GeometryViewModel } from '../../models/geometry.model';

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
  private geometries: GeometryViewModel[] = [];
  private geometrySubscription!: Subscription;
  private selectedGeometry: GeometryViewModel | null = null;
  mode: Mode = 'none';
  drawingType: 'point' | 'line' | 'polygon' = 'point';

  private isDrawing = false;
  private tempCoordinates: number[][] = [];
  private previewCoordinates: number[][] = [];
  private scaleX = 1;  // Scaling factor for X
  private scaleY = 1;  // Scaling factor for Y
  canvasWidth = 800;
  canvasHeight = 600;
  @Input() editingGeometryId: string | null = null;

  constructor(
    private geometryService: GeometryService,
    private dialog: MatDialog,
    private renderer: Renderer2) { }

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
      console.error('Could not get 2D context');
      return;
    }

    this.renderer.setAttribute(this.canvasRef.nativeElement, 'width', this.canvasWidth.toString());
    this.renderer.setAttribute(this.canvasRef.nativeElement, 'height', this.canvasHeight.toString());
    this.calculateScalingFactors();
    this.setupCanvasListeners();
    this.redrawCanvas();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.calculateScalingFactors();
    this.redrawCanvas();
  }

  calculateScalingFactors() {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.scaleX = this.canvasWidth / rect.width;
    this.scaleY = this.canvasHeight / rect.height;
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
    canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
  }

  onDoubleClick(event: MouseEvent): void {
    if (this.mode === 'draw' && (this.drawingType === 'line' || this.drawingType === 'polygon')) {
      this.finishDrawing();
    }
  }

  onClick(event: MouseEvent): void {
    if (this.mode === 'delete') {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) * this.scaleX;
      const y = (event.clientY - rect.top) * this.scaleY;

      for (const geometry of this.geometries) {
        for (const coord of geometry.coordinates) {
          const distance = Math.sqrt((x - coord[0]) ** 2 + (y - coord[1]) ** 2);
          if (distance < 5 && geometry.id) {
            this.geometryService.deleteGeometry(geometry.id);
            return;
          }
        }
      }
    } else if (this.mode === 'edit') {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) * this.scaleX;
      const y = (event.clientY - rect.top) * this.scaleY;

      for (const geometry of this.geometries) {
        for (const coord of geometry.coordinates) {
          const distance = Math.sqrt((x - coord[0]) ** 2 + (y - coord[1]) ** 2);
          if (distance < 5) {
            this.selectedGeometry = geometry;
            this.openDialog(geometry);
            return;
          }
        }
      }
    } else if (this.mode === 'draw' && this.drawingType === 'point') {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) * this.scaleX;
      const y = (event.clientY - rect.top) * this.scaleY;
      this.tempCoordinates = [[x, y]];
      this.finishDrawing();
    }
  }

  onMouseDown(event: MouseEvent): void {
    if (this.mode === 'draw' && this.drawingType !== 'point') {
      this.isDrawing = true;
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) * this.scaleX;
      const y = (event.clientY - rect.top) * this.scaleY;

      if (this.tempCoordinates.length === 0) {
        this.tempCoordinates.push([x, y]);
      } else {
        this.tempCoordinates.push([x, y]);
      }
      this.previewCoordinates = [...this.tempCoordinates, [x, y]];
      this.redrawCanvas();
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (this.mode === 'draw' && this.isDrawing && this.drawingType !== 'point') {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) * this.scaleX;
      const y = (event.clientY - rect.top) * this.scaleY;

      this.previewCoordinates = [...this.tempCoordinates, [x, y]];
      this.redrawCanvas();
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this.mode === 'draw' && this.isDrawing && this.drawingType !== 'point') {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) * this.scaleX;
      const y = (event.clientY - rect.top) * this.scaleY;
      this.previewCoordinates = [...this.tempCoordinates, [x, y]];
      this.redrawCanvas();
    }
  }
  //Other methods remains the same.
  finishDrawing(): void {
    if (this.tempCoordinates.length > 0) {
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
    this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
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

  toggleForm() {
    this.openDialog();
  }

  openDialog(geometry?: GeometryViewModel): void {
    console.log("geometry: ", geometry)
    const dialogRef = this.dialog.open(GeometryDialogComponent, {
      data: { geometry },
    });

    dialogRef.afterClosed().subscribe((result: GeometryViewModel | null) => {
      if (result) {
        if (this.selectedGeometry && this.selectedGeometry.id) {
          this.geometryService.updateGeometry(this.selectedGeometry.id, result); // Pass the complete result
          this.selectedGeometry = null;
        } else {
          this.geometryService.addGeometry(result); // Pass the complete result
        }
      }
      this.editingGeometryId = null;
    });
  }

  toggleEdit(geometry: GeometryViewModel): void {
    if (this.editingGeometryId === geometry.id) {
      this.editingGeometryId = null;
    } else {
      //Safe way to assign the id.
      this.editingGeometryId = geometry.id ? geometry.id : null;
      this.openDialog(geometry);
    }
  }

  redrawCanvas(): void {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    for (const geometry of this.geometries) {
      this.drawGeometry(geometry);
    }
    this.drawPreview();
  }
  drawGeometry(geometry: GeometryViewModel): void {
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
        this.ctx.closePath();
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
        centerY = geometry.coordinates[0][1] - 10;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';

      } else if (geometry.type === 'line') {
        // Midpoint of the line
        centerX = (geometry.coordinates[0][0] + geometry.coordinates[geometry.coordinates.length - 1][0]) / 2;
        centerY = (geometry.coordinates[0][1] + geometry.coordinates[geometry.coordinates.length - 1][1]) / 2;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
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
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
      }
      else {
        centerX = 0;
        centerY = 0;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
      }

      this.ctx.fillText(geometry.name, centerX, centerY);
    }
  }

  toggleDraw() {
    this.mode = this.isDrawing ? 'none' : 'draw';
    this.isDrawing = !this.isDrawing;
    this.tempCoordinates = [];
    this.previewCoordinates = [];
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.isDrawing = false;
    this.tempCoordinates = [];
    this.previewCoordinates = [];
  }

  setDrawingType(type: 'point' | 'line' | 'polygon'): void {
    this.drawingType = type;
    this.tempCoordinates = [];
    this.previewCoordinates = [];
  }
}