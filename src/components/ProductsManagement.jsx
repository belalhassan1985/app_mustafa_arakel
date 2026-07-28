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
  FolderOpen,
  LockKeyhole
} from 'lucide-react';

const PRODUCTS_PIN = '19851985';

export default function ProductsManagement() {
  // 1. ط¬ظ„ط¨ ظ‚ط§ط¦ظ…ط© ط§ظ„ظ…ظ†طھط¬ط§طھ ظˆط§ظ„طھطµظ†ظٹظپط§طھ ط¯ظٹظ†ط§ظ…ظٹظƒظٹط§ظ‹
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const dbCategories = useLiveQuery(() => db.categories.toArray()) || [];

  // 2. ط­ط§ظ„ط§طھ ط¥ط¶ط§ظپط© ظ…ظ†طھط¬ ط¬ط¯ظٹط¯
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newBuyPrice, setNewBuyPrice] = useState('');
  const [newSellPrice, setNewSellPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newImage, setNewImage] = useState(''); // ط³ظ„ط³ظ„ط© طµظˆط±ط© ط§ظ„طھط±ظ…ظٹط² Base64

  // 3. ط­ط§ظ„ط§طھ طھط¹ط¯ظٹظ„ ظ…ظ†طھط¬ ظ‚ط§ط¦ظ…
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [editSellPrice, setEditSellPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImage, setEditImage] = useState('');

  // 4. ط­ط§ظ„ط§طھ ط§ظ„طھطµظ†ظٹظپط§طھ ط§ظ„ظ…ط¶ط§ظپط© ط¯ظٹظ†ط§ظ…ظٹظƒظٹط§ظ‹
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [editCatName, setEditCatName] = useState('');

  const [isProductsUnlocked, setIsProductsUnlocked] = useState(false);
  const [pinModal, setPinModal] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');

  const closePinModal = () => {
    setPinModal(null);
    setPinValue('');
    setPinError('');
  };

  const requestPin = (mode, payload = null) => {
    setPinModal({ mode, payload });
    setPinValue('');
    setPinError('');
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
  // 5. ظ…ط¹ط§ظ„ط¬ط© ط§ط®طھظٹط§ط± ظ…ظ„ظپ ط§ظ„طµظˆط±ط© ظˆطھط­ظˆظٹظ„ظ‡ ط¥ظ„ظ‰ Base64
  const handleImageChange = (e, targetSetter) => {
    const file = e.target.files[0];
    if (file) {
      // ط§ظ„ط­ط¯ ط§ظ„ط£ظ‚طµظ‰ ظ„ط­ط¬ظ… ط§ظ„طµظˆط±ط© (ظ…ط«ظ„ط§ظ‹ 500 ظƒظٹظ„ظˆط¨ط§ظٹطھ)
      if (file.size > 512000) {
        alert('ط­ط¬ظ… ط§ظ„طµظˆط±ط© ظƒط¨ظٹط± ط¬ط¯ط§ظ‹! ط§ظ„ط±ط¬ط§ط، ط§ط®طھظٹط§ط± طµظˆط±ط© ط£ظ‚ظ„ ظ…ظ† 500 ظƒظٹظ„ظˆط¨ط§ظٹطھ.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        targetSetter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 6. ظ…ط¹ط§ظ„ط¬ط© ط¥ط¶ط§ظپط© ظ…ظ†طھط¬ ط¬ط¯ظٹط¯
  const handleAddProduct = async (e) => {
    e.preventDefault();

    const selectedCat = newCategory || (dbCategories[0] ? dbCategories[0].name : 'ظ…ط¹ط³ظ„');

    if (!newName.trim() || !newBuyPrice || !newSellPrice || newStock === '') {
      alert('ط§ظ„ط±ط¬ط§ط، طھط¹ط¨ط¦ط© ظƒط§ظپط© ط§ظ„ط­ظ‚ظˆظ„ ط¨ط´ظƒظ„ طµط­ظٹط­ ظˆط§ط®طھظٹط§ط± طھطµظ†ظٹظپ.');
      return;
    }

    const buyVal = Number(newBuyPrice);
    const sellVal = Number(newSellPrice);
    const stockVal = Number(newStock);

    if (buyVal < 0 || sellVal < 0 || stockVal < 0) {
      alert('ظ„ط§ ظٹظ…ظƒظ† ط¥ط¯ط®ط§ظ„ ظ‚ظٹظ… ط³ط§ظ„ط¨ط© ظ„ظ„ط£ط³ط¹ط§ط± ط£ظˆ ط§ظ„ظƒظ…ظٹط§طھ.');
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

      // طھظپط±ظٹط؛ ط§ظ„ط­ظ‚ظˆظ„ ط¨ط¹ط¯ ط§ظ„ط¥ط¶ط§ظپط© ط§ظ„ظ†ط§ط¬ط­ط©
      setNewName('');
      setNewBuyPrice('');
      setNewSellPrice('');
      setNewStock('');
      setNewImage('');
      alert('طھظ…طھ ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­!');
    } catch (err) {
      console.error(err);
      alert('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬.');
    }
  };

  // 7. ظپطھط­ ظ…ظˆط¯ط§ظ„ ط§ظ„طھط¹ط¯ظٹظ„ ظˆطھط¬ظ‡ظٹط² ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ„ظ‡
  const openEditProduct = (product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditBuyPrice(product.buyPrice);
    setEditSellPrice(product.sellPrice);
    setEditStock(product.stock);
    setEditImage(product.image || '');
  };

  const startEditProduct = (product) => {
    requestPin('edit', product);
  };

  // 8. ظ…ط¹ط§ظ„ط¬ط© طھط­ط¯ظٹط« ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬
  const handleUpdateProduct = async (e) => {
    e.preventDefault();

    if (!editName.trim() || !editCategory || !editBuyPrice || !editSellPrice || editStock === '') {
      alert('ط§ظ„ط±ط¬ط§ط، طھط¹ط¨ط¦ط© ظƒط§ظپط© ط§ظ„ط­ظ‚ظˆظ„ ط¨ط´ظƒظ„ طµط­ظٹط­.');
      return;
    }

    const buyVal = Number(editBuyPrice);
    const sellVal = Number(editSellPrice);
    const stockVal = Number(editStock);

    if (buyVal < 0 || sellVal < 0 || stockVal < 0) {
      alert('ظ„ط§ ظٹظ…ظƒظ† ط¥ط¯ط®ط§ظ„ ظ‚ظٹظ… ط³ط§ظ„ط¨ط© ظ„ظ„ط£ط³ط¹ط§ط± ط£ظˆ ط§ظ„ظƒظ…ظٹط§طھ.');
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
      alert('طھظ… طھط­ط¯ظٹط« ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­!');
    } catch (err) {
      console.error(err);
      alert('ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ط¯ظٹط« ط§ظ„ظ…ظ†طھط¬.');
    }
  };

  // 9. ظ…ط¹ط§ظ„ط¬ط© ط­ط°ظپ ط§ظ„ظ…ظ†طھط¬
  const runDeleteProduct = async ({ productId, productName }) => {
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

  const handleDeleteProduct = async (productId, productName) => {
    requestPin('delete', { productId, productName });
  };

  // ==================== ظˆط¸ط§ط¦ظپ ط§ظ„طھطµظ†ظٹظپط§طھ ط§ظ„ط¯ظٹظ†ط§ظ…ظٹظƒظٹط© ====================

  // ط£. ط¥ط¶ط§ظپط© طھطµظ†ظٹظپ ط¬ط¯ظٹط¯
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„طھظƒط±ط§ط±
    const exists = dbCategories.some(c => c.name.trim() === newCatName.trim());
    if (exists) {
      alert('ظ‡ط°ط§ ط§ظ„طھطµظ†ظٹظپ ظ…ظˆط¬ظˆط¯ ط¨ط§ظ„ظپط¹ظ„!');
      return;
    }

    try {
      await saveCategory({ name: newCatName.trim() });
      setNewCatName('');
    } catch (err) {
      console.error(err);
      alert('ظپط´ظ„ ط¥ط¶ط§ظپط© ط§ظ„طھطµظ†ظٹظپ.');
    }
  };

  // ط¨. طھط­ط¯ظٹط« طھطµظ†ظٹظپ
  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editCatName.trim() || !editingCat) return;

    try {
      // طھط­ط¯ظٹط« ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„طھظٹ طھظ†طھظ…ظٹ ظ„ظ‡ط°ط§ ط§ظ„طھطµظ†ظٹظپ ظ„طھط­ط¯ظٹط« ظپط¦طھظ‡ط§ ط£ظٹط¶ط§ظ‹
      const relatedProducts = products.filter(p => p.category === editingCat.name);
      for (const p of relatedProducts) {
        await saveProduct({ ...p, category: editCatName.trim() });
      }

      await saveCategory({ id: editingCat.id, name: editCatName.trim() });
      setEditingCat(null);
    } catch (err) {
      console.error(err);
      alert('ظپط´ظ„ طھط­ط¯ظٹط« ط§ظ„طھطµظ†ظٹظپ.');
    }
  };

  // ط¯. ط­ط°ظپ طھطµظ†ظٹظپ
  const handleDeleteCategory = async (catId, catName) => {
    if (confirm(`ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ طھطµظ†ظٹظپ "${catName}"طں ظ„ظ† ظٹطھظ… ط­ط°ظپ ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„طھط§ط¨ط¹ط© ظ„ظ‡ ظˆظ„ظƒظ† ط³طھط­طھط§ط¬ ط¥ظ„ظ‰ ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† طھطµظ†ظٹظپط§طھظ‡ط§.`)) {
      try {
        await deleteCategory(catId, catName);
      } catch (err) {
        console.error(err);
        alert('ظپط´ظ„ ط­ط°ظپ ط§ظ„طھطµظ†ظٹظپ.');
      }
    }
  };


  const getPinModalTitle = () => {
    if (!pinModal || pinModal.mode === 'access') return 'إدارة المنتجات محمية';
    if (pinModal.mode === 'edit') return 'تأكيد تعديل المنتج';
    return 'تأكيد حذف المنتج';
  };

  const getPinModalText = () => {
    if (!pinModal || pinModal.mode === 'access') return 'أدخل رمز المرور للوصول إلى إدارة المنتجات والمخزن.';
    if (pinModal.mode === 'edit') return 'أدخل رمز المرور لفتح نموذج تعديل المنتج.';
    return 'أدخل رمز المرور قبل تنفيذ حذف المنتج.';
  };

  if (!isProductsUnlocked) {
    return (
      <div className="p-4 overflow-y-auto h-full pb-20">
        <div className="min-h-[70vh] flex items-center justify-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pinValue === PRODUCTS_PIN) {
                setIsProductsUnlocked(true);
                setPinValue('');
                setPinError('');
              } else {
                setPinError('رمز المرور غير صحيح');
              }
            }}
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
            {pinError && (
              <div className="text-[11px] text-red-500 font-bold mt-2">{pinError}</div>
            )}
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
      
      {/* ط²ط± ظ„ظپطھط­ ظˆط¥ط¯ط§ط±ط© ط§ظ„طھطµظ†ظٹظپط§طھ ط§ظ„ط¯ظٹظ†ط§ظ…ظٹظƒظٹط© */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowCategoryModal(true)}
          className="w-full bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-500 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700/50 transition-colors shadow-sm dark:shadow-md backdrop-blur-md"
        >
          <FolderOpen className="h-4.5 w-4.5 text-amber-500" />
          <span>ط¥ط¯ط§ط±ط© ط§ظ„طھطµظ†ظٹظپط§طھ ط§ظ„ط¯ظٹظ†ط§ظ…ظٹظƒظٹط© ({dbCategories.length})</span>
        </button>
      </div>

      {/* 1. ظ†ظ…ظˆط°ط¬ ط¥ط¶ط§ظپط© ظ…ظ†طھط¬ ط¬ط¯ظٹط¯ ظ…ط¹ ط§ظ„طµظˆط±ط© ظˆط§ظ„طھطµظ†ظٹظپط§طھ */}
      <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4.5 shadow-sm dark:shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">ط¥ط¶ط§ظپط© ظ…ظ†طھط¬ ط¬ط¯ظٹط¯ ظ„ظ„ظ…ط®ط²ظ†</h3>
        </div>

        <form onSubmit={handleAddProduct} className="space-y-4">
          
          {/* ط­ظ‚ظ„ ط±ظپط¹ ط§ظ„طµظˆط±ط© ط¨ظ†ظ…ط· ط¹طµط±ظٹ ظˆظ…طµط؛ط± */}
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
                <span className="text-[9px] mt-1 font-bold">طµظˆط±ط©</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, setNewImage)}
                  className="hidden"
                />
              </label>
            )}
            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-350">ط£ط¶ظپ طµظˆط±ط© ظ„ظ„ظ…ظ†طھط¬</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-550 mt-0.5 leading-relaxed">ط§ط®طھظٹط§ط±ظٹطŒ ظƒط­ط¯ ط£ظ‚طµظ‰ 1 ظ…ظٹط؛ط§ط¨ط§ظٹطھ. ط³ظٹطھظ… ط¶ط؛ط·ظ‡ط§ ظˆطھط®ط²ظٹظ†ظ‡ط§ ظ…ط­ظ„ظٹط§ظ‹.</div>
            </div>
          </div>

          {/* ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬ */}
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬:</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ظ…ط«ط§ظ„: ظ…ط¹ط³ظ„ ظپط§ط®ط± طھظپط§ط­طھظٹظ†"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
            />
          </div>

          {/* ط§ظ„طھطµظ†ظٹظپط§طھ ط§ظ„ط¯ظٹظ†ط§ظ…ظٹظƒظٹط© ظˆط§ظ„ظƒظ…ظٹط© */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط§ظ„طھطµظ†ظٹظپ:</label>
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
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط§ظ„ظƒظ…ظٹط© ط¨ط§ظ„ظ…ط®ط²ظ†:</label>
              <input
                type="number"
                required
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="ط§ظ„ط¹ط¯ط¯"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
              />
            </div>
          </div>

          {/* ط£ط³ط¹ط§ط± ط§ظ„ط´ط±ط§ط، ظˆط§ظ„ط¨ظٹط¹ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط³ط¹ط± ط§ظ„ط´ط±ط§ط، (ط§ظ„ظƒظ„ظپط©):</label>
              <input
                type="number"
                required
                min="0"
                value={newBuyPrice}
                onChange={(e) => setNewBuyPrice(e.target.value)}
                placeholder="ط¨ط§ظ„ط¯ظٹظ†ط§ط±"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط³ط¹ط± ط§ظ„ط¨ظٹط¹ (ظ„ظ„ط²ط¨ظˆظ†):</label>
              <input
                type="number"
                required
                min="0"
                value={newSellPrice}
                onChange={(e) => setNewSellPrice(e.target.value)}
                placeholder="ط¨ط§ظ„ط¯ظٹظ†ط§ط±"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
              />
            </div>
          </div>

          {/* ط²ط± ط§ظ„طھظ‚ط¯ظٹظ… */}
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-amber-950/20"
          >
            <Package className="h-4 w-4 text-slate-950" />
            <span>ط¥ط¶ط§ظپط© ط§ظ„ظ…ظ†طھط¬ ظ„ظ„ظ…ط®ط²ظ†</span>
          </button>
        </form>
      </div>

      {/* 2. ظ‚ط§ط¦ظ…ط© ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ط­ط§ظ„ظٹط© */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-850 dark:text-slate-100 px-1 flex items-center gap-2">
          <span>ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ط­ط§ظ„ظٹط© ({products.length})</span>
        </h3>

        {products.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            ظ„ط§ طھظˆط¬ط¯ ظ…ظ†طھط¬ط§طھ ط­ط§ظ„ظٹط§ظ‹.
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
                      {/* ط¹ط±ط¶ ظ…طµط؛ط±ط© طµظˆط±ط© ط§ظ„ظ…ظ†طھط¬ */}
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
                            ط§ظ„ظ…ط®ط²ظ†: {product.stock}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-0.5">
                      <button
                        onClick={() => startEditProduct(product)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg text-amber-500 dark:text-amber-400"
                        title="طھط¹ط¯ظٹظ„ ط§ظ„ظ…ظ†طھط¬"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-lg text-red-500 dark:text-red-400"
                        title="ط­ط°ظپ ط§ظ„ظ…ظ†طھط¬"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* طھظپط§طµظٹظ„ ط§ظ„ط£ط³ط¹ط§ط± ظˆط§ظ„ط±ط¨ط­ */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-700/40 text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>ط³ط¹ط± ط§ظ„ط´ط±ط§ط،</div>
                      <div className="text-slate-800 dark:text-slate-300 mt-0.5 font-bold">{(product.buyPrice || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>ط³ط¹ط± ط§ظ„ط¨ظٹط¹</div>
                      <div className="text-amber-600 dark:text-amber-400 mt-0.5 font-bold">{(product.sellPrice || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded-xl text-right">
                      <div>ط§ظ„ط±ط¨ط­ ط§ظ„ظ…طھظˆظ‚ط¹</div>
                      <div className="text-green-600 dark:text-green-400 mt-0.5 font-bold">+{profit ? profit.toLocaleString() : '0'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. ظ…ظˆط¯ط§ظ„ طھط¹ط¯ظٹظ„ ط§ظ„ظ…ظ†طھط¬ ظ…ط¹ ط®ظٹط§ط±ط§طھ ط§ظ„طµظˆط± ظˆط§ظ„طھطµظ†ظٹظپ ط§ظ„ط¬ط¯ظٹط¯ */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto backdrop-blur-md shadow-sm dark:shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Edit className="h-4.5 w-4.5 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">طھط¹ط¯ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬</h4>
              </div>
              <button 
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-right">
              {/* طµظˆط±ط© ط§ظ„طھط¹ط¯ظٹظ„ */}
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
                    <span className="text-[9px] mt-1 font-bold">طµظˆط±ط©</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, setEditImage)}
                      className="hidden"
                    />
                  </label>
                )}
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">طھط¹ط¯ظٹظ„ ط§ظ„طµظˆط±ط© ظ„ظ„ظ…ظ†طھط¬</div>
                  <div className="text-[9px] text-slate-550 dark:text-slate-400 mt-0.5">ظٹظ…ظƒظ†ظƒ طھط؛ظٹظٹط± ط§ظ„طµظˆط±ط© ط£ظˆ ط­ط°ظپظ‡ط§ ط¨ط§ظ„ظƒط§ظ…ظ„.</div>
                </div>
              </div>

              {/* ط§ظ„ط§ط³ظ… */}
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500"
                />
              </div>

              {/* ط§ظ„طھطµظ†ظٹظپ ظˆط§ظ„ظƒظ…ظٹط© */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط§ظ„طھطµظ†ظٹظپ:</label>
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
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط§ظ„ظƒظ…ظٹط© ط¨ط§ظ„ظ…ط®ط²ظ†:</label>
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

              {/* ط§ظ„ط£ط³ط¹ط§ط± */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط³ط¹ط± ط§ظ„ط´ط±ط§ط،:</label>
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
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">ط³ط¹ط± ط§ظ„ط¨ظٹط¹:</label>
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

              {/* ط£ط²ط±ط§ط± ط§ظ„ط­ظپط¸ ط£ظˆ ط§ظ„ط¥ظ„ط؛ط§ط، */}
              <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-950/30"
                >
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>طھط­ط¯ظٹط« ظˆط­ظپط¸</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  <span>ط¥ظ„ط؛ط§ط،</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ظ…ظˆط¯ط§ظ„ ط¥ط¯ط§ط±ط© ط§ظ„طھطµظ†ظٹظپط§طھ ط§ظ„ط¯ظٹظ†ط§ظ…ظٹظƒظٹط© */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4">
          <form
            onSubmit={handlePinSubmit}
            className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 text-center shadow-md backdrop-blur-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <LockKeyhole className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">{getPinModalTitle()}</h2>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-4">
              {getPinModalText()}
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
            {pinError && (
              <div className="text-[11px] text-red-500 font-bold mt-2">{pinError}</div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-md shadow-amber-950/20 transition-colors"
              >
                تأكيد
              </button>
              <button
                type="button"
                onClick={closePinModal}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold py-3 px-5 rounded-2xl text-xs"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 space-y-4 max-h-[85vh] flex flex-col justify-between shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">ط¥ط¯ط§ط±ط© ط§ظ„طھطµظ†ظٹظپط§طھ ط§ظ„ط¯ظٹظ†ط§ظ…ظٹظƒظٹط©</h4>
              </div>
              <button 
                onClick={() => setShowCategoryModal(false)} 
                className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ظ†ظ…ظˆط°ط¬ ط¥ط¶ط§ظپط© طھطµظ†ظٹظپ */}
            <form onSubmit={handleAddCategory} className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-300 dark:border-slate-700">
              <input
                type="text"
                required
                placeholder="ط§ط³ظ… ط§ظ„طھطµظ†ظٹظپ ط§ظ„ط¬ط¯ظٹط¯..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500"
              />
              <button 
                type="submit" 
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-slate-950" />
                <span>ط¥ط¶ط§ظپط©</span>
              </button>
            </form>

            {/* ظ‚ط§ط¦ظ…ط© ط§ظ„طھطµظ†ظٹظپط§طھ ط§ظ„ط­ط§ظ„ظٹط© */}
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
                        ط­ظپط¸
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditingCat(null)} 
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-lg text-[10px] transition-colors"
                      >
                        ط¥ظ„ط؛ط§ط،
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
                          طھط¹ط¯ظٹظ„
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="text-red-500 dark:text-red-400 hover:text-red-300 text-[10px] bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 transition-colors"
                        >
                          ط­ط°ظپ
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
              ط¥ط؛ظ„ط§ظ‚ ط§ظ„ظ†ط§ظپط°ط©
            </button>
          </div>
        </div>
      )}

    </div>
  );
}




