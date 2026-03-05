"use client";
// ============================================================================
// Avatar Shop - Purchase and Manage Avatar Items
// ============================================================================
import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AVATAR_ITEMS, RARITY_COLORS } from "@/lib/gamificationEngine";

const CoinsIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
    <path d="M2 12h20"/>
  </svg>
);

const LockIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const CheckIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function AvatarShop({ scholarId }) {
  const [scholar, setScholar] = useState(null);
  const [ownedItems, setOwnedItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (scholarId) fetchData();
  }, [scholarId]);

  const fetchData = async () => {
    try {
      // Fetch scholar data
      const { data: scholarData, error: scholarError } = await supabase
        .from('scholars')
        .select('*')
        .eq('id', scholarId)
        .single();

      if (scholarError) throw scholarError;
      setScholar(scholarData);

      // Fetch owned items
      const { data: itemsData, error: itemsError } = await supabase
        .from('scholar_avatar_items')
        .select('*')
        .eq('scholar_id', scholarId);

      if (itemsError) throw itemsError;
      setOwnedItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching avatar shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const canUnlock = (item) => {
    if (!scholar) return false;

    // Check if already owned
    if (ownedItems.some(owned => owned.item_id === item.id)) return false;

    // Check coin cost
    if (item.coinCost > 0 && scholar.coins < item.coinCost) return false;

    // Check badge requirement
    if (item.badgeRequired) {
      const badges = scholar.badges || [];
      if (!badges.includes(item.badgeRequired)) return false;
    }

    return true;
  };

  const isOwned = (itemId) => {
    return ownedItems.some(owned => owned.item_id === itemId);
  };

  const isEquipped = (itemId) => {
    const item = ownedItems.find(owned => owned.item_id === itemId);
    return item?.equipped || false;
  };

  const purchaseItem = async (itemId, item) => {
    if (!canUnlock(item) || purchasing) return;

    setPurchasing(itemId);

    try {
      // Deduct coins if needed
      if (item.coinCost > 0) {
        const { error: updateError } = await supabase
          .from('scholars')
          .update({ coins: scholar.coins - item.coinCost })
          .eq('id', scholarId);

        if (updateError) throw updateError;
      }

      // Add item to scholar's collection
      const { error: insertError } = await supabase
        .from('scholar_avatar_items')
        .insert({
          scholar_id: scholarId,
          item_id: itemId,
          item_category: item.category,
          unlocked_at: new Date().toISOString(),
          equipped: false
        });

      if (insertError) throw insertError;

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error purchasing item:', error);
      alert('Failed to purchase item. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const equipItem = async (itemId, category) => {
    try {
      // Unequip all items in this category
      await supabase
        .from('scholar_avatar_items')
        .update({ equipped: false })
        .eq('scholar_id', scholarId)
        .eq('item_category', category);

      // Equip this item
      await supabase
        .from('scholar_avatar_items')
        .update({ equipped: true })
        .eq('scholar_id', scholarId)
        .eq('item_id', itemId);

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error equipping item:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-slate-100 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const categories = ['all', 'hat', 'pet', 'accessory', 'background'];
  const filteredItems = Object.entries(AVATAR_ITEMS).filter(([id, item]) => 
    selectedCategory === 'all' || item.category === selectedCategory
  );

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-slate-900">Avatar Shop</h2>
        <div className="flex items-center gap-2 bg-yellow-50 border-2 border-yellow-200 px-4 py-2 rounded-xl">
          <CoinsIcon size={20} className="text-yellow-600" />
          <span className="font-black text-yellow-700">{scholar?.coins || 0}</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl font-black text-sm uppercase tracking-wide transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map(([itemId, item]) => {
          const owned = isOwned(itemId);
          const equipped = isEquipped(itemId);
          const canBuy = canUnlock(item);
          const isPurchasing = purchasing === itemId;

          return (
            <div
              key={itemId}
              className={`p-4 rounded-2xl border-2 transition-all ${
                equipped
                  ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
                  : owned
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Item Icon */}
              <div className="text-5xl mb-2 text-center">{item.icon}</div>

              {/* Item Name */}
              <h3 className="font-black text-sm text-center mb-1 text-slate-900">
                {item.name}
              </h3>

              {/* Rarity */}
              <p className={`text-xs font-bold text-center mb-3 uppercase tracking-wide ${RARITY_COLORS[item.rarity]}`}>
                {item.rarity}
              </p>

              {/* Cost or Requirements */}
              <div className="text-center mb-3">
                {item.badgeRequired ? (
                  <div className="text-xs font-bold text-purple-600 flex items-center justify-center gap-1">
                    <LockIcon size={14} />
                    Badge Required
                  </div>
                ) : item.coinCost > 0 ? (
                  <div className="flex items-center justify-center gap-1 text-sm font-black text-yellow-600">
                    <CoinsIcon size={16} />
                    {item.coinCost}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-emerald-600">Free</div>
                )}
              </div>

              {/* Action Button */}
              {owned ? (
                equipped ? (
                  <div className="bg-indigo-600 text-white font-black py-2 rounded-lg text-xs text-center flex items-center justify-center gap-1">
                    <CheckIcon size={14} />
                    Equipped
                  </div>
                ) : (
                  <button
                    onClick={() => equipItem(itemId, item.category)}
                    className="w-full bg-indigo-600 text-white font-black py-2 rounded-lg text-xs hover:bg-indigo-700 transition-colors"
                  >
                    Equip
                  </button>
                )
              ) : canBuy ? (
                <button
                  onClick={() => purchaseItem(itemId, item)}
                  disabled={isPurchasing}
                  className="w-full bg-emerald-500 text-white font-black py-2 rounded-lg text-xs hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isPurchasing ? 'Unlocking...' : 'Unlock'}
                </button>
              ) : (
                <div className="bg-slate-200 text-slate-500 font-black py-2 rounded-lg text-xs text-center">
                  Locked
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 font-bold">No items in this category</p>
        </div>
      )}
    </div>
  );
}