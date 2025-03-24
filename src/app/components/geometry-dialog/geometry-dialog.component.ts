import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GeometryViewModel } from '../../models/geometry.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface ColorOption {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-geometry-dialog',
  standalone: false,
  templateUrl: './geometry-dialog.component.html',
  styleUrl: './geometry-dialog.component.scss',
})
export class GeometryDialogComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;

  // Options
  colors: ColorOption[] = [
    { value: 'yellow', viewValue: 'Amarelo' },
    { value: 'blue', viewValue: 'Azul' },
    { value: 'gray', viewValue: 'Cinza' },
    { value: 'black', viewValue: 'Preto' },
    { value: 'pink', viewValue: 'Rosa' },
    { value: 'green', viewValue: 'Verde' },
    { value: 'red', viewValue: 'Vermelho' },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<GeometryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { geometry?: GeometryViewModel; mode: 'create' | 'edit' },
  ) { }

  ngOnInit(): void {
    this.isEditMode = this.data.mode === 'edit';
    this.buildForm();
  }

  buildForm(): void {
    const geometry = this.data.geometry;
    const initialColor = geometry && geometry.color ? geometry.color : 'black'; // Default to black

    this.form = this.fb.group({
      name: [geometry ? geometry.name : ''],
      type: [geometry ? geometry.type : (this.data.geometry?.type || ''), Validators.required],
      coordinates: [geometry ? geometry.coordinates : (this.data.geometry?.coordinates || []), Validators.required],
      color: [initialColor],
    });
  }
  onSubmit(): void {
    if (this.form.valid) {
      const formData: GeometryViewModel = {
        ...this.form.value,
        id: this.data.geometry?.id,
        layer: null,
      };

      this.dialogRef.close(formData);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}