"use client";
/**
 * AvatarCustomiser.jsx — Scholar avatar customisation interface
 *
 * Lets scholars equip/unequip purchased items from their inventory.
 * Integrates with the existing AvatarShop (purchase) and AvatarRenderer (display).
 *
 * Props:
 *   scholar      — scholar DB row (id, avatar, coins, owned_items)
 *   onSave       — callback(updatedAvatar) when scholar saves changes
 *   onClose      — close the customiser panel
 *
 * Avatar shape: { base, hat, pet, accessory, background, skin, hair, expression }
 *   - base: "astronaut" | "explorer" | "scientist" | "pilot" | "captain"
 *   - hat/pet/accessory/background/skin/hair/expression: item key or null
 *
 * Database:
 *   - Reads owned_items from scholars.owned_avatar_items (jsonb array)
 *   - Writes avatar config to scholars.avatar (jsonb)
 */

import React, { useState, useMemo, useCallback } from "react";
import { AVATAR_ITEMS, RARITY_COLORS } from "@/lib/gamificationEngine";
import AvatarRenderer from "./AvatarRenderer";

// ─── CATEGORY CONFIG ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "base",       label: "Character",   icon: "👤", slot: "base" },
  { key: "skin",       label: "Skin Tone",   icon: "🎨", slot: "skin" },
  { key: "hair",       label: "Hair",        icon: "💇", slot: "hair" },
  { key: "expression", label: "Expression",  icon: "😊", slot: "expression" },
  { key: "hat",        label: "Hats",        icon: "🎩", slot: "hat" },
  { key: "accessory",  label: "Effects",     icon: "✨", slot: "accessory" },
  { key: "pet",        label: "Pets",        icon: "🐾", slot: "pet" },
  { key: "background", label: "Backgrounds", icon: "🌌", slot: "background" },
];

const BASE_OPTIONS = [
  { id: "astronaut",  name: "Astronaut",  icon: "🧑‍🚀", colour: "#6366f1" },
  { id: "explorer",   name: "Explorer",   icon: "🧭",  colour: "#10b981" },
  { id: "scientist",  name: "Scientist",  icon: "🔬",  colour: "#f59e0b" },
  { id: "pilot",      name: "Pilot",      icon: "✈️",  colour: "#f43f5e" },
  { id: "captain",    name: "Captain",    icon: "🚀",  colour: "#7c3aed" },
];

const RARITY_BORDER = {
  common:    "#94a3b8",
  rare:      "#3b82f6",
  epic:      "#8b5cf6",
  legendary: "#eab308",
};

