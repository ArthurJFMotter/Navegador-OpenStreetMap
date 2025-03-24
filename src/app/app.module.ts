// Angular Imports
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DeleteDialogComponent } from './components/delete-dialog/delete-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GeometryDialogComponent } from './components/geometry-dialog/geometry-dialog.component';
import { GeometryService } from './services/geometry.service';
import { MapScreenComponent } from './components/map-screen/map-screen.component';
import { OpenStreetMapService } from './services/open-street-map.service';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';

//extra imports
import 'leaflet-draw';

@NgModule({
  declarations: [
    AppComponent,
    DeleteDialogComponent,
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
    MatSelectModule,
    MatToolbarModule,
    ReactiveFormsModule
  ],
  providers: [GeometryService, OpenStreetMapService],
  bootstrap: [AppComponent]
})
export class AppModule { }