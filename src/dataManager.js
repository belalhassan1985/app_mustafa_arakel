import { supabase } from './supabaseClient';
import { db } from './db';

// دالة مساعدة لتحويل سلسلة Base64 إلى Blob بطريقة آمنة ومباشرة تدعم سلاسل Base64 بدون بادئات
export function base64ToBlob(base64Data, contentType = 'image/jpeg') {
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const byteCharacters = atob(cleanBase64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

// دالة لمساعدة تحويل الصور من Base64 ورفعها إلى Supabase Storage Bucket المسماة 'products'
export async function uploadProductImage(base64Str, filename) {
  if (!base64Str || base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
    return base64Str; // إذا كان رابطاً بالفعل أو فارغاً، نعيده كما هو
  }

  try {
    let contentType = 'image/jpeg';
    if (base64Str.startsWith('data:')) {
      const match = base64Str.match(/data:(.*?);/);
      if (match && match[1]) {
        contentType = match[1];
      }
    }

    const blob = base64ToBlob(base64Str, contentType);
    const fileExt = contentType.split('/')[1] || 'jpeg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = uniqueName; // الرفع مباشرة إلى جذر الحاوية لتجنب مشاكل صلاحيات المجلدات الفرعية

    // 2. الرفع إلى حاوية الصور 'products'
    const { data, error } = await supabase.storage
      .from('products')
      .upload(filePath, blob, {
        contentType: contentType,
        upsert: true
      });

    if (error) throw error;

    // 3. جلب الرابط العام للصورة المرفوعة
    const { data: publicUrlData } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('فشل رفع الصورة إلى Supabase Storage، سيتم حفظها محلياً بصيغة base64:', err);
    return base64Str; // التراجع لحفظ الصورة محلياً في حالة الفشل
  }
}

// ==================== إدارة المنتجات (Products) ====================

export async function saveProduct(product) {
  // أ. رفع الصورة إن كانت مضافة حديثاً كملف base64
  let finalImageUrl = product.image;
  if (product.image && !product.image.startsWith('http://') && !product.image.startsWith('https://')) {
    finalImageUrl = await uploadProductImage(product.image, product.name);
  }

  const isOnline = navigator.onLine;
  let synced = false;
  let savedId = product.id;

  // ب. إذا كان الإنترنت متوفراً، نحاول الحفظ في Supabase أولاً
  if (isOnline) {
    try {
      let categoryId = null;
      // البحث عن التصنيف في Supabase مباشرة للتأكد من وجوده وجلب معرّفه الحقيقي
      const { data: catData, error: catFetchErr } = await supabase
        .from('categories')
        .select('id')
        .eq('name', product.category)
        .maybeSingle();
      
      if (!catFetchErr && catData) {
        categoryId = catData.id;
      } else {
        // إذا لم يكن موجوداً على السيرفر، نبحث محلياً كخيار ثانٍ
        const catRecord = await db.categories.where('name').equals(product.category).first();
        categoryId = catRecord ? catRecord.id : null;
      }

      if (!categoryId) {
        // إنشاء التصنيف على السيرفر تلقائياً لتفادي رفض إدراج المنتج بسبب قيود العلاقات
        const { data: newCat, error: newCatErr } = await supabase
          .from('categories')
          .insert([{ name: product.category || 'عام' }])
          .select();
        
        if (newCatErr) {
          console.error('Supabase DB Auto-Category Creation Error:', newCatErr);
          throw newCatErr;
        }
        if (newCat && newCat[0]) {
          categoryId = newCat[0].id;
          await db.categories.put({
            id: categoryId,
            name: product.category || 'عام',
            syncStatus: 'synced'
          });
        }
      }

      const supabasePayload = {
        name: product.name,
        category: product.category || 'عام',
        category_id: categoryId,
        cost: Number(product.buyPrice),
        price: Number(product.sellPrice),
        stock: Number(product.stock),
        image_url: finalImageUrl
      };

      console.log('كائن المنتج المُراد إدراجه في Supabase:', supabasePayload);

      if (product.id) {
        // تحديث منتج قائم
        const { error } = await supabase
          .from('products')
          .update(supabasePayload)
          .eq('id', product.id);

        if (error) {
          console.error('Supabase DB Update Error:', error);
          throw error;
        }
      } else {
        // إضافة منتج جديد
        const { data, error } = await supabase
          .from('products')
          .insert([supabasePayload])
          .select();

        if (error) {
          console.error('Supabase DB Insert Error:', error);
          throw error;
        }
        if (data && data[0]) {
          savedId = data[0].id; // أخذ الـ ID المولد من السيرفر
        }
      }
      synced = true;
    } catch (err) {
      console.error('فشل حفظ المنتج في Supabase، التفاصيل:', err);
      alert(`خطأ سحابة Supabase:\n${err.message || err.details || JSON.stringify(err)}`);
      throw err; // رمي الخطأ للواجهة لوقف الحفظ التلقائي أوفلاين أثناء الفحص
    }
  }

  // ج. الحفظ في قاعدة البيانات المحلية Dexie باستخدام put لمنع تعارض المعرفات الناتجة عن الـ Realtime
  const dexiePayload = {
    ...product,
    id: savedId,
    image: finalImageUrl,
    syncStatus: synced ? 'synced' : 'pending'
  };
  await db.products.put(dexiePayload);
}

export async function deleteProduct(productId) {
  const isOnline = navigator.onLine;
  let deletedOnSupabase = false;

  if (isOnline) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      deletedOnSupabase = true;
    } catch (err) {
      console.error('فشل حذف المنتج من Supabase، سيتم جدولته للحذف لاحقاً:', err);
    }
  }

  // إذا لم يتم الحذف من السيرفر (بسبب الأوفلاين)، نضيف المعرف لقائمة الحذف المؤجل
  if (!deletedOnSupabase) {
    const pendingDeletions = JSON.parse(localStorage.getItem('pending_deletions') || '[]');
    pendingDeletions.push({ table: 'products', id: productId });
    localStorage.setItem('pending_deletions', JSON.stringify(pendingDeletions));
  }

  // الحذف من قاعدة البيانات المحلية Dexie
  await db.products.delete(productId);
}

