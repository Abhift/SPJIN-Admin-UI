import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/auth/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { NAV_SECTIONS, NavSection } from '../nav.config';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressBarModule,
    MatDividerModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly loading = inject(LoadingService);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly isLoading = this.loading.isLoading;
  readonly user = this.auth.user;

  readonly isHandset = toSignal(
    this.breakpoints.observe(Breakpoints.Handset).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly sections = computed<NavSection[]>(() =>
    NAV_SECTIONS.map((section) => ({
      heading: section.heading,
      items: section.items.filter(
        (item) => !item.permissions || this.auth.hasAnyPermission(...item.permissions),
      ),
    })).filter((section) => section.items.length > 0),
  );

  readonly opened = signal(true);

  toggle(): void {
    this.opened.update((v) => !v);
  }

  closeOnHandset(): void {
    if (this.isHandset()) {
      this.opened.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }

  initials(): string {
    const email = this.user()?.email ?? '';
    return email.charAt(0).toUpperCase() || '?';
  }
}
