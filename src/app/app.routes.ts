import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'migrate',
        loadComponent: () => import('./features/migrate/migrate.component').then(m => m.MigrateComponent),
      },
      {
        path: 'history',
        loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent),
      },
      {
        path: 'log-report',
        loadComponent: () => import('./features/log-report/log-report.component').then(m => m.LogReportComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
