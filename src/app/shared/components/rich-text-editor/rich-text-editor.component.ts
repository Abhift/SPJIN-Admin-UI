import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';

/**
 * Shared rich-text editor (Quill) with the standard formatting toolbar used
 * across the admin console. Bind a reactive FormControl via [control]; the
 * control value is an HTML string (null when the editor is empty).
 */
@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [ReactiveFormsModule, QuillModule],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
})
export class RichTextEditorComponent {
  @Input({ required: true }) control!: FormControl<string>;
  @Input() label = '';
  @Input() placeholder = '';
  @Input() minHeight = '140px';

  readonly modules = {
    toolbar: [
      [{ header: [2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['blockquote', 'link'],
      ['clean'],
    ],
  };
}
