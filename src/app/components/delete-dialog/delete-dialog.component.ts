import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-dialog',
  standalone: false,
  templateUrl: './delete-dialog.component.html',
  styleUrl: './delete-dialog.component.scss'
})
export class DeleteDialogComponent {

  public EntityName: string;
  public EntitySpecification: string;

  constructor(
    public dialogRef: MatDialogRef<DeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { entityName: string; entitySpecification: string }
  ) {
    this.EntityName = data.entityName;
    this.EntitySpecification = data.entitySpecification;
  }

  onConfirm(): void {
      this.dialogRef.close(true);
  }
    onCancel(): void {
        this.dialogRef.close(false);
    }
}