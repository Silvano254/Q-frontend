import React, { useState } from "react";
import { ShoppingBag, Plus, Search, Trash2, Edit, ChevronLeft, Layers, Percent, DollarSign } from "lucide-react";
import { ProductService } from "../../../shared/types.js";

interface ProductsModuleProps {
  products: ProductService[];
  currency: string;
  onCreateProduct: (prod: Partial<ProductService>) => Promise<void>;
  onUpdateProduct: (id: string, prod: Partial<ProductService>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export default function ProductsModule({
  products,
  currency,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct
}: ProductsModuleProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductService | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Tents");
  const [unitType, setUnitType] = useState("Day");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxRate, setTaxRate] = useState("16");
  const [status, setStatus] = useState<'active' | 'inactive'>("active");

  const startEdit = (p: ProductService) => {
    setSelectedProduct(p);
    setIsEditing(true);
    setName(p.name);
    setDescription(p.description || "");
    setCategory(p.category);
    setUnitType(p.unitType);
    setUnitPrice(p.unitPrice.toString());
    setTaxRate(p.taxRate.toString());
    setStatus(p.status);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unitPrice) {
      alert("Name and price are required.");
      return;
    }

    const payload: Partial<ProductService> = {
      name,
      description,
      category,
      unitType,
      unitPrice: Number(unitPrice),
      taxRate: Number(taxRate),
      status
    };

    if (isEditing && selectedProduct) {
      await onUpdateProduct(selectedProduct.id, payload);
      setIsEditing(false);
    } else {
      await onCreateProduct(payload);
      setIsCreating(false);
    }
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("Tents");
    setUnitType("Day");
    setUnitPrice("");
    setTaxRate("16");
    setStatus("active");
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-[#6B46C1]" />
            <span>Products & Hire Services</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Manage Binti standard assets, event tents, pergolas, tabletop hire pricing, and tax brackets.</p>
        </div>
        {!isCreating && !isEditing && (
          <button
            onClick={() => {
              setIsCreating(true);
              setIsEditing(false);
              resetForm();
            }}
            className="px-4 py-2 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset / Service</span>
          </button>
        )}
      </div>

      {/* VIEW 1: CREATION / EDITING FORM */}
      {(isCreating || isEditing) && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-bold text-sm text-gray-800">{isEditing ? "Edit Catalog Item" : "Register New Asset Service"}</h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
              }}
              className="text-gray-400 hover:text-gray-600 text-xs flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>

          <form onSubmit={handleSaveProduct} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Service / Asset Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cheese Tent (Semi-open)"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-700"
                  >
                    <option value="Tents">Tents hire</option>
                    <option value="Structures">Structures & Pergolas</option>
                    <option value="Lighting">Ambient Lighting</option>
                    <option value="Furniture">Furniture hire</option>
                    <option value="Decor">Bespoke Table decor</option>
                    <option value="Logistics">Crew Logistics</option>
                    <option value="Consultation">Site Consultation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Unit Type</label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-700"
                  >
                    <option value="Day">Per Day</option>
                    <option value="Setup">Per Setup</option>
                    <option value="Event">Per Event</option>
                    <option value="Piece">Per Piece</option>
                    <option value="Guest">Per Guest</option>
                    <option value="Hour">Per Hour</option>
                    <option value="Flat Rate">Flat Rate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Unit Price * ({currency})</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="e.g. 35000"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">VAT Tax Rate %</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-700"
                  >
                    <option value="16">16% (Standard Kenya VAT)</option>
                    <option value="0">0% (Zero Rated)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Status Flag</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-700"
                  >
                    <option value="active">Active Inventory</option>
                    <option value="inactive">Archived / Off market</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Technical Description & Scope</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of dimensions, pegging safety rules, draping textures, logisistical weights."
                rows={4}
                className="w-full p-4 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow shadow-[#6B46C1]/20 transition-all"
              >
                {isEditing ? "Save Catalog Item" : "Register Item Asset"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition-all"
              >
                Go Back
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 2: PRODUCT GRID LISTING */}
      {!isCreating && !isEditing && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog by service name, category, text..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/10 focus:border-[#6B46C1]"
              />
            </div>
            <div className="text-xs text-gray-400 font-medium">
              Registered items count: <span className="font-bold text-[#6B46C1]">{filteredProducts.length}</span>
            </div>
          </div>

          <div className="glass-card p-6 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px] pb-3">
                  <th className="pb-3">Service / Asset Name</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Billing Unit</th>
                  <th className="pb-3 text-right">Standard Price</th>
                  <th className="pb-3 text-center">VAT Rate</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No catalog assets or services match query criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4">
                        <p className="text-xs font-bold text-gray-800">{p.name}</p>
                        {p.description && <p className="text-[10px] text-gray-400 mt-1 max-w-[280px] truncate">{p.description}</p>}
                      </td>
                      <td className="py-4">
                        <span className="inline-block px-2.5 py-1 bg-purple-50 text-[#6B46C1] rounded-lg font-medium text-[10px] uppercase tracking-wider">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-4 font-medium text-gray-500 capitalize">per {p.unitType}</td>
                      <td className="py-4 font-bold text-gray-900 text-right">{currency} {p.unitPrice.toLocaleString()}</td>
                      <td className="py-4 text-center font-semibold text-gray-500">{p.taxRate}%</td>
                      <td className="py-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          p.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Edit catalog details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm(`Delete catalog item "${p.name}"?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove catalog item"
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
    </div>
  );
}
