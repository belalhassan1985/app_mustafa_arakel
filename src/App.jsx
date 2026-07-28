import React, { useState, useEffect } from 'react';
import POSView from './components/POSView';
import ProductsManagement from './components/ProductsManagement';
import ReportsView from './components/ReportsView';
import { ShoppingCart, Package, BarChart3, CloudOff, Sun, Moon } from 'lucide-react';
import { supabase } from './supabaseClient';
import { db } from './db';
import { syncOfflineData, pullAllData } from './dataManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // الاشتراك بالـ Realtime ومزامنة البيانات عند عودة الاتصال بالإنترنت
  useEffect(() => {
    // جلب وتحديث كامل البيانات من السحابة عند بدء التشغيل
    pullAllData();

    // تشغيل مزامنة البيانات المعلقة بالخلفية عند بدء تشغيل التطبيق
    syncOfflineData();

    const handleOnline = () => {
      syncOfflineData();
    };
    window.addEventListener('online', handleOnline);

    // أ. الاشتراك المباشر لجدول المنتجات
    const productsSub = supabase
      .channel('realtime:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          await db.products.delete(payload.old.id);
        } else {
          const product = {
            id: payload.new.id,
            name: payload.new.name,
            category: payload.new.category || 'عام',
            buyPrice: payload.new.cost,
            sellPrice: payload.new.price,
            stock: payload.new.stock,
            image: payload.new.image_url,
            syncStatus: 'synced'
          };
          await db.products.put(product);
        }
      })
      .subscribe();

    // ب. الاشتراك المباشر لجدول التصنيفات
    const categoriesSub = supabase
      .channel('realtime:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          await db.categories.delete(payload.old.id);
        } else {
          const category = {
            id: payload.new.id,
            name: payload.new.name,
            syncStatus: 'synced'
          };
          await db.categories.put(category);
        }
      })
      .subscribe();

    // ج. الاشتراك المباشر لجدول المبيعات
    const salesSub = supabase
      .channel('realtime:sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          await db.sales.delete(payload.old.id);
        } else {
          const sale = {
            id: payload.new.id,
            date: payload.new.date,
            totalAmount: payload.new.total_amount,
            discount: payload.new.discount,
            finalAmount: payload.new.final_amount,
            syncStatus: 'synced'
          };
          await db.sales.put(sale);
        }
      })
      .subscribe();

    // د. الاشتراك المباشر لجدول المواد المباعة
    const saleItemsSub = supabase
      .channel('realtime:sale_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          await db.saleItems.delete(payload.old.id);
        } else {
          const item = {
            id: payload.new.id,
            saleId: payload.new.sale_id,
            productId: payload.new.product_id,
            productName: payload.new.product_name,
            quantity: payload.new.quantity,
            unitPrice: payload.new.unit_price,
            unitBuyPrice: payload.new.unit_buy_price,
            syncStatus: 'synced'
          };
          await db.saleItems.put(item);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      supabase.removeChannel(productsSub);
      supabase.removeChannel(categoriesSub);
      supabase.removeChannel(salesSub);
      supabase.removeChannel(saleItemsSub);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex justify-center transition-colors duration-300">
      <div className="w-full max-w-7xl min-h-screen bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 flex flex-col relative shadow-2xl md:pb-0 pb-16">

        {/* الترويسة الرئيسية */}
        <header className="no-print bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
              <ShoppingCart className="h-4.5 w-4.5 text-slate-950 font-black" />
            </div>
            <div>
              <h1 className="font-black text-sm text-slate-800 dark:text-slate-100 tracking-wide">O2</h1>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold -mt-0.5">نظام المبيعات والمخزن</p>
            </div>
          </div>

          {/* أزرار التنقل للشاشات الكبيرة */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pos'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-650 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>الكاشير</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-650 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>المنتجات</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'reports'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-650 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>التقارير</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* زر الدارك مود واللايت مود */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95"
              title={theme === 'dark' ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-[9px] font-bold text-slate-700 dark:text-slate-300">
              <CloudOff className="h-3 w-3 text-amber-500 animate-pulse" />
              <span>محلي</span>
            </div>
          </div>
        </header>

        {/* جسم الشاشات */}
        <main className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
          {activeTab === 'pos' && <POSView />}
          {activeTab === 'products' && <ProductsManagement />}
          {activeTab === 'reports' && <ReportsView />}
        </main>

        {/* شريط التنقل السفلي */}
        <nav className="no-print bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 fixed bottom-0 left-0 right-0 max-w-md mx-auto py-2 px-4 flex justify-around items-center z-30 shadow-xl md:hidden">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex flex-col items-center gap-1 transition-all py-1 px-3.5 rounded-xl ${activeTab === 'pos'
                ? 'text-amber-500 dark:text-amber-400 font-black scale-105 bg-amber-500/10'
                : 'text-slate-500 dark:text-slate-400 font-semibold'
              }`}
          >
            <ShoppingCart className="h-4.5 w-4.5" />
            <span className="text-[10px]">الكاشير</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex flex-col items-center gap-1 transition-all py-1 px-3.5 rounded-xl ${activeTab === 'products'
                ? 'text-amber-500 dark:text-amber-400 font-black scale-105 bg-amber-500/10'
                : 'text-slate-500 dark:text-slate-400 font-semibold'
              }`}
          >
            <Package className="h-4.5 w-4.5" />
            <span className="text-[10px]">المنتجات</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-1 transition-all py-1 px-3.5 rounded-xl ${activeTab === 'reports'
                ? 'text-amber-500 dark:text-amber-400 font-black scale-105 bg-amber-500/10'
                : 'text-slate-500 dark:text-slate-400 font-semibold'
              }`}
          >
            <BarChart3 className="h-4.5 w-4.5" />
            <span className="text-[10px]">التقارير</span>
          </button>
        </nav>

      </div>
    </div>
  );
}