// ==================== إدارة التصنيفات (Categories) ====================

export async function saveCategory(category) {
  const isOnline = navigator.onLine;
  let synced = false;
  let savedId = category.id;

  if (isOnline) {
    try {
      const supabasePayload = { name: category.name };

      if (category.id) {
        const { error } = await supabase
          .from('categories')
          .update(supabasePayload)
          .eq('id', category.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert([supabasePayload])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          savedId = data[0].id;
        }
      }
      synced = true;
    } catch (err) {
      console.error('فشل حفظ التصنيف في Supabase:', err);
    }
  }

  // الحفظ محلياً باستخدام put للتعامل الآمن مع الإضافة والتحديث وتفادي مشاكل التعارض
  const dexiePayload = {
    ...category,
    id: savedId,
    syncStatus: synced ? 'synced' : 'pending'
  };
  await db.categories.put(dexiePayload);
}

export async function deleteCategory(catId, catName) {
  const isOnline = navigator.onLine;
  let deletedOnSupabase = false;

  if (isOnline) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', catId);

      if (error) throw error;
      deletedOnSupabase = true;
    } catch (err) {
      console.error('فشل حذف التصنيف من Supabase:', err);
    }
  }

  if (!deletedOnSupabase) {
    const pendingDeletions = JSON.parse(localStorage.getItem('pending_deletions') || '[]');
    pendingDeletions.push({ table: 'categories', id: catId });
    localStorage.setItem('pending_deletions', JSON.stringify(pendingDeletions));
  }

  // الحذف محلياً
  await db.categories.delete(catId);

  // تحديث المنتجات المحلية لتكون فئتها 'ملحقات' (مثل سلوك POS القديم)
  const relatedProducts = await db.products.where('category').equals(catName).toArray();
  for (const p of relatedProducts) {
    await db.products.update(p.id, { category: 'ملحقات', syncStatus: 'pending' });
  }
}

// ==================== إتمام المبيعات والفواتير (Sales) ====================

