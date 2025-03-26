import { Injectable } from '@angular/core';
import { Feature, Map, View } from 'ol';
import { GeoJsonFeature } from '../models/geometry.model';
import { Style, Stroke, Fill, Circle as CircleStyle, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { Geometry } from 'ol/geom';
import { FeatureLike } from 'ol/Feature';
import { Zoom, Attribution } from 'ol/control.js';

import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import TileLayer from 'ol/layer/Tile';

const DEFAULT_COLOR = '#3399CC';
const DEFAULT_WIDTH = 3;
const SELECTED_COLOR = '#FF00FF';
const SELECTED_WIDTH = 4;
const TEXT_FILL_COLOR = '#000000'; // Black text
const TEXT_STROKE_COLOR = '#FFFFFF'; // White outline
const TEXT_STROKE_WIDTH = 3;
const TEXT_FONT = '12px Calibri, sans-serif';
const POINT_LABEL_OFFSET_Y = -15;

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
      controls: [
        new Zoom(),          
        new Attribution({
           collapsible: false
        })
      ]
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

  createStyleFunction(): (feature: FeatureLike, resolution: number) => Style | Style[] {
    return (feature: FeatureLike, resolution: number): Style | Style[] => {
      const featureName = feature.get('name') as string || '';
      const featureColor = feature.get('color') || DEFAULT_COLOR;
      const geometry = feature.getGeometry();
      const geometryType = geometry?.getType();

      const geometryStyle = new Style({
        stroke: new Stroke({
          color: featureColor,
          width: DEFAULT_WIDTH,
        }),
        fill: new Fill({
          color: this.hexToRgba(featureColor, 0.3),
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: this.hexToRgba(featureColor, 0.6)
          }),
          stroke: new Stroke({ color: TEXT_STROKE_COLOR, width: 2 })
        })
      });

      let textStyle: Style | null = null;

      if (featureName) {
        let textOptions: any = {
          text: featureName,
          font: TEXT_FONT,
          fill: new Fill({ color: TEXT_FILL_COLOR }),
          stroke: new Stroke({ color: TEXT_STROKE_COLOR, width: TEXT_STROKE_WIDTH }),
          overflow: true,
        };

        if (geometryType === 'Point') {
          textOptions.textAlign = 'center';
          textOptions.textBaseline = 'bottom';
          textOptions.offsetY = POINT_LABEL_OFFSET_Y;
        } else if (geometryType === 'LineString') {
          textOptions.textAlign = 'center';
          textOptions.textBaseline = 'middle';
          textOptions.placement = 'line';
        } else if (geometryType === 'Polygon') {
          textOptions.textAlign = 'center';
          textOptions.textBaseline = 'middle';
        }

        textStyle = new Style({
          text: new Text(textOptions)
        });
      }

      return textStyle ? [geometryStyle, textStyle] : geometryStyle;
    };
  }

  createSelectStyleFunction(): (feature: FeatureLike, resolution: number) => Style | Style[] {
    return (feature: FeatureLike, resolution: number): Style | Style[] => {
      const featureName = feature.get('name') as string || '';
      const geometry = feature.getGeometry();
      const geometryType = geometry?.getType();

      const selectGeometryStyle = new Style({
        stroke: new Stroke({
          color: SELECTED_COLOR,
          width: SELECTED_WIDTH + 1,
        }),
        fill: new Fill({
          color: this.hexToRgba(SELECTED_COLOR, 0.4),
        }),
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({
            color: this.hexToRgba(SELECTED_COLOR, 0.6)
          }),
          stroke: new Stroke({ color: TEXT_STROKE_COLOR, width: 2 })
        }),
        zIndex: 1
      });

      let selectTextStyle: Style | null = null;
      if (featureName) {
        let textOptions: any = {
          text: featureName,
          font: `bold ${TEXT_FONT}`,
          fill: new Fill({ color: SELECTED_COLOR }),
          stroke: new Stroke({ color: TEXT_STROKE_COLOR, width: TEXT_STROKE_WIDTH + 1 }),
          overflow: true,
          zIndex: 2
        };

        if (geometryType === 'Point') {
          textOptions.textAlign = 'center';
          textOptions.textBaseline = 'bottom';
          textOptions.offsetY = POINT_LABEL_OFFSET_Y - 2;
        } else if (geometryType === 'LineString') {
          textOptions.textAlign = 'center';
          textOptions.textBaseline = 'middle';
          textOptions.placement = 'line';
        } else if (geometryType === 'Polygon') {
          textOptions.textAlign = 'center';
          textOptions.textBaseline = 'middle';
        }

        selectTextStyle = new Style({
          text: new Text(textOptions)
        });
      }

      return selectTextStyle ? [selectGeometryStyle, selectTextStyle] : selectGeometryStyle;
    };
  }

  hexToRgba(hex: string, alpha: number = 1): string {
    let r = 0, g = 0, b = 0;

    if (hex?.length == 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex?.length == 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }

    if (!hex || isNaN(r) || isNaN(g) || isNaN(b)) {
      // Log warning only once or provide a fallback default
      // console.warn(`Invalid or missing hex color: '${hex}'. Using default gray.`);
      return `rgba(128, 128, 128, ${alpha})`;
    }
    return `rgba(${r},${g},${b},${alpha})`;
  }

}