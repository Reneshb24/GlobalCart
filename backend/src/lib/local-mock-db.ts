import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Prisma } from "../generated/prisma";

export interface LocalDbState {
  users: any[];
  vendorProfiles: any[];
  vendors: any[];
  categories: any[];
  products: any[];
  productImages: any[];
  warehouses: any[];
  inventories: any[];
  carts: any[];
  cartItems: any[];
  wishlists: any[];
  wishlistItems: any[];
  orders: any[];
  orderItems: any[];
  payments: any[];
  shipments: any[];
  offers: any[];
  loyaltyAccounts: any[];
  loyaltyTransactions: any[];
  addresses: any[];
  returnRequests: any[];
  reviews: any[];
  refunds: any[];
}

export function createLocalMockDb(): any {
  const state: LocalDbState = {
    users: [],
    vendorProfiles: [],
    vendors: [],
    categories: [],
    products: [],
    productImages: [],
    warehouses: [],
    inventories: [],
    carts: [],
    cartItems: [],
    wishlists: [],
    wishlistItems: [],
    orders: [],
    orderItems: [],
    payments: [],
    shipments: [],
    offers: [],
    loyaltyAccounts: [],
    loyaltyTransactions: [],
    addresses: [],
    returnRequests: [],
    reviews: [],
    refunds: []
  };

  // Valid RFC 4122 v4 UUID constants for pre-seeded database entities
  const ID_WH_1 = "10000000-0000-4000-8000-000000000001";
  const ID_WH_2 = "10000000-0000-4000-8000-000000000002";
  const ID_WH_3 = "10000000-0000-4000-8000-000000000003";

  const ID_CAT_1 = "20000000-0000-4000-8000-000000000001";
  const ID_CAT_2 = "20000000-0000-4000-8000-000000000002";
  const ID_CAT_3 = "20000000-0000-4000-8000-000000000003";
  const ID_CAT_4 = "20000000-0000-4000-8000-000000000004";

  const ID_VEN_1 = "30000000-0000-4000-8000-000000000001";
  const ID_VP_1 = "30000000-0000-4000-8000-000000000002";

  const ID_USR_ADMIN = "40000000-0000-4000-8000-000000000001";
  const ID_USR_VENDOR = "40000000-0000-4000-8000-000000000002";
  const ID_USR_CUSTOMER = "40000000-0000-4000-8000-000000000003";

  const ID_PROD_1 = "50000000-0000-4000-8000-000000000001";
  const ID_PROD_2 = "50000000-0000-4000-8000-000000000002";
  const ID_PROD_3 = "50000000-0000-4000-8000-000000000003";

  const ID_OFF_1 = "60000000-0000-4000-8000-000000000001";
  const ID_OFF_2 = "60000000-0000-4000-8000-000000000002";
  const ID_OFF_3 = "60000000-0000-4000-8000-000000000003";

  const ID_LOY_1 = "70000000-0000-4000-8000-000000000001";

  // Preload test accounts
  const adminPasswordHash = bcrypt.hashSync("Admin123!", 10);
  const vendorPasswordHash = bcrypt.hashSync("VendorPass123!", 10);
  const customerPasswordHash = bcrypt.hashSync("CustomerPass123!", 10);

  state.users.push(
    {
      id: ID_USR_ADMIN,
      email: "globalcart.admin.dev@example.com",
      passwordHash: adminPasswordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: ID_USR_VENDOR,
      email: "vendor.demo@globalcart.example",
      passwordHash: vendorPasswordHash,
      firstName: "Alex",
      lastName: "Vance",
      role: "VENDOR",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: ID_USR_CUSTOMER,
      email: "shopper.demo@example.com",
      passwordHash: customerPasswordHash,
      firstName: "Alexander",
      lastName: "Mercer",
      role: "CUSTOMER",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  );

  state.warehouses.push(
    {
      id: ID_WH_1,
      code: "WH-NYC-01",
      name: "New York Regional Hub",
      address: "100 Logistics Blvd",
      city: "New York",
      countryCode: "US",
      isActive: true
    },
    {
      id: ID_WH_2,
      code: "WH-CHI-02",
      name: "Chicago Central Fulfillment",
      address: "500 Lake Express",
      city: "Chicago",
      countryCode: "US",
      isActive: true
    },
    {
      id: ID_WH_3,
      code: "WH-BLR-01",
      name: "Bengaluru South Hub",
      address: "7 Electronics City",
      city: "Bengaluru",
      countryCode: "IN",
      isActive: true
    }
  );

  state.vendors.push({
    id: ID_VEN_1,
    name: "Apex Electronics Global",
    email: "vendor.demo@globalcart.example",
    phone: "+1 555-0199",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  state.vendorProfiles.push({
    id: ID_VP_1,
    userId: ID_USR_VENDOR,
    name: "Apex Electronics Global",
    contactEmail: "vendor.demo@globalcart.example",
    phone: "+1 555-0199",
    nearestWarehouseId: ID_WH_1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  state.categories.push(
    { id: ID_CAT_1, slug: "audio", name: "High-Fidelity Audio", description: "Studio headphones, ANC earbuds and sound systems", parentId: null, isActive: true },
    { id: ID_CAT_2, slug: "electronics", name: "Consumer Electronics", description: "Smart devices, chargers and tech accessories", parentId: null, isActive: true },
    { id: ID_CAT_3, slug: "lifestyle", name: "Home & Lifestyle", description: "Premium lifestyle and kitchen essentials", parentId: null, isActive: true },
    { id: ID_CAT_4, slug: "gaming", name: "Gaming Gear", description: "High performance mechanical hardware and peripherals", parentId: null, isActive: true }
  );

  const sampleProducts = [
    {
      id: ID_PROD_1,
      sku: "SKU-AUDIO-001",
      slug: "pro-wireless-studio-headphones-v2",
      name: "Pro Wireless Studio Headphones V2",
      brand: "AcousticPrime",
      description: "Active noise-cancelling studio headphones with 40mm beryllium drivers, 45-hour battery life and multi-device Bluetooth 5.4.",
      price: 139.99,
      currency: "USD",
      categoryId: ID_CAT_1,
      vendorId: ID_VEN_1,
      status: "ACTIVE",
      images: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      id: ID_PROD_2,
      sku: "SKU-CHARGER-002",
      slug: "demo-usb-c-charger",
      name: "GaN Pro 65W USB-C Fast Charger",
      brand: "VoltTech",
      description: "Ultra-compact Gallium Nitride 3-port wall charger supporting PD 3.0 and PPS fast charging protocols.",
      price: 24.99,
      currency: "USD",
      categoryId: ID_CAT_2,
      vendorId: ID_VEN_1,
      status: "ACTIVE",
      images: [
        "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1618218168350-6e7c81151b64?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      id: ID_PROD_3,
      sku: "SKU-CHEF-003",
      slug: "stainless-steel-utility-knife",
      name: "Japanese Damascus Chef Knife 8-Inch",
      brand: "KikuForge",
      description: "Precision-forged 67-layer VG-10 Damascus steel blade with ergonomic Pakkawood handle.",
      price: 69.99,
      currency: "USD",
      categoryId: ID_CAT_3,
      vendorId: ID_VEN_1,
      status: "ACTIVE",
      images: [
        "https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=800&q=80"
      ]
    }
  ];

  for (const p of sampleProducts) {
    state.products.push({
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      description: p.description,
      price: new Prisma.Decimal(p.price),
      currency: p.currency,
      categoryId: p.categoryId,
      vendorId: p.vendorId,
      vendorProfileId: ID_VP_1,
      status: p.status,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    p.images.forEach((url, idx) => {
      state.productImages.push({
        id: crypto.randomUUID(),
        productId: p.id,
        url,
        altText: `${p.name} - Studio Perspective ${idx + 1}`,
        position: idx
      });
    });

    state.inventories.push({
      id: crypto.randomUUID(),
      productId: p.id,
      warehouseId: ID_WH_1,
      quantity: 50,
      reserved: 0
    });
  }

  state.offers.push(
    {
      id: ID_OFF_1,
      code: "SAVE20",
      description: "Seasonal Sale - 20% Off All Orders [TIER:ALL]",
      discountPercent: new Prisma.Decimal(20),
      discountAmount: null,
      minOrderAmount: new Prisma.Decimal(0),
      maxDiscountAmount: new Prisma.Decimal(50),
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 86400000 * 30),
      status: "ACTIVE",
      scope: "GLOBAL"
    },
    {
      id: ID_OFF_2,
      code: "WELCOME10",
      description: "New Shopper Welcome Bonus 10% Off [TIER:ALL]",
      discountPercent: new Prisma.Decimal(10),
      discountAmount: null,
      minOrderAmount: new Prisma.Decimal(15),
      maxDiscountAmount: new Prisma.Decimal(30),
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 86400000 * 30),
      status: "ACTIVE",
      scope: "GLOBAL"
    },
    {
      id: ID_OFF_3,
      code: "VIPGOLD",
      description: "Exclusive Gold Member Flash Deal 30% Off [TIER:GOLD]",
      discountPercent: new Prisma.Decimal(30),
      discountAmount: null,
      minOrderAmount: new Prisma.Decimal(50),
      maxDiscountAmount: new Prisma.Decimal(100),
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 86400000 * 30),
      status: "ACTIVE",
      scope: "GLOBAL"
    }
  );

  state.loyaltyAccounts.push({
    id: ID_LOY_1,
    userId: ID_USR_CUSTOMER,
    pointsBalance: 250,
    tier: "SILVER",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  function matchWhere(item: any, where: any, modelName?: string): boolean {
    if (!where) return true;
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;

      if (k === "OR" && Array.isArray(v)) {
        if (!v.some((sub) => matchWhere(item, sub, modelName))) return false;
      } else if (k === "AND" && Array.isArray(v)) {
        if (!v.every((sub) => matchWhere(item, sub, modelName))) return false;
      } else if (k === "category" && modelName === "product" && typeof v === "object") {
        const cat = state.categories.find(c => c.id === item.categoryId);
        if (!cat) return false;
        if (!matchWhere(cat, v, "category")) return false;
      } else if (k === "warehouse" && modelName === "inventory" && typeof v === "object") {
        const wh = state.warehouses.find(w => w.id === item.warehouseId);
        if (!wh) return false;
        if (!matchWhere(wh, v, "warehouse")) return false;
      } else if (v !== null && typeof v === "object" && !(v instanceof Date) && !(v instanceof Prisma.Decimal)) {
        const itemVal = item[k];
        if ("equals" in v && itemVal !== (v as any).equals) return false;
        if ("contains" in v && (!itemVal || !String(itemVal).toLowerCase().includes(String((v as any).contains).toLowerCase()))) return false;
        if ("in" in v && Array.isArray((v as any).in) && !(v as any).in.includes(itemVal)) return false;
        if ("not" in v && itemVal === (v as any).not) return false;
        if ("gt" in v && !(itemVal > (v as any).gt)) return false;
        if ("gte" in v && !(itemVal >= (v as any).gte)) return false;
        if ("lt" in v && !(itemVal < (v as any).lt)) return false;
        if ("lte" in v && !(itemVal <= (v as any).lte)) return false;
      } else if (item[k] !== v) {
        return false;
      }
    }
    return true;
  }

  function applyUpdate(target: any, data: any) {
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && typeof v === "object" && !(v instanceof Date) && !(v instanceof Prisma.Decimal)) {
        if ("increment" in v) {
          const current = Number(target[k] || 0);
          target[k] = target[k] instanceof Prisma.Decimal ? new Prisma.Decimal(current + Number(v.increment)) : (current + Number(v.increment));
        } else if ("decrement" in v) {
          const current = Number(target[k] || 0);
          target[k] = target[k] instanceof Prisma.Decimal ? new Prisma.Decimal(current - Number(v.decrement)) : (current - Number(v.decrement));
        } else if ("set" in v) {
          target[k] = (v as any).set;
        } else {
          target[k] = v;
        }
      } else {
        target[k] = v;
      }
    }
  }

  function expandItem(item: any, modelName: string, includeOrSelect?: any): any {
    if (!item) return null;
    const res = { ...item };

    if (modelName === "product") {
      res.images = state.productImages
        .filter(img => img.productId === item.id)
        .sort((a, b) => a.position - b.position);
      res.category = state.categories.find(c => c.id === item.categoryId) || null;
      res.vendor = state.vendors.find(v => v.id === item.vendorId) || { id: ID_VEN_1, name: "Apex Electronics Global" };
      res.vendorProfile = state.vendorProfiles.find(v => v.id === item.vendorProfileId) || null;
      res.inventory = state.inventories.filter(inv => inv.productId === item.id).map(inv => {
        const wh = state.warehouses.find(w => w.id === inv.warehouseId);
        return { ...inv, warehouse: wh };
      });
    } else if (modelName === "user") {
      res.vendorProfile = state.vendorProfiles.find(v => v.userId === item.id) || null;
      res.loyaltyAccount = state.loyaltyAccounts.find(l => l.userId === item.id) || null;
    } else if (modelName === "cart") {
      res.items = state.cartItems.filter(ci => ci.cartId === item.id).map(ci => {
        const prod = state.products.find(p => p.id === ci.productId);
        return {
          ...ci,
          product: expandItem(prod, "product")
        };
      });
    } else if (modelName === "cartItem") {
      const prod = state.products.find(p => p.id === item.productId);
      res.product = expandItem(prod, "product");
    } else if (modelName === "wishlist") {
      res.items = state.wishlistItems.filter(wi => wi.wishlistId === item.id).map(wi => {
        const prod = state.products.find(p => p.id === wi.productId);
        return {
          ...wi,
          product: expandItem(prod, "product")
        };
      });
    } else if (modelName === "wishlistItem") {
      const prod = state.products.find(p => p.id === item.productId);
      res.product = expandItem(prod, "product");
    } else if (modelName === "order") {
      res.items = state.orderItems.filter(oi => oi.orderId === item.id).map(oi => {
        const prod = state.products.find(p => p.id === oi.productId);
        return {
          ...oi,
          product: expandItem(prod, "product")
        };
      });
      res.payments = state.payments.filter(pm => pm.orderId === item.id);
      res.shipments = state.shipments.filter(sh => sh.orderId === item.id);
      res.user = state.users.find(u => u.id === item.userId) || null;
    } else if (modelName === "vendorProfile") {
      res.warehouse = state.warehouses.find(w => w.id === item.nearestWarehouseId) || null;
      res.nearestWarehouse = res.warehouse;
      res.user = state.users.find(u => u.id === item.userId) || null;
    } else if (modelName === "category") {
      res.children = state.categories.filter(c => c.parentId === item.id);
    } else if (modelName === "loyaltyAccount") {
      res.transactions = state.loyaltyTransactions.filter(t => t.accountId === item.id);
    } else if (modelName === "inventory") {
      res.product = state.products.find(p => p.id === item.productId) || null;
      res.warehouse = state.warehouses.find(w => w.id === item.warehouseId) || null;
    }

    return res;
  }

  function createRepo(tableName: keyof LocalDbState, modelName: string) {
    const repo: any = {
      findMany: async (args?: any) => {
        let list = (state[tableName] as any[]).filter(item => matchWhere(item, args?.where, modelName));
        list = list.map(item => expandItem(item, modelName, args?.include || args?.select));
        if (args?.skip) list = list.slice(args.skip);
        if (args?.take) list = list.slice(0, args.take);
        return list;
      },
      findFirst: async (args?: any) => {
        const item = (state[tableName] as any[]).find(i => matchWhere(i, args?.where, modelName));
        if (!item) return null;
        return expandItem(item, modelName, args?.include || args?.select);
      },
      findUnique: async (args: any) => {
        let item: any = null;
        if (args?.where?.id) {
          item = (state[tableName] as any[]).find(i => i.id === args.where.id);
        } else if (args?.where?.email) {
          item = (state[tableName] as any[]).find(i => i.email === args.where.email);
        } else if (args?.where?.userId) {
          item = (state[tableName] as any[]).find(i => i.userId === args.where.userId);
        } else if (args?.where?.code) {
          item = (state[tableName] as any[]).find(i => i.code === args.where.code);
        } else if (args?.where?.cartId_productId) {
          item = (state[tableName] as any[]).find(i => i.cartId === args.where.cartId_productId.cartId && i.productId === args.where.cartId_productId.productId);
        } else if (args?.where?.wishlistId_productId) {
          item = (state[tableName] as any[]).find(i => i.wishlistId === args.where.wishlistId_productId.wishlistId && i.productId === args.where.wishlistId_productId.productId);
        } else if (args?.where?.productId_warehouseId) {
          item = (state[tableName] as any[]).find(i => i.productId === args.where.productId_warehouseId.productId && i.warehouseId === args.where.productId_warehouseId.warehouseId);
        } else {
          item = (state[tableName] as any[]).find(i => matchWhere(i, args?.where, modelName));
        }
        if (!item) return null;
        return expandItem(item, modelName, args?.include || args?.select);
      },
      create: async (args: any) => {
        const id = args.data.id || crypto.randomUUID();
        const { items, payments, shipments, images, ...cleanData } = args.data;
        const newItem = {
          isActive: true,
          status: "ACTIVE",
          ...cleanData,
          id,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (modelName === "product" && images?.create && Array.isArray(images.create)) {
          images.create.forEach((img: any) => {
            state.productImages.push({
              ...img,
              id: crypto.randomUUID(),
              productId: id,
              position: img.position ?? 0
            });
          });
        }

        if (modelName === "user") {
          newItem.role = cleanData.role || "CUSTOMER";
        }

        if (cleanData.price !== undefined && !(cleanData.price instanceof Prisma.Decimal)) {
          newItem.price = new Prisma.Decimal(cleanData.price);
        }

        (state[tableName] as any[]).push(newItem);

        // Handle order creations with sub-resources
        if (modelName === "order") {
          if (items?.create && Array.isArray(items.create)) {
            items.create.forEach((it: any) => {
              state.orderItems.push({
                ...it,
                id: crypto.randomUUID(),
                orderId: id,
                unitPrice: it.unitPrice instanceof Prisma.Decimal ? it.unitPrice : new Prisma.Decimal(it.unitPrice || 0),
                lineTotal: it.lineTotal instanceof Prisma.Decimal ? it.lineTotal : new Prisma.Decimal(it.lineTotal || 0)
              });
            });
          }
          if (payments?.create && Array.isArray(payments.create)) {
            payments.create.forEach((pm: any) => {
              state.payments.push({
                ...pm,
                id: crypto.randomUUID(),
                orderId: id,
                amount: pm.amount instanceof Prisma.Decimal ? pm.amount : new Prisma.Decimal(pm.amount || 0)
              });
            });
          }
          // Default initial live tracking shipment
          state.shipments.push({
            id: crypto.randomUUID(),
            orderId: id,
            status: "PREPARING",
            carrier: "Global Express Prime",
            trackingNumber: `GC-TRK-${Date.now().toString().slice(-6)}`,
            shippedAt: null,
            estimatedDelivery: new Date(Date.now() + 86400000 * 2),
            deliveredAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Auto create loyalty account when customer registers
        if (modelName === "user" && newItem.role === "CUSTOMER") {
          state.loyaltyAccounts.push({
            id: crypto.randomUUID(),
            userId: id,
            pointsBalance: 150, // Welcome 150 SuperCoins
            tier: "STANDARD",
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Auto create vendor profile if vendor user registers
        if (modelName === "vendorProfile") {
          state.vendors.push({
            id: crypto.randomUUID(),
            name: newItem.name,
            email: newItem.contactEmail,
            phone: newItem.phone,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        return expandItem(newItem, modelName, args?.include || args?.select);
      },
      upsert: async (args: any) => {
        let existing: any = null;
        if (args?.where) {
          const list = state[tableName] as any[];
          if (args.where.id) {
            existing = list.find(i => i.id === args.where.id);
          } else if (args.where.userId) {
            existing = list.find(i => i.userId === args.where.userId);
          } else if (args.where.code) {
            existing = list.find(i => i.code === args.where.code);
          } else if (args.where.cartId_productId) {
            existing = list.find(i => i.cartId === args.where.cartId_productId.cartId && i.productId === args.where.cartId_productId.productId);
          } else if (args.where.wishlistId_productId) {
            existing = list.find(i => i.wishlistId === args.where.wishlistId_productId.wishlistId && i.productId === args.where.wishlistId_productId.productId);
          } else if (args.where.productId_warehouseId) {
            existing = list.find(i => i.productId === args.where.productId_warehouseId.productId && i.warehouseId === args.where.productId_warehouseId.warehouseId);
          } else {
            existing = list.find(i => matchWhere(i, args.where, modelName));
          }
        }
        if (existing) {
          if (args.update) applyUpdate(existing, args.update);
          existing.updatedAt = new Date();
          return expandItem(existing, modelName, args?.include || args?.select);
        } else {
          return repo.create({
            data: { ...(args.where || {}), ...(args.create || {}) },
            include: args.include,
            select: args.select
          });
        }
      },
      update: async (args: any) => {
        const list = state[tableName] as any[];
        const idx = list.findIndex(i => matchWhere(i, args.where, modelName));
        if (idx === -1) throw new Error(`${modelName} record not found for update`);
        applyUpdate(list[idx], args.data);
        list[idx].updatedAt = new Date();
        return expandItem(list[idx], modelName, args?.include || args?.select);
      },
      updateMany: async (args: any) => {
        const list = state[tableName] as any[];
        let count = 0;
        for (let i = 0; i < list.length; i++) {
          if (matchWhere(list[i], args.where, modelName)) {
            applyUpdate(list[i], args.data);
            list[i].updatedAt = new Date();
            count++;
          }
        }
        return { count };
      },
      delete: async (args: any) => {
        const list = state[tableName] as any[];
        const idx = list.findIndex(i => matchWhere(i, args.where, modelName));
        if (idx === -1) throw new Error(`${modelName} record not found for deletion`);
        const [deleted] = list.splice(idx, 1);
        return deleted;
      },
      deleteMany: async (args?: any) => {
        const list = state[tableName] as any[];
        const before = list.length;
        state[tableName] = list.filter(i => !matchWhere(i, args?.where, modelName)) as any;
        return { count: before - (state[tableName] as any[]).length };
      },
      count: async (args?: any) => {
        const list = (state[tableName] as any[]).filter(i => matchWhere(i, args?.where, modelName));
        return list.length;
      },
      aggregate: async (args: any) => {
        const list = (state[tableName] as any[]).filter(i => matchWhere(i, args?.where, modelName));
        const res: any = { _sum: {} };
        if (args?._sum) {
          for (const key of Object.keys(args._sum)) {
            res._sum[key] = list.reduce((sum, item) => sum + Number(item[key] || 0), 0);
          }
        }
        return res;
      },
      groupBy: async (args: any) => {
        const list = (state[tableName] as any[]).filter(i => matchWhere(i, args?.where, modelName));
        const byFields = Array.isArray(args.by) ? args.by : [args.by];
        const groupMap = new Map<string, any>();

        for (const item of list) {
          const key = byFields.map((f: any) => String(item[f] || "")).join("::");
          if (!groupMap.has(key)) {
            const initial: any = { _count: { id: 0, _all: 0 }, _sum: {} };
            byFields.forEach((f: any) => initial[f] = item[f]);
            if (args._sum) {
              for (const sumKey of Object.keys(args._sum)) {
                initial._sum[sumKey] = 0;
              }
            }
            groupMap.set(key, initial);
          }
          const group = groupMap.get(key);
          group._count.id++;
          group._count._all++;
          if (args._sum) {
            for (const sumKey of Object.keys(args._sum)) {
              group._sum[sumKey] = (group._sum[sumKey] || 0) + Number(item[sumKey] || 0);
            }
          }
        }
        return Array.from(groupMap.values());
      }
    };
    return repo;
  }

  const mockClient: any = {
    user: createRepo("users", "user"),
    vendorProfile: createRepo("vendorProfiles", "vendorProfile"),
    vendor: createRepo("vendors", "vendor"),
    category: createRepo("categories", "category"),
    product: createRepo("products", "product"),
    productImage: createRepo("productImages", "productImage"),
    warehouse: createRepo("warehouses", "warehouse"),
    inventory: createRepo("inventories", "inventory"),
    cart: createRepo("carts", "cart"),
    cartItem: createRepo("cartItems", "cartItem"),
    wishlist: createRepo("wishlists", "wishlist"),
    wishlistItem: createRepo("wishlistItems", "wishlistItem"),
    order: createRepo("orders", "order"),
    orderItem: createRepo("orderItems", "orderItem"),
    payment: createRepo("payments", "payment"),
    shipment: createRepo("shipments", "shipment"),
    offer: createRepo("offers", "offer"),
    loyaltyAccount: createRepo("loyaltyAccounts", "loyaltyAccount"),
    loyaltyTransaction: createRepo("loyaltyTransactions", "loyaltyTransaction"),
    userAddress: createRepo("addresses", "address"),
    address: createRepo("addresses", "address"),
    refund: createRepo("refunds", "refund"),
    returnRequest: createRepo("returnRequests", "returnRequest"),
    review: createRepo("reviews", "review"),
    $connect: async () => {},
    $disconnect: async () => {},
    $transaction: async (fn: any, _opts?: any) => {
      if (typeof fn === "function") {
        return await fn(mockClient);
      }
      if (Array.isArray(fn)) {
        const results = [];
        for (const p of fn) {
          results.push(await p);
        }
        return results;
      }
      return null;
    }
  };

  return mockClient;
}
