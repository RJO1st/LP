"use client";
// ============================================================================
// Avatar Shop - Purchase, Equip, and Live-Preview Avatar Items
// src/components/game/AvatarShop.jsx
//
// REBUILT:
//   - Live AvatarRenderer preview (replaces broken LottieAvatar)
//   - Optimistic equip — instant visual feedback, then DB write
//   - RLS-compatible upsert for free items
//   - Each item card shows a mini AvatarRenderer with that item applied
//   - "None" button to unequip within a category
//   - purchaseItem uses spend_coins() RPC (atomic, race-condition safe)
// ============================================================================
import React, { useEffect, useState, useRef, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseKeys } from "@/lib/env";
import { AVATAR_ITEMS, RARITY_COLORS } from "@/lib/gamificationEngine";
import gsap from "gsap";
import AvatarRenderer from "./AvatarRendererCanvas";

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

const StarIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

// ── Rarity-tinted backgrounds ───────────────────────────────────────────────
const LOCKED_BG = {
  common:    "linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 50%, #d1d8e0 100%)",
  rare:      "linear-gradient(145deg, #dbeafe 0%, #93c5fd 50%, #bfdbfe 100%)",
  epic:      "linear-gradient(145deg, #ede9fe 0%, #c4b5fd 50%, #ddd6fe 100%)",
  legendary: "linear-gradient(145deg, #fef3c7 0%, #fcd34d 50%, #fde68a 100%)",
};
const LOCKED_BORDER = {
  common: "#94a3b8", rare: "#3b82f6", epic: "#8b5cf6", legendary: "#f59e0b",
};
const RARITY_GLOW = {
  common: "rgba(100,116,139,0.18)", rare: "rgba(59,130,246,0.3)",
  epic: "rgba(139,92,246,0.35)", legendary: "rgba(234,179,8,0.45)",
};

const EARN_METHODS = [
  { icon: "🎯", label: "Complete a quiz", detail: "+10 coins base award" },
  { icon: "⭐", label: "Perfect score (100%)", detail: "+20 coins bonus" },
  { icon: "🔥", label: "Streak milestones", detail: "+5 at 3-day, +15 at 7-day, +30 at 14-day" },
  { icon: "🆕", label: "First topic attempt", detail: "+25 coin explorer bonus" },
  { icon: "🏆", label: "Quest completion", detail: "+8 coins per quest" },
  { icon: "🚀", label: "Mission complete", detail: "+50 coins for a full mission" },
];

// ── Categories with display-friendly labels ─────────────────────────────────
// NOTE: hat, accessory (gear), pet removed — they are not visible on the
// Canvas 2D renderer so showing them confuses scholars (all look identical).
const CATEGORIES = [
  { key: 'all',        icon: '🎨', label: 'All' },
  { key: 'base',       icon: '🚀', label: 'Suit' },
  { key: 'background', icon: '🌌', label: 'Scene' },
];

// Categories to exclude from "All" view (hidden / not visually rendered)
const HIDDEN_CATEGORIES = new Set(['skin', 'hair', 'expression', 'hat', 'accessory', 'pet']);

// Categories that support "None" (unequip)
const UNEQUIPPABLE = new Set(['background']);

