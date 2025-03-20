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
    // todo
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 0);
  }

  private initMap(): void {
    this.map = this.mapService.initMap(this.mapElement.nativeElement, {
      center: [-23.478549220947194, -47.42413624752591],
      zoom: 19
    });
  }
}