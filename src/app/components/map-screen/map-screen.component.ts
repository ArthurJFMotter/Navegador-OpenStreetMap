import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { OpenStreetMapService } from '../../services/open-street-map.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-screen',
  standalone: false,
  templateUrl: './map-screen.component.html',
  styleUrl: './map-screen.component.scss'
})
export class MapScreenComponent implements OnInit, AfterViewInit {
  @ViewChild('map') mapElement!: ElementRef;
  private map!: L.Map;

  constructor(private mapService: OpenStreetMapService) { }

  ngOnInit(): void {
    // Nothing needed here for the simplified version
  }

  ngAfterViewInit(): void {
    // Initialize the map after the view is initialized
    setTimeout(() => {
      this.initMap();
    }, 0);
  }

  private initMap(): void {
    // Initialize the map with a default view of Europe
    this.map = this.mapService.initMap(this.mapElement.nativeElement, {
      center: [48.8566, 2.3522], // Paris, as a central point in Europe
      zoom: 5
    });
  }
}