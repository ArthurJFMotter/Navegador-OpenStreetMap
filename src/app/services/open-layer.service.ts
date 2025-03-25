import { Injectable } from '@angular/core';
import { Feature, Map, View } from 'ol';
import { GeoJsonFeature } from '../models/geometry.model';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { Geometry } from 'ol/geom'; 
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import TileLayer from 'ol/layer/Tile';

@Injectable({
  providedIn: 'root'
})
export class OpenLayerService {

  createVectorLayer(features: Feature<Geometry>[]): VectorLayer<VectorSource<Feature<Geometry>>> {
    const vectorSource = new VectorSource<Feature<Geometry>>({
      features: features
    });

    return new VectorLayer({
      source: vectorSource,
      style: this.getDefaultStyle(),
    });
  }

  getDefaultStyle(): Style {
    return new Style({
      stroke: new Stroke({
        color: 'blue',
        width: 3,
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)',
      }),
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: 'red' }),
        stroke: new Stroke({ color: 'white', width: 2 })
      })
    });
  }

  createMap(target: string | HTMLElement, layers: (VectorLayer<any> | TileLayer<any>)[], center: [number, number] = [0, 0], zoom: number = 2): Map {
    return new Map({
      target: target,
      layers: layers,
      view: new View({
        center: fromLonLat(center),
        zoom: zoom,
      }),
    });
  }

  createFeatureFromGeoJson(geoJsonFeature: GeoJsonFeature): Feature<Geometry> {
    const feature = new Feature({
      geometry: this.convertGeoJsonGeometryToOlGeometry(geoJsonFeature.geometry),
      properties: geoJsonFeature.properties
    });
    if (geoJsonFeature.id) {
      feature.setId(geoJsonFeature.id);
    }
    return feature;
  }

  convertGeoJsonGeometryToOlGeometry(geoJsonGeometry: any): Geometry {
    let olGeometry: Geometry;

    switch (geoJsonGeometry.type) {
      case 'Point':
        olGeometry = new Point(fromLonLat(geoJsonGeometry.coordinates));
        break;
      case 'LineString':
        olGeometry = new LineString(geoJsonGeometry.coordinates.map((coord: [number, number]) => fromLonLat(coord)));
        break;
      case 'Polygon':
        const transformedCoordinates = geoJsonGeometry.coordinates.map((ring: any) =>
          ring.map((coord: [number, number]) => fromLonLat(coord))
        );
        olGeometry = new Polygon(transformedCoordinates);
        break;

      default:
        throw new Error(`Unsupported geometry type: ${geoJsonGeometry.type}`);
    }

    return olGeometry;
  }
}