export async function checkoutSale(saleData, items) {
  const isOnline = navigator.onLine;
  let synced = false;
  let savedSaleId = saleData.id || Date.now(); // استخدام تيمستامب كمعرف محلي مؤقت إن لزم الأمر

  if (isOnline) {
    try {
      // 1. إدراج الفاتورة في Supabase
      const { data: insertedSale, error: saleErr } = await supabase
        .from('sales')
        .insert([{
          date: saleData.date,
          total_amount: Number(saleData.totalAmount),
          discount: Number(saleData.discount),
          final_amount: Number(saleData.finalAmount)
        }])
        .select();

      if (saleErr) throw saleErr;
      if (insertedSale && insertedSale[0]) {
        savedSaleId = insertedSale[0].id;
      }

      // 2. إدراج مواد الفاتورة وتحديث كميات مخزن المنتجات على السيرفر
      for (const item of items) {
        const { error: itemErr } = await supabase
          .from('sale_items')
          .insert([{
            sale_id: savedSaleId,
            product_id: item.id,
            product_name: item.name,
            quantity: Number(item.quantity),
            unit_price: Number(item.sellPrice),
            unit_buy_price: Number(item.buyPrice)
          }]);

        if (itemErr) throw itemErr;

        // إنقاص المخزن على Supabase
        const { data: dbProd } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (dbProd) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, dbProd.stock - item.quantity) })
            .eq('id', item.id);
        }
      }
      synced = true;
    } catch (err) {
      console.error('فشلت المزامنة المباشرة للفاتورة مع Supabase، سيتم الحفظ محلياً وتأجيل المزامنة:', err);
    }
  }

  // 3. الحفظ في Dexie محلياً (الفاتورة والمواد وإنقاص المخزن)
  await db.transaction('rw', [db.products, db.sales, db.saleItems], async () => {
    // حفظ الفاتورة محلياً
    await db.sales.put({
      id: savedSaleId,
      date: saleData.date,
      totalAmount: saleData.totalAmount,
      discount: saleData.discount,
      finalAmount: saleData.finalAmount,
      syncStatus: synced ? 'synced' : 'pending'
    });

    // حفظ المواد وتحديث المخزون محلياً
    for (const item of items) {
      await db.saleItems.put({
        saleId: savedSaleId,
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.sellPrice,
        unitBuyPrice: item.buyPrice,
        syncStatus: synced ? 'synced' : 'pending'
      });

      // إنقاص المخزن محلياً
      const localProd = await db.products.get(item.id);
      if (localProd) {
        await db.products.update(item.id, {
          stock: Math.max(0, localProd.stock - item.quantity)
        });
      }
    }
  });
}

export async function deleteSale(saleId) {
  const isOnline = navigator.onLine;

  // 1. Get the sale and sale items to know what products to restore and by how much
  const sale = await db.sales.get(saleId);
  if (!sale) return;

  const localItems = await db.saleItems.where('saleId').equals(saleId).toArray();

  // 2. Restore stock for each item
  for (const item of localItems) {
    // A. If online and not pending, update Supabase product stock
    if (isOnline && sale.syncStatus !== 'pending') {
      try {
        const { data: dbProd } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .single();

        if (dbProd) {
          const newStock = Math.max(0, (dbProd.stock || 0) + (item.quantity || 0));
          await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.productId);
        }
      } catch (err) {
        console.error(`فشل تحديث مخزن المنتج ${item.productId} على Supabase:`, err);
      }
    }
  }

  // 3. Delete from Supabase (if online and not pending)
  let deletedOnSupabase = false;
  if (isOnline && sale.syncStatus !== 'pending') {
    try {
      // First delete sale_items since they might reference the sale
      const { error: itemsDelErr } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);

      if (itemsDelErr) throw itemsDelErr;

      const { error: saleDelErr } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (saleDelErr) throw saleDelErr;
      deletedOnSupabase = true;
    } catch (err) {
      console.error('فشل حذف الفاتورة من Supabase، سيتم جدولتها للحذف لاحقاً:', err);
    }
  }

  // If offline/failed, track pending deletion (only if it was synced)
  if (!deletedOnSupabase && sale.syncStatus !== 'pending') {
    const pendingDeletions = JSON.parse(localStorage.getItem('pending_deletions') || '[]');
    for (const item of localItems) {
      if (item.id) {
        pendingDeletions.push({ table: 'sale_items', id: item.id });
      }
    }
    pendingDeletions.push({ table: 'sales', id: saleId });
    localStorage.setItem('pending_deletions', JSON.stringify(pendingDeletions));
  }

  // 4. Delete from local Dexie database and update local stock
  await db.transaction('rw', [db.products, db.sales, db.saleItems], async () => {
    // Restore local product stock
    for (const item of localItems) {
      const localProduct = await db.products.get(item.productId);
      if (localProduct) {
        await db.products.update(item.productId, {
          stock: (localProduct.stock || 0) + (item.quantity || 0)
        });
      }
    }
    // Delete the sale items
    await db.saleItems.where('saleId').equals(saleId).delete();
    // Delete the sale itself
    await db.sales.delete(saleId);
  });
}

// ==================== عامل المزامنة الخلفية (Background Sync Work) ====================

