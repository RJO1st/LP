"use client";
// ============================================================================
// Avatar Shop - Purchase and Manage Avatar Items
// src/components/game/AvatarShop.jsx
//
// ENHANCED:
//   - Stronger card backgrounds — locked items now use rarity-tinted bg instead of #f8fafc
//   - Locked items show full-colour icon + gentle bounce/pulse animation (not greyed out)
//   - "How to Earn Coins" collapsible banner
//   - Richer shimmer for epic + legendary items
//   - purchaseItem uses spend_coins() RPC (atomic, race-condition safe)
// ============================================================================
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AVATAR_ITEMS, RARITY_COLORS } from "@/lib/gamificationEngine";
import gsap from "gsap";
import AvatarRenderer from "./AvatarRenderer";
import LottieAvatar from "./LottieAvatar";

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

// ── Rarity-tinted locked backgrounds — STRONG FILL for visibility ────────────
const LOCKED_BG = {
  common:    "linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 50%, #d1d8e0 100%)",
  rare:      "linear-gradient(145deg, #dbeafe 0%, #93c5fd 50%, #bfdbfe 100%)",
  epic:      "linear-gradient(145deg, #ede9fe 0%, #c4b5fd 50%, #ddd6fe 100%)",
  legendary: "linear-gradient(145deg, #fef3c7 0%, #fcd34d 50%, #fde68a 100%)",
};

const LOCKED_BORDER = {
  common:    "#94a3b8",
  rare:      "#3b82f6",
  epic:      "#8b5cf6",
  legendary: "#f59e0b",
};

// ── "How to Earn Coins" data — matches coins.js actual rates ─────────────────
const EARN_METHODS = [
  { icon: "🎯", label: "Complete a quiz", detail: "+10 coins base award" },
  { icon: "⭐", label: "Perfect score (100%)", detail: "+20 coins bonus" },
  { icon: "🔥", label: "Streak milestones", detail: "+5 at 3-day, +15 at 7-day, +30 at 14-day" },
  { icon: "🆕", label: "First topic attempt", detail: "+25 coin explorer bonus" },
  { icon: "🏆", label: "Quest completion", detail: "+8 coins per quest" },
  { icon: "🚀", label: "Mission complete", detail: "+50 coins for a full mission" },
];

