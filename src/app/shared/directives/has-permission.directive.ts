import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/models/auth.models';

/** Structural directive: renders content only when the user has any of the given permissions. */
@Directive({ selector: '[appHasPermission]', standalone: true })
export class HasPermissionDirective {
  private readonly auth = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private rendered = false;

  @Input() set appHasPermission(permissions: Permission | Permission[]) {
    const required = Array.isArray(permissions) ? permissions : [permissions];
    const allowed = required.length === 0 || this.auth.hasAnyPermission(...required);
    if (allowed && !this.rendered) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.rendered = true;
    } else if (!allowed && this.rendered) {
      this.viewContainer.clear();
      this.rendered = false;
    }
  }
}