export default function AvatarShop({ scholarId, onAvatarChange }) {
  const [scholar, setScholar] = useState(null);
  const [ownedItems, setOwnedItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showEarnInfo, setShowEarnInfo] = useState(false);
  const [equipping, setEquipping] = useState(null);
  const gridRef = useRef(null);

  // ── LIVE AVATAR STATE — this is the source of truth for the preview ────
  // We track it locally so equip feels instant before DB confirms
  const [liveAvatar, setLiveAvatar] = useState({ base: "astronaut" });

  const supabase = createBrowserClient(
    supabaseKeys.url(),
    supabaseKeys.publishable()
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
      setLiveAvatar(scholarData?.avatar || { base: "astronaut" });

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
    if (isOwned(item.id || '')) return false;
    if (item.coinCost > 0 && scholar.coins < item.coinCost) return false;
    if (item.badgeRequired) {
      const badges = scholar.badges || [];
      if (!badges.includes(item.badgeRequired)) return false;
    }
    return true;
  };

  const isOwned = (itemId) => {
    const def = AVATAR_ITEMS[itemId];
    if (def?.free) return true;
    return ownedItems.some(owned => owned.item_id === itemId);
  };

  const isEquipped = (itemId) => {
    // Check live avatar state first (optimistic)
    const def = AVATAR_ITEMS[itemId];
    if (!def) return false;
    const current = liveAvatar[def.category];
    if (current === itemId) return true;
    // Back-compat: old avatars store base as "astronaut" not "base_astronaut"
    if (def.category === 'base' && current === itemId.replace(/^base_/, '')) return true;
    return false;
  };

  // ── PURCHASE ──────────────────────────────────────────────────────────────
  const purchaseItem = async (itemId, item) => {
    if (!canUnlock(item) || purchasing) return;
    setPurchasing(itemId);
    setErrorMsg(null);

    try {
      if (item.coinCost > 0) {
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

      // Auto-equip after purchase
      await equipItem(itemId, item.category);
      await fetchData();
    } catch (error) {
      console.error('Error purchasing item:', error);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  // ── EQUIP — optimistic update + DB write ──────────────────────────────────
  const equipItem = async (itemId, category) => {
    setEquipping(itemId);
    setErrorMsg(null);

    // 1. Optimistic: update liveAvatar immediately for instant feedback
    // For base items, store bare name (e.g. "scientist" not "base_scientist")
    // so AvatarRenderer BASES lookup works without normalisation
    const avatarValue = category === 'base' ? itemId.replace(/^base_/, '') : itemId;
    const newAvatar = { ...liveAvatar, [category]: avatarValue };
    setLiveAvatar(newAvatar);

    try {
      // 2. Unequip all in category in tracking table
      await supabase
        .from('scholar_avatar_items')
        .update({ equipped: false })
        .eq('scholar_id', scholarId)
        .eq('item_category', category);

      // 3. Upsert the item row (free items may not have a row yet)
      const { error: upsertErr } = await supabase
        .from('scholar_avatar_items')
        .upsert({
          scholar_id:    scholarId,
          item_id:       itemId,
          item_category: category,
          equipped:      true,
          unlocked_at:   new Date().toISOString(),
        }, { onConflict: 'scholar_id,item_id' });

      if (upsertErr) console.warn('Upsert warning:', upsertErr);

      // 4. Update scholars.avatar JSONB
      const { error: avatarErr } = await supabase
        .from('scholars')
        .update({ avatar: newAvatar })
        .eq('id', scholarId);

      if (avatarErr) throw avatarErr;

      // Flash success
      showSuccess(`${AVATAR_ITEMS[itemId]?.name || 'Item'} equipped!`);

      // Update local scholar state
      setScholar(prev => prev ? { ...prev, avatar: newAvatar } : prev);

      // Notify parent (dashboard) so HeroAvatar updates in real-time
      if (onAvatarChange) onAvatarChange(newAvatar);
    } catch (error) {
      console.error('Error equipping item:', error);
      setErrorMsg('Failed to equip — please try again.');
      // Rollback optimistic update
      setLiveAvatar(scholar?.avatar || { base: "astronaut" });
    } finally {
      setEquipping(null);
    }
  };

  // ── UNEQUIP (set category to null) ────────────────────────────────────────
  const unequipCategory = async (category) => {
    setEquipping(`none_${category}`);
    const newAvatar = { ...liveAvatar, [category]: null };
    setLiveAvatar(newAvatar);

    try {
      await supabase
        .from('scholar_avatar_items')
        .update({ equipped: false })
        .eq('scholar_id', scholarId)
        .eq('item_category', category);

      await supabase
        .from('scholars')
        .update({ avatar: newAvatar })
        .eq('id', scholarId);

      setScholar(prev => prev ? { ...prev, avatar: newAvatar } : prev);
      showSuccess(`${category} removed`);

      // Notify parent (dashboard) so HeroAvatar updates in real-time
      if (onAvatarChange) onAvatarChange(newAvatar);
    } catch (error) {
      console.error('Error unequipping:', error);
      setLiveAvatar(scholar?.avatar || { base: "astronaut" });
    } finally {
      setEquipping(null);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const filteredItems = Object.entries(AVATAR_ITEMS).filter(([id, item]) => {
    if (selectedCategory === 'all') {
      // In "All" view, exclude items in hidden categories (skin, hair, expression)
      return !HIDDEN_CATEGORIES.has(item.category);
    }
    return item.category === selectedCategory;
  });

  // ── Distinct face presets per base so shop previews look unique ───────────
  const BASE_PREVIEW_FACES = {
    astronaut:  { skin: 'light',     expression: 'happy'   },
    explorer:   { skin: 'brown',     expression: 'excited' },
    scientist:  { skin: 'olive',     expression: 'cool'    },
    pilot:      { skin: 'tanned',    expression: 'wink'    },
    captain:    { skin: 'darkBrown', expression: 'serious' },
    ranger:     { skin: 'pale',      expression: 'mischief'},
    guardian:   { skin: 'black',     expression: 'starry'  },
    vanguard:   { skin: 'brown',     expression: 'proud'   },
  };

  // Build a preview avatar for a specific item (for mini preview thumbnails)
  const previewFor = (itemId) => {
    const def = AVATAR_ITEMS[itemId];
    if (!def) return liveAvatar;
    if (def.category === 'base') {
      const bare = itemId.replace(/^base_/, '');
      const face = BASE_PREVIEW_FACES[bare] || {};
      // Base items: show THAT character with a unique face preset
      return { base: bare, hat: null, pet: null, accessory: null, background: null, ...face };
    }
    // Non-base items: apply to current avatar
    return { ...liveAvatar, [def.category]: itemId };
  };

  // GSAP stagger entrance
  useEffect(() => {
    if (loading || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".shop-card");
    if (!cards.length) return;
    gsap.fromTo(cards,
      { y: 24, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: "back.out(1.6)" }
    );
  }, [selectedCategory, loading]);

  if (loading) {
    return (
      <div style={{ background: "#f8fafc", borderRadius: 24, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div style={{ width: 160, height: 160, borderRadius: "50%", background: "#e2e8f0" }} className="animate-pulse" />
          <div>
            <div style={{ width: 140, height: 24, background: "#e2e8f0", borderRadius: 8, marginBottom: 8 }} className="animate-pulse" />
            <div style={{ width: 100, height: 16, background: "#e2e8f0", borderRadius: 8 }} className="animate-pulse" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 160, background: "#e2e8f0", borderRadius: 16 }} className="animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
      borderRadius: 24, padding: 0, position: "relative", overflow: "hidden",
    }}>

      {/* ── HERO SECTION — large live avatar preview ─────────────────────── */}
      <div style={{
        padding: "24px 20px 20px",
        background: "linear-gradient(180deg, rgba(99,102,241,0.15) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {/* Live Avatar Preview */}
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
              animation: "shopAvatarPulse 3s ease-in-out infinite",
            }} />
            <div style={{
              borderRadius: "50%", overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.2)",
              boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
            }}>
              <AvatarRenderer avatar={liveAvatar} size="xl" animated />
            </div>
            {/* Success badge */}
            {successMsg && (
              <div style={{
                position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
                background: "#10b981", color: "white", fontSize: 10, fontWeight: 800,
                padding: "4px 12px", borderRadius: 12, whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(16,185,129,0.4)",
                animation: "successPop 0.3s ease-out",
              }}>{successMsg}</div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: 0 }}>
              Avatar Shop
            </h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600, margin: "4px 0 12px" }}>
              Tap any item to equip it instantly
            </p>
            {/* Coin balance */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 12,
              background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.1))",
              border: "1px solid rgba(251,191,36,0.3)",
            }}>
              <CoinsIcon size={18} />
              <span style={{ fontWeight: 900, color: "#fbbf24", fontSize: 18 }}>
                {scholar?.coins || 0}
              </span>
              <span style={{ fontSize: 10, color: "rgba(251,191,36,0.7)", fontWeight: 700 }}>coins</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── "How to Earn Coins" collapsible ──────────────────────────────── */}
      <div style={{ margin: "0 16px", borderRadius: 14, overflow: "hidden", marginTop: 12 }}>
        <button
          onClick={() => setShowEarnInfo(!showEarnInfo)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", border: "none", cursor: "pointer",
            background: "rgba(255,255,255,0.05)", borderRadius: showEarnInfo ? "14px 14px 0 0" : 14,
            textAlign: "left",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "#fbbf24" }}>
            💰 How to Earn Coins
          </span>
          <span style={{ fontSize: 16, color: "#fbbf24", transform: showEarnInfo ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.25s ease" }}>▾</span>
        </button>
        {showEarnInfo && (
          <div style={{
            padding: "12px 16px", display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8,
            background: "rgba(255,255,255,0.03)", borderRadius: "0 0 14px 14px",
          }}>
            {EARN_METHODS.map((m, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 10,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>{m.label}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{m.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Error / Success banners ──────────────────────────────────────── */}
      {errorMsg && (
        <div style={{
          margin: "12px 16px 0", padding: "10px 16px", borderRadius: 12,
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 12, fontWeight: 700, color: "#fca5a5",
        }}>
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", fontSize: 14, marginLeft: 12 }}>✕</button>
        </div>
      )}

      {/* ── Category Tabs ────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 6, padding: "16px 16px 0", overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            style={{
              padding: "8px 14px", borderRadius: 10,
              fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5,
              background: selectedCategory === cat.key
                ? "linear-gradient(135deg, #6366f1, #7c3aed)"
                : "rgba(255,255,255,0.06)",
              color: selectedCategory === cat.key ? "white" : "rgba(255,255,255,0.5)",
              border: selectedCategory === cat.key ? "2px solid rgba(129,140,248,0.5)" : "2px solid rgba(255,255,255,0.08)",
              cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: selectedCategory === cat.key ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* ── "None" unequip button for applicable categories ──────────────── */}
      {selectedCategory !== 'all' && UNEQUIPPABLE.has(selectedCategory) && liveAvatar[selectedCategory] && (
        <div style={{ padding: "12px 16px 0" }}>
          <button
            onClick={() => unequipCategory(selectedCategory)}
            disabled={equipping === `none_${selectedCategory}`}
            style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 11, fontWeight: 800,
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5", cursor: "pointer", transition: "all 0.2s ease",
            }}
          >
            {equipping === `none_${selectedCategory}` ? "Removing..." : `Remove ${selectedCategory}`}
          </button>
        </div>
      )}

      {/* ── Items Grid ───────────────────────────────────────────────────── */}
      <div ref={gridRef} style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 10, padding: 16,
      }}>
        {filteredItems.map(([itemId, item]) => {
          const owned = isOwned(itemId);
          const equipped = isEquipped(itemId);
          const canBuy = !owned && canUnlock(item);
          const isPurchasing = purchasing === itemId;
          const isEquippingThis = equipping === itemId;
          const isLocked = !owned;

          return (
            <div
              key={itemId}
              className={`shop-card ${isLocked ? "shop-locked" : ""}`}
              onClick={() => {
                // Tap-to-equip for owned items
                if (owned && !equipped && !equipping) equipItem(itemId, item.category);
              }}
              style={{
                padding: 12, borderRadius: 16, cursor: owned ? "pointer" : "default",
                border: `2px solid ${equipped ? "rgba(129,140,248,0.6)" : owned ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                background: equipped
                  ? "linear-gradient(145deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))"
                  : owned
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.02)",
                boxShadow: equipped
                  ? "0 4px 20px rgba(99,102,241,0.3), inset 0 0 0 1px rgba(129,140,248,0.2)"
                  : isLocked ? "none" : "0 2px 8px rgba(0,0,0,0.1)",
                transition: "all 0.25s ease",
                position: "relative", overflow: "hidden",
                opacity: isLocked ? 0.6 : 1,
              }}
            >
              {/* Equipped indicator */}
              {equipped && (
                <div style={{
                  position: "absolute", top: 6, right: 6,
                  width: 20, height: 20, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
                }}>
                  <CheckIcon size={11} />
                </div>
              )}

              {/* Equipping spinner */}
              {isEquippingThis && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(99,102,241,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 14, zIndex: 5,
                }}>
                  <div style={{
                    width: 24, height: 24, border: "3px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white", borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }} />
                </div>
              )}

              {/* Lock overlay */}
              {isLocked && (
                <div style={{
                  position: "absolute", top: 6, right: 6,
                  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
                  borderRadius: 6, padding: "2px 6px",
                  display: "flex", alignItems: "center", gap: 2,
                  color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: 800,
                }}>
                  <LockIcon size={9} />
                </div>
              )}

              {/* Shimmer for epic/legendary */}
              {(item.rarity === "legendary" || item.rarity === "epic") && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: item.rarity === "legendary"
                    ? "linear-gradient(135deg, transparent 30%, rgba(234,179,8,0.15) 50%, transparent 70%)"
                    : "linear-gradient(135deg, transparent 30%, rgba(139,92,246,0.1) 50%, transparent 70%)",
                  backgroundSize: "250% 250%",
                  animation: "shimmer 3s linear infinite",
                  borderRadius: 14, pointerEvents: "none",
                }} />
              )}

              {/* Mini avatar preview showing what the avatar looks like WITH this item */}
              <div style={{
                width: 72, height: 72, margin: "0 auto 8px",
                borderRadius: "50%", overflow: "hidden",
                border: equipped ? "2px solid rgba(129,140,248,0.4)" : "2px solid rgba(255,255,255,0.08)",
                transition: "border-color 0.2s ease",
              }}>
                <AvatarRenderer avatar={previewFor(itemId)} size="md" animated={false} />
              </div>

              {/* Item name */}
              <h3 style={{
                fontWeight: 800, fontSize: 11, textAlign: "center",
                color: "white", marginBottom: 2, lineHeight: 1.2,
              }}>{item.name}</h3>

              {/* Rarity + Price row */}
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <span style={{
                  fontSize: 8, fontWeight: 800, textTransform: "uppercase",
                  letterSpacing: 0.8, padding: "2px 8px", borderRadius: 6,
                  display: "inline-flex", alignItems: "center", gap: 2,
                  background: item.rarity === "legendary" ? "rgba(251,191,36,0.2)"
                    : item.rarity === "epic" ? "rgba(139,92,246,0.2)"
                    : item.rarity === "rare" ? "rgba(59,130,246,0.2)"
                    : "rgba(255,255,255,0.08)",
                  color: item.rarity === "legendary" ? "#fbbf24"
                    : item.rarity === "epic" ? "#a78bfa"
                    : item.rarity === "rare" ? "#60a5fa"
                    : "rgba(255,255,255,0.5)",
                }}>
                  {(item.rarity === "legendary" || item.rarity === "epic") && <StarIcon size={8} />}
                  {item.rarity}
                </span>
              </div>

              {/* Action area */}
              {owned ? (
                equipped ? (
                  <div style={{
                    background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                    color: "white", fontWeight: 900, padding: "6px 0", borderRadius: 8,
                    fontSize: 10, textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                  }}>
                    <CheckIcon size={10} /> Wearing
                  </div>
                ) : (
                  <div style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.6)", fontWeight: 800, padding: "6px 0", borderRadius: 8,
                    fontSize: 10, textAlign: "center",
                  }}>Tap to equip</div>
                )
              ) : canBuy ? (
                <button
                  onClick={(e) => { e.stopPropagation(); purchaseItem(itemId, item); }}
                  disabled={isPurchasing}
                  style={{
                    width: "100%", fontWeight: 900, padding: "6px 0", borderRadius: 8,
                    fontSize: 10, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "white", opacity: isPurchasing ? 0.6 : 1,
                    transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}
                >
                  {isPurchasing ? "..." : <><CoinsIcon size={11} /> {item.coinCost}</>}
                </button>
              ) : (
                <div style={{
                  color: "rgba(255,255,255,0.3)", fontWeight: 800, padding: "6px 0",
                  fontSize: 9, textAlign: "center",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                }}>
                  {item.badgeRequired ? (
                    <><LockIcon size={9} /> Badge</>
                  ) : (
                    <><CoinsIcon size={9} /> {item.coinCost}</>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>No items in this category</p>
        </div>
      )}

      {/* ── CSS animations ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes shopAvatarPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -250% -250% }
          100% { background-position: 250% 250% }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes successPop {
          from { transform: translateX(-50%) scale(0.7); opacity: 0; }
          to { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        .shop-card {
          transform-origin: center center;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease !important;
        }
        .shop-card:hover {
          transform: translateY(-4px) scale(1.03) !important;
          box-shadow: 0 12px 32px rgba(0,0,0,0.3) !important;
        }
        .shop-card:active {
          transform: scale(0.97) !important;
        }
      `}</style>
    </div>
  );
}
