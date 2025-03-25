import { Injectable } from '@angular/core';
import { GeoJsonFeature, PointGeometry, LineStringGeometry, PolygonGeometry } from '../models/geometry.model';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';

@Injectable({
  providedIn: 'root'
})
export class GeometryService {

  createPoint(longitude: number, latitude: number, properties: any = null): GeoJsonFeature {
    const point: PointGeometry = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
    return {
      type: 'Feature',
      geometry: point,
      properties: properties,
    };
  }

  createLineString(coordinates: [number, number][], properties: any = null): GeoJsonFeature {
    const lineString: LineStringGeometry = {
      type: 'LineString',
      coordinates: coordinates
    };
    return {
      type: 'Feature',
      geometry: lineString,
      properties: properties
    };
  }
  createPolygon(coordinates: [number, number][][], properties: any = null): GeoJsonFeature {
    const polygon: PolygonGeometry = {
      type: 'Polygon',
      coordinates: coordinates
    };
    return {
      type: 'Feature',
      geometry: polygon,
      properties: properties
    };
  }
}