import { CartRepository } from '../repositories/CartRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { AppError } from '../middleware/errorHandler';

export class CartService {
  static async getCart(userId: string) {
    const cart = await CartRepository.getCart(userId);

    const cartItems = await CartRepository.findMany({
      where: { cartId: cart.id },
      include: {
        variant: {
          include: {
            product: {
              include: { images: true }
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let subtotal = 0;
    const formattedItems = cartItems.map((item) => {
      const unitPrice = Number(item.variant.price);
      const itemTotal = unitPrice * item.quantity;
      const isAvailable = item.variant.isActive && item.variant.product.isActive && item.variant.stockQuantity >= item.quantity;

      if (isAvailable) subtotal += itemTotal;

      return {
        id: item.id,
        variantId: item.variantId,
        productId: item.variant.productId,
        productTitle: item.variant.product.name,
        productSlug: item.variant.product.slug,
        image: item.variant.product.images[0]?.imageUrl || null,
        size: item.variant.size,
        color: item.variant.color,
        sku: item.variant.sku,
        unitPrice,
        quantity: item.quantity,
        totalPrice: itemTotal,
        stock: item.variant.stockQuantity,
        isAvailable,
      };
    });

    return {
      items: formattedItems,
      totalItems: formattedItems.reduce((acc, curr) => acc + curr.quantity, 0),
      subtotal,
    };
  }

  static async addToCart(userId: string, variantId: string, quantity: number = 1) {
    if (!variantId || quantity <= 0) {
      throw new AppError('Valid variantId and quantity are required');
    }

    const cart = await CartRepository.getCart(userId);

    const variant = await ProductRepository.findManyVariants({
      where: { id: variantId },
      include: { product: true },
    }).then(res => res[0]);

    if (!variant || !variant.isActive || !variant.product.isActive) {
      throw new AppError('Product variant is currently unavailable', 400);
    }

    if (variant.stockQuantity < quantity) {
      throw new AppError(`Only ${variant.stockQuantity} items left in stock`, 400);
    }

    const existingCartItem = await CartRepository.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });

    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + quantity;
      if (variant.stockQuantity < newQuantity) {
        throw new AppError(`Cannot add more. Only ${variant.stockQuantity} available in stock.`);
      }

      return CartRepository.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
      });
    }

    return CartRepository.create({
      data: { cartId: cart.id, variantId, quantity },
    });
  }

  static async updateQuantity(userId: string, id: string, quantity: number) {
    const cart = await CartRepository.getCart(userId);

    if (quantity === 0) {
      await CartRepository.deleteMany({ where: { id, cartId: cart.id } });
      return null; 
    }

    const cartItem = await CartRepository.findMany({
      where: { id, cartId: cart.id },
      include: { variant: true },
    }).then(res => res[0]);

    if (!cartItem) throw new AppError('Cart item not found', 404);
    if (cartItem.variant.stockQuantity < quantity) {
      throw new AppError(`Only ${cartItem.variant.stockQuantity} available in stock`);
    }

    return CartRepository.update({
      where: { id },
      data: { quantity },
    });
  }

  static async removeFromCart(userId: string, id: string) {
    const cart = await CartRepository.getCart(userId);
    await CartRepository.deleteMany({ where: { id, cartId: cart.id } });
  }

  static async clearCart(userId: string) {
    const cart = await CartRepository.getCart(userId);
    await CartRepository.deleteMany({ where: { cartId: cart.id } });
  }
}
