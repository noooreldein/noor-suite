/** Collection hooks built on the app store. */
import { useCallback } from 'react';
import { Collection } from '../types/core';
import { useStore } from './AppStore';

export function useCollection<T>(col: Collection) {
  const { data, add, update, remove } = useStore();
  const items = (data as any)[col] as T[];
  return {
    items,
    byId: useCallback((id: string) => items.find((i: any) => i.id === id) as T | undefined, [items]),
    add: useCallback((rec: any) => add(col, rec), [add, col]),
    update: useCallback((id: string, patch: any) => update(col, id, patch), [update, col]),
    remove: useCallback((id: string) => remove(col, id), [remove, col]),
  };
}

export function useProducts() { return useCollection<any>('products'); }
export function usePartners() { return useCollection<any>('partners'); }
export function useInvoices() { return useCollection<any>('invoices'); }
export function useLeads() { return useCollection<any>('leads'); }
export function useEmployees() { return useCollection<any>('employees'); }
export function useTasks() { return useCollection<any>('tasks'); }
export function useNotifications() { return useCollection<any>('notifications'); }
