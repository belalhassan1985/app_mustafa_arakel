import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { checkoutSale } from '../dataManager';
import { getBusinessDate } from '../utils/businessDateHelper';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  X,
  Check,
  AlertTriangle,
  Package
} from 'lucide-react';

export default function POSView() {
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const dbCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const categoriesList = ['الكل', ...dbCategories.map(c => c.name)];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'credit'
  const [customerName, setCustomerName] = useState('');

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'الكل' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert('عذراً، هذا المنتج غير متوفر في المخزن حالياً!');
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          alert(`عذراً، الكمية المطلوبة تتجاوز المتاح في المخزن (${product.stock} فقط).`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId, change, maxStock) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id !== productId) return item;

      const newQty = item.quantity + change;
      if (newQty <= 0) return null;
      if (newQty > maxStock) {
        alert(`المتاح في المخزن هو ${maxStock} فقط.`);
        return item;
      }
      return { ...item, quantity: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const validDiscount = Math.max(0, Math.min(discount, cartSubtotal));
  const cartTotal = cartSubtotal - validDiscount;

  const handleConfirmCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;

    // التحقق من إدخال اسم الزبون للدفع بالآجل
    if (paymentMethod === 'credit' && !customerName.trim()) {
      setCheckoutError('يرجى كتابة اسم الزبون للفاتورة الآجلة.');
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      for (const item of cart) {
        const dbProduct = await db.products.get(item.id);
        if (!dbProduct || dbProduct.stock < item.quantity) {
          throw new Error(`المنتج "${item.name}" لم يعد يتوفر منه المقدار المطلوب. المتاح: ${dbProduct ? dbProduct.stock : 0}`);
        }
      }

      const saleData = {
        date: new Date().toISOString(),
        totalAmount: cartSubtotal,
        discount: validDiscount,
        finalAmount: cartTotal,
        paymentMethod,
        status: paymentMethod === 'credit' ? 'unpaid' : 'paid',
        customerName: paymentMethod === 'credit' ? customerName.trim() : ''
      };

      await checkoutSale(saleData, cart);

      // تفريغ السلة مباشرة بعد نجاح حفظ الفاتورة لمنع إرسال نفس السلة مرة أخرى
      setCart([]);
      setDiscount(0);
      setPaymentMethod('cash');
      setCustomerName('');
      setIsCartOpen(false);
      setShowReceiptModal(false);
      alert('تم إتمام عملية البيع وحفظ الفاتورة بنجاح!');
    } catch (error) {
      console.error('فشلت عملية البيع:', error);
      setCheckoutError(error.message || 'حدث خطأ غير متوقع أثناء إتمام عملية البيع.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderCartItem = (item, isMobile = false) => (
    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800/80 flex-shrink-0">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="h-4.5 w-4.5 text-slate-400 dark:text-slate-700" />
        )}
      </div>

      <div className="flex-1 min-w-0 px-3 text-right">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">{item.name}</div>
        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
          {(item.sellPrice * item.quantity).toLocaleString()} د.ع{isMobile ? ` (${item.sellPrice.toLocaleString()} للقطعة)` : ''}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => updateCartQuantity(item.id, -1, item.stock)}
          className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/30"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 w-5 text-center">{item.quantity}</span>
        <button
          onClick={() => updateCartQuantity(item.id, 1, item.stock)}
          className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/30"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          onClick={() => removeFromCart(item.id)}
          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const CartFooter = ({ mobile = false }) => (
    <div className={`${mobile ? 'bg-white dark:bg-slate-800/95 pt-4 mt-4 space-y-3' : 'bg-white dark:bg-slate-900/95 p-4 space-y-4'} border-t border-slate-200 dark:border-slate-700/50 shrink-0 shadow-lg`}>
      <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">خصم دينار عراقي:</span>
        <input
          type="number"
          placeholder="0"
          min="0"
          max={cartSubtotal}
          value={discount || ''}
          onChange={(e) => setDiscount(Number(e.target.value))}
          className={`${mobile ? 'w-32' : 'w-28'} bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-left rounded-lg px-2 py-1 text-xs font-bold focus:border-red-500 focus:outline-none`}
        />
      </div>

      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex justify-between">
          <span>المجموع الفرعي:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{cartSubtotal.toLocaleString()} د.ع</span>
        </div>
        {validDiscount > 0 && (
          <div className="flex justify-between text-red-600 dark:text-red-400 font-semibold">
            <span>الخصم المستقطع:</span>
            <span>-{validDiscount.toLocaleString()} د.ع</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-extrabold text-slate-800 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-700/50">
          <span>الإجمالي النهائي:</span>
          <span className="text-amber-600 dark:text-amber-400">{cartTotal.toLocaleString()} د.ع</span>
        </div>
      </div>

      <button
        onClick={() => {
          setPaymentMethod('cash');
          setCustomerName('');
          setCheckoutError(null);
          setShowReceiptModal(true);
        }}
        disabled={cart.length === 0 || isSubmitting}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-colors mt-2"
      >
        <Receipt className="h-5 w-5" />
        <span>{isSubmitting ? "جاري إتمام البيع..." : "إتمام عملية البيع وفاتورة"}</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 relative overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden border-l border-slate-200 dark:border-slate-800">
        <div className="shrink-0 p-3 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 space-y-2.5 sticky top-0 z-20 backdrop-blur-lg">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="بحث عن منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-10 pl-4 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            <Search className="absolute right-3 top-2.5 text-slate-400 h-4 w-4" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-print scrollbar-none">
            {categoriesList.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-28 md:pb-6">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <AlertTriangle className="h-10 w-10 mb-2 stroke-[1.5]" />
              <p className="text-sm">لم يتم العثور على منتجات مطابقة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {filteredProducts.map(product => {
                const inCartItem = cart.find(item => item.id === product.id);
                const remainingStock = product.stock - (inCartItem ? inCartItem.quantity : 0);

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={remainingStock <= 0}
                    className={`relative flex flex-col overflow-hidden text-right rounded-2xl border transition-all duration-300 ${
                      remainingStock <= 0
                        ? 'bg-slate-200/40 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-700/30 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 shadow-sm dark:shadow-md backdrop-blur-md'
                    }`}
                  >
                    <div className="w-full h-24 relative bg-slate-100 dark:bg-slate-900/40 flex items-center justify-center border-b border-slate-200 dark:border-slate-700/30 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-400 dark:text-slate-600 flex flex-col items-center gap-1.5">
                          <Package className="h-7 w-7 stroke-[1.2]" />
                          <span className="text-[9px] text-slate-500">لا توجد صورة</span>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 text-[9px] bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 backdrop-blur-md px-2 py-0.5 rounded-md font-bold border border-slate-200 dark:border-slate-700/50">
                        {product.category}
                      </span>
                    </div>

                    <div className="p-3 w-full flex-1 flex flex-col justify-between">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed mb-2 w-full">
                        {product.name}
                      </div>

                      <div className="w-full flex justify-between items-end">
                        <div>
                          <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                            {(product.sellPrice || 0).toLocaleString()} د.ع
                          </div>
                          <div className="text-[9px] mt-0.5 text-slate-500 dark:text-slate-400 font-bold">
                            {remainingStock <= 0 ? <span className="text-red-500 font-bold">نفذت</span> : <span>المتبقي: {remainingStock}</span>}
                          </div>
                        </div>

                        {inCartItem && (
                          <div className="bg-amber-500 text-slate-950 text-[10px] font-black w-5.5 h-5.5 flex items-center justify-center rounded-lg shadow-md shadow-amber-950/40">
                            {inCartItem.quantity}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex w-80 lg:w-96 bg-white dark:bg-slate-800/95 border-r border-slate-200 dark:border-slate-800 flex-col h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] overflow-hidden no-print">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">سلة المشتريات ({cartTotalItems})</h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <ShoppingCart className="h-12 w-12 mb-2 stroke-[1.2] text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold">السلة فارغة حالياً</p>
            </div>
          ) : (
            cart.map(item => renderCartItem(item))
          )}
        </div>

        <CartFooter />
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 z-20 no-print md:hidden">
          <div
            onClick={() => setIsCartOpen(true)}
            className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-2xl py-3 px-5 shadow-lg shadow-amber-950/50 cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-slate-950" />
                <span className="absolute -top-2 -left-2 bg-slate-900 text-amber-400 text-[10px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-md">
                  {cartTotalItems}
                </span>
              </div>
              <div>
                <div className="text-xs text-amber-950/80 font-bold">سلة المشتريات</div>
                <div className="text-sm font-black text-slate-950">{cartTotal.toLocaleString()} د.ع</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-xs bg-slate-950/15 hover:bg-slate-950/25 py-1.5 px-3.5 rounded-xl border border-slate-950/20 text-slate-950">
              <span>عرض السلة</span>
              <Plus className="h-3.5 w-3.5 text-slate-950" />
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/75 z-40 flex items-end justify-center no-print md:hidden">
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)}></div>

          <div className="relative w-full max-w-md bg-white dark:bg-slate-800/90 rounded-t-3xl border-t border-slate-200 dark:border-slate-700/50 p-5 z-50 h-[85vh] max-h-[85vh] min-h-0 flex flex-col overflow-hidden backdrop-blur-md shadow-sm dark:shadow-md">
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer shrink-0" onClick={() => setIsCartOpen(false)}></div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/50 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">سلة المشتريات ({cartTotalItems})</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0 space-y-3 min-h-0">
              {cart.map(item => renderCartItem(item, true))}
            </div>

            <CartFooter mobile />
          </div>
        </div>
      )}

      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-5 overflow-y-auto max-h-[90vh] flex flex-col justify-between font-sans backdrop-blur-md shadow-sm dark:shadow-md">
            <div className="print-area bg-white text-slate-950 p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="mb-4">
                <h2 className="text-lg font-black tracking-wide text-slate-900">متجر O2</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">متجر فيب، أراكيل، معسل وملحقات</p>
                <div className="border-b border-dashed border-slate-300 my-3"></div>
                <div className="flex justify-between items-center text-[10px] text-slate-600 px-1">
                  <span>التاريخ: {getBusinessDate().toLocaleDateString('ar-EG')}</span>
                  <span>الوقت: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-600 px-1 mt-1 border-t border-dashed border-slate-200 pt-1">
                  <span>طريقة الدفع: {paymentMethod === 'credit' ? 'آجل (دين)' : 'نقدي'}</span>
                  {paymentMethod === 'credit' && <span className="font-bold">الزبون: {customerName}</span>}
                </div>
              </div>

              <table className="w-full text-right text-[11px] mb-4">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="pb-1 text-right">المادة</th>
                    <th className="pb-1 text-center">الكمية</th>
                    <th className="pb-1 text-left">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2 text-slate-800 font-semibold max-w-[150px] truncate">{item.name}</td>
                      <td className="py-2 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-2 text-left font-bold text-slate-900">{(item.sellPrice * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-[11px] text-slate-700 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold">{cartSubtotal.toLocaleString()} د.ع</span>
                </div>
                {validDiscount > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>الخصم:</span>
                    <span>-{validDiscount.toLocaleString()} د.ع</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-1.5 border-t border-slate-200">
                  <span>المجموع الكلي:</span>
                  <span>{cartTotal.toLocaleString()} د.ع</span>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-[10px] text-slate-400 font-bold">شكراً لزيارتكم! نتشرف بزيارتكم دائماً.</p>
              </div>
            </div>

            {/* خيار تحديد طريقة الدفع (نقدي / آجل) */}
            <div className="no-print mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2 text-right">طريقة الدفع:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all duration-200 ${
                    paymentMethod === 'cash'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  نقدي
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all duration-200 ${
                    paymentMethod === 'credit'
                      ? 'bg-red-500 text-white shadow-sm font-extrabold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  آجل (دين)
                </button>
              </div>

              {paymentMethod === 'credit' && (
                <div className="mt-3 text-right">
                  <label className="text-[10px] font-bold text-red-500 dark:text-red-400 block mb-1">اسم الزبون (مطلوب):</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-red-500 focus:outline-none"
                    placeholder="اكتب اسم الزبون..."
                    required
                  />
                </div>
              )}
            </div>

            {checkoutError && (
              <div className="bg-red-950/40 border border-red-800 text-red-400 dark:text-red-300 text-xs p-3 rounded-xl mt-4 text-right">
                {checkoutError}
              </div>
            )}

            <div className="no-print flex gap-2.5 mt-5">
              <button
                onClick={handleConfirmCheckout}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-green-950 text-xs transition-colors"
              >
                {isSubmitting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></span>
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'جاري إتمام البيع...' : 'تأكيد المبيعات'}</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={isSubmitting}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1 text-xs border border-slate-700/80 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة</span>
              </button>

              <button
                onClick={() => setShowReceiptModal(false)}
                disabled={isSubmitting}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 dark:text-slate-100 font-bold py-2.5 px-3.5 rounded-xl text-xs transition-colors"
              >
                <span>إلغاء</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
