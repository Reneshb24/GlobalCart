import { prisma } from "../../lib/prisma";

export async function listCategories() {
  return prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      children: {
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true
        },
        orderBy: {
          name: "asc"
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findFirst({
    where: {
      slug,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      children: {
        where: {
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true
        },
        orderBy: {
          name: "asc"
        }
      }
    }
  });
}
