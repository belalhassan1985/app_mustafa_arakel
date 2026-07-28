import React, { useState } from 'react';
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
  FolderOpen,
  LockKeyhole
} from 'lucide-react';

const PRODUCTS_PIN = '19851985';

export default function ProductsManagement() {
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const dbCategories = useLiveQuery(() => db.categories.toArray()) || [];

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newBuyPrice, setNewBuyPrice] = useState('');
  const [newSellPrice, setNewSellPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newImage, setNewImage] = useState('');

  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [editSellPrice, setEditSellPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImage, setEditImage] = useState('');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [editCatName, setEditCatName] = useState('');

  const [isProductsUnlocked, setIsProductsUnlocked] = useState(false);
  const [pinModal, setPinModal] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');

  const resetPin = () => {
    setPinValue('');
    setPinError('');
  };

  const closePinModal = () => {
    setPinModal(null);
    resetPin();
  };

  const requestPin = (mode, payload = null) => {
    setPinModal({ mode, payload });
    resetPin();
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setEditName(product.name || '');
    setEditCategory(product.category || '');
    setEditBuyPrice(product.buyPrice ?? '');
    setEditSellPrice(product.sellPrice ?? '');
    setEditStock(product.stock ?? '');
    setEditImage(product.image || '');
  };

  const runDeleteProduct = async ({ productId, productName }) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف المنتج: "${productName}"؟`)) return;

    try {
      await deleteProduct(productId);
      alert('تم حذف المنتج بنجاح.');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حذف المنتج.');
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();

    if (pinValue !== PRODUCTS_PIN) {
      setPinError('رمز المرور غير صحيح');
      return;
    }

    const currentModal = pinModal;
    closePinModal();

    if (!currentModal || currentModal.mode === 'access') {
      setIsProductsUnlocked(true);
      return;
    }

    if (currentModal.mode === 'edit') {
      openEditProduct(currentModal.payload);
      return;
    }

    if (currentModal.mode === 'delete') {
      await runDeleteProduct(currentModal.payload);
    }
  };

  const handleAccessSubmit = (e) => {
    e.preventDefault();

    if (pinValue === PRODUCTS_PIN) {
      setIsProductsUnlocked(true);
      resetPin();
      return;
    }

    setPinError('رمز المرور غير صحيح');
  };

  const handleImageChange = (e, targetSetter) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 512000) {
      alert('حجم الصورة كبير جداً! الرجاء اختيار صورة أقل من 500 كيلوبايت.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => targetSetter(reader.result);
    reader.readAsDataURL(file);
  };

  const validateProductForm = ({ name, category, buyPrice, sellPrice, stock }) => {
    if (!name.trim() || !category || buyPrice === '' || sellPrice === '' || stock === '') {
      alert('الرجاء تعبئة كافة الحقول بشكل صحيح واختيار تصنيف.');
      return null;
    }

    const buyVal = Number(buyPrice);
    const sellVal = Number(sellPrice);
    const stockVal = Number(stock);

    if (buyVal < 0 || sellVal < 0 || stockVal < 0) {
      alert('لا يمكن إدخال قيم سالبة للأسعار أو الكميات.');
      return null;
    }

    return { buyVal, sellVal, stockVal };
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const selectedCat = newCategory || (dbCategories[0] ? dbCategories[0].name : 'معسل');
    const values = validateProductForm({
      name: newName,
      category: selectedCat,
      buyPrice: newBuyPrice,
      sellPrice: newSellPrice,
      stock: newStock
    });
    if (!values) return;

    try {
      await saveProduct({
        name: newName.trim(),
        category: selectedCat,
        buyPrice: values.buyVal,
        sellPrice: values.sellVal,
        stock: values.stockVal,
        image: newImage
      });

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

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const values = validateProductForm({
      name: editName,
      category: editCategory,
      buyPrice: editBuyPrice,
      sellPrice: editSellPrice,
      stock: editStock
    });
    if (!values) return;

    try {
      await saveProduct({
        id: editingProduct.id,
        name: editName.trim(),
        category: editCategory,
        buyPrice: values.buyVal,
        sellPrice: values.sellVal,
        stock: values.stockVal,
        image: editImage
      });

      setEditingProduct(null);
      alert('تم تحديث بيانات المنتج بنجاح!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحديث المنتج.');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName) return;

    const exists = dbCategories.some(c => c.name.trim() === trimmedName);
    if (exists) {
      alert('هذا التصنيف موجود بالفعل!');
      return;
    }

    try {
      await saveCategory({ name: trimmedName });
      setNewCatName('');
    } catch (err) {
      console.error(err);
      alert('فشل إضافة التصنيف.');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    const trimmedName = editCatName.trim();
    if (!trimmedName || !editingCat) return;

    try {
      const relatedProducts = products.filter(p => p.category === editingCat.name);
      for (const product of relatedProducts) {
        await saveProduct({ ...product, category: trimmedName });
      }

      await saveCategory({ id: editingCat.id, name: trimmedName });
      setEditingCat(null);
    } catch (err) {
      console.error(err);
      alert('فشل تحديث التصنيف.');
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!confirm(`هل أنت متأكد من حذف تصنيف "${catName}"؟ لن يتم حذف المنتجات التابعة له ولكن ستحتاج إلى إعادة تعيين تصنيفاتها.`)) return;

    try {
      await deleteCategory(catId, catName);
    } catch (err) {
      console.error(err);
      alert('فشل حذف التصنيف.');
    }
  };

  const pinTitle = pinModal?.mode === 'edit' ? 'تأكيد تعديل المنتج' : 'تأكيد حذف المنتج';
  const pinText = pinModal?.mode === 'edit'
    ? 'أدخل رمز المرور لفتح نموذج تعديل المنتج.'
    : 'أدخل رمز المرور قبل تنفيذ حذف المنتج.';

  const renderProductImageInput = ({ image, setImage, helperText }) => (
    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-700">
      {image ? (
        <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0">
          <img src={image} alt="معاينة المنتج" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setImage('')}
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
            onChange={(e) => handleImageChange(e, setImage)}
            className="hidden"
          />
        </label>
      )}
      <div>
        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">صورة المنتج</div>
        <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{helperText}</div>
      </div>
    </div>
  );

  if (!isProductsUnlocked) {
    return (
      <div className="p-4 overflow-y-auto h-full pb-20">
        <div className="min-h-[70vh] flex items-center justify-center">
          <form
            onSubmit={handleAccessSubmit}
            className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 text-center shadow-md backdrop-blur-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <LockKeyhole className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">إدارة المنتجات محمية</h2>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-4">
              أدخل رمز المرور للوصول إلى إدارة المنتجات والمخزن.
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={pinValue}
              onChange={(event) => {
                setPinValue(event.target.value);
                setPinError('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-center text-lg font-black tracking-[0.35em] text-slate-900 dark:text-slate-100"
              placeholder="••••••••"
              autoFocus
            />
            {pinError && <div className="text-[11px] text-red-500 font-bold mt-2">{pinError}</div>}
            <button
              type="submit"
              className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-md shadow-amber-950/20 transition-colors"
            >
              فتح إدارة المنتجات
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full pb-20">
      <div className="flex gap-2">
        <button
          onClick={() => setShowCategoryModal(true)}
          className="w-full bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-500 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700/50 transition-colors shadow-sm dark:shadow-md backdrop-blur-md"
        >
          <FolderOpen className="h-4.5 w-4.5 text-amber-500" />
          <span>إدارة التصنيفات ({dbCategories.length})</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4.5 shadow-sm dark:shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">إضافة منتج جديد للمخزن</h3>
        </div>

        <form onSubmit={handleAddProduct} className="space-y-4">
          {renderProductImageInput({
            image: newImage,
            setImage: setNewImage,
            helperText: 'اختياري، بحد أقصى 500 كيلوبايت. سيتم ضغطها وتخزينها محلياً عند الحاجة.'
          })}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">التصنيف:</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
              >
                <option value="">اختر التصنيف</option>
                {dbCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">سعر الشراء:</label>
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
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">سعر البيع:</label>
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

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-amber-950/20"
          >
            <Package className="h-4 w-4 text-slate-950" />
            <span>إضافة المنتج للمخزن</span>
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 px-1 flex items-center gap-2">
          <span>المنتجات الحالية ({products.length})</span>
        </h3>

        {products.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">لا توجد منتجات حالياً.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => {
              const profit = Number(product.sellPrice || 0) - Number(product.buyPrice || 0);
              return (
                <div key={product.id} className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between shadow-sm dark:shadow-md backdrop-blur-md">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 text-right min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                        {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <Package className="h-5 w-5 text-slate-400 dark:text-slate-700" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 leading-snug">{product.name}</h4>
                        <div className="flex gap-2 items-center mt-1.5 flex-wrap">
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold">{product.category}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${product.stock <= 5 ? 'bg-red-950/40 text-red-500 dark:text-red-400 border border-red-900/20' : 'bg-green-950/40 text-green-500 dark:text-green-400 border border-green-900/20'}`}>
                            المخزن: {product.stock}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => requestPin('edit', product)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-amber-500 dark:text-amber-400"
                        title="تعديل المنتج"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => requestPin('delete', { productId: product.id, productName: product.name })}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-red-500 dark:text-red-400"
                        title="حذف المنتج"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-700/40 text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>سعر الشراء</div>
                      <div className="text-slate-800 dark:text-slate-300 mt-0.5 font-bold">{Number(product.buyPrice || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>سعر البيع</div>
                      <div className="text-amber-600 dark:text-amber-400 mt-0.5 font-bold">{Number(product.sellPrice || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>الربح المتوقع</div>
                      <div className="text-green-600 dark:text-green-400 mt-0.5 font-bold">+{profit.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto backdrop-blur-md shadow-sm dark:shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Edit className="h-4.5 w-4.5 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">تعديل بيانات المنتج</h4>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-right">
              {renderProductImageInput({
                image: editImage,
                setImage: setEditImage,
                helperText: 'يمكنك تغيير الصورة أو حذفها بالكامل.'
              })}

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">اسم المنتج:</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">التصنيف:</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500">
                    {dbCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">الكمية بالمخزن:</label>
                  <input type="number" required min="0" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">سعر الشراء:</label>
                  <input type="number" required min="0" value={editBuyPrice} onChange={(e) => setEditBuyPrice(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">سعر البيع:</label>
                  <input type="number" required min="0" value={editSellPrice} onChange={(e) => setEditSellPrice(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500" />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-950/30">
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>تحديث وحفظ</span>
                </button>
                <button type="button" onClick={() => setEditingProduct(null)} className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold py-2 px-4 rounded-xl text-xs">
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pinModal && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4">
          <form onSubmit={handlePinSubmit} className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 text-center shadow-md backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <LockKeyhole className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">{pinTitle}</h2>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-4">{pinText}</p>
            <input
              type="password"
              inputMode="numeric"
              value={pinValue}
              onChange={(event) => {
                setPinValue(event.target.value);
                setPinError('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-center text-lg font-black tracking-[0.35em] text-slate-900 dark:text-slate-100"
              placeholder="••••••••"
              autoFocus
            />
            {pinError && <div className="text-[11px] text-red-500 font-bold mt-2">{pinError}</div>}
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-md shadow-amber-950/20 transition-colors">تأكيد</button>
              <button type="button" onClick={closePinModal} className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold py-3 px-5 rounded-2xl text-xs">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 space-y-4 max-h-[85vh] flex flex-col justify-between shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">إدارة التصنيفات</h4>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-300 dark:border-slate-700">
              <input
                type="text"
                required
                placeholder="اسم التصنيف الجديد..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500"
              />
              <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors">
                <Plus className="h-3.5 w-3.5 text-slate-950" />
                <span>إضافة</span>
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 min-h-[150px]">
              {dbCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl">
                  {editingCat?.id === cat.id ? (
                    <form onSubmit={handleUpdateCategory} className="flex-1 flex gap-2">
                      <input type="text" required value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500" />
                      <button type="submit" className="bg-green-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold transition-colors">حفظ</button>
                      <button type="button" onClick={() => setEditingCat(null)} className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-lg text-[10px] transition-colors">إلغاء</button>
                    </form>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 pr-2">{cat.name}</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => { setEditingCat(cat); setEditCatName(cat.name); }} className="text-amber-500 dark:text-amber-400 hover:text-amber-300 text-[10px] bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors">تعديل</button>
                        <button type="button" onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-red-500 dark:text-red-400 hover:text-red-300 text-[10px] bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors">حذف</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setShowCategoryModal(false)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 py-2.5 rounded-xl text-xs font-bold mt-2 transition-colors">
              إغلاق النافذة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
