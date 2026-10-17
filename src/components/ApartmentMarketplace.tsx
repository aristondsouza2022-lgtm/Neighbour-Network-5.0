import React, { useState } from 'react';
import { Apartment, MarketplaceItem, Profile } from '../types/community';
import {
  filterByApartmentScope,
  getMarketplaceStatusBadge,
} from '../utils/communityRules';
import { LuxuryMediaArt, RoleAvatar } from './LuxuryCrest';
import {
  ShoppingBag,
  Plus,
  Lock,
  CheckCircle2,
  Tag,
  PackageOpen,
} from 'lucide-react';

interface ApartmentMarketplaceProps {
  items: MarketplaceItem[];
  profiles: Profile[];
  currentApartment: Apartment;
  currentUser: Profile;
  onCreateListing: (
    item: Omit<MarketplaceItem, 'id' | 'created_at' | 'status'>
  ) => void;
  onUpdateStatus: (
    itemId: string,
    newStatus: MarketplaceItem['status']
  ) => void;
}

const CATEGORIES: Array<'All' | MarketplaceItem['category']> = [
  'All',
  'Furniture',
  'Appliances',
  'Electronics',
  'Sports & Leisure',
  'Horology & Art',
];

export function ApartmentMarketplace({
  items,
  profiles,
  currentApartment,
  currentUser,
  onCreateListing,
  onUpdateStatus,
}: ApartmentMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof CATEGORIES)[number]>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Listing Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] =
    useState<MarketplaceItem['category']>('Furniture');
  const [listingType, setListingType] =
    useState<MarketplaceItem['listing_type']>('both');
  const [salePrice, setSalePrice] = useState('35000');
  const [rentPrice, setRentPrice] = useState('800');
  const [formError, setFormError] = useState<string | null>(null);

  // Strictly isolate items to current apartment
  const apartmentItems = filterByApartmentScope(items, currentApartment.id);
  const filteredItems =
    selectedCategory === 'All'
      ? apartmentItems
      : apartmentItems.filter((item) => item.category === selectedCategory);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Please provide an item title.');
      return;
    }

    const parsedSale =
      listingType === 'sale' || listingType === 'both'
        ? Number(salePrice)
        : null;
    const parsedRent =
      listingType === 'rent' || listingType === 'both'
        ? Number(rentPrice)
        : null;

    if (
      (listingType === 'sale' || listingType === 'both') &&
      (!parsedSale || parsedSale <= 0)
    ) {
      setFormError('Please enter a valid sale price in INR (₹).');
      return;
    }

    if (
      (listingType === 'rent' || listingType === 'both') &&
      (!parsedRent || parsedRent <= 0)
    ) {
      setFormError('Please enter a valid daily rental rate in INR (₹/day).');
      return;
    }

    onCreateListing({
      apartment_id: currentApartment.id,
      seller_id: currentUser.id,
      title: title.trim(),
      description:
        description.trim() ||
        'Maintained in pristine residence condition. Available for immediate inspection within the society.',
      category,
      listing_type: listingType,
      sale_price: parsedSale,
      rent_price_per_day: parsedRent,
      image_url: 'luxury-visual://espresso-marzocco',
    });

    setTitle('');
    setDescription('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5" />
            <span>Apartment-Locked Scope · {currentApartment.name} Only</span>
          </div>
          <h2 className="text-2xl font-display font-semibold text-[#F9F9F9] mt-1">
            Private Resident Marketplace & Atelier Exchange
          </h2>
          <p className="text-xs text-[#F9F9F9]/65 mt-0.5">
            Peer-to-peer acquisition and short-term leasing exclusively among
            verified households of {currentApartment.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-[#0B0C10] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>List Residence Item</span>
        </button>
      </div>

      {/* Create Listing Form Drawer */}
      {showAddModal && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-[#141821] border border-[#D4AF37]/50 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-semibold text-[#F9F9F9]">
              New Listing for {currentApartment.name}
            </h3>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-[#F9F9F9]/60 hover:text-[#F9F9F9] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/50 text-xs text-[#EF4444]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                Item Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dyson Purifier Cool Formaldehyde"
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                Collection Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as MarketplaceItem['category'])
                }
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                Listing Option
              </label>
              <select
                value={listingType}
                onChange={(e) =>
                  setListingType(
                    e.target.value as MarketplaceItem['listing_type']
                  )
                }
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
              >
                <option value="sale">For Sale Only</option>
                <option value="rent">For Rent Only</option>
                <option value="both">Both (For Sale & For Rent)</option>
              </select>
            </div>

            {(listingType === 'sale' || listingType === 'both') && (
              <div>
                <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                  Sale Price (₹ INR)
                </label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] font-mono-tabular outline-none focus:border-[#D4AF37]"
                />
              </div>
            )}

            {(listingType === 'rent' || listingType === 'both') && (
              <div>
                <label className="block text-xs text-[#F9F9F9]/75 mb-1">
                  Rent Price per Day (₹/day)
                </label>
                <input
                  type="number"
                  value={rentPrice}
                  onChange={(e) => setRentPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] font-mono-tabular outline-none focus:border-[#D4AF37]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-[#F9F9F9]/75 mb-1">
              Provenance & Condition Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify age, warranty, and preferred pickup hours..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#0B0C10] border border-white/15 text-sm text-[#F9F9F9] outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#0B0C10] font-semibold text-xs cursor-pointer"
            >
              Publish Listing to {currentApartment.name}
            </button>
          </div>
        </form>
      )}

      {/* Interactive Category Filter Control Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#141821] border border-white/10 rounded-xl">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              selectedCategory === cat
                ? 'bg-[#D4AF37] text-[#0B0C10] font-semibold'
                : 'text-[#F9F9F9]/70 hover:text-[#F9F9F9]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid or Luxury "No Stock" Empty State Illustration */}
      {filteredItems.length === 0 ? (
        <div
          data-testid="marketplace-empty-state"
          className="bg-[#141821] border border-[#D4AF37]/30 rounded-xl p-12 text-center flex flex-col items-center justify-center"
        >
          <svg
            viewBox="0 0 120 120"
            className="w-24 h-24 mb-4"
            fill="none"
            aria-label="No Stock Luxury Illustration"
          >
            <circle
              cx="60"
              cy="60"
              r="48"
              stroke="#D4AF37"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <rect
              x="36"
              y="42"
              width="48"
              height="38"
              rx="4"
              stroke="#D4AF37"
              strokeWidth="2"
              fill="#0B0C10"
            />
            <path
              d="M48 42V34C48 28 72 28 72 34V42"
              stroke="#D4AF37"
              strokeWidth="2"
            />
            <circle cx="60" cy="61" r="6" stroke="#F5E6A8" strokeWidth="1.5" />
          </svg>
          <div className="text-sm uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
            No Stock
          </div>
          <h3 className="text-xl font-display font-semibold text-[#F9F9F9] mt-1">
            No Curated Pieces in {selectedCategory} for {currentApartment.name}
          </h3>
          <p className="text-xs text-[#F9F9F9]/60 max-w-md mt-1">
            All listings in this category have either been acquired by fellow
            residents or none have been consigned yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item) => {
            const seller = profiles.find((p) => p.id === item.seller_id);
            const badge = getMarketplaceStatusBadge(item.status);

            return (
              <div
                key={item.id}
                className="bg-[#141821] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <LuxuryMediaArt
                    variant={item.image_url}
                    className="w-full h-52"
                  />

                  <div className="p-5">
                    {/* Unboxed Metadata Kicker */}
                    <div className="flex items-center justify-between text-xs text-[#F9F9F9]/60 font-mono-tabular">
                      <span>
                        {item.category} · Residence {seller?.flat_no || 'A-101'}
                      </span>
                      <span
                        className={`font-semibold uppercase tracking-wider ${
                          item.status === 'available'
                            ? 'text-[#10B981]'
                            : item.status === 'occupied'
                            ? 'text-[#D4AF37]'
                            : 'text-[#9CA3AF]'
                        }`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <h3 className="text-xl font-display font-semibold text-[#F9F9F9] mt-1.5">
                      {item.title}
                    </h3>

                    <p className="text-xs text-[#F9F9F9]/75 mt-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Pricing Row */}
                    <div className="flex flex-wrap items-center gap-6 mt-4 pt-3 border-t border-white/10 tabular-nums">
                      {item.sale_price && (
                        <div>
                          <div className="text-[10px] uppercase text-[#F9F9F9]/50 font-mono-tabular">
                            For Sale
                          </div>
                          <div className="text-base font-semibold text-[#F9F9F9]">
                            INR {item.sale_price.toLocaleString('en-IN')}
                          </div>
                        </div>
                      )}
                      {item.rent_price_per_day && (
                        <div>
                          <div className="text-[10px] uppercase text-[#F9F9F9]/50 font-mono-tabular">
                            For Rent
                          </div>
                          <div className="text-base font-semibold text-[#D4AF37]">
                            INR {item.rent_price_per_day.toLocaleString('en-IN')}/day
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Footer based on Dynamic Status */}
                <div className="px-5 py-3.5 bg-[#0B0C10]/60 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <RoleAvatar
                      name={seller?.full_name || 'Resident'}
                      role={seller?.role || 'resident'}
                      size="sm"
                    />
                    <div className="text-xs">
                      <div className="text-[#F9F9F9] font-medium">
                        {seller?.full_name || 'Verified Family Head'}
                      </div>
                      <div className="text-[#F9F9F9]/50 font-mono-tabular">
                        Flat {seller?.flat_no || 'A-101'}
                      </div>
                    </div>
                  </div>

                  {item.status === 'available' ? (
                    <div className="flex items-center gap-2">
                      {item.sale_price && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(item.id, 'purchased')}
                          className="px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-[#0B0C10] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Buy ₹{item.sale_price.toLocaleString('en-IN')}
                        </button>
                      )}
                      {item.rent_price_per_day && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(item.id, 'occupied')}
                          className="px-3.5 py-2 rounded-lg border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/15 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Rent ₹{item.rent_price_per_day.toLocaleString('en-IN')}/day
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold uppercase tracking-wider border ${
                          item.status === 'occupied'
                            ? 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-white/20 text-[#F9F9F9]/70 bg-white/5'
                        }`}
                      >
                        {badge.label}
                      </span>
                      {(item.seller_id === currentUser.id ||
                        currentUser.role === 'developer') && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(item.id, 'available')}
                          className="text-xs text-[#D4AF37] underline cursor-pointer"
                        >
                          Relist
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