export async function syncOfflineData() {
  if (!navigator.onLine) return;
  console.log('جاري فحص المزامنة مع Supabase...');

  try {
    // أ. معالجة الحذف المؤجل أولاً
    const pendingDeletions = JSON.parse(localStorage.getItem('pending_deletions') || '[]');
    if (pendingDeletions.length > 0) {
      const remainingDeletions = [];
      for (const del of pendingDeletions) {
        try {
          const { error } = await supabase
            .from(del.table)
            .delete()
            .eq('id', del.id);
          
          if (error) throw error;
        } catch (err) {
          console.error(`فشل مزامنة حذف المعرف ${del.id} من جدول ${del.table}:`, err);
          remainingDeletions.push(del);
        }
      }
      localStorage.setItem('pending_deletions', JSON.stringify(remainingDeletions));
    }

    // ب. مزامنة التصنيفات المعلقة
    const pendingCats = await db.categories.where('syncStatus').equals('pending').toArray();
    for (const cat of pendingCats) {
      try {
        let existsOnSupabase = false;
        if (cat.id) {
          const { data: checkData } = await supabase
            .from('categories')
            .select('id')
            .eq('id', cat.id)
            .maybeSingle();
          if (checkData) existsOnSupabase = true;
        }

        let resultData;
        if (existsOnSupabase) {
          const { data, error } = await supabase
            .from('categories')
            .update({ name: cat.name })
            .eq('id', cat.id)
            .select();
          if (error) throw error;
          resultData = data;
        } else {
          const { data, error } = await supabase
            .from('categories')
            .insert([{ name: cat.name }])
            .select();
          if (error) throw error;
          resultData = data;
        }

        await db.categories.update(cat.id, { syncStatus: 'synced' });
        if (resultData && resultData[0] && resultData[0].id !== cat.id) {
          // تحديث الـ ID المحلي في حال تغيره
          await db.categories.delete(cat.id);
          await db.categories.add({ ...cat, id: resultData[0].id, syncStatus: 'synced' });
        }
      } catch (err) {
        console.error('فشل مزامنة التصنيف المعلق:', err);
      }
    }

    // ج. مزامنة المنتجات المعلقة
    const pendingProds = await db.products.where('syncStatus').equals('pending').toArray();
    for (const prod of pendingProds) {
      try {
        let finalImg = prod.image;
        if (prod.image && !prod.image.startsWith('http://') && !prod.image.startsWith('https://')) {
          finalImg = await uploadProductImage(prod.image, prod.name);
        }

        let categoryId = null;
        const { data: catData, error: catFetchErr } = await supabase
          .from('categories')
          .select('id')
          .eq('name', prod.category)
          .maybeSingle();
        
        if (!catFetchErr && catData) {
          categoryId = catData.id;
        } else {
          const catRecord = await db.categories.where('name').equals(prod.category).first();
          categoryId = catRecord ? catRecord.id : null;
        }

        if (!categoryId) {
          const { data: newCat, error: newCatErr } = await supabase
            .from('categories')
            .insert([{ name: prod.category || 'عام' }])
            .select();
          
          if (newCatErr) {
            console.error('Supabase DB Sync Auto-Category Creation Error:', newCatErr);
            throw newCatErr;
          }
          if (newCat && newCat[0]) {
            categoryId = newCat[0].id;
            await db.categories.put({
              id: categoryId,
              name: prod.category || 'عام',
              syncStatus: 'synced'
            });
          }
        }

        let existsOnSupabase = false;
        if (prod.id) {
          const { data: checkData } = await supabase
            .from('products')
            .select('id')
            .eq('id', prod.id)
            .maybeSingle();
          if (checkData) existsOnSupabase = true;
        }

        let resultData;
        const supabasePayload = {
          name: prod.name,
          category: prod.category || 'عام',
          category_id: categoryId,
          cost: Number(prod.buyPrice),
          price: Number(prod.sellPrice),
          stock: Number(prod.stock),
          image_url: finalImg
        };

        if (existsOnSupabase) {
          const { data, error } = await supabase
            .from('products')
            .update(supabasePayload)
            .eq('id', prod.id)
            .select();
          
          if (error) {
            console.error('Supabase DB Sync Update Error:', error);
            throw error;
          }
          resultData = data;
        } else {
          const { data, error } = await supabase
            .from('products')
            .insert([supabasePayload])
            .select();
          
          if (error) {
            console.error('Supabase DB Sync Insert Error:', error);
            throw error;
          }
          resultData = data;
        }

        await db.products.update(prod.id, { image: finalImg, syncStatus: 'synced' });
        if (resultData && resultData[0] && resultData[0].id !== prod.id) {
          await db.products.delete(prod.id);
          await db.products.add({ ...prod, id: resultData[0].id, image: finalImg, syncStatus: 'synced' });
        }
      } catch (err) {
        console.error('فشل مزامنة المنتج المعلق:', err);
      }
    }

    // د. مزامنة المبيعات المعلقة
    const pendingSales = await db.sales.where('syncStatus').equals('pending').toArray();
    for (const sale of pendingSales) {
      try {
        // 1. إدراج المبيعات
        const { data: insertedSale, error: saleErr } = await supabase
          .from('sales')
          .insert([{
            date: sale.date,
            total_amount: sale.totalAmount,
            discount: sale.discount,
            final_amount: sale.finalAmount
          }])
          .select();

        if (saleErr) throw saleErr;
        const newSaleId = insertedSale[0].id;

        // 2. إدراج مواد الفاتورة وتحديث مخزن المنتجات على السيرفر
        const localItems = await db.saleItems.where('saleId').equals(sale.id).toArray();
        for (const item of localItems) {
          const { error: itemErr } = await supabase
            .from('sale_items')
            .insert([{
              sale_id: newSaleId,
              product_id: item.productId,
              product_name: item.productName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              unit_buy_price: item.unitBuyPrice
            }]);

          if (itemErr) throw itemErr;

          // تحديث المخزن في السيرفر
          const { data: dbProd } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.productId)
            .single();

          if (dbProd) {
            await supabase
              .from('products')
              .update({ stock: Math.max(0, dbProd.stock - item.quantity) })
              .eq('id', item.productId);
          }
        }

        // 3. تحديث محلي للمبيعات والمواد
        await db.sales.update(sale.id, { syncStatus: 'synced' });
        // إذا اختلف الـ ID المحلي عن الجديد المولد من Supabase
        if (newSaleId !== sale.id) {
          await db.sales.delete(sale.id);
          await db.sales.add({ ...sale, id: newSaleId, syncStatus: 'synced' });

          for (const item of localItems) {
            await db.saleItems.delete(item.id);
            await db.saleItems.add({ ...item, saleId: newSaleId, syncStatus: 'synced' });
          }
        }
      } catch (err) {
        console.error('فشل مزامنة الفاتورة المعلقة مع السيرفر:', err);
      }
    }

    console.log('اكتملت مزامنة البيانات المعلقة مع Supabase.');
  } catch (err) {
    console.error('فشلت عملية المزامنة الدورية للبيانات:', err);
  }
}

