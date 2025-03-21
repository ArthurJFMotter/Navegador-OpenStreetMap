import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeometryCanvasComponent } from './geometry-canvas.component';

describe('GeometryCanvasComponent', () => {
  let component: GeometryCanvasComponent;
  let fixture: ComponentFixture<GeometryCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeometryCanvasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeometryCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
