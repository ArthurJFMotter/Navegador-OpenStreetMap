import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';

interface ColorOption {
  value: string; 
  viewValue: string;
}

export interface GeometryDialogResult {
  name: string;
  color: string;
}

export interface GeometryDialogData {
  mode: 'create' | 'edit';
  featureProperties?: { [key: string]: any };
}

@Component({
  selector: 'app-geometry-dialog',
  standalone: false,
  templateUrl: './geometry-dialog.component.html',
  styleUrls: ['./geometry-dialog.component.scss'],
})
export class GeometryDialogComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;

  colors: ColorOption[] = [
    { value: '#FFEB3B', viewValue: 'Amarelo' },   
    { value: '#2196F3', viewValue: 'Azul' },      
    { value: '#9E9E9E', viewValue: 'Cinza' },     
    { value: '#000000', viewValue: 'Preto' },     
    { value: '#E91E63', viewValue: 'Rosa' },      
    { value: '#4CAF50', viewValue: 'Verde' },    
    { value: '#F44336', viewValue: 'Vermelho' },  
    { value: '#FFFFFF', viewValue: 'Branco' },    
    { value: '#FF9800', viewValue: 'Laranja' },   
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<GeometryDialogComponent, GeometryDialogResult>, 
    @Inject(MAT_DIALOG_DATA) public data: GeometryDialogData 
  ) {}

  ngOnInit(): void {
    this.isEditMode = this.data.mode === 'edit';
    this.buildForm();
  }

  buildForm(): void {
    const currentProperties = this.data.featureProperties || {};
    const initialName = this.isEditMode ? currentProperties['name'] || '' : 'Nova Geometria';
    const initialColor = this.isEditMode ? currentProperties['color'] || '#F44336' : '#F44336';

    this.form = this.fb.group({
      name: [initialName, Validators.required],
      color: [initialColor],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      const result: GeometryDialogResult = {
        name: this.form.value.name,
        color: this.form.value.color,
      };
      this.dialogRef.close(result);
    } else {
       this.form.markAllAsTouched();
       console.log("Form invalid:", this.form.errors);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}