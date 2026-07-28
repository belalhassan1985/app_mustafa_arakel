import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { saveProduct, deleteProduct, saveCategory, deleteCategory } from '../dataManager';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Tag, 
  X, 
  Check,
  ImageIcon,
  FolderOpen
} from 'lucide-react';

export default function ProductsManagement() {
  // 1. جلب قائمة المنتجات والتصنيفات ديناميكياً
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const dbCategories = useLiveQuery(() => db.categories.toArray()) || [];

  // 2. حالات إضافة منتج جديد
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newBuyPrice, setNewBuyPrice] = useState('');
  const [newSellPrice, setNewSellPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newImage, setNewImage] = useState(''); // سلسلة صورة الترميز Base64

  // 3. حالات تعديل منتج قائم
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [editSellPrice, setEditSellPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImage, setEditImage] = useState('');

  // 4. حالات التصنيفات المضافة ديناميكياً
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [editCatName, setEditCatName] = useState('');

  // 5. معالجة اختيار ملف الصورة وتحويله إلى Base64
  const handleImageChange = (e, targetSetter) => {
    const file = e.target.files[0];
    if (file) {
      // الحد الأقصى لحجم الصورة (مثلاً 500 كيلوبايت)
      if (file.size > 512000) {
        alert('حجم الصورة كبير جداً! الرجاء اختيار صورة أقل من 500 كيلوبايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        targetSetter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 6. معالجة إضافة منتج جديد
  const handleAddProduct = async (e) => {
    e.preventDefault();

    const selectedCat = newCategory || (dbCategories[0] ? dbCategories[0].name : 'معسل');

    if (!newName.trim() || !newBuyPrice || !newSellPrice || newStock === '') {
      alert('الرجاء تعبئة كافة الحقول بشكل صحيح واختيار تصنيف.');
      return;
    }

    const buyVal = Number(newBuyPrice);
    const sellVal = Number(newSellPrice);
    const stockVal = Number(newStock);

    if (buyVal < 0 || sellVal < 0 || stockVal < 0) {
      alert('لا يمكن إدخال قيم سالبة للأسعار أو الكميات.');
      return;
    }

    try {
      await saveProduct({
        name: newName.trim(),
        category: selectedCat,
        buyPrice: buyVal,
        sellPrice: sellVal,
        stock: stockVal,
        image: newImage
      });

      // تفريغ الحقول بعد الإضافة الناجحة
      setNewName('');
      setNewBuyPrice('');
      setNewSellPrice('');
      setNewStock('');
      setNewImage('');
      alert('تمت إضافة المنتج بنجاح!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة المنتج.');
    }
  };

  // 7. فتح مودال التعديل وتجهيز البيانات له
  const startEditProduct = (product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditBuyPrice(product.buyPrice);
    setEditSellPrice(product.sellPrice);
    setEditStock(product.stock);
    setEditImage(product.image || '');
  };

  // 8. معالجة تحديث بيانات المنتج
  const handleUpdateProduct = async (e) => {
    e.preventDefault();

    if (!editName.trim() || !editCategory || !editBuyPrice || !editSellPrice || editStock === '') {
      alert('الرجاء تعبئة كافة الحقول بشكل صحيح.');
      return;
    }

    const buyVal = Number(editBuyPrice);
    const sellVal = Number(editSellPrice);
    const stockVal = Number(editStock);

    if (buyVal < 0 || sellVal < 0 || stockVal < 0) {
      alert('لا يمكن إدخال قيم سالبة للأسعار أو الكميات.');
      return;
    }

    try {
      await saveProduct({
        id: editingProduct.id,
        name: editName.trim(),
        category: editCategory,
        buyPrice: buyVal,
        sellPrice: sellVal,
        stock: stockVal,
        image: editImage
      });

      setEditingProduct(null);
      alert('تم تحديث بيانات المنتج بنجاح!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحديث المنتج.');
    }
  };

  // 9. معالجة حذف المنتج
  const handleDeleteProduct = async (productId, productName) => {
    if (confirm(`هل أنت متأكد من رغبتك في حذف المنتج: "${productName}"؟`)) {
      try {
        await deleteProduct(productId);
        alert('تم حذف المنتج بنجاح.');
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء حذف المنتج.');
      }
    }
  };

  // ==================== وظائف التصنيفات الديناميكية ====================

  // أ. إضافة تصنيف جديد
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    // التحقق من التكرار
    const exists = dbCategories.some(c => c.name.trim() === newCatName.trim());
    if (exists) {
      alert('هذا التصنيف موجود بالفعل!');
      return;
    }

    try {
      await saveCategory({ name: newCatName.trim() });
      setNewCatName('');
    } catch (err) {
      console.error(err);
      alert('فشل إضافة التصنيف.');
    }
  };

  // ب. تحديث تصنيف
  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editCatName.trim() || !editingCat) return;

    try {
      // تحديث المنتجات التي تنتمي لهذا التصنيف لتحديث فئتها أيضاً
      const relatedProducts = products.filter(p => p.category === editingCat.name);
      for (const p of relatedProducts) {
        await saveProduct({ ...p, category: editCatName.trim() });
      }

      await saveCategory({ id: editingCat.id, name: editCatName.trim() });
      setEditingCat(null);
    } catch (err) {
      console.error(err);
      alert('فشل تحديث التصنيف.');
    }
  };

  // د. حذف تصنيف
  const handleDeleteCategory = async (catId, catName) => {
    if (confirm(`هل أنت متأكد من حذف تصنيف "${catName}"؟ لن يتم حذف المنتجات التابعة له ولكن ستحتاج إلى إعادة تعيين تصنيفاتها.`)) {
      try {
        await deleteCategory(catId, catName);
      } catch (err) {
        console.error(err);
        alert('فشل حذف التصنيف.');
      }
    }
  };

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full pb-20">
      
      {/* زر لفتح وإدارة التصنيفات الديناميكية */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowCategoryModal(true)}
          className="w-full bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-500 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700/50 transition-colors shadow-sm dark:shadow-md backdrop-blur-md"
        >
          <FolderOpen className="h-4.5 w-4.5 text-amber-500" />
          <span>إدارة التصنيفات الديناميكية ({dbCategories.length})</span>
        </button>
      </div>

      {/* 1. نموذج إضافة منتج جديد مع الصورة والتصنيفات */}
      <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4.5 shadow-sm dark:shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">إضافة منتج جديد للمخزن</h3>
        </div>

        <form onSubmit={handleAddProduct} className="space-y-4">
          
          {/* حقل رفع الصورة بنمط عصري ومصغر */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-700">
            {newImage ? (
              <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0">
                <img src={newImage} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewImage('')}
                  className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-500 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                <Package className="h-5 w-5 text-slate-400 dark:text-slate-600" />
                <span className="text-[9px] mt-1 font-bold">صورة</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, setNewImage)}
                  className="hidden"
                />
              </label>
            )}
            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-350">أضف صورة للمنتج</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-550 mt-0.5 leading-relaxed">اختياري، كحد أقصى 1 ميغابايت. سيتم ضغطها وتخزينها محلياً.</div>
            </div>
          </div>

          {/* اسم المنتج */}
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">اسم المنتج:</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: معسل فاخر تفاحتين"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
            />
          </div>

          {/* التصنيفات الديناميكية والكمية */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">التصنيف:</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
              >
                {dbCategories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">الكمية بالمخزن:</label>
              <input
                type="number"
                required
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="العدد"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
              />
            </div>
          </div>

          {/* أسعار الشراء والبيع */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">سعر الشراء (الكلفة):</label>
              <input
                type="number"
                required
                min="0"
                value={newBuyPrice}
                onChange={(e) => setNewBuyPrice(e.target.value)}
                placeholder="بالدينار"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">سعر البيع (للزبون):</label>
              <input
                type="number"
                required
                min="0"
                value={newSellPrice}
                onChange={(e) => setNewSellPrice(e.target.value)}
                placeholder="بالدينار"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
              />
            </div>
          </div>

          {/* زر التقديم */}
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-amber-950/20"
          >
            <Package className="h-4 w-4 text-slate-950" />
            <span>إضافة المنتج للمخزن</span>
          </button>
        </form>
      </div>

      {/* 2. قائمة المنتجات الحالية */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-850 dark:text-slate-100 px-1 flex items-center gap-2">
          <span>المنتجات الحالية ({products.length})</span>
        </h3>

        {products.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            لا توجد منتجات حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => {
              const profit = product.sellPrice - product.buyPrice;
              return (
                <div 
                  key={product.id}
                  className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between shadow-sm dark:shadow-md backdrop-blur-md"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 text-right">
                      {/* عرض مصغرة صورة المنتج */}
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-slate-400 dark:text-slate-750" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 leading-snug">{product.name}</h4>
                        <div className="flex gap-2 items-center mt-1.5">
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-355 px-2 py-0.5 rounded-md font-bold">
                            {product.category}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${
                            product.stock <= 5 
                              ? 'bg-red-950/40 text-red-500 dark:text-red-400 border border-red-900/20' 
                              : 'bg-green-950/40 text-green-500 dark:text-green-400 border border-green-900/20'
                          }`}>
                            المخزن: {product.stock}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-0.5">
                      <button
                        onClick={() => startEditProduct(product)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg text-amber-500 dark:text-amber-400"
                        title="تعديل المنتج"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg text-red-500 dark:text-red-400"
                        title="حذف المنتج"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* تفاصيل الأسعار والربح */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-700/40 text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>سعر الشراء</div>
                      <div className="text-slate-800 dark:text-slate-300 mt-0.5 font-bold">{(product.buyPrice || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>سعر البيع</div>
                      <div className="text-amber-600 dark:text-amber-400 mt-0.5 font-bold">{(product.sellPrice || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>الربح المتوقع</div>
                      <div className="text-green-600 dark:text-green-400 mt-0.5 font-bold">+{profit ? profit.toLocaleString() : '0'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. مودال تعديل المنتج مع خيارات الصور والتصنيف الجديد */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto backdrop-blur-md shadow-sm dark:shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Edit className="h-4.5 w-4.5 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">تعديل بيانات المنتج</h4>
              </div>
              <button 
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-right">
              {/* صورة التعديل */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-700">
                {editImage ? (
                  <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0">
                    <img src={editImage} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditImage('')}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-550 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    <Package className="h-5 w-5 text-slate-400 dark:text-slate-600" />
                    <span className="text-[9px] mt-1 font-bold">صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, setEditImage)}
                      className="hidden"
                    />
                  </label>
                )}
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">تعديل الصورة للمنتج</div>
                  <div className="text-[9px] text-slate-550 dark:text-slate-400 mt-0.5">يمكنك تغيير الصورة أو حذفها بالكامل.</div>
                </div>
              </div>

              {/* الاسم */}
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">اسم المنتج:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
                />
              </div>

              {/* التصنيف والكمية */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">التصنيف:</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
                  >
                    {dbCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">الكمية بالمخزن:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* الأسعار */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">سعر الشراء:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editBuyPrice}
                    onChange={(e) => setEditBuyPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">سعر البيع:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editSellPrice}
                    onChange={(e) => setEditSellPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* أزرار الحفظ أو الإلغاء */}
              <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-950/30"
                >
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>تحديث وحفظ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. مودال إدارة التصنيفات الديناميكية */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 space-y-4 max-h-[85vh] flex flex-col justify-between shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">إدارة التصنيفات الديناميكية</h4>
              </div>
              <button 
                onClick={() => setShowCategoryModal(false)} 
                className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* نموذج إضافة تصنيف */}
            <form onSubmit={handleAddCategory} className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-300 dark:border-slate-700">
              <input
                type="text"
                required
                placeholder="اسم التصنيف الجديد..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500"
              />
              <button 
                type="submit" 
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-slate-950" />
                <span>إضافة</span>
              </button>
            </form>

            {/* قائمة التصنيفات الحالية */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 min-h-[150px]">
              {dbCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl">
                  {editingCat && editingCat.id === cat.id ? (
                    <form onSubmit={handleUpdateCategory} className="flex-1 flex gap-2">
                      <input
                        type="text"
                        required
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
                      />
                      <button 
                        type="submit" 
                        className="bg-green-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
                      >
                        حفظ
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditingCat(null)} 
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-lg text-[10px] transition-colors"
                      >
                        إلغاء
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 pr-2">{cat.name}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingCat(cat); setEditCatName(cat.name); }}
                          className="text-amber-500 dark:text-amber-400 hover:text-amber-300 text-[10px] bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="text-red-500 dark:text-red-400 hover:text-red-300 text-[10px] bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setShowCategoryModal(false)} 
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 py-2.5 rounded-xl text-xs font-bold mt-2 transition-colors"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
