import { Injectable } from '@angular/core';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

@Injectable({
  providedIn: 'root'
})
export class OpenStreetMapService {

  createOSMLayer(): TileLayer<OSM> {
    return new TileLayer({
      source: new OSM(),
    });
  }
}