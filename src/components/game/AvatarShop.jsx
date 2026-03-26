"use client";
// ============================================================================
// Avatar Shop - Purchase and Manage Avatar Items
// src/components/game/AvatarShop.jsx
//
// CHANGES FROM ORIGINAL:
//   - purchaseItem now calls spend_coins() RPC (atomic, race-condition safe)
//     instead of two separate updates that could desync on failure
//   - Removed manual coin deduction + manual insert — RPC handles both
//   - Error messages now use reason codes from RPC response
// ============================================================================
import React, { useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AVATAR_ITEMS, RARITY_COLORS } from "@/lib/gamificationEngine";
import gsap from "gsap";
import AvatarRenderer from "./AvatarRenderer";

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
  const [errorMsg, setErrorMsg] = useState(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (scholarId) fetchData();
  }, [scholarId]);

  const fetchData = async () => {
    try {
      const { data: scholarData, error: scholarError } = await supabase
        .from('scholars')
        .select('*')
        .eq('id', scholarId)
        .single();

      if (scholarError) throw scholarError;
      setScholar(scholarData);

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
    if (ownedItems.some(owned => owned.item_id === item.id)) return false;
    if (item.coinCost > 0 && scholar.coins < item.coinCost) return false;
    if (item.badgeRequired) {
      const badges = scholar.badges || [];
      if (!badges.includes(item.badgeRequired)) return false;
    }
    return true;
  };

  const isOwned  = (itemId) => ownedItems.some(owned => owned.item_id === itemId);
  const isEquipped = (itemId) => ownedItems.find(owned => owned.item_id === itemId)?.equipped || false;

  // ── UPDATED: uses spend_coins() RPC (atomic) ─────────────────────────────
  const purchaseItem = async (itemId, item) => {
    if (!canUnlock(item) || purchasing) return;
    setPurchasing(itemId);
    setErrorMsg(null);

    try {
      if (item.coinCost > 0) {
        // Atomic RPC: deducts coins + inserts scholar_avatar_items in one transaction
        const { data, error } = await supabase.rpc('spend_coins', {
          p_scholar_id: scholarId,
          p_item_id:    itemId,
          p_price:      item.coinCost,
          p_category:   item.category,
        });

        if (error) throw error;

        if (!data?.ok) {
          const messages = {
            insufficient_coins: "Not enough coins!",
            already_owned:      "You already own this item.",
            scholar_not_found:  "Account error — please refresh.",
          };
          setErrorMsg(messages[data?.error] || "Purchase failed. Try again.");
          return;
        }
      } else {
        // Free item — insert directly (no coin deduction needed)
        const { error: insertError } = await supabase
          .from('scholar_avatar_items')
          .insert({
            scholar_id:    scholarId,
            item_id:       itemId,
            item_category: item.category,
            unlocked_at:   new Date().toISOString(),
            equipped:      false,
          });
        if (insertError) throw insertError;
      }

      await fetchData();
    } catch (error) {
      console.error('Error purchasing item:', error);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const equipItem = async (itemId, category) => {
    try {
      await supabase
        .from('scholar_avatar_items')
        .update({ equipped: false })
        .eq('scholar_id', scholarId)
        .eq('item_category', category);

      await supabase
        .from('scholar_avatar_items')
        .update({ equipped: true })
        .eq('scholar_id', scholarId)
        .eq('item_id', itemId);

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

  const gridRef = useRef(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Build current equipped avatar for live preview
  const equippedAvatar = {
    base: scholar?.avatar?.base || "astronaut",
    hat: null, pet: null, accessory: null, background: null,
  };
  ownedItems.forEach(oi => {
    if (oi.equipped) {
      const def = AVATAR_ITEMS[oi.item_id];
      if (def) equippedAvatar[def.category] = oi.item_id;
    }
  });

  // Preview avatar = equipped + hovered item overlaid
  const previewAvatar = { ...equippedAvatar };
  if (previewItem) {
    const def = AVATAR_ITEMS[previewItem];
    if (def) previewAvatar[def.category] = previewItem;
  }

  // GSAP stagger entrance on grid items
  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".shop-card");
    if (!cards.length) return;
    gsap.fromTo(cards,
      { y: 20, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: 0.04, ease: "back.out(1.4)" }
    );
  }, [selectedCategory, loading]);

  const categories = ['all', 'hat', 'pet', 'accessory', 'background'];
  const CATEGORY_ICONS = { all: '🎨', hat: '🎩', pet: '🐾', accessory: '✨', background: '🌌' };
  const filteredItems = Object.entries(AVATAR_ITEMS).filter(([id, item]) =>
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const RARITY_GLOW = {
    common: "rgba(100,116,139,0.15)",
    rare: "rgba(59,130,246,0.2)",
    epic: "rgba(139,92,246,0.25)",
    legendary: "rgba(234,179,8,0.3)",
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-100 relative" style={{
      boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    }}>
      <div className="absolute inset-0 rounded-3xl bg-white/95 backdrop-blur-sm sm:hidden -z-[1]" />

      {/* Header with live avatar preview */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <div style={{ position: "relative" }}>
            <AvatarRenderer avatar={previewAvatar} size="lg" animated />
            {previewItem && (
              <div style={{
                position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
                background: "#6366f1", color: "white", fontSize: 9, fontWeight: 800,
                padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap",
              }}>Preview</div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Avatar Shop</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Customise your space explorer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "2px solid #fbbf24",
          boxShadow: "0 2px 8px rgba(251,191,36,0.3)",
        }}>
          <CoinsIcon size={20} />
          <span className="font-black text-yellow-700 text-lg">{scholar?.coins || 0}</span>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-sm font-bold text-red-700 flex items-center justify-between">
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

      {/* Category Filter — enhanced with icons */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="transition-all whitespace-nowrap"
            style={{
              padding: "8px 16px", borderRadius: 12,
              fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5,
              background: selectedCategory === cat
                ? "linear-gradient(135deg, #6366f1, #7c3aed)"
                : "#f1f5f9",
              color: selectedCategory === cat ? "white" : "#64748b",
              border: "none", cursor: "pointer",
              boxShadow: selectedCategory === cat ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
              transform: selectedCategory === cat ? "scale(1.05)" : "scale(1)",
            }}
          >
            {CATEGORY_ICONS[cat]} {cat}
          </button>
        ))}
      </div>

      {/* Items Grid — animated */}
      <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map(([itemId, item]) => {
          const owned = isOwned(itemId);
          const equipped = isEquipped(itemId);
          const canBuy = canUnlock(item);
          const isPurchasing = purchasing === itemId;

          return (
            <div
              key={itemId}
              className="shop-card"
              onMouseEnter={() => setPreviewItem(itemId)}
              onMouseLeave={() => setPreviewItem(null)}
              style={{
                padding: 16, borderRadius: 16, cursor: "pointer",
                border: `2px solid ${equipped ? "#818cf8" : owned ? "#6ee7b7" : "#e2e8f0"}`,
                background: equipped
                  ? "linear-gradient(135deg, #eef2ff, #e0e7ff)"
                  : owned
                  ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
                  : "#f8fafc",
                boxShadow: equipped
                  ? "0 4px 16px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.8)"
                  : `0 2px 8px ${RARITY_GLOW[item.rarity] || "transparent"}`,
                transition: "all 0.2s ease",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Rarity shimmer for legendary */}
              {item.rarity === "legendary" && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: "linear-gradient(135deg, transparent 40%, rgba(234,179,8,0.08) 50%, transparent 60%)",
                  backgroundSize: "200% 200%",
                  animation: "shimmer 3s linear infinite",
                  borderRadius: 14, pointerEvents: "none",
                }} />
              )}

              {/* Item icon — large, animated on hover */}
              <div style={{
                fontSize: 48, textAlign: "center", marginBottom: 8, lineHeight: 1,
                filter: owned ? "none" : "grayscale(0.3)",
                transition: "transform 0.2s ease, filter 0.2s ease",
              }}>{item.icon}</div>

              <h3 style={{
                fontWeight: 900, fontSize: 13, textAlign: "center",
                color: "#1e293b", marginBottom: 2,
              }}>{item.name}</h3>

              {/* Rarity badge */}
              <div style={{
                textAlign: "center", marginBottom: 10,
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                  letterSpacing: 0.8, padding: "2px 8px", borderRadius: 6,
                  background: item.rarity === "legendary" ? "linear-gradient(135deg, #fef3c7, #fde68a)"
                    : item.rarity === "epic" ? "#f3e8ff"
                    : item.rarity === "rare" ? "#dbeafe"
                    : "#f1f5f9",
                  color: item.rarity === "legendary" ? "#92400e"
                    : item.rarity === "epic" ? "#7c3aed"
                    : item.rarity === "rare" ? "#2563eb"
                    : "#64748b",
                }}>{item.rarity}</span>
              </div>

              {/* Price */}
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                {item.badgeRequired ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>
                    <LockIcon size={13} /> Badge Required
                  </div>
                ) : item.coinCost > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 14, fontWeight: 900, color: "#d97706" }}>
                    <CoinsIcon size={16} /> {item.coinCost}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#059669" }}>Free</span>
                )}
              </div>

              {/* Action button */}
              {owned ? (
                equipped ? (
                  <div style={{
                    background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                    color: "white", fontWeight: 900, padding: "8px 0", borderRadius: 10,
                    fontSize: 11, textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}>
                    <CheckIcon size={13} /> Equipped
                  </div>
                ) : (
                  <button
                    onClick={() => equipItem(itemId, item.category)}
                    style={{
                      width: "100%", background: "#6366f1", color: "white",
                      fontWeight: 900, padding: "8px 0", borderRadius: 10,
                      fontSize: 11, border: "none", cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                  >Equip</button>
                )
              ) : canBuy ? (
                <button
                  onClick={() => purchaseItem(itemId, item)}
                  disabled={isPurchasing}
                  style={{
                    width: "100%", fontWeight: 900, padding: "8px 0", borderRadius: 10,
                    fontSize: 11, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "white", opacity: isPurchasing ? 0.6 : 1,
                    transition: "all 0.2s ease",
                  }}
                >{isPurchasing ? "Unlocking..." : "Unlock"}</button>
              ) : (
                <div style={{
                  background: "#e2e8f0", color: "#94a3b8",
                  fontWeight: 900, padding: "8px 0", borderRadius: 10,
                  fontSize: 11, textAlign: "center",
                }}>Locked</div>
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

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% -200% }
          100% { background-position: 200% 200% }
        }
        .shop-card:hover {
          transform: translateY(-3px) scale(1.02) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
        }
      `}</style>
    </div>
  );
}