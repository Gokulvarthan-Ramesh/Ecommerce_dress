import { prisma } from '../config/db';

export class TaxService {
  static async calculateTaxForItems(items: any[], shippingAddress?: any) {
    let totalTax = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let taxableAmount = 0;

    // Fetch tax rules for categories if needed
    for (const item of items) {
      taxableAmount += item.totalPrice; // This is the discounted/net price per item in a real engine

      let taxRate = 18; // Default to 18% GST

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { category: { include: { taxRule: true } } },
      });

      if (product?.taxRate) {
        taxRate = Number(product.taxRate);
      } else if (product?.category?.taxRule) {
        taxRate = Number(product.category.taxRule.rate);
      } else if (product?.category?.taxRate) {
        taxRate = Number(product.category.taxRate);
      }

      // Calculate tax exclusive (assuming base prices are exclusive)
      const itemTax = (item.totalPrice * taxRate) / 100;
      totalTax += itemTax;

      // Split into CGST/SGST/IGST (simplified logic: intra-state = CGST+SGST, inter-state = IGST)
      // Assuming warehouse is in 'Karnataka' (KA)
      const isInterState = shippingAddress?.state && shippingAddress.state.toLowerCase() !== 'karnataka';
      
      if (isInterState) {
        igst += itemTax;
      } else {
        cgst += itemTax / 2;
        sgst += itemTax / 2;
      }
    }

    return {
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
    };
  }
}
