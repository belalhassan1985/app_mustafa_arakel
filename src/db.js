import Dexie from 'dexie';

// 1. تعريف قاعدة البيانات
export const db = new Dexie('ShishaStoreDB');

// 2. تحديد جداول قاعدة البيانات ومفاتيح الفهرسة ودعم الترقية
db.version(1).stores({
  products: '++id, name, category, buyPrice, sellPrice, stock',
  sales: '++id, date, totalAmount, discount, finalAmount',
  saleItems: '++id, saleId, productId, productName, quantity, unitPrice, unitBuyPrice'
});

db.version(2).stores({
  products: '++id, name, category, buyPrice, sellPrice, stock',
  sales: '++id, date, totalAmount, discount, finalAmount',
  saleItems: '++id, saleId, productId, productName, quantity, unitPrice, unitBuyPrice',
  categories: '++id, name'
});

db.version(3).stores({
  products: '++id, name, category, buyPrice, sellPrice, stock, syncStatus',
  sales: '++id, date, totalAmount, discount, finalAmount, syncStatus',
  saleItems: '++id, saleId, productId, productName, quantity, unitPrice, unitBuyPrice, syncStatus',
  categories: '++id, name, syncStatus'
});

// 3. دالة بذر البيانات الأولية (Seed Data)
export async function seedDatabase() {
  // أ. بذر التصنيفات إذا كانت فارغة
  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkAdd([
      { name: 'معسل' },
      { name: 'فيب' },
      { name: 'أراكيل' },
      { name: 'فحم' },
      { name: 'ملحقات' }
    ]);
    console.log('تم إدراج التصنيفات التجريبية بنجاح.');
  }

  // ب. بذر المنتجات إذا كانت فارغة
  const count = await db.products.count();
  if (count === 0) {
    await db.products.bulkAdd([
      {
        name: 'معسل فاخر تفاحتين - كرتون',
        category: 'معسل',
        buyPrice: 3500,
        sellPrice: 5000,
        stock: 45,
        image: ''
      },
      {
        name: 'سحبة فيب جاهزة 9000 سحبة',
        category: 'فيب',
        buyPrice: 10000,
        sellPrice: 15000,
        stock: 18,
        image: ''
      },
      {
        name: 'فحم فوري سريع الاشتعال (أبو سهم)',
        category: 'فحم',
        buyPrice: 1200,
        sellPrice: 2500,
        stock: 80,
        image: ''
      },
      {
        name: 'أرجيلة خليل مأمون كلاسيك نحاس',
        category: 'أراكيل',
        buyPrice: 30000,
        sellPrice: 45000,
        stock: 8,
        image: ''
      },
      {
        name: 'رأس أرجيلة فخار تركي',
        category: 'ملحقات',
        buyPrice: 1500,
        sellPrice: 3000,
        stock: 25,
        image: ''
      }
    ]);
    console.log('تم إدراج المنتجات التجريبية بنجاح.');
  }
}

// تشغيل البذر تلقائياً عند استيراد الملف
seedDatabase().catch(err => {
  console.error('خطأ أثناء بذر البيانات الأولية في قاعدة البيانات:', err);
});
