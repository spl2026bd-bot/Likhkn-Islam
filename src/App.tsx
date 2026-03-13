/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Download, 
  Save, 
  Settings, 
  History, 
  FileText, 
  Store,
  X,
  Edit2,
  ChevronLeft
} from 'lucide-react';
import { ShopInfo, Invoice, InvoiceItem } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
// @ts-ignore
// import html2pdf from 'html2pdf.js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_SHOP_INFO: ShopInfo = {
  name: "My Computer & Photocopy Shop",
  address: "123 Shop Street, Dhaka, Bangladesh",
  mobile: "01700-000000",
  logo: null,
  services: ["Photocopy", "Color Print", "B&W Print", "Scanning", "Lamination", "Typing (Bangla)", "Typing (English)", "Internet Browsing", "Passport Photo"]
};

export default function App() {
  // State
  const [shopInfo, setShopInfo] = useState<ShopInfo>(DEFAULT_SHOP_INFO);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>(createNewInvoice());
  const [view, setView] = useState<'editor' | 'list' | 'settings'>('editor');
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const savedShop = localStorage.getItem('shopInfo');
    if (savedShop) setShopInfo(JSON.parse(savedShop));

    const savedInvoices = localStorage.getItem('invoices');
    if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('shopInfo', JSON.stringify(shopInfo));
  }, [shopInfo]);

  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoices));
  }, [invoices]);

  function createNewInvoice(): Invoice {
    const lastInvoice = invoices[0];
    const nextNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-')[1]) + 1 : 1001;
    
    return {
      id: crypto.randomUUID(),
      invoiceNumber: `INV-${nextNum}`,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerMobile: '',
      items: [{ id: crypto.randomUUID(), description: '', quantity: 1, price: 0, total: 0 }],
      subtotal: 0,
      discount: 0,
      grandTotal: 0,
      createdAt: Date.now()
    };
  }

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    };
    setCurrentInvoice({
      ...currentInvoice,
      items: [...currentInvoice.items, newItem]
    });
  };

  const handleRemoveItem = (id: string) => {
    if (currentInvoice.items.length === 1) return;
    const updatedItems = currentInvoice.items.filter(item => item.id !== id);
    updateInvoiceTotals(updatedItems);
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = currentInvoice.items.map(item => {
      if (item.id === id) {
        let finalValue = value;
        if (field === 'quantity' || field === 'price') {
          finalValue = Number(value) || 0;
        }
        const updatedItem = { ...item, [field]: finalValue };
        if (field === 'quantity' || field === 'price') {
          updatedItem.total = Number(updatedItem.quantity) * Number(updatedItem.price);
        }
        return updatedItem;
      }
      return item;
    });
    updateInvoiceTotals(updatedItems);
  };

  const updateInvoiceTotals = (items: InvoiceItem[], discount = currentInvoice.discount) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const grandTotal = subtotal - Number(discount);
    setCurrentInvoice({
      ...currentInvoice,
      items,
      subtotal,
      discount: Number(discount),
      grandTotal
    });
  };

  const handleSaveInvoice = () => {
    if (!currentInvoice.customerName.trim()) {
      alert('Please enter Customer Name (Customer Name বাধ্যতামূলক)');
      return;
    }
    if (!currentInvoice.customerMobile.trim()) {
      alert('Please enter Customer Mobile (Customer Mobile বাধ্যতামূলক)');
      return;
    }

    if (isEditing) {
      setInvoices(invoices.map(inv => inv.id === currentInvoice.id ? currentInvoice : inv));
      setIsEditing(false);
    } else {
      setInvoices([currentInvoice, ...invoices]);
    }
    alert('Invoice Saved Successfully!');
    setCurrentInvoice(createNewInvoice());
    setView('list');
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setIsEditing(true);
    setView('editor');
  };

  const handleDeleteInvoice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(inv => inv.id !== id));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-print-area');
    if (!element || isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    const opt = {
      margin: 10,
      filename: `Invoice_${currentInvoice.invoiceNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('invoice-print-area');
          if (el) {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.style.position = 'static';
            el.style.left = '0';
            el.style.top = '0';
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
    
    try {
      // @ts-ignore
      const h2p = window.html2pdf || (typeof html2pdf !== 'undefined' ? html2pdf : null);
      
      if (h2p) {
        await h2p().from(element).set(opt).save();
      } else {
        alert('PDF library is still loading. Please try again in a moment.');
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setShopInfo({ ...shopInfo, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const numberToWords = (num: number) => {
    // Simple implementation for demo purposes
    return "Taka " + num.toLocaleString() + " Only";
  };

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900">
      {/* Navigation Bar */}
      <nav className="no-print sticky top-0 z-50 bg-white border-b border-stone-200 px-4 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-emerald-700">
            <Store className="w-6 h-6" />
            <span>{shopInfo.name}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-4">
            <button 
              onClick={() => setView('editor')}
              className={cn("p-2 rounded-lg flex items-center gap-2 transition-colors", view === 'editor' ? "bg-emerald-50 text-emerald-700" : "hover:bg-stone-100")}
            >
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">Editor</span>
            </button>
            <button 
              onClick={() => { setView('editor'); setIsEditing(false); setCurrentInvoice(createNewInvoice()); }}
              className="p-2 rounded-lg flex items-center gap-2 hover:bg-stone-100 transition-colors text-stone-600"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("p-2 rounded-lg flex items-center gap-2 transition-colors", view === 'list' ? "bg-emerald-50 text-emerald-700" : "hover:bg-stone-100")}
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button 
              onClick={() => setView('settings')}
              className={cn("p-2 rounded-lg flex items-center gap-2 transition-colors", view === 'settings' ? "bg-emerald-50 text-emerald-700" : "hover:bg-stone-100")}
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
        {view === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Editor Section */}
            <div className="lg:col-span-2 space-y-6 no-print">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Invoice Number</label>
                    <input 
                      type="text" 
                      value={currentInvoice.invoiceNumber}
                      onChange={(e) => setCurrentInvoice({...currentInvoice, invoiceNumber: e.target.value})}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Date</label>
                    <input 
                      type="date" 
                      value={currentInvoice.date}
                      onChange={(e) => setCurrentInvoice({...currentInvoice, date: e.target.value})}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Customer Name *</label>
                    <input 
                      type="text" 
                      placeholder="Required"
                      value={currentInvoice.customerName}
                      onChange={(e) => setCurrentInvoice({...currentInvoice, customerName: e.target.value})}
                      className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-lg focus:border-emerald-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Customer Mobile *</label>
                    <input 
                      type="text" 
                      placeholder="Required"
                      value={currentInvoice.customerMobile}
                      onChange={(e) => setCurrentInvoice({...currentInvoice, customerMobile: e.target.value})}
                      className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-lg focus:border-emerald-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-stone-700">Items</h3>
                    <button 
                      onClick={handleAddItem}
                      className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-100">
                          <th className="text-left py-2 font-medium text-stone-500">Description</th>
                          <th className="text-center py-2 font-medium text-stone-500 w-20">Qty</th>
                          <th className="text-right py-2 font-medium text-stone-500 w-24">Price</th>
                          <th className="text-right py-2 font-medium text-stone-500 w-24">Total</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {currentInvoice.items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 pr-2">
                              <input 
                                type="text"
                                list="services"
                                value={item.description}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                placeholder="e.g. Photocopy"
                                className="w-full px-2 py-1.5 bg-stone-50 border border-transparent rounded focus:border-emerald-500 outline-none"
                              />
                              <datalist id="services">
                                {shopInfo.services.map((service, idx) => (
                                  <option key={idx} value={service} />
                                ))}
                              </datalist>
                            </td>
                            <td className="py-2 px-1">
                              <input 
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                className="w-full px-2 py-1.5 bg-stone-50 border border-transparent rounded focus:border-emerald-500 outline-none text-center"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input 
                                type="number"
                                value={item.price}
                                onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                className="w-full px-2 py-1.5 bg-stone-50 border border-transparent rounded focus:border-emerald-500 outline-none text-right"
                              />
                            </td>
                            <td className="py-2 pl-2 text-right font-medium">
                              {Number(item.total).toFixed(2)}
                            </td>
                            <td className="py-2 pl-2 text-center">
                              <button 
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-stone-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100 flex flex-col items-end gap-3">
                  <div className="flex items-center justify-between w-full max-w-[240px]">
                    <span className="text-stone-500">Subtotal</span>
                    <span className="font-semibold">{Number(currentInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between w-full max-w-[240px]">
                    <span className="text-stone-500">Discount</span>
                    <input 
                      type="number"
                      value={currentInvoice.discount}
                      onChange={(e) => updateInvoiceTotals(currentInvoice.items, e.target.value)}
                      className="w-24 px-2 py-1 bg-stone-50 border border-stone-200 rounded text-right outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between w-full max-w-[240px] pt-3 border-t border-stone-200">
                    <span className="font-bold text-stone-900">Grand Total</span>
                    <span className="font-bold text-emerald-700 text-xl">৳ {currentInvoice.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={handleSaveInvoice}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    <Save className="w-5 h-5" /> Save Invoice
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="lg:col-span-1 space-y-6">
              <div className="no-print bg-white rounded-2xl p-6 shadow-sm border border-stone-200 sticky top-24">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  Actions
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={handlePrint}
                    className="w-full bg-stone-900 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print Invoice
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className={cn(
                      "w-full py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all border",
                      isGeneratingPDF 
                        ? "bg-stone-50 text-stone-400 border-stone-100 cursor-not-allowed" 
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200"
                    )}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" /> Download PDF
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Tip:</strong> For best results, use "Save as PDF" in the print dialog or click the Download PDF button. Ensure "Background Graphics" is enabled in print settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('editor')}
                  className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  title="Back to Editor"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-stone-800">Invoice History</h2>
                  <div className="text-sm text-stone-500">{invoices.length} Invoices Found</div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Invoice #</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                        No invoices found. Create your first one!
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-emerald-700">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4 text-stone-600">{inv.date}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-stone-800">{inv.customerName || 'Cash Customer'}</div>
                          <div className="text-xs text-stone-400">{inv.customerMobile || 'No Mobile'}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-stone-900">৳ {Number(inv.grandTotal).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEditInvoice(inv)}
                              className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setCurrentInvoice(inv); setView('editor'); }}
                              className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="View/Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                <Settings className="w-6 h-6 text-emerald-600" />
                Shop Settings
              </h2>
              <button 
                onClick={() => setView('editor')}
                className="flex items-center gap-1 text-stone-500 hover:text-emerald-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Editor
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 p-6 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                {shopInfo.logo ? (
                  <div className="relative group">
                    <img src={shopInfo.logo} alt="Logo" className="w-32 h-32 object-contain rounded-lg bg-white p-2 shadow-sm" />
                    <button 
                      onClick={() => setShopInfo({...shopInfo, logo: null})}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center text-stone-300 border border-stone-100">
                    <Store className="w-12 h-12" />
                  </div>
                )}
                <label className="cursor-pointer bg-white px-4 py-2 border border-stone-200 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors shadow-sm">
                  Upload Shop Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Shop Name</label>
                  <input 
                    type="text" 
                    value={shopInfo.name}
                    onChange={(e) => setShopInfo({...shopInfo, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
                  <textarea 
                    rows={3}
                    value={shopInfo.address}
                    onChange={(e) => setShopInfo({...shopInfo, address: e.target.value})}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Mobile Number</label>
                  <input 
                    type="text" 
                    value={shopInfo.mobile}
                    onChange={(e) => setShopInfo({...shopInfo, mobile: e.target.value})}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Manage Services (Dropdown Options)</label>
                  <div className="space-y-2">
                    {shopInfo.services.map((service, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          type="text"
                          value={service}
                          onChange={(e) => {
                            const newServices = [...shopInfo.services];
                            newServices[index] = e.target.value;
                            setShopInfo({...shopInfo, services: newServices});
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg outline-none focus:border-emerald-500"
                        />
                        <button 
                          onClick={() => {
                            const newServices = shopInfo.services.filter((_, i) => i !== index);
                            setShopInfo({...shopInfo, services: newServices});
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => setShopInfo({...shopInfo, services: [...shopInfo.services, ""]})}
                      className="w-full py-2 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add New Service Option
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => { alert('Settings Saved!'); setView('editor'); }}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Hidden Print Area */}
      <div id="invoice-print-area" className="print-only bg-white">
        <div className="a4-page text-stone-900">
          {/* Bangladeshi Shop Header Style */}
          <div className="flex items-start justify-between border-b-4 border-emerald-800 pb-6 mb-8">
            <div className="flex gap-6 items-center">
              {shopInfo.logo && (
                <img src={shopInfo.logo} alt="Logo" className="w-24 h-24 object-contain" />
              )}
              <div>
                <h1 className="text-4xl font-black text-emerald-900 uppercase tracking-tight leading-none mb-2">{shopInfo.name}</h1>
                <p className="text-sm text-stone-600 font-medium max-w-md">{shopInfo.address}</p>
                <p className="text-lg font-bold text-stone-800 mt-1">Mobile: {shopInfo.mobile}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-emerald-800 text-white px-4 py-2 inline-block font-bold text-xl mb-3">INVOICE</div>
              <div className="text-sm">
                <p className="font-bold">Invoice #: <span className="text-emerald-700">{currentInvoice.invoiceNumber}</span></p>
                <p className="font-bold">Date: <span className="text-stone-600">{currentInvoice.date}</span></p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="border border-stone-200 p-4 rounded-lg">
              <h3 className="text-xs font-bold text-stone-400 uppercase mb-2">Bill To</h3>
              <p className="text-xl font-bold text-stone-800">{currentInvoice.customerName || 'Cash Customer'}</p>
              <p className="text-stone-600">{currentInvoice.customerMobile || 'N/A'}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-8">
            <thead>
              <tr className="bg-emerald-50 text-emerald-900 border-y-2 border-emerald-800">
                <th className="py-3 px-4 text-left font-bold uppercase text-sm w-12">SL</th>
                <th className="py-3 px-4 text-left font-bold uppercase text-sm">Description of Service</th>
                <th className="py-3 px-4 text-center font-bold uppercase text-sm w-24">Qty</th>
                <th className="py-3 px-4 text-right font-bold uppercase text-sm w-32">Rate</th>
                <th className="py-3 px-4 text-right font-bold uppercase text-sm w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {currentInvoice.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="py-3 px-4 text-stone-600">{index + 1}</td>
                  <td className="py-3 px-4 font-medium text-stone-800">{item.description}</td>
                  <td className="py-3 px-4 text-center text-stone-600">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-stone-600">{Number(item.price).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-bold text-stone-900">{Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
              {/* Fill empty space to keep layout consistent */}
              {[...Array(Math.max(0, 8 - currentInvoice.items.length))].map((_, i) => (
                <tr key={i} className="h-10">
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="flex justify-between items-start">
            <div className="max-w-md">
              <p className="text-sm font-bold text-stone-400 uppercase mb-1">In Words</p>
              <p className="text-stone-800 font-medium italic border-b border-stone-200 pb-1">
                {numberToWords(currentInvoice.grandTotal)}
              </p>
              <div className="mt-12 grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="h-16 border-b border-stone-300 mb-2"></div>
                  <div className="text-xs font-bold uppercase text-stone-500">Customer Signature</div>
                </div>
                <div className="text-center">
                  <div className="h-16 border-b border-stone-300 mb-2"></div>
                  <div className="text-xs font-bold uppercase text-stone-500">Authorized Signature</div>
                </div>
              </div>
            </div>
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span className="font-bold">{Number(currentInvoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Discount:</span>
                <span className="font-bold">(-) {Number(currentInvoice.discount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between bg-emerald-900 text-white p-3 rounded-lg mt-4">
                <span className="font-bold uppercase">Grand Total:</span>
                <span className="font-black text-xl">৳ {Number(currentInvoice.grandTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center border-t border-stone-100 pt-8">
            <p className="text-emerald-800 font-bold text-xl italic mb-1">Thank You for Your Business!</p>
            <p className="text-stone-400 text-xs uppercase tracking-widest">Software by Bangla Invoice Pro</p>
          </div>
        </div>
      </div>
    </div>
  );
}
