import { openDB, type IDBPDatabase } from 'idb';
import type { PosProduct, AdminCategory } from '@/lib/admin/api';

const DB = 'pos-offline';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pendingSales')) {
          const store = db.createObjectStore('pendingSales', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('synced', 'synced');
        }
      },
    });
  }
  return dbPromise;
}

export type PendingSale = {
  id?: number;
  synced: boolean;
  createdAt: string;
  body: {
    session_id: number;
    items: { product_id: number; quantity: number }[];
    payment_method: 'cash' | 'mobile_money' | 'card';
    amount_paid: number;
    discount_amount: number;
    customer_phone?: string;
  };
};

export async function cacheProducts(products: PosProduct[]) {
  const db = await getDb();
  const tx = db.transaction('products', 'readwrite');
  for (const p of products) {
    await tx.store.put(p);
  }
  await tx.done;
}

export async function getCachedProducts(): Promise<PosProduct[]> {
  const db = await getDb();
  return db.getAll('products');
}

export async function cacheCategories(categories: AdminCategory[]) {
  const db = await getDb();
  const tx = db.transaction('categories', 'readwrite');
  for (const c of categories) {
    await tx.store.put(c);
  }
  await tx.done;
}

export async function getCachedCategories(): Promise<AdminCategory[]> {
  const db = await getDb();
  return db.getAll('categories');
}

export async function queueSale(sale: Omit<PendingSale, 'id' | 'synced' | 'createdAt'>) {
  const db = await getDb();
  const id = await db.add('pendingSales', {
    ...sale,
    synced: false,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await getDb();
  const all: PendingSale[] = await db.getAll('pendingSales');
  return all.filter((s) => !s.synced);
}

export async function markSynced(id: number) {
  const db = await getDb();
  const existing = await db.get('pendingSales', id) as PendingSale | undefined;
  if (existing) {
    await db.put('pendingSales', { ...existing, synced: true });
  }
}

export async function clearSynced() {
  const db = await getDb();
  const all: PendingSale[] = await db.getAll('pendingSales');
  const tx = db.transaction('pendingSales', 'readwrite');
  for (const item of all) {
    if (item.synced && item.id != null) {
      await tx.store.delete(item.id);
    }
  }
  await tx.done;
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const all: PendingSale[] = await db.getAll('pendingSales');
  return all.filter((s) => !s.synced).length;
}
