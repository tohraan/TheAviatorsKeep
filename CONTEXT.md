# CONTEXT.md — SkyFrame CRM
> Living document. Update when business rules, product details, or flows change.
> Agents: read this first before any task.

---

## 1. Business Overview

**Product:** SkyFrame — handmade aviation shadow box frames for home/gift market.
**Operator:** Solo home-based business. Single user. Internal tool only.
**Location:** Dubai, UAE. Currency: AED.

### Product Variants
| Type | Price |
|------|-------|
| Standard frame | 249 AED |
| Custom/personalised frame | 300 AED |

### Airlines Carried
Emirates, Etihad, Saudi, Qatar, FlyDubai + rotating others.

### Frame Components (raw materials per order)
- Box frame
- Model plane (airliner)
- Printout plaque
- Frame extension
- Nail (plane mounting)
- PVC tape

**Assembly time:** 3–4 hours per frame (when all materials in stock).

---

## 2. Payment Structure (per order)

| Payment Stage | Amount | Trigger |
|---------------|--------|---------|
| Booking amount | 50 AED | Customer confirms order |
| Remaining balance | (total - 50 AED) | Frame assembly complete, image shared |
| Shipping fee | Courier quote | Customer approves shipping quote |

**Total collected = Booking + Balance + Shipping**

---

## 3. Lead Sources

| Source | Channel | How leads arrive |
|--------|---------|-----------------|
| Facebook Marketplace | Organic listing | Direct FB message |
| Facebook Page | Boosted carousel post | FB message or Instagram DM |
| Instagram | Driven from FB Page boost | Instagram DM → moved to WhatsApp |
| Other | Manual entry | Any other channel |

**Lead flow:** Ad/listing → DM → Operator moves interested leads to WhatsApp → Close on WhatsApp → Order placed.

---

## 4. Order Lifecycle (source of truth)

```
[INQUIRY]
    ↓ lead responds to ad/listing
[CONTACTED]
    ↓ operator replies, handles queries
[INTERESTED]
    ↓ customer wants to proceed
[BOOKING PAID] ← 50 AED received
    ↓ assembly begins (if materials available)
[IN PRODUCTION]
    ↓ frame complete
[READY — PENDING APPROVAL]
    ↓ image shared with customer
[BALANCE PAID] ← remaining balance received
    ↓ shipping quote sent
[SHIPPING PAID] ← shipping fee received
    ↓ packaged and dispatched
[DELIVERED]
```

---

## 5. Follow-Up Types

- **Hot-gone-cold:** Lead messaged via ad, went cold/ghosted.
- **Price ghost:** Went quiet after seeing price.
- **Unread:** Message not seen in time.
- **Post-delivery:** Past customer, re-engage for new product/launch.

---

## 6. Cost Categories (for P&L tracking)

- Raw materials & consumables
- Ad spend (FB Marketplace boost / FB Page boost)
- Shipping errors / wrongful delivery
- Wasted/damaged materials
- Miscellaneous operational costs

---

## 7. Content Strategy Context

**Goal:** Daily posts. Reach masses. Stop scroll. Create FOMO. Build follower base.
**Content creator:** Operator creates AI-generated images, recreates viral product formats.
**Platforms:** Instagram (primary), Facebook Page (cross-post + boost source).
**Analytics inputs:** Manually provided by operator (screenshots + context labels).
**AI agency role:** Analyse provided analytics → produce content calendar, captions, strategy.

---

## 8. What This System Is NOT

- Not a public-facing tool. No customer login.
- Not an e-commerce platform.
- No payment gateway integration (payments tracked manually).
- No WhatsApp/Instagram/Facebook API integration (manual logging).
- No team collaboration. Single operator only.