export default function AvatarShop({ scholarId }) {
  const [scholar, setScholar] = useState(null);
  const [ownedItems, setOwnedItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showEarnInfo, setShowEarnInfo] = useState(false);
  const gridRef = useRef(null);
  const [previewItem, setPreviewItem] = useState(null);

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

      await fetchData();
    } catch (error) {
      console.error('Error purchasing item:', error);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

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

  // Build current equipped avatar for live preview
  const equippedAvatar = useMemo(() => {
    const base = { base: scholar?.avatar?.base || "astronaut", hat: null, pet: null, accessory: null, background: null };
    ownedItems.forEach(oi => {
      if (oi.equipped) { const def = AVATAR_ITEMS[oi.item_id]; if (def) base[def.category] = oi.item_id; }
    });
    return base;
  }, [scholar, ownedItems]);

  // Preview avatar = equipped + hovered item overlaid
  const previewAvatar = useMemo(() => {
    const pv = { ...equippedAvatar };
    if (previewItem) { const def = AVATAR_ITEMS[previewItem]; if (def) pv[def.category] = previewItem; }
    return pv;
  }, [equippedAvatar, previewItem]);

  const categories = ['all', 'hat', 'pet', 'accessory', 'background'];
  const CATEGORY_ICONS = { all: '🎨', hat: '🎩', pet: '🐾', accessory: '✨', background: '🌌' };
  const filteredItems = Object.entries(AVATAR_ITEMS).filter(([id, item]) =>
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const RARITY_GLOW = {
    common: "rgba(100,116,139,0.18)",
    rare: "rgba(59,130,246,0.3)",
    epic: "rgba(139,92,246,0.35)",
    legendary: "rgba(234,179,8,0.45)",
  };

  // GSAP stagger entrance on grid items — must be BEFORE any conditional return
  useEffect(() => {
    if (loading || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".shop-card");
    if (!cards.length) return;
    gsap.fromTo(cards,
      { y: 24, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.045, ease: "back.out(1.6)" }
    );
  }, [selectedCategory, loading]);

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

  return (
    <div style={{
      background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      borderRadius: 24, padding: "16px", position: "relative",
      border: "2px solid #e0e7ff",
      boxShadow: "0 4px 32px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.04)",
    }}>

      {/* ── Header with live avatar preview + coin balance ──────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "relative", width: 140, height: 140 }}>
              {/* Lottie ambient ring behind */}
              <div style={{
                position: "absolute", inset: -12, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
                animation: "shopAvatarPulse 3s ease-in-out infinite",
              }} />
              <LottieAvatar
                avatar={previewAvatar}
                size="lg"
                role={scholar?.avatar?.role}
                streak={scholar?.streak || 0}
                mastery={scholar?.total_xp ? Math.min(100, Math.round(scholar.total_xp / 50)) : 0}
              />
            </div>
            {previewItem && (
              <div style={{
                position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
                background: "#6366f1", color: "white", fontSize: 9, fontWeight: 800,
                padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap",
              }}>Preview</div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", margin: 0 }}>Avatar Shop</h2>
            <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: "4px 0 0" }}>Customise your space explorer</p>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 14,
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "2px solid #fbbf24",
          boxShadow: "0 4px 16px rgba(251,191,36,0.25), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}>
          <CoinsIcon size={22} />
          <span style={{ fontWeight: 900, color: "#92400e", fontSize: 20 }}>{scholar?.coins || 0}</span>
        </div>
      </div>

      {/* ── "How to Earn Coins" collapsible banner ──────────────────────── */}
      <div style={{
        marginBottom: 16, borderRadius: 14, overflow: "hidden",
        border: "2px solid #fde68a",
        background: "linear-gradient(135deg, #fffbeb, #fef9c3)",
      }}>
        <button
          onClick={() => setShowEarnInfo(!showEarnInfo)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", border: "none", cursor: "pointer",
            background: "transparent", textAlign: "left",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: "#92400e" }}>
            <span style={{ fontSize: 18 }}>💰</span> How to Earn Coins
          </span>
          <span style={{ fontSize: 18, color: "#d97706", transform: showEarnInfo ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.25s ease" }}>
            ▾
          </span>
        </button>
        {showEarnInfo && (
          <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {EARN_METHODS.map((m, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.7)",
                border: "1px solid #fde68a",
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1e293b" }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: "#78716c", fontWeight: 600 }}>{m.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{
          marginBottom: 14, padding: "10px 16px", borderRadius: 12,
          background: "#fef2f2", border: "2px solid #fecaca",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 13, fontWeight: 700, color: "#b91c1c",
        }}>
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 16, marginLeft: 12 }}>✕</button>
        </div>
      )}

      {/* ── Category Filter ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "8px 18px", borderRadius: 12,
              fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5,
              background: selectedCategory === cat
                ? "linear-gradient(135deg, #6366f1, #7c3aed)"
                : "rgba(255,255,255,0.8)",
              color: selectedCategory === cat ? "white" : "#475569",
              border: selectedCategory === cat ? "2px solid #6366f1" : "2px solid #e2e8f0",
              cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: selectedCategory === cat ? "0 4px 12px rgba(99,102,241,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
              transform: selectedCategory === cat ? "scale(1.05)" : "scale(1)",
              transition: "all 0.2s ease",
            }}
          >
            {CATEGORY_ICONS[cat]} {cat}
          </button>
        ))}
      </div>

      {/* ── Items Grid — animated ───────────────────────────────────────── */}
      <div ref={gridRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 14 }}>
        {filteredItems.map(([itemId, item]) => {
          const owned = isOwned(itemId);
          const equipped = isEquipped(itemId);
          const canBuy = canUnlock(item);
          const isPurchasing = purchasing === itemId;
          const isLocked = !owned;

          // Rarity-specific animation class for the card (drives child icon animation)
          const lockedAnimClass = isLocked
            ? item.rarity === "legendary" ? "locked-float-legendary"
            : item.rarity === "epic" ? "locked-float-epic"
            : ""
            : "";

          return (
            <div
              key={itemId}
              className={`shop-card ${lockedAnimClass}`}
              onMouseEnter={() => setPreviewItem(itemId)}
              onMouseLeave={() => setPreviewItem(null)}
              style={{
                padding: 16, borderRadius: 16, cursor: "pointer",
                border: `2px solid ${equipped ? "#818cf8" : owned ? "#6ee7b7" : LOCKED_BORDER[item.rarity] || "#cbd5e1"}`,
                background: equipped
                  ? "linear-gradient(145deg, #eef2ff, #e0e7ff)"
                  : owned
                  ? "linear-gradient(145deg, #ecfdf5, #d1fae5)"
                  : LOCKED_BG[item.rarity] || LOCKED_BG.common,
                boxShadow: equipped
                  ? "0 4px 20px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.8)"
                  : `0 3px 12px ${RARITY_GLOW[item.rarity] || "rgba(0,0,0,0.06)"}`,
                transition: "all 0.25s ease",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Shimmer overlay for epic + legendary (even when locked) */}
              {(item.rarity === "legendary" || item.rarity === "epic") && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: item.rarity === "legendary"
                    ? "linear-gradient(135deg, transparent 30%, rgba(234,179,8,0.12) 50%, transparent 70%)"
                    : "linear-gradient(135deg, transparent 30%, rgba(139,92,246,0.08) 50%, transparent 70%)",
                  backgroundSize: "250% 250%",
                  animation: "shimmer 3s linear infinite",
                  borderRadius: 14, pointerEvents: "none",
                }} />
              )}

              {/* Lock badge overlay (top-right) */}
              {isLocked && (
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                  borderRadius: 8, padding: "3px 6px",
                  display: "flex", alignItems: "center", gap: 3,
                  color: "white", fontSize: 9, fontWeight: 800,
                }}>
                  <LockIcon size={10} />
                </div>
              )}

              {/* Item icon — FULL COLOUR even when locked, with stage bg + hover anim */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 80, height: 80, margin: "0 auto 10px",
                borderRadius: "50%",
                background: isLocked
                  ? `radial-gradient(circle, ${item.rarity === "legendary" ? "rgba(251,191,36,0.35)" : item.rarity === "epic" ? "rgba(139,92,246,0.28)" : item.rarity === "rare" ? "rgba(59,130,246,0.22)" : "rgba(100,116,139,0.18)"} 0%, ${item.rarity === "legendary" ? "rgba(251,191,36,0.08)" : item.rarity === "epic" ? "rgba(139,92,246,0.06)" : item.rarity === "rare" ? "rgba(59,130,246,0.05)" : "rgba(100,116,139,0.04)"} 70%)`
                  : `radial-gradient(circle, ${equipped ? "rgba(99,102,241,0.22)" : "rgba(16,185,129,0.18)"} 0%, ${equipped ? "rgba(99,102,241,0.05)" : "rgba(16,185,129,0.04)"} 70%)`,
                border: isLocked
                  ? `2px solid ${item.rarity === "legendary" ? "rgba(251,191,36,0.25)" : item.rarity === "epic" ? "rgba(139,92,246,0.2)" : item.rarity === "rare" ? "rgba(59,130,246,0.15)" : "rgba(100,116,139,0.12)"}`
                  : "2px solid transparent",
                transition: "all 0.3s ease",
              }}>
                <div
                  className={`shop-item-icon ${isLocked ? "shop-item-icon-locked" : "shop-item-icon-owned"}`}
                  style={{
                    fontSize: 52, textAlign: "center", lineHeight: 1,
                  }}
                >{item.icon}</div>
              </div>

              <h3 style={{
                fontWeight: 900, fontSize: 13, textAlign: "center",
                color: "#1e293b", marginBottom: 3, lineHeight: 1.2,
              }}>{item.name}</h3>

              {/* Rarity badge */}
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                  letterSpacing: 0.8, padding: "3px 10px", borderRadius: 8,
                  display: "inline-flex", alignItems: "center", gap: 3,
                  background: item.rarity === "legendary" ? "linear-gradient(135deg, #fef3c7, #fde68a)"
                    : item.rarity === "epic" ? "linear-gradient(135deg, #f3e8ff, #ede9fe)"
                    : item.rarity === "rare" ? "#dbeafe"
                    : "#f1f5f9",
                  color: item.rarity === "legendary" ? "#92400e"
                    : item.rarity === "epic" ? "#7c3aed"
                    : item.rarity === "rare" ? "#2563eb"
                    : "#64748b",
                }}>
                  {(item.rarity === "legendary" || item.rarity === "epic") && <StarIcon size={9} />}
                  {item.rarity}
                </span>
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
                    boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
                  }}>
                    <CheckIcon size={13} /> Equipped
                  </div>
                ) : (
                  <button
                    onClick={() => equipItem(itemId, item.category)}
                    style={{
                      width: "100%", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "white",
                      fontWeight: 900, padding: "8px 0", borderRadius: 10,
                      fontSize: 11, border: "none", cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 8px rgba(99,102,241,0.2)",
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
                    boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                  }}
                >{isPurchasing ? "Unlocking..." : "Unlock"}</button>
              ) : (
                <div style={{
                  background: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
                  color: "white", fontWeight: 900, padding: "8px 0", borderRadius: 10,
                  fontSize: 11, textAlign: "center",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                  <CoinsIcon size={11} /> {item.coinCost > 0 ? `Need ${item.coinCost}` : "Locked"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: "#94a3b8", fontWeight: 700 }}>No items in this category</p>
        </div>
      )}

      {/* ── CSS animations — robust hover with !important overrides ──── */}
      <style>{`
        @keyframes shopAvatarPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -250% -250% }
          100% { background-position: 250% 250% }
        }
        @keyframes shopIconFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes shopIconFloatEpic {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-5px) rotate(1.5deg); }
          75% { transform: translateY(-2px) rotate(-1.5deg); }
        }
        @keyframes shopIconFloatLegendary {
          0%, 100% { transform: translateY(0px) scale(1); }
          33% { transform: translateY(-6px) scale(1.06); }
          66% { transform: translateY(-2px) scale(0.97); }
        }
        @keyframes shopIconGlimmer {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 0px transparent); }
          50% { filter: brightness(1.15) drop-shadow(0 0 10px rgba(251,191,36,0.5)); }
        }
        @keyframes shopHoverWiggle {
          0% { transform: scale(1) rotate(0deg); }
          15% { transform: scale(1.22) rotate(-10deg); }
          30% { transform: scale(1.18) rotate(8deg); }
          45% { transform: scale(1.2) rotate(-5deg); }
          60% { transform: scale(1.18) rotate(3deg); }
          75% { transform: scale(1.2) rotate(-1deg); }
          100% { transform: scale(1.15) rotate(0deg); }
        }
        @keyframes shopHoverBounce {
          0% { transform: scale(1) translateY(0px); }
          30% { transform: scale(1.25) translateY(-10px); }
          50% { transform: scale(1.1) translateY(0px); }
          70% { transform: scale(1.18) translateY(-4px); }
          100% { transform: scale(1.12) translateY(0px); }
        }

        /* ── Idle floating for locked icons ─── */
        .shop-item-icon-locked {
          animation: shopIconFloat 2.5s ease-in-out infinite !important;
        }
        .locked-float-epic .shop-item-icon-locked {
          animation: shopIconFloatEpic 3s ease-in-out infinite !important;
        }
        .locked-float-legendary .shop-item-icon-locked {
          animation: shopIconFloatLegendary 2.8s ease-in-out infinite, shopIconGlimmer 3s ease-in-out infinite !important;
        }

        /* ── Card hover lift ─── */
        .shop-card {
          transform-origin: center center;
          transition: transform 0.25s ease, box-shadow 0.25s ease !important;
        }
        .shop-card:hover {
          transform: translateY(-8px) scale(1.05) !important;
          box-shadow: 0 20px 48px rgba(0,0,0,0.18), 0 8px 16px rgba(99,102,241,0.12) !important;
          z-index: 2;
        }

        /* ── HOVER: locked items do wiggle ─── */
        .shop-card:hover .shop-item-icon-locked {
          animation: shopHoverWiggle 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97) both !important;
        }
        /* ── HOVER: owned items do bounce ─── */
        .shop-card:hover .shop-item-icon-owned {
          animation: shopHoverBounce 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both !important;
        }
      `}</style>
    </div>
  );
}
