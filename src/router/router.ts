/** Minimal hash router — zero dependencies. */
import { useEffect, useState } from 'react';

export const routes = [
  { path: 'dashboard', title: 'لوحة التحكم' },
  { path: 'pos', title: 'نقطة البيع' },
  { path: 'sales', title: 'فواتير المبيعات' },
  { path: 'purchaseOrders', title: 'طلبات الشراء' },
  { path: 'purchases', title: 'فواتير المشتريات' },
  { path: 'inventory', title: 'المخازن' },
  { path: 'partners', title: 'العملاء والموردون' },
  { path: 'crm', title: 'إدارة العملاء CRM' },
  { path: 'hr', title: 'الموظفين' },
  { path: 'projects', title: 'المشاريع' },
  { path: 'accounting', title: 'المحاسبة' },
  { path: 'reports', title: 'التقارير' },
  { path: 'bi', title: 'الذكاء والتوقعات' },
  { path: 'calendar', title: 'التقويم' },
  { path: 'settings', title: 'الإعدادات' },
  { path: 'team', title: 'الفريق والأدوار' },
] as const;

export type RoutePath = (typeof routes)[number]['path'];

export function currentRoute(): RoutePath {
  const h = location.hash.replace('#/', '') || 'dashboard';
  return (routes.find(r => r.path === h)?.path ?? 'dashboard') as RoutePath;
}

export function navigate(path: RoutePath): void {
  location.hash = `/${path}`;
}

export function useRoute(): [RoutePath, (p: RoutePath) => void] {
  const [route, setRoute] = useState<RoutePath>(currentRoute());
  useEffect(() => {
    const on = () => setRoute(currentRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, navigate];
}

export function routeTitle(p: string): string {
  return routes.find(r => r.path === p)?.title ?? '';
}
