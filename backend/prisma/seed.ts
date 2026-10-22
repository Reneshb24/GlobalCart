
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Create top-level categories.
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {
      name: "Electronics",
      isActive: true
    },
    create: {
      name: "Electronics",
      slug: "electronics",
      description: "Devices and everyday technology"
    }
  });

  const home = await prisma.category.upsert({
    where: { slug: "home-living" },
    update: {
      name: "Home & Living",
      isActive: true
    },
    create: {
      name: "Home & Living",
      slug: "home-living",
      description: "Useful products for your home"
    }
  });

  // 2. Create child categories.
  const phones = await prisma.category.upsert({
    where: { slug: "smartphones" },
    update: {
      name: "Smartphones",
      parentId: electronics.id,
      isActive: true
    },
    create: {
      name: "Smartphones",
      slug: "smartphones",
      description: "Smartphones and mobile devices",
      parentId: electronics.id
    }
  });

  const accessories = await prisma.category.upsert({
    where: { slug: "accessories" },
    update: {
      name: "Accessories",
      parentId: electronics.id,
      isActive: true
    },
    create: {
      name: "Accessories",
      slug: "accessories",
      description: "Accessories for your devices",
      parentId: electronics.id
    }
  });

  const kitchen = await prisma.category.upsert({
    where: { slug: "kitchen" },
    update: {
      name: "Kitchen",
      parentId: home.id,
      isActive: true
    },
    create: {
      name: "Kitchen",
      slug: "kitchen",
      description: "Kitchen and dining essentials",
      parentId: home.id
    }
  });

  // 3. Create demo vendors.
  const vendorOne = await prisma.vendor.upsert({
    where: { email: "demo-electronics@globalcart.example" },
    update: {
      name: "GlobalCart Demo Electronics",
      isActive: true
    },
    create: {
      name: "GlobalCart Demo Electronics",
      email: "demo-electronics@globalcart.example"
    }
  });

  const vendorTwo = await prisma.vendor.upsert({
    where: { email: "demo-home@globalcart.example" },
    update: {
      name: "GlobalCart Demo Home",
      isActive: true
    },
    create: {
      name: "GlobalCart Demo Home",
      email: "demo-home@globalcart.example"
    }
  });

  // 4. Create a demo warehouse.
  const warehouse = await prisma.warehouse.upsert({
    where: { code: "DEMO-MUM-01" },
    update: {
      isActive: true
    },
    create: {
      code: "DEMO-MUM-01",
      name: "GlobalCart Demo Warehouse",
      countryCode: "IN",
      region: "Maharashtra",
      city: "Mumbai"
    }
  });

  // 5. Define fictional products for development.
  const products = [
    {
      sku: "GC-DEMO-PHONE-001",
      slug: "demo-smartphone",
      name: "Demo Smartphone",
      description: "A fictional smartphone for catalog testing.",
      brand: "GlobalCart Demo",
      price: "499.99",
      currency: "USD",
      categoryId: phones.id,
      vendorId: vendorOne.id,
      imageUrl:
        "https://placehold.co/600x600?text=Demo+Smartphone"
    },
    {
      sku: "GC-DEMO-HEADPHONES-001",
      slug: "demo-wireless-headphones",
      name: "Demo Wireless Headphones",
      description: "Fictional wireless headphones for catalog testing.",
      brand: "GlobalCart Demo",
      price: "79.99",
      currency: "USD",
      categoryId: accessories.id,
      vendorId: vendorOne.id,
      imageUrl:
        "https://placehold.co/600x600?text=Demo+Headphones"
    },
    {
      sku: "GC-DEMO-CHARGER-001",
      slug: "demo-usb-c-charger",
      name: "Demo USB-C Charger",
      description: "A fictional USB-C charger for catalog testing.",
      brand: "GlobalCart Demo",
      price: "24.99",
      currency: "USD",
      categoryId: accessories.id,
      vendorId: vendorOne.id,
      imageUrl:
        "https://placehold.co/600x600?text=Demo+Charger"
    },
    {
      sku: "GC-DEMO-MUG-001",
      slug: "demo-ceramic-mug",
      name: "Demo Ceramic Mug",
      description: "A fictional ceramic mug for catalog testing.",
      brand: "GlobalCart Demo",
      price: "12.50",
      currency: "USD",
      categoryId: kitchen.id,
      vendorId: vendorTwo.id,
      imageUrl:
        "https://placehold.co/600x600?text=Demo+Mug"
    }
  ];

  let inventoryCount = 0;

  // 6. Upsert products, images and inventory.
  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        brand: item.brand,
        price: item.price,
        currency: item.currency,
        status: "ACTIVE",
        categoryId: item.categoryId,
        vendorId: item.vendorId
      },
      create: {
        sku: item.sku,
        slug: item.slug,
        name: item.name,
        description: item.description,
        brand: item.brand,
        price: item.price,
        currency: item.currency,
        status: "ACTIVE",
        categoryId: item.categoryId,
        vendorId: item.vendorId
      }
    });

    // Find the existing primary image to avoid duplicates on reruns.
    const existingImage = await prisma.productImage.findFirst({
      where: {
        productId: product.id,
        position: 0
      }
    });

    if (existingImage) {
      await prisma.productImage.update({
        where: { id: existingImage.id },
        data: {
          url: item.imageUrl,
          altText: item.name,
          position: 0
        }
      });
    } else {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: item.imageUrl,
          altText: item.name,
          position: 0
        }
      });
    }

    // Keep one inventory record per product and warehouse.
    await prisma.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse.id
        }
      },
      update: {
        quantity: 25,
        reserved: 0,
        reorderLevel: 5
      },
      create: {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 25,
        reserved: 0,
        reorderLevel: 5
      }
    });

    inventoryCount++;
  }

  // 6. Seed default sitewide coupons & offers
  const now = new Date();
  const startsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const defaultOffers = [
    {
      code: "SAVE20",
      name: "20% Off Everything",
      description: "Get an instant 20% discount on your entire order.",
      discountPercent: 20.0,
      discountAmount: null,
      currency: "USD",
      startsAt,
      endsAt,
      status: "ACTIVE" as const
    },
    {
      code: "WELCOME10",
      name: "Welcome 10% Off",
      description: "New customer welcome discount of 10% off any order.",
      discountPercent: 10.0,
      discountAmount: null,
      currency: "USD",
      startsAt,
      endsAt,
      status: "ACTIVE" as const
    },
    {
      code: "FLAT50",
      name: "$50 Flat Instant Savings",
      description: "Enjoy a flat $50 discount applied at checkout.",
      discountPercent: null,
      discountAmount: 50.0,
      currency: "USD",
      startsAt,
      endsAt,
      status: "ACTIVE" as const
    },
    {
      code: "FESTIVE25",
      name: "25% Festive Season Special",
      description: "Celebrate with 25% off all eligible items.",
      discountPercent: 25.0,
      discountAmount: null,
      currency: "USD",
      startsAt,
      endsAt,
      status: "ACTIVE" as const
    },
    {
      code: "SUPER15",
      name: "$15 Super Savings Voucher",
      description: "Instant $15 off on your cart total.",
      discountPercent: null,
      discountAmount: 15.0,
      currency: "USD",
      startsAt,
      endsAt,
      status: "ACTIVE" as const
    }
  ];

  for (const offer of defaultOffers) {
    await prisma.offer.upsert({
      where: { code: offer.code },
      update: offer,
      create: offer
    });
  }

  console.log("GlobalCart development seed completed.");
  console.log({
    categories: 5,
    vendors: 2,
    products: products.length,
    warehouse: warehouse.code,
    inventoryRecords: inventoryCount
  });
}

main()
  .catch((error: unknown) => {
    console.error("Development seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
