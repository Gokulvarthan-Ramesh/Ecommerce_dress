import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
const generateSlug = (text: string) => text.toLowerCase().trim().replace(/[\s\W-]+/g, '-');

export class IconService {
  static async getIcons(query: any) {
    const { category, status } = query;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;

    const icons = await prisma.icon.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return icons;
  }

  static async getIconById(id: string) {
    const icon = await prisma.icon.findUnique({ where: { id } });
    if (!icon) throw new AppError('Icon not found', 404);
    return icon;
  }

  static async createIcon(data: any) {
    const { name, category, icon_url, status, sort_order } = data;

    if (category && !['ecommerce', 'bottombar', 'DcodexLogo'].includes(category)) {
      throw new AppError('Invalid category selected', 400);
    }

    const slug = generateSlug(name);

    // Check if slug exists
    const existing = await prisma.icon.findUnique({ where: { slug } });
    if (existing) throw new AppError('Icon with this name already exists', 400);

    const icon = await prisma.icon.create({
      data: {
        name,
        slug,
        category,
        iconUrl: icon_url,
        status: status || 'active',
        sortOrder: sort_order || 0,
      },
    });
    return icon;
  }

  static async updateIcon(id: string, data: any) {
    const existing = await prisma.icon.findUnique({ where: { id } });
    if (!existing) throw new AppError('Icon not found', 404);

    const { name, category, icon_url, status, sort_order } = data;

    if (category && !['ecommerce', 'bottombar', 'DcodexLogo'].includes(category)) {
      throw new AppError('Invalid category selected', 400);
    }

    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = generateSlug(name);
      const dup = await prisma.icon.findFirst({ where: { slug, id: { not: id } } });
      if (dup) throw new AppError('Icon with this name already exists', 400);
    }

    const icon = await prisma.icon.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(name && { slug }),
        ...(category && { category }),
        ...(icon_url && { iconUrl: icon_url }),
        ...(status && { status }),
        ...(sort_order !== undefined && { sortOrder: sort_order }),
      },
    });
    return icon;
  }

  static async deleteIcon(id: string) {
    const existing = await prisma.icon.findUnique({ where: { id } });
    if (!existing) throw new AppError('Icon not found', 404);

    await prisma.icon.delete({ where: { id } });
    return { success: true };
  }
}
