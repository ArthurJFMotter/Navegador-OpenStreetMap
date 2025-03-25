import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenMapComponent } from './open-map.component';

describe('OpenMapComponent', () => {
  let component: OpenMapComponent;
  let fixture: ComponentFixture<OpenMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
