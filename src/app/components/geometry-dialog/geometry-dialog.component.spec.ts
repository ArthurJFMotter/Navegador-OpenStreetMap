import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeometryDialogComponent } from './geometry-dialog.component';

describe('GeometryDialogComponent', () => {
  let component: GeometryDialogComponent;
  let fixture: ComponentFixture<GeometryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeometryDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeometryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
