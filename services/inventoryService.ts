
import { Product, InventoryLog } from '../types';

/**
 * Service to manage SME inventory.
 * Used primarily by the Worker dashboard for rapid operations.
 */

let mockInventory: Product[] = [
    { id: '1', name: 'Tela Algodón Premium', sku: 'TEL-001', price: 25.50, stock: 150, category: 'Telas' },
    { id: '2', name: 'Hilo Industrial Blanco', sku: 'HIL-002', price: 12.00, stock: 45, category: 'Insumos' },
    { id: '3', name: 'Botón Nácar 15mm', sku: 'BOT-003', price: 0.50, stock: 1200, category: 'Insumos' },
];

export const getInventory = async (): Promise<Product[]> => {
    return [...mockInventory];
};

export const updateStock = async (productId: string, quantity: number, reason: string): Promise<Product> => {
    const product = mockInventory.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');
    
    product.stock += quantity;
    console.log(`[INVENTORY] Updated ${product.name}: ${quantity} units (Reason: ${reason})`);
    
    return { ...product };
};

export const addProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
    const newProduct = { ...product, id: Math.random().toString(36).substring(7) };
    mockInventory.push(newProduct);
    return newProduct;
};