const RARITY_GLOW = {
  common:    "none",
  rare:      "0 0 8px rgba(59,130,246,0.3)",
  epic:      "0 0 12px rgba(139,92,246,0.4)",
  legendary: "0 0 16px rgba(234,179,8,0.5)",
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function AvatarCustomiser({ scholar, onSave, onClose }) {
  const ownedItems = useMemo(
    () => new Set(scholar?.owned_avatar_items || []),
    [scholar]
  );

  const currentAvatar = scholar?.avatar || { base: "astronaut" };
  const [avatar, setAvatar] = useState({ ...currentAvatar });
  const [activeCategory, setActiveCategory] = useState("base");
  const [saving, setSaving] = useState(false);

  const hasChanges = JSON.stringify(avatar) !== JSON.stringify(currentAvatar);

  // Get items available for the active category
  const categoryItems = useMemo(() => {
    if (activeCategory === "base") {
      return BASE_OPTIONS.map((b) => ({
        ...b,
        owned: true, // bases are always available
        equipped: avatar.base === b.id,
        rarity: "common",
        free: true,
      }));
    }

    return Object.entries(AVATAR_ITEMS)
      .filter(([, item]) => item.category === activeCategory)
      .map(([key, item]) => {
        // Free items are always available — no purchase needed
        const isFree = item.free === true;
        const isOwned = isFree || ownedItems.has(key);
        return {
          id: key,
          name: item.name,
          icon: item.icon,
          colour: RARITY_BORDER[item.rarity] || "#94a3b8",
          rarity: item.rarity,
          owned: isOwned,
          equipped: avatar[activeCategory] === key,
          free: isFree,
          coinCost: item.coinCost,
          badgeRequired: item.badgeRequired,
        };
      })
      .sort((a, b) => {
        // Free first, then owned, then by rarity
        if (a.free !== b.free) return a.free ? -1 : 1;
        if (a.owned !== b.owned) return a.owned ? -1 : 1;
        const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
        return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
      });
  }, [activeCategory, ownedItems, avatar]);

  const handleEquip = useCallback(
    (itemId) => {
      if (activeCategory === "base") {
        setAvatar((prev) => ({ ...prev, base: itemId }));
      } else {
        setAvatar((prev) => ({
          ...prev,
          [activeCategory]: prev[activeCategory] === itemId ? null : itemId,
        }));
      }
    },
    [activeCategory]
  );

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      await onSave(avatar);
    } finally {
      setSaving(false);
    }
  }, [avatar, hasChanges, saving, onSave]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        borderRadius: 24, maxWidth: 520, width: "100%",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        overflow: "hidden",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
              Customise Avatar
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              Make it yours — free items included!
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.1)", color: "#fff",
              fontSize: 16, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Preview */}
        <div style={{
          display: "flex", justifyContent: "center", padding: "20px 0 12px",
          background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.1), transparent 70%)",
          flexShrink: 0,
        }}>
          <AvatarRenderer avatar={avatar} size="xl" animated />
        </div>

        {/* Category tabs — horizontally scrollable for mobile */}
        <div style={{
          display: "flex", gap: 4, padding: "0 16px 8px",
          overflowX: "auto", scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          flexShrink: 0,
        }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                flex: "0 0 auto",
                padding: "8px 12px", borderRadius: 12,
                border: activeCategory === cat.key
                  ? "2px solid #6366f1"
                  : "2px solid transparent",
                background: activeCategory === cat.key
                  ? "rgba(99,102,241,0.15)"
                  : "rgba(255,255,255,0.05)",
                color: activeCategory === cat.key ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 13 }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Item grid — scrollable */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
          gap: 8, padding: "8px 16px 12px",
          maxHeight: 220, overflowY: "auto",
          flexGrow: 1,
        }}>
          {/* "None" option for non-base, non-skin categories — lets scholar unequip */}
          {activeCategory !== "base" && (
            <button
              onClick={() => handleEquip(null)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 4, padding: 10, borderRadius: 14,
                border: !avatar[activeCategory]
                  ? "2px solid #6366f1"
                  : "1px solid rgba(255,255,255,0.1)",
                background: !avatar[activeCategory]
                  ? "rgba(99,102,241,0.15)"
                  : "rgba(255,255,255,0.05)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 22 }}>&#x2205;</span>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: !avatar[activeCategory] ? "#fff" : "rgba(255,255,255,0.5)",
                textAlign: "center",
              }}>
                None
              </span>
              {!avatar[activeCategory] && (
                <span style={{
                  fontSize: 8, fontWeight: 800, color: "#22c55e",
                  textTransform: "uppercase",
                }}>
                  Active
                </span>
              )}
            </button>
          )}

          {categoryItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.owned && handleEquip(item.id)}
              disabled={!item.owned}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3, padding: 8, borderRadius: 14,
                border: item.equipped
                  ? `2px solid ${item.colour || "#6366f1"}`
                  : `1px solid ${item.owned ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
                background: item.equipped
                  ? `${item.colour || "#6366f1"}15`
                  : item.owned
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(255,255,255,0.02)",
                boxShadow: item.equipped ? RARITY_GLOW[item.rarity] : "none",
                cursor: item.owned ? "pointer" : "not-allowed",
                opacity: item.owned ? 1 : 0.4,
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              {/* Free badge */}
              {item.free && (
                <span style={{
                  position: "absolute", top: 3, right: 3,
                  fontSize: 7, fontWeight: 800, color: "#22c55e",
                  background: "rgba(34,197,94,0.15)", padding: "1px 4px",
                  borderRadius: 6, textTransform: "uppercase",
                }}>
                  Free
                </span>
              )}

              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: item.equipped ? "#fff" : "rgba(255,255,255,0.5)",
                textAlign: "center", lineHeight: 1.2,
              }}>
                {item.name}
              </span>
              {item.equipped && (
                <span style={{
                  fontSize: 8, fontWeight: 800, color: "#22c55e",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  Equipped
                </span>
              )}
              {!item.owned && item.coinCost > 0 && (
                <span style={{
                  fontSize: 8, fontWeight: 700, color: "#fbbf24",
                }}>
                  {item.coinCost} coins
                </span>
              )}
              {!item.owned && item.badgeRequired && (
                <span style={{
                  fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)",
                }}>
                  Badge needed
                </span>
              )}
              {!item.owned && !item.coinCost && !item.badgeRequired && (
                <span style={{
                  fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)",
                }}>
                  Locked
                </span>
              )}
            </button>
          ))}

          {categoryItems.length === 0 && (
            <div style={{
              gridColumn: "1 / -1", textAlign: "center",
              padding: 24, color: "rgba(255,255,255,0.3)", fontSize: 13,
            }}>
              No items in this category yet. Visit the shop to get some!
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          display: "flex", gap: 10, padding: "12px 16px 16px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent", color: "rgba(255,255,255,0.6)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              flex: 2, padding: "12px 0", borderRadius: 12,
              border: "none",
              background: hasChanges
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "rgba(255,255,255,0.1)",
              color: hasChanges ? "#fff" : "rgba(255,255,255,0.3)",
              fontSize: 13, fontWeight: 800, cursor: hasChanges ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {saving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
