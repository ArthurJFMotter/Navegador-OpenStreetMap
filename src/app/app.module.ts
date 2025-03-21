// Angular Imports
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { MapScreenComponent } from './components/map-screen/map-screen.component';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { OpenStreetMapService } from './services/open-street-map.service';
import { GeometryDialogComponent } from './components/geometry-dialog/geometry-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

//extra imports
import 'leaflet-draw';
import { GeometryService } from './services/geometry.service';

@NgModule({
  declarations: [
    AppComponent,
    GeometryDialogComponent,
    MapScreenComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatToolbarModule,
    ReactiveFormsModule
  ],
  providers: [OpenStreetMapService, GeometryService],
  bootstrap: [AppComponent]
})
export class AppModule { }