// دالة جلب وتحديث كامل البيانات من Supabase وتخزينها محلياً عند بدء تشغيل التطبيق
export async function pullAllData() {
  if (!navigator.onLine) return;
  console.log('جاري تحميل وتحديث البيانات من Supabase...');
  try {
    // 1. جلب وتحديث التصنيفات
    const { data: dbCats, error: catsErr } = await supabase
      .from('categories')
      .select('*');
    
    if (catsErr) {
      console.error('فشل جلب التصنيفات من السحابة:', catsErr);
    } else if (dbCats) {
      for (const cat of dbCats) {
        await db.categories.put({
          id: cat.id,
          name: cat.name,
          syncStatus: 'synced'
        });
      }
    }

    // 2. جلب وتحديث المنتجات
    const { data: dbProds, error: prodsErr } = await supabase
      .from('products')
      .select('*');
    
    if (prodsErr) {
      console.error('فشل جلب المنتجات من السحابة:', prodsErr);
    } else if (dbProds) {
      for (const prod of dbProds) {
        const categoryName = prod.category || 'عام';

        await db.products.put({
          id: prod.id,
          name: prod.name,
          category: categoryName,
          buyPrice: prod.cost,
          sellPrice: prod.price,
          stock: prod.stock,
          image: prod.image_url,
          syncStatus: 'synced'
        });
      }
    }

    // 3. جلب وتحديث المبيعات
    const { data: dbSales, error: salesErr } = await supabase
      .from('sales')
      .select('*');
    
    if (salesErr) {
      console.error('فشل جلب الفواتير من السحابة:', salesErr);
    } else if (dbSales) {
      for (const sale of dbSales) {
        await db.sales.put({
          id: sale.id,
          date: sale.date,
          totalAmount: sale.total_amount,
          discount: sale.discount,
          finalAmount: sale.final_amount,
          syncStatus: 'synced'
        });
      }
    }

    // 4. جلب وتحديث تفاصيل الفواتير
    const { data: dbItems, error: itemsErr } = await supabase
      .from('sale_items')
      .select('*');
    
    if (itemsErr) {
      console.error('فشل جلب تفاصيل الفواتير من السحابة:', itemsErr);
    } else if (dbItems) {
      for (const item of dbItems) {
        await db.saleItems.put({
          id: item.id,
          saleId: item.sale_id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          unitBuyPrice: item.unit_buy_price,
          syncStatus: 'synced'
        });
      }
    }

    console.log('اكتمل تحديث قاعدة البيانات المحلية بنجاح من Supabase.');
  } catch (err) {
    console.error('خطأ غير متوقع أثناء تحميل البيانات من Supabase:', err);
  }